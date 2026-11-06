/**
 * 本地预览驱动：模拟宿主的「模块加载器 + 槽位服务 + RPC」，把面板渲染出来。
 *
 * 这里刻意照抄宿主的调用顺序（load → factory(require) → apply(ctx) →
 * 取 main 槽的组件 → 用它自己的 inject 结果当 props），这样预览里能出图，
 * 基本就说明装进 DSH 也能出图。
 */

const MOCK = {
  running: true,
  port: 8765,
  code: 'a1b2c3d4',
  targetAuthority: '127.0.0.1:53219',
  hasToken: false,
  autoStart: true,
  link: 'http://192.168.2.86:8765/__dshrl_pair?code=a1b2c3d4',
  lan: [
    { iface: 'WLAN', address: '192.168.2.86' },
    { iface: 'Tailscale', address: '100.88.4.12' },
  ],
  upstream: { authority: '127.0.0.1:53219', ok: true, checkedAt: Date.now() },
  devices: [
    { key: 'k1', ip: '192.168.2.31', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) AppleWebKit/605.1.15 Safari/604.1', firstSeen: Date.now() - 3600_000, lastSeen: Date.now() - 4000, requests: 412, live: 2 },
    { key: 'k2', ip: '192.168.2.77', ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile', firstSeen: Date.now() - 7200_000, lastSeen: Date.now() - 480_000, requests: 88, live: 0 },
    { key: 'k3', ip: '100.88.4.12', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1) AppleWebKit/605.1.15 Safari/604.1', firstSeen: Date.now() - 200_000, lastSeen: Date.now() - 30_000, requests: 7, live: 1 },
  ],
  events: [
    { level: 'info', text: '新设备接入：192.168.2.31', at: Date.now() - 3600_000 },
    { level: 'info', text: '接入服务已启动：0.0.0.0:8765 → 127.0.0.1:53219', at: Date.now() - 3600_000 },
    { level: 'warn', text: '配对码错误：来自 192.168.2.99', at: Date.now() - 2400_000 },
    { level: 'info', text: '新设备接入：100.88.4.12', at: Date.now() - 200_000 },
  ],
  lastError: null,
  node: 'win32 x64',
  version: '0.1.0',
}

window.__MOCK = MOCK

window.__preview = (variant) => {
  const root = document.getElementById('root')
  try {
    if (!window.React) throw new Error('window.React 未就位（react-boot 没跑）')
    if (typeof window.__createRoot !== 'function') throw new Error('window.__createRoot 未就位')

    const def = window.__captured
    if (!def) throw new Error('client bundle 没有注册 __ModuleLoader__.load')

    const mod = def.factory((name) => {
      if (name === 'react') return window.React
      throw new Error(`未声明的模块：${name}`)
    })

    const registrations = []
    const ctx = {
      effect(fn) {
        fn()
        return () => {}
      },
      slots: {
        inject(_name, cb) {
          cb()
        },
        register(options, component) {
          registrations.push({ options, component })
          return () => {}
        },
      },
      connection: {
        rpc: {
          async call() {
            const data = variant === 'stopped' ? { ...MOCK, running: false, code: '', link: '', devices: [], events: [] } : MOCK
            return { ok: true, value: data }
          },
        },
      },
    }

    mod.apply(ctx)

    const main = registrations.find((r) => r.options.name === 'main')
    if (!main) throw new Error('没有注册 main 槽')
    const props = main.options.inject()
    const React = window.React
    window.__createRoot(root).render(React.createElement(main.component, props))
  } catch (e) {
    root.textContent = `PREVIEW ERROR: ${e?.message || e}\n${e?.stack || ''}`
    root.style.cssText = 'color:#e5484d;font:12px/1.5 monospace;padding:20px;white-space:pre-wrap'
  }
}
