#!/usr/bin/env node
/**
 * 自测：不装进 DSH 也能验证这套插件是完整的。
 *
 * 覆盖两件最容易「装了没反应」的事：
 *
 * 1. **client bundle 能不能注册上**：宿主只认 `window.__ModuleLoader__.load`
 *    那一处注册，id 与包名不一致时页面永远等不到 bundle 且不报错。这里把宿主
 *    的加载器与槽位服务打桩，真跑一遍 `apply`，逐条断言注册的 name/id/key。
 * 2. **host 的反代与配对门真的管用**：起一个假上游 + 真接入服务，用真 HTTP
 *    请求走一遍「没码 401 / 带码 302 换 cookie / 有 cookie 放行」。
 *
 * 用法：`node scripts/selftest.mjs`
 */

import http from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import net from 'node:net'
import vm from 'node:vm'
import { createConnector } from '../lib/connector.js'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

let pass = 0
let fail = 0
const lines = []

function ok(name, cond, detail) {
  if (cond) {
    pass += 1
    lines.push(`  ✓ ${name}`)
  } else {
    fail += 1
    lines.push(`  ✗ ${name}${detail ? ` —— ${detail}` : ''}`)
  }
}

function eq(name, actual, expected) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), `实际 ${JSON.stringify(actual)}，期望 ${JSON.stringify(expected)}`)
}

// ── 隔离 DSH_HOME：绝不碰用户真实配置 ────────────────────────────────────
const sandboxHome = mkdtempSync(join(tmpdir(), 'dshrl-selftest-'))
process.env.DSH_HOME = sandboxHome

// ══════════════════════════════════════════════════════════════════════════
// 1. client bundle
// ══════════════════════════════════════════════════════════════════════════
lines.push('[1] client bundle 注册')

const bundle = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')

let loaded = null
const loaderSandbox = {
  window: { __ModuleLoader__: { load: (def) => { loaded = def } } },
  console,
  setTimeout,
  clearTimeout,
  navigator: { clipboard: null },
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, dataset: {}, appendChild() {}, remove() {}, setAttribute() {}, select() {} }),
    head: { appendChild() {} },
    body: { appendChild() {}, removeChild() {} },
    visibilityState: 'visible',
    execCommand: () => true,
  },
}
vm.createContext(loaderSandbox)
vm.runInContext(bundle, loaderSandbox)

ok('产物调用了 __ModuleLoader__.load', Boolean(loaded))
eq('注册 id 等于包名', loaded?.id, 'dsh-remote-link')
ok('factory 是函数', typeof loaded?.factory === 'function')

// React 只需要占位：apply 阶段不渲染任何组件（渲染才用 hooks）。
const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useRef: (v) => ({ current: v }),
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
}

const clientMod = loaded.factory((name) => {
  if (name === 'react') return fakeReact
  throw new Error(`client bundle 请求了未声明的模块：${name}`)
})

eq('client 导出 name', clientMod.name, 'dsh-remote-link-client')
eq('client inject 声明', clientMod.inject, ['slots', 'connection'])
ok('client 导出 apply', typeof clientMod.apply === 'function')

// 打桩的槽位服务：记录每一次注册。
const registrations = []
const injectedSlots = []
const clientEffects = []
const rpcCalls = []

