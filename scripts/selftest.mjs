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
import vm from 'node:vm'

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
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'x-upstream-host': String(req.headers.host) })
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
