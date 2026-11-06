/**
 * 接入服务本体：一个跑在电脑上的小反向代理 + 配对门 + 设备台账。
 *
 * ## 为什么必须有它
 *
 * DSH 的 webServer 只监听 `127.0.0.1`，而且它的 Host 校验只认回环地址与显式
 * `trustedHosts` 条目。手机在局域网里指过去一定失败，我们也不该去改它
 * （Electron 包在 asar 里，改了会被下次更新覆盖）。
 *
 * 这个服务做三件事：
 *   1. 对外监听 `0.0.0.0:<port>`，把请求转发到本机 `127.0.0.1:<dshPort>`，
 *      **转发时把 `Host` 改回上游的 authority** —— 上游于是认为请求来自本机，
 *      整套 origin / cookie 校验原样通过，一行都不用改它。
 *   2. 配对门：没有配对 cookie 的请求到不了上游。局域网里谁都能扫到端口，
 *      但打不开会话。
 *   3. WebSocket 透传：DSH 的流式对话走 upgrade，漏了这条就是「界面能开、
 *      一发消息就断」。
 *
 * ## 设备台账
 *
 * 每次请求按 `ip + User-Agent` 归并成一台设备，记首见、末次活跃、请求数、
 * 当前活跃的 upgrade 连接数。这是面板里「谁连着」的数据来源 —— 只读统计，
 * 不影响转发行为。
 *
 * ⚠️ 配对 cookie 是**整站**一个（不是逐设备派发），所以「断开某台设备」只能
 * 断它当前的 socket，浏览器几秒后会自动重连。真正吊销要靠换配对码 ——
 * 面板上的文案必须这么说，否则用户会以为踢出等于拉黑。
 *
 * @module dsh-remote-link/connector
 */

import http from 'node:http'
import os from 'node:os'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** 配对 cookie 名。故意不叫 `dsh_*`，避免与上游自己的 cookie 混淆。 */
export const PAIR_COOKIE = 'dshrl_pair'

/** 配对页路径。连接串里带的就是它。 */
export const PAIR_PATH = '/__dshrl_pair'

/** 事件日志上限（环形）。 */
const MAX_EVENTS = 200

/** 设备表上限：防止扫描器把内存刷爆。超了按「最久未活跃」淘汰。 */
const MAX_DEVICES = 200

/**
 * 4 组十六进制取 8 位：好念、好输，也够 32 位熵（配对 + cookie 双重校验下
 * 暴力猜中的成本远高于收益）。
 */
export function generateCode() {
  return randomBytes(6).toString('hex').slice(0, 8)
}

/** 定长比较，避免按字节短路泄露配对码前缀。 */
function sameCode(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

/**
 * 本机可用的局域网地址。
 *
 * 私有网段排前面、公网与虚拟网卡排后面；`100.64/10`（Tailscale）单独排在
 * 私有网段之后但在公网之前 —— 用户很可能就是用 Tailscale 做异地接入的。
 */
export function listLanAddresses() {
  const out = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family !== 'IPv4' || info.internal) continue
      out.push({ iface: name, address: info.address })
    }
  }
  const score = (ip) => {
    if (ip.startsWith('192.168.')) return 0
    if (ip.startsWith('10.')) return 1
    if (ip.startsWith('172.')) return 2
    if (ip.startsWith('100.')) return 3
    return 4
  }
  return out.sort((a, b) => score(a.address) - score(b.address))
}

/** 一次性探测上游是否可达。只看「有没有 HTTP 响应」，401 也算活着。 */
export function probeUpstream(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.request(
      { host, port, path: '/', method: 'GET', headers: { host: `${host}:${port}` } },
      (res) => {
        res.resume()
        resolve(true)
      },
    )
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
    req.end()
  })
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