const clientCtx = {
  effect(fn) {
    const dispose = fn()
    clientEffects.push(dispose)
    return () => {}
  },
  inject() {},
  slots: {
    inject(slotName, cb) {
      injectedSlots.push(slotName)
      cb()
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
  connection: {
    rpc: {
      async call(mount, endpoint, payload) {
        rpcCalls.push({ mount, endpoint, payload })
        return { ok: true, value: { running: false, probe: true } }
      },
    },
  },
}

clientMod.apply(clientCtx)

eq('注入了两个槽位', injectedSlots.sort(), ['main', 'sidebar.panellist'])

const sidebar = registrations.find((r) => r.options.name === 'sidebar.panellist')
const main = registrations.find((r) => r.options.name === 'main')

ok('注册了 sidebar.panellist', Boolean(sidebar))
ok('注册了 main', Boolean(main))
eq('侧栏行 id', sidebar?.options.id, 'remote-link')
eq('主面板 key 与侧栏 id 一致', main?.options.key, sidebar?.options.id)
eq('侧栏标签', sidebar?.options.label?.(), '远程接入')
ok('侧栏 order 是数字', Number.isFinite(sidebar?.options.order))
ok('侧栏渲染体是函数组件', typeof sidebar?.component === 'function')
ok('主面板渲染体是函数组件', typeof main?.component === 'function')

const injected = main?.options.inject?.()
ok('主面板 inject 交出 rpcCall', typeof injected?.rpcCall === 'function')

const statusValue = await injected.rpcCall('status')
eq('rpcCall 打到 /api + remote-link', rpcCalls[0] && [rpcCalls[0].mount, rpcCalls[0].endpoint], ['/api', 'remote-link'])
eq('rpcCall 的信封形状', rpcCalls[0]?.payload, { method: 'status', payload: undefined })
ok('rpcCall 解包 ok:true 的 value', statusValue?.probe === true)

ok('样式注入效果返回卸载函数', typeof clientEffects[0] === 'function')

// ══════════════════════════════════════════════════════════════════════════
// 2. host 侧：RPC + 反代 + 配对门
// ══════════════════════════════════════════════════════════════════════════
lines.push('')
lines.push('[2] host 侧 RPC 与反代')

const hostMod = await import(new URL('../lib/index.js', import.meta.url).href)

eq('host 导出 name', hostMod.name, 'dsh-remote-link')
eq('host inject 声明', hostMod.inject, ['webServer', 'connection'])

// 假上游：模拟 DSH webServer。
const upstream = http.createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'text/plain; charset=utf-8',
    'x-upstream-host': String(req.headers.host),
    'x-upstream-origin': String(req.headers.origin || ''),
    'x-upstream-referer': String(req.headers.referer || ''),
  })
  res.end(`UPSTREAM OK ${req.url}`)
})
await new Promise((r) => upstream.listen(0, '127.0.0.1', r))
const upstreamPort = upstream.address().port

let registered = null
const hostEffects = []
const hostCtx = {
  logger: { info() {}, warn() {}, error() {}, debug() {} },
  webServer: { listenedPort: upstreamPort },
  connection: {
    fetch: {
      register(options) {
        registered = options
        return () => { registered = null }
      },
    },
    // 真宿主里 ConnectionService 公开的就是这个方法：把本进程 launch token
    // 拼进 URL 返回。插件靠它自动鉴权，用户不需要手抄 token。
    authenticatedUrl(baseUrl) {
      return `${baseUrl}?token=selftest-launch-token`
    },
  },
  effect(fn) {
    const dispose = fn()
    if (typeof dispose === 'function') hostEffects.push(dispose)
    return () => {}
  },
}

hostMod.apply(hostCtx)

eq('注册路径与动作名一致', registered?.path, '/api/remote-link')
eq('只接受 POST', registered?.methods, ['POST'])

/** 走一次真实的 RPC 信封。 */
async function rpc(method, payload) {
  const req = new Request('http://127.0.0.1/api/remote-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `t-${Math.random().toString(16).slice(2)}`,
      method: 'remote-link',
      payload: { method, payload },
    }),
  })
  const res = await registered.fetch(req)
  const json = await res.json()
  return json.result
}

const s0 = await rpc('status')
ok('status 返回 ok', s0?.ok === true, JSON.stringify(s0))
ok('初始未运行', s0?.value?.running === false)
ok('status 带局域网地址数组', Array.isArray(s0?.value?.lan))
ok('上游探测为可达', s0?.value?.upstream?.ok === true)

// 换一个不常用端口，避免与开发机上其他服务撞车。
const TEST_PORT = 18765
const sPort = await rpc('setPort', { port: TEST_PORT })
ok('setPort 成功', sPort?.ok === true, JSON.stringify(sPort))
eq('端口已更新', sPort?.value?.port, TEST_PORT)

const sStart = await rpc('start')
ok('start 成功', sStart?.ok === true, JSON.stringify(sStart))
ok('启动后 running=true', sStart?.value?.running === true)
eq('生成了 8 位配对码', sStart?.value?.code?.length, 8)
ok('给出连接串', String(sStart?.value?.link || '').includes('__dshrl_pair?code='), sStart?.value?.link)

eq('自动拿到了 launch token', sStart?.value?.hasToken, true)
eq('token 来源标记为 launch', sStart?.value?.tokenSource, 'launch')
ok('快照里不暴露 token 值', !JSON.stringify(sStart.value).includes('selftest-launch-token'))

const code = sStart.value.code

/** 对连接器发一次真请求（不自动跟随重定向）。 */
function hit(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: TEST_PORT, path, method: 'GET', headers },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (d) => { body += d })
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

