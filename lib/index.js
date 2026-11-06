/**
 * dsh-remote-link —— DSH 桌面端的「手机远程接入」面板（host 半边）。
 *
 * ## 它做什么
 *
 * 把原先要开命令行窗口跑的「远程连接器」，变成 DSH 界面里的一块面板：
 * 一键开关接入服务、看配对码与连接串、看哪台手机连着、换码踢人。
 *
 * ## 为什么是反代而不是让 DSH 监听 0.0.0.0
 *
 * DSH 的 webServer 明确拒绝通配地址（`Config.host` 的 transform 里就写着
 * 「binding every interface would expose remote code execution to the network」），
 * 这是有意的安全边界，不该绕过。接入服务因此在本机回环之外再开一个口子，
 * 但对上游永远以回环身份出现 —— 边界留在我们这一层，且带配对门。
 *
 * ## 与 client 半边的分工
 *
 * host 侧只提供数据与动作（`/api/remote-link` 一个 POST 端点），不做任何
 * HTML。界面在 `lib/client.js`（`dsh.client` 声明的 client bundle），通过
 * `connection.rpc.call('/api', 'remote-link', { method, payload })` 调这里。
 *
 * @module dsh-remote-link
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import os from 'node:os'

import { createConnector, generateCode, listLanAddresses, PAIR_PATH, probeUpstream } from './connector.js'

/** 插件名（= package.json 的 name，宿主按它建 client entry id）。 */
export const name = 'dsh-remote-link'

/**
 * 依赖的官方服务。
 *
 * · `webServer` —— 要拿它真实监听的端口，接入服务才能指向上游；
 * · `connection` —— 提供 `fetch.register`，这是 client 与 host 之间唯一的通道。
 *
 * 两者都是官方公开服务，缺任何一个属于部署错误，不该静默降级。
 */
export const inject = ['webServer', 'connection']

/** RPC 端点路径。client 侧对应 `rpc.call('/api', 'remote-link', …)`。 */
const API_PATH = '/api/remote-link'

/** 端点名（RPC 信封里的 `method` 字段，与上面的路径末段一致）。 */
const ENDPOINT = 'remote-link'

/** 默认对外端口。避开 8080（常见占用）与 DSH 自己的端口。 */
const DEFAULT_PORT = 8765

/** 上游探测结果的缓存时长：面板每次轮询都去探一遍会把桌面端打满。 */
const PROBE_TTL_MS = 30_000

/**
 * 取本进程的 launch token。
 *
 * DSH 的 webServer 对**每个请求**都校验一个签名 cookie，而 cookie 只能用
 * 进程 launch token 换：`GET /?token=<t>` → 303 + `Set-Cookie`。没有 token
 * 的转发一律拿到 401，正文就是手机截图里那句
 * `dsh web authentication required; reopen the URL printed by dsh web.`
 *
 * 这个 token 每次启动都换一个、只打印在 DSH 自己的窗口里，让用户手抄不现实。
 * `ConnectionService` 恰好公开了 `authenticatedUrl(baseUrl)` —— 它把 token
 * 拼进 URL 返回，是唯一能自动拿到它的正规入口。
 *
 * 拿不到时返回空串：当作「没配 token」，让连接器照常转发、由上游返回 401，
 * 而不是让整个插件起不来（比如换了 DSH 大版本、方法被改名）。
 */
function launchToken(ctx, port) {
  try {
    const url = ctx.connection?.authenticatedUrl?.(`http://127.0.0.1:${port}/`)
    if (!url) return ''
    return new URL(url).searchParams.get('token') || ''
  } catch (e) {
    pushEvent('warn', `取本机 launch token 失败：${String(e?.message ?? e)}`)
    return ''
  }
}

/**
 * 进程内单例状态。
 *
 * ⚠️ 放在模块级而不是 `apply()` 里：HMR 重载会再跑一次 `apply`，若每次新建
 * 一份状态，旧的服务仍在监听端口、新的再 listen 就 EADDRINUSE。这里让
 * `apply` 复用同一份，并在重入时先关掉旧服务。
 */