/** 配对失败 / 上游不可达时给手机看的页面。刻意与 DSH 的深色主题一致。 */
function renderErrorPage(title, detail) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#151517;
         color:#f9fafb; font:15px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }
  .box { max-width: 340px; padding: 28px 24px; }
  h1 { font-size:17px; margin:0 0 10px; }
  p { margin:0; color:#9aa1a9; font-size:13.5px; }
</style>
<div class="box"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p></div>
</html>`
}

/**
 * 建一个接入服务实例（不 listen）。
 *
 * @param {object} options
 * @param {number} options.port        对外监听端口
 * @param {string} [options.bindHost]  监听地址，默认 `0.0.0.0`
 * @param {string} options.targetHost  上游主机（几乎总是 127.0.0.1）
 * @param {number} options.targetPort  上游端口（DSH webServer 的真实端口）
 * @param {string} [options.code]      固定配对码，缺省随机
 * @param {string} [options.token]     上游 `?token=`，浏览器没有 DSH cookie 时补一次
 * @param {(event: object) => void} [options.onEvent] 事件回调（喂给面板的日志）
 */
export function createConnector(options) {
  const port = Number(options.port)
  const bindHost = String(options.bindHost ?? '0.0.0.0')
  const targetHost = String(options.targetHost)
  const targetPort = Number(options.targetPort)
  const targetAuthority = `${targetHost}:${targetPort}`
  let token = String(options.token ?? '')
  const onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {}

  let code = String(options.code ?? generateCode())

  /** 当前所有 TCP socket（close 时一次性销毁，否则 close() 会永远等 keep-alive）。 */
  const sockets = new Set()
  /** 设备台账：key → 记录。 */
  const devices = new Map()

  const log = (level, text) => onEvent({ level, text, at: Date.now() })

  /** 设备 key：ip + UA 的短哈希（UA 可能很长，不能直接当 key）。 */
  function deviceKeyOf(req) {
    const ip = req.socket?.remoteAddress || 'unknown'
    const ua = String(req.headers['user-agent'] || '')
    return createHash('sha1').update(`${ip}\u0000${ua}`).digest('hex').slice(0, 12)
  }

  /** 取（或建）一台设备记录，并刷新活跃时间。 */
  function touchDevice(req, liveDelta = 0) {
    const key = deviceKeyOf(req)
    let rec = devices.get(key)
    const now = Date.now()
    if (!rec) {
      if (devices.size >= MAX_DEVICES) evictIdleDevice()
      rec = {
        key,
        ip: String(req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, ''),
        ua: String(req.headers['user-agent'] || ''),
        firstSeen: now,
        lastSeen: now,
        requests: 0,
        live: 0,
      }
      devices.set(key, rec)
      log('info', `新设备接入：${rec.ip}`)
    }
    rec.lastSeen = now
    rec.requests += 1
    if (liveDelta) rec.live = Math.max(0, rec.live + liveDelta)
    return rec
  }

  function evictIdleDevice() {
    let oldestKey = null
    let oldest = Infinity
    for (const [key, rec] of devices) {
      if (rec.live > 0) continue
      if (rec.lastSeen < oldest) {
        oldest = rec.lastSeen
        oldestKey = key
      }
    }
    if (oldestKey) devices.delete(oldestKey)
  }

  function hasPairCookie(req) {
    const raw = req.headers.cookie || ''
    for (const part of raw.split(';')) {
      const [name, ...rest] = part.trim().split('=')
      if (name !== PAIR_COOKIE) continue
      if (sameCode(decodeURIComponent(rest.join('=')), code)) return true
    }
    return false
  }

  // ── 上游会话：连接器自己持有，浏览器永远看不到 token ─────────────────────
  //
  // 上游（DSH webServer）对每个请求都要求一个**签名 cookie**，而 cookie 只能用
  // 进程 launch token 换：`GET /?token=<t>` → 303 + Set-Cookie，且 cookie 里
  // 编码了 authority（签发时的 Host）。也就是说：
  //
  //   · 手机浏览器直接拿到的 401 文案是 "dsh web authentication required"；
  //   · 光把 token 塞进 URL 重定向也不行 —— 上游签出的 cookie 绑定的是
  //     `127.0.0.1:<port>`（我们改写后的 Host），手机那边根本用不上。
  //
  // 正解是「cookie 不下发、只留在连接器里」：进来时发一次内网请求换 cookie，
  // 之后每条转发的请求都由我们注入 Cookie 头。浏览器的地址栏、前端 JS、
  // 包括手机上的任何页面脚本，都接触不到 token。
  let sessionCookie = ''
  let sessionAt = 0
  /** 并发去重：首屏可能同时打十几个请求，不要每个都去换一次。 */
  let minting = null
  /** 上次换取失败的时刻。上游本来就不要鉴权、或 token 不对时，别每个请求都去撞。 */
  let mintFailedAt = 0

  function invalidateSession(reason) {
    if (sessionCookie) log('warn', `上游会话失效，重新换取（${reason}）`)
    sessionCookie = ''
    sessionAt = 0
  }

  /** 换失败后的冷却：既要避免每个请求都去打一次上游，也要让 token 修正后能自愈。 */
  const MINT_BACKOFF_MS = 5000

  function mintSession() {
    if (!token) return Promise.resolve('')
    if (minting) return minting
    minting = new Promise((resolve) => {
      const done = (value) => {
        minting = null
        resolve(value)
      }
      const req = http.request(
        {
          host: targetHost,
          port: targetPort,
          method: 'GET',
          path: `/?token=${encodeURIComponent(token)}`,
          headers: { host: targetAuthority, accept: 'text/html', 'user-agent': 'kxxy-remote-link' },
        },
        (res) => {
          const raw = res.headers['set-cookie']
          res.resume()
          res.on('end', () => {
            const pairs = (Array.isArray(raw) ? raw : raw ? [raw] : [])
              .map((line) => String(line).split(';')[0].trim())
              .filter((pair) => pair && !pair.startsWith(`${PAIR_COOKIE}=`))
            if (!pairs.length) {
              // 200/303 但没给 cookie = token 不对（或上游换了换 cookie 的路由）
              mintFailedAt = Date.now()
              log('warn', `上游没下发会话 cookie（HTTP ${res.statusCode}），token 可能已失效`)
              done('')
              return
            }
            sessionCookie = pairs.join('; ')
            sessionAt = Date.now()
            mintFailedAt = 0
            log('info', '已用本机 launch token 换取上游会话')
            done(sessionCookie)
          })
        },
      )
      req.on('error', (err) => {
        mintFailedAt = Date.now()
        log('warn', `换取上游会话失败：${err.code || err.message}`)
        done('')
      })
      req.setTimeout(3000, () => {
        req.destroy()
        done('')
      })
      req.end()
    })
    return minting
  }

  function stripCodeParam(params) {
    const rest = new URLSearchParams(params)
    rest.delete('code')
    const qs = rest.toString()
    return qs ? `?${qs}` : ''
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    // ── 1. 配对页：校验码 → 下发 cookie → 302 回首页 ──────────────────
    if (url.pathname === PAIR_PATH) {
      const offered = url.searchParams.get('code') || ''
      if (!sameCode(offered, code)) {
        log('warn', `配对码错误：来自 ${req.socket.remoteAddress}`)
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' })
        res.end(renderErrorPage('配对码不对', '请回到电脑上确认面板里的连接串。'))
        return
      }
      res.writeHead(302, {
        // HttpOnly：页面脚本读不到；SameSite=Lax：隧道域名跨站直连也能带上；
        // 一年有效。真正的吊销手段是换配对码。
        'set-cookie': `${PAIR_COOKIE}=${encodeURIComponent(code)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
        location: '/',
      })
      res.end()
      return
    }

    // ── 2. 认证门 ────────────────────────────────────────────────────
    if (!hasPairCookie(req)) {
      if (url.searchParams.get('code') === code) {
        // 连接串直接带 code 时不经配对页 —— 手机端粘贴的就是这种。
        touchDevice(req)
        res.writeHead(302, {
          'set-cookie': `${PAIR_COOKIE}=${encodeURIComponent(code)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
          location: url.pathname + stripCodeParam(url.searchParams),
        })
        res.end()
        return
      }
      res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' })
      res.end(renderErrorPage('需要配对码', '请在 DSH 的「远程接入」面板里重新复制连接串。'))
      return
    }

    touchDevice(req)

    // ── 3. 转发 ──────────────────────────────────────────────────────
    // 上游会话由 forward() 注入（见上面的 sessionCookie 说明），这里不再做
    // 「重定向到 ?token=」—— 那条路在手机上行不通（cookie 绑 authority），
    // 还会把 token 暴露在地址栏与 Referer 里。
    forward(req, res)
  })

  /**
   * 把「跟源站绑定」的请求头改写成本机视角。
   *
   * ⚠️ 只改 `Host` 是不够的：浏览器的 `Origin` 是 `http://192.168.x.x:8765`
   * （手机看到的地址），而改过 Host 之后上游认为自己在 `127.0.0.1:<port>`。
   * 上游只要有一处做「Origin 必须与 Host 同源」的比对，手机就会被挡在门外，
   * 而本机浏览器永远是同源的 —— 这个坑只在真机上炸，桌面自测炸不出来。
   *
   * `Referer` 同理：它是完整 URL，只替换 origin 部分，路径与查询保留。
   */
  function rewriteOriginHeaders(headers) {
    const upstreamOrigin = `http://${targetAuthority}`
    if (headers.origin) headers.origin = upstreamOrigin
    if (headers.referer) {
      try {
        const ref = new URL(headers.referer)
        headers.referer = upstreamOrigin + ref.pathname + ref.search
      } catch {
        delete headers.referer
      }
    }
    return headers
  }

  /**
   * 组装转发给上游的请求头。
   *
   * 三件事：① 把 Host/Origin/Referer 改回上游视角；② 丢掉本服务自己的配对
   * cookie（上游不认识它）；③ 注入连接器换来的上游会话 cookie。
   */
  function forwardedHeaders(req) {
    const headers = rewriteOriginHeaders({ ...req.headers, host: targetAuthority })
    // 让上游看到真实来源，便于它自己的日志；不影响 Host 校验（那只认 Host）。
    headers['x-forwarded-for'] = req.socket.remoteAddress || ''
    headers['x-forwarded-proto'] = 'http'

    const cookies = String(req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith(`${PAIR_COOKIE}=`))
    if (sessionCookie) cookies.push(sessionCookie)
    if (cookies.length) headers.cookie = cookies.join('; ')
    else delete headers.cookie
    return headers
  }

  /**
   * 转发一条请求。
   *
   * `attempt` 用来做**一次** 401 重试：DSH 的 cookie 有效期短，可能正好在
   * 会话中途过期（表现为面板用着用着突然整片 401）。只在无请求体的方法上
   * 重试 —— POST 的 body 已经流走了，重发就得缓存整个请求体，不值当。
   */
  async function forward(req, res, attempt = 0) {
    if (token && !sessionCookie && Date.now() - mintFailedAt > MINT_BACKOFF_MS) await mintSession()
    const headers = forwardedHeaders(req)

    const upstream = http.request(
      { host: targetHost, port: targetPort, method: req.method, path: req.url, headers },
      (upRes) => {
        const retryable = attempt === 0 && token && (req.method === 'GET' || req.method === 'HEAD')
        if (upRes.statusCode === 401 && retryable) {
          upRes.resume()
          invalidateSession('上游回 401')
          forward(req, res, 1)
          return
        }
        // 上游的 Set-Cookie 原样下发：浏览器按**当前 host**（本服务的 host）存，
        // 下次请求自然带回，我们再原样转发。上游没设 Domain，故无需改写。
        res.writeHead(upRes.statusCode || 502, upRes.headers)
        upRes.pipe(res)
      },
    )
    upstream.on('error', (err) => {
      if (res.headersSent) {
        res.end()
        return
      }
      log('error', `上游不可达：${err.code || err.message}`)
      res.writeHead(502, { 'content-type': 'text/html; charset=utf-8' })
      res.end(
        renderErrorPage(
          '连不上本机的 DSH',
          `已尝试 ${targetAuthority}，报错：${err.code || err.message}。请确认 DSH 桌面端仍在运行。`,
        ),
      )
    })
    req.pipe(upstream)
  }

  server.on('upgrade', (req, socket, head) => {
    if (!hasPairCookie(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }

    const rec = touchDevice(req, 1)
    let settled = false
    const releaseLive = () => {
      if (settled) return
      settled = true
      rec.live = Math.max(0, rec.live - 1)
    }
    socket.on('close', releaseLive)

    // WebSocket 握手同样要上游会话（DSH 的实时通道也走这套 cookie）。
    // `minted` 防止 token 无效时无限重试：换一次拿不到就照原样发，让上游的
    // 401 回到手机上，而不是把连接卡在这里。
    const open = (attempt = 0, minted = false) => {
      if (token && !sessionCookie && !minted && Date.now() - mintFailedAt > MINT_BACKOFF_MS) {
        mintSession().then(() => open(attempt, true))
        return
      }

      const upstream = http.request({
        host: targetHost,
        port: targetPort,
        method: req.method,
        path: req.url,
        headers: forwardedHeaders(req),
      })

      upstream.on('upgrade', (upRes, upSocket, upHead) => {
        const lines = [`HTTP/1.1 101 ${upRes.statusMessage || 'Switching Protocols'}`]
        for (let i = 0; i < upRes.rawHeaders.length; i += 2) {
          lines.push(`${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}`)
        }
        socket.write(lines.join('\r\n') + '\r\n\r\n')
        if (upHead?.length) socket.write(upHead)
        if (head?.length) upSocket.write(head)

        upSocket.on('error', () => socket.destroy())
        socket.on('error', () => upSocket.destroy())
        upSocket.on('close', releaseLive)
        upSocket.pipe(socket)
        socket.pipe(upSocket)
      })

      upstream.on('response', (upRes) => {
        if (upRes.statusCode === 401 && token && attempt === 0) {
          upRes.resume()
          invalidateSession('升级握手回 401')
          open(1)
          return
        }
        // 上游拒绝升级（例如 401）：把它的响应原样交回去，别让手机一直等。
        const lines = [`HTTP/1.1 ${upRes.statusCode} ${upRes.statusMessage}`]
        for (let i = 0; i < upRes.rawHeaders.length; i += 2) {
          lines.push(`${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}`)
        }
        socket.write(lines.join('\r\n') + '\r\n\r\n')
        releaseLive()
        socket.destroy()
      })

      upstream.on('error', () => {
        releaseLive()
        socket.destroy()
      })
      upstream.end()
    }

    open(0)
  })

  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  return {
    get code() {
      return code
    },
    get port() {
      return port
    },
    targetAuthority,
    targetHost,
    targetPort,
    get running() {
      return server.listening
    },
    listen() {
      return new Promise((resolve, reject) => {
        const onError = (err) => reject(err)
        server.once('error', onError)
        server.listen(port, bindHost, () => {
          server.removeListener('error', onError)
          log('info', `接入服务已启动：0.0.0.0:${port} → ${targetAuthority}`)
          resolve(server.address())
        })
      })
    },
    close() {
      return new Promise((resolve) => {
        for (const s of sockets) s.destroy()
        sockets.clear()
        devices.clear()
        if (!server.listening) {
          resolve()
          return
        }
        server.close(() => resolve())
      })
    },
    /** 换配对码：所有已配对设备的 cookie 立刻失效。 */
    /** 运行中补/换 token：拿到之后下一次转发会自己换会话，不必重建服务。 */
    setToken(next) {
      const value = String(next ?? '')
      if (value === token) return
      token = value
      invalidateSession('token 变更')
    },
    resetCode(next) {
      code = String(next ?? generateCode())
      for (const s of sockets) s.destroy()
      devices.clear()
      log('warn', '配对码已更换：所有设备需要重新配对')
      return code
    },
    /**
     * 断开某台设备当前的连接。
     *
     * ⚠️ 只断 socket，**不拉黑**：浏览器会在几秒内自动重连。要彻底断开只能换
     * 配对码 —— 配对 cookie 是整站一个，没有逐设备吊销的能力。面板文案照此写。
     */
    kick(key) {
      const rec = devices.get(key)
      if (!rec) return false
      // socket 上没有反向索引，这里按「远端地址匹配」批量断 —— 同一 NAT 后的
      // 多台设备会一起断，这是已知且可接受的代价（面板会写明）。
      let closed = 0
      for (const s of sockets) {
        const addr = String(s.remoteAddress || '').replace(/^::ffff:/, '')
        if (addr === rec.ip) {
          s.destroy()
          closed += 1
        }
      }
      log('warn', `断开设备 ${rec.ip}（${closed} 条连接）`)
      rec.live = 0
      return closed > 0
    },
    /** 面板用的快照。 */
    snapshot() {
      const now = Date.now()
      const list = [...devices.values()]
        .filter((d) => now - d.lastSeen < 12 * 60 * 60 * 1000)
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .map((d) => ({
          key: d.key,
          ip: d.ip,
          ua: d.ua,
          firstSeen: d.firstSeen,
          lastSeen: d.lastSeen,
          requests: d.requests,
          live: d.live,
        }))
      return {
        running: server.listening,
        port,
        code,
        targetAuthority,
        hasToken: Boolean(token),
        /** 上游会话是否已建立（cookie 只在连接器内存里，浏览器看不到）。 */
        hasSession: Boolean(sessionCookie),
        sessionAt: sessionAt || 0,
        devices: list,
      }
    },
  }
}