const noCookie = await hit('/')
eq('没配对码 → 401', noCookie.status, 401)
ok('401 页面是能读的中文提示', noCookie.body.includes('需要配对码'))

const withCode = await hit(`/?code=${code}`)
eq('带配对码 → 302', withCode.status, 302)
const setCookie = String(withCode.headers['set-cookie'] || '')
ok('下发配对 cookie', setCookie.includes('dshrl_pair='), setCookie)

const cookie = setCookie.split(';')[0]
const paired = await hit('/', { cookie })
eq('有 cookie → 200', paired.status, 200)
ok('拿到上游内容', paired.body.includes('UPSTREAM OK'))
eq('转发时 Host 改回上游', paired.headers['x-upstream-host'], `127.0.0.1:${upstreamPort}`)

// Origin 必须一起改写：手机看到的 origin 是 http://<局域网 IP>:<端口>，而改过
// Host 之后上游认为自己在 127.0.0.1:<port>。上游只要有一处「Origin 必须与 Host
// 同源」的比对，只改 Host 就会把真机挡在门外，而本机自测永远同源、炸不出来。
const withOrigin = await hit('/', {
  cookie,
  origin: `http://192.168.2.86:${TEST_PORT}`,
  referer: `http://192.168.2.86:${TEST_PORT}/kxxy?x=1`,
})
eq('转发时 Origin 改写为上游源', withOrigin.headers['x-upstream-origin'], `http://127.0.0.1:${upstreamPort}`)
eq('referer 只替换 origin、保留路径', withOrigin.headers['x-upstream-referer'], `http://127.0.0.1:${upstreamPort}/kxxy?x=1`)

const afterHit = await rpc('status')
ok('设备台账记到了这台设备', afterHit.value.devices.length >= 1, JSON.stringify(afterHit.value.devices))
ok('设备记录带 IP', /^\d+\.\d+\.\d+\.\d+$/.test(afterHit.value.devices[0]?.ip || ''))

const kicked = await rpc('kick', { key: afterHit.value.devices[0].key })
ok('kick 成功', kicked?.ok === true, JSON.stringify(kicked))

const sStop = await rpc('stop')
ok('stop 成功', sStop?.ok === true)
ok('停止后 running=false', sStop?.value?.running === false)

const unknown = await rpc('nope')
ok('未知动作返回错误', unknown?.ok === false)

// ══════════════════════════════════════════════════════════════════════════
// 3. 上游鉴权：连接器自己用 launch token 换会话 cookie
// ══════════════════════════════════════════════════════════════════════════
//
// 真机上踩到的现象：手机连上了、配对也过了，页面却是纯文本
//
//     dsh web authentication required; reopen the URL printed by dsh web.
//
// 因为 DSH webServer 对每个请求校验一个**签名 cookie**，而 cookie 只能用
// 进程 launch token 换，且绑定了签发时的 authority。所以连接器必须自己持有
// 会话：进来时换一次 cookie，之后每条转发都注入 —— 手机侧全程看不到 token。
lines.push('[3] 上游鉴权（launch token → 会话 cookie）')

const LAUNCH = 'launch-token-for-selftest'
const AUTH_COOKIE = 'dsh_session'
let mintCount = 0
let validCookie = ''

const authUpstream = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://dsh.invalid')
  const cookie = String(req.headers.cookie || '')
  if (url.pathname === '/' && url.searchParams.get('token') === LAUNCH) {
    mintCount += 1
    validCookie = `${AUTH_COOKIE}=gen-${mintCount}`
    res.writeHead(303, { 'set-cookie': `${validCookie}; Path=/; HttpOnly`, location: './' })
    res.end()
    return
  }
  if (!validCookie || !cookie.includes(validCookie)) {
    res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('dsh web authentication required; reopen the URL printed by dsh web.\n')
    return
  }
  res.writeHead(200, {
    'content-type': 'text/plain; charset=utf-8',
    'x-upstream-host': String(req.headers.host),
    'x-upstream-cookie': cookie,
  })
  res.end('DSH APP OK')
})
await new Promise((r) => authUpstream.listen(0, '127.0.0.1', r))
const authPort = authUpstream.address().port

function hitPort(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (d) => { body += d })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