const STATE = {
  /** @type {ReturnType<typeof createConnector> | null} */
  connector: null,
  /** 对外端口。 */
  port: DEFAULT_PORT,
  /** 插件启动时是否自动开启接入服务。默认关 —— 装插件不该悄悄开端口。 */
  autoStart: false,
  /** 用户在面板里手工填的 token（覆盖自动取到的 launch token）。 */
  token: '',
  /** 自动取到的本进程 launch token（每次启动都不同，不落盘）。 */
  autoToken: '',
  /** 最近事件（环形，新的在前）。 */
  events: [],
  /** 最近一次错误，给面板显示。 */
  lastError: null,
  /** 上游探测结果与时间戳。 */
  upstreamOk: null,
  upstreamCheckedAt: 0,
}

/** 事件日志上限。 */
const MAX_EVENTS = 60

function pushEvent(level, text) {
  STATE.events.unshift({ level, text, at: Date.now() })
  if (STATE.events.length > MAX_EVENTS) STATE.events.length = MAX_EVENTS
  if (level === 'error') STATE.lastError = text
}

/** DSH 主目录（桌面端就是 `~/.dsh`）。 */
function dshHome() {
  return process.env.DSH_HOME || join(os.homedir(), '.dsh')
}

function configPath() {
  return join(dshHome(), 'remote-link.json')
}

/** 读偏好。任何异常都退回默认值 —— 配置文件坏了不该让插件起不来。 */
function loadConfig() {
  try {
    const file = configPath()
    if (!existsSync(file)) return
    const json = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
    if (Number.isInteger(json?.port) && json.port > 0 && json.port < 65536) STATE.port = json.port
    if (typeof json?.autoStart === 'boolean') STATE.autoStart = json.autoStart
    if (typeof json?.token === 'string') STATE.token = json.token
  } catch (e) {
    pushEvent('warn', `读取配置失败，已按默认值运行：${String(e?.message ?? e)}`)
  }
}

/** 写偏好（临时文件 + rename，避免写一半掉电留下半截 JSON）。 */
function saveConfig() {
  const file = configPath()
  const tmp = `${file}.tmp-${process.pid}`
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(
      tmp,
      JSON.stringify({ port: STATE.port, autoStart: STATE.autoStart, token: STATE.token }, null, 2),
      'utf8',
    )
    renameSync(tmp, file)
  } catch (e) {
    try {
      unlinkSync(tmp)
    } catch {
      /* 临时文件可能根本没建出来 */
    }
    pushEvent('warn', `保存配置失败：${String(e?.message ?? e)}`)
  }
}

/**
 * 上游（DSH webServer）的端口。
 *
 * ⚠️ 必须**每次现取**：插件可能在 webServer listen 之前 apply，那时
 * `listenedPort` 还是 undefined。用户点「启动」时早就 listen 完了。
 */
function upstreamPort(ctx) {
  const ws = ctx.webServer
  const port = Number(ws?.listenedPort ?? ws?.config?.port ?? 0)
  if (!port) throw new Error('拿不到 DSH webServer 的监听端口，接入服务无法指向上游')
  return port
}

/** 当前可用的连接串（没有局域网地址时给出回环地址，便于本机自测）。 */
function currentLink() {
  const lan = listLanAddresses()
  const host = lan[0]?.address || '127.0.0.1'
  const code = STATE.connector?.code ?? ''
  return `http://${host}:${STATE.port}${PAIR_PATH}?code=${code}`
}

function ensureConnector(ctx) {
  if (STATE.connector) {
    // 服务已在跑但当初没拿到 token（插件早于 webServer listen、或 DSH 刚重载）：
    // 这里补一次，不必让用户重启接入服务。
    refreshToken(ctx, STATE.connector)
    return STATE.connector
  }
  const port = upstreamPort(ctx)
  const token = effectiveToken(ctx, port)
  STATE.connector = createConnector({
    port: STATE.port,
    targetHost: '127.0.0.1',
    targetPort: port,
    code: generateCode(),
    token,
    onEvent: (ev) => pushEvent(ev.level, ev.text),
  })
  if (!token) {
    pushEvent('warn', '没取到本机 launch token：手机连上后会看到 401，需要在面板里手工填一次 token')
  }
  return STATE.connector
}