// ── 3.1 没有 token：症状必须能复现（否则后面的断言等于没测到东西）─────────
const noTokPort = 18766
const noTok = createConnector({ port: noTokPort, targetHost: '127.0.0.1', targetPort: authPort, code: 'aaaa1111' })
await noTok.listen()
const pairNoTok = await hitPort(noTokPort, '/?code=aaaa1111')
const noTokCookie = String(pairNoTok.headers['set-cookie'] || '').split(';')[0]
const noTokHit = await hitPort(noTokPort, '/', { cookie: noTokCookie })
eq('无 token → 上游 401 原样回来', noTokHit.status, 401)
ok('401 正文就是手机看到的那句', noTokHit.body.includes('dsh web authentication required'), noTokHit.body.slice(0, 80))
await noTok.close()

// ── 3.2 有 token：连接器换 cookie 后放行 ─────────────────────────────────
const TOKEN_PORT = 18767
const conn = createConnector({ port: TOKEN_PORT, targetHost: '127.0.0.1', targetPort: authPort, code: 'bbbb2222', token: LAUNCH })
await conn.listen()

const pair = await hitPort(TOKEN_PORT, '/?code=bbbb2222')
const pairCookie = String(pair.headers['set-cookie'] || '').split(';')[0]
ok('配对 cookie 已下发', pairCookie.startsWith('dshrl_pair='), pairCookie)

const authed = await hitPort(TOKEN_PORT, '/', { cookie: pairCookie })
eq('有 token → 200', authed.status, 200)
ok('拿到上游正文', authed.body.includes('DSH APP OK'), authed.body.slice(0, 60))
eq('换了一次会话', mintCount, 1)
eq('Host 依旧是上游 authority', authed.headers['x-upstream-host'], `127.0.0.1:${authPort}`)
ok('注入的上游 cookie 到上游了', String(authed.headers['x-upstream-cookie']).includes('dsh_session='), String(authed.headers['x-upstream-cookie']))

// 会话 cookie 只活在连接器内存里：不能以任何形式落到手机侧。
ok('响应里没有上游 Set-Cookie', !authed.headers['set-cookie'], JSON.stringify(authed.headers['set-cookie']))
ok('配对 cookie 没泄露给上游', !String(authed.headers['x-upstream-cookie']).includes('dshrl_pair='), String(authed.headers['x-upstream-cookie']))
ok('手机侧看不到 token', !authed.body.includes(LAUNCH))

const snap = conn.snapshot()
ok('快照报 hasToken', snap.hasToken === true)
ok('快照报 hasSession', snap.hasSession === true)

// ── 3.3 会话中途失效：自动重换一次，用户无感 ─────────────────────────────
validCookie = 'dsh_session=rotated-by-server'
const afterExpire = await hitPort(TOKEN_PORT, '/', { cookie: pairCookie })
eq('会话失效后仍然 200', afterExpire.status, 200)
eq('重换了一次会话', mintCount, 2)

// ── 3.4 WebSocket 握手同样要注入会话 ─────────────────────────────────────
function upgradeProbe(port, cookie) {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(
        [
          'GET /ws HTTP/1.1',
          `Host: 127.0.0.1:${port}`,
          `Cookie: ${cookie}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          'Sec-WebSocket-Version: 13',
          'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
          '',
          '',
        ].join('\r\n'),
      )
    })
    let buf = ''
    sock.setEncoding('utf8')
    sock.on('data', (d) => {
      buf += d
      if (buf.includes('\r\n')) {
        sock.destroy()
        resolve(buf.split('\r\n')[0])
      }
    })
    sock.on('error', () => resolve('ERROR'))
    sock.on('close', () => resolve(buf.split('\r\n')[0] || 'CLOSED'))
    setTimeout(() => { sock.destroy(); resolve(buf.split('\r\n')[0] || 'TIMEOUT') }, 1500)
  })
}

// 假上游不实现真升级，但握手仍走「会话校验」这一关：带 cookie 时放行（这里
// 回 200 表示认证通过但拒绝升级），不带时 401。断言点就是这个区别。
const wsAuthed = await upgradeProbe(TOKEN_PORT, pairCookie)
ok('握手带了会话（不是 401）', !String(wsAuthed).includes('401'), String(wsAuthed))

await conn.close()


authUpstream.close()

// 清理
for (const dispose of hostEffects) {
  try { dispose() } catch { /* 已经关了 */ }
}
await new Promise((r) => upstream.close(r))
rmSync(sandboxHome, { recursive: true, force: true })

// ── 汇总 ──────────────────────────────────────────────────────────────────
const summary = `\n${lines.join('\n')}\n\n结论：${pass} 通过 / ${fail} 失败\n`
process.stdout.write(summary)
process.exit(fail === 0 ? 0 : 1)