/** 手工填的 token 优先；否则用本进程的 launch token。 */
function effectiveToken(ctx, port) {
  const manual = String(STATE.token || '').trim()
  if (manual) return manual
  const auto = launchToken(ctx, port)
  if (auto) STATE.autoToken = auto
  return auto
}

/** 给已存在的连接器补/刷新 token（空值不会覆盖已有的）。 */
function refreshToken(ctx, connector) {
  try {
    const port = upstreamPort(ctx)
    const token = effectiveToken(ctx, port)
    if (token) connector.setToken(token)
  } catch {
    /* 拿不到端口说明 webServer 还没起来，下次再说 */
  }
}

/** 面板快照：状态 + 设备 + 事件 + 连接串。 */
async function snapshot(ctx) {
  const connector = STATE.connector
  const base = connector
    ? connector.snapshot()
    : {
        running: false,
        port: STATE.port,
        code: '',
        targetAuthority: `127.0.0.1:${(() => {
          try {
            return upstreamPort(ctx)
          } catch {
            return 0
          }
        })()}`,
        hasToken: Boolean(STATE.token || STATE.autoToken),
        devices: [],
      }

  // 上游探测带缓存：面板 3 秒轮询一次，每次真探会把桌面端打成忙音。
  const now = Date.now()
  if (now - STATE.upstreamCheckedAt > PROBE_TTL_MS) {
    STATE.upstreamCheckedAt = now
    try {
      const port = upstreamPort(ctx)
      STATE.upstreamOk = await probeUpstream('127.0.0.1', port)
    } catch {
      STATE.upstreamOk = false
    }
  }

  return {
    ...base,
    autoStart: STATE.autoStart,
    link: base.code ? currentLink() : '',
    lan: listLanAddresses(),
    upstream: {
      authority: base.targetAuthority,
      ok: STATE.upstreamOk,
      checkedAt: STATE.upstreamCheckedAt,
    },
    tokenSource: STATE.token ? 'manual' : STATE.autoToken ? 'launch' : 'none',
    events: STATE.events.slice(0, MAX_EVENTS),
    lastError: STATE.lastError,
    node: `${process.platform} ${process.arch}`,
    version: '0.2.0',
  }
}

/** 动作分派表。未知动作返回 501，让前端抛错而不是假装成功。 */
async function handleAction(ctx, method, payload) {
  switch (method) {
    case 'status':
      return snapshot(ctx)

    case 'start': {
      const connector = ensureConnector(ctx)
      if (connector.running) return snapshot(ctx)
      try {
        await connector.listen()
      } catch (e) {
        const code = String(e?.code ?? '')
        const msg =
          code === 'EADDRINUSE'
            ? `端口 ${STATE.port} 已被占用，换一个端口再试`
            : `启动失败：${String(e?.message ?? e)}`
        STATE.lastError = msg
        pushEvent('error', msg)
        throw new Error(msg)
      }
      return snapshot(ctx)
    }

    case 'stop': {
      if (STATE.connector) await STATE.connector.close()
      pushEvent('info', '接入服务已停止')
      return snapshot(ctx)
    }

    case 'restart':
      if (STATE.connector) await STATE.connector.close()
      STATE.connector = null
      ensureConnector(ctx)
      try {
        await STATE.connector.listen()
      } catch (e) {
        const msg = `重启失败：${String(e?.message ?? e)}`
        STATE.lastError = msg
        pushEvent('error', msg)
        throw new Error(msg)
      }
      return snapshot(ctx)

    case 'regenerate': {
      const connector = ensureConnector(ctx)
      connector.resetCode(payload?.code)
      return snapshot(ctx)
    }

    case 'setPort': {
      const next = Number(payload?.port)
      if (!Number.isInteger(next) || next < 1024 || next > 65535) {
        throw new Error('端口必须是 1024–65535 之间的整数')
      }
      const wasRunning = Boolean(STATE.connector?.running)
      if (wasRunning) await STATE.connector.close()
      STATE.connector = null
      STATE.port = next
      saveConfig()
      if (wasRunning) {
        const connector = ensureConnector(ctx)
        await connector.listen()
      }
      pushEvent('info', `端口已改为 ${next}`)
      return snapshot(ctx)
    }

    case 'setAutoStart':
      STATE.autoStart = Boolean(payload?.enabled)
      saveConfig()
      return snapshot(ctx)

    case 'setToken': {
      const token = String(payload?.token ?? '').trim()
      const wasRunning = Boolean(STATE.connector?.running)
      STATE.token = token
      saveConfig()
      if (wasRunning) {
        // token 是构造期参数：要生效只能重建。配对码一并换掉（重建就会换）。
        await STATE.connector.close()
        STATE.connector = null
        await ensureConnector(ctx).listen()
      }
      return snapshot(ctx)
    }

    case 'kick': {
      const key = String(payload?.key ?? '')
      if (!key) throw new Error('缺少设备 key')
      const ok = STATE.connector?.kick(key) ?? false
      if (!ok) throw new Error('这台设备已经不在了')
      return snapshot(ctx)
    }

    case 'clearEvents':
      STATE.events = []
      STATE.lastError = null
      return snapshot(ctx)

    default:
      throw Object.assign(new Error(`未知动作：${method}`), { statusCode: 501 })
  }
}

/** 统一的 RPC 响应封装（格式与官方 client 的 `connection.rpc.call` 约定一致）。 */
function reply(rpcId, result) {
  return Response.json({ type: 'server-response', rpcId, result })
}

/**
 * 插件入口。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  loadConfig()

  ctx.effect(() => {
    // ⚠️ 重入保护：HMR 或用户重载插件时会再跑一次 apply。旧服务必须先关，
    //    否则端口被自己占着，日志里会出现一条「EADDRINUSE」让人以为端口冲突。
    if (STATE.connector?.running) {
      STATE.connector.close().catch(() => {})
    }
    STATE.connector = null

    const disposeFetch = ctx.connection.fetch.register({
      path: API_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
        const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
        if (contentType !== 'application/json') return new Response('content type must be application/json', { status: 415 })

        let message
        try {
          message = await request.json()
        } catch {
          return new Response('body is not JSON', { status: 400 })
        }

        const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request'
        const call = message?.payload
        if (
          message?.type !== 'client-request' ||
          typeof message.rpcId !== 'string' ||
          message.method !== ENDPOINT ||
          !call ||
          typeof call.method !== 'string'
        ) {
          return reply(rpcId, { ok: false, error: { code: 'dsh-remote-link/bad-request', message: '请求格式不对' } })
        }

        try {
          const value = await handleAction(ctx, call.method, call.payload)
          return reply(rpcId, { ok: true, value })
        } catch (e) {
          const msg = String(e?.message ?? e)
          ctx.logger?.warn?.(`[dsh-remote-link] ${call.method} 失败：${msg}`)
          return reply(rpcId, { ok: false, error: { code: 'dsh-remote-link/handler-failed', message: msg } })
        }
      },
    })

    // 自动启动放在 effect 里、且不 await：插件的激活不该被端口绑定卡住。
    if (STATE.autoStart) {
      ensureConnector(ctx)
        .listen()
        .then(() => ctx.logger?.info?.(`[dsh-remote-link] 自动启动于 0.0.0.0:${STATE.port}`))
        .catch((e) => {
          const msg = `自动启动失败：${String(e?.message ?? e)}`
          STATE.lastError = msg
          pushEvent('error', msg)
          ctx.logger?.warn?.(`[dsh-remote-link] ${msg}`)
        })
    }

    return () => {
      disposeFetch()
      const connector = STATE.connector
      STATE.connector = null
      if (connector) connector.close().catch(() => {})
    }
  })
}
