/**
 * 「远程接入」面板（client 半边）。
 *
 * ## 它是什么
 *
 * 主导航里的一行 + 中央主面板的一整页：开关手机接入服务、看配对码与连接串、
 * 扫码、看谁连着、断开或换码。所有数据来自 host 侧的 `/api/remote-link`。
 *
 * ## 槽位契约（两处必须成对）
 *
 * · `sidebar.panellist`：`id` 就是面板 id，点它宿主会 `layout.selectPanel(id)`；
 * · `main`：`key` 必须**等于**上面那个 id，否则点侧栏会「未注册的 panel」。
 *
 * ## 为什么不用 JSX
 *
 * 这个仓库刻意不引入构建链之外的编译步骤（用户拿到的是可直接安装的纯 JS
 * bundle）。用 `React.createElement` 手写，esbuild 只做打包不做转译。
 *
 * @module dsh-remote-link/client
 */

import * as React from 'react'

import { qrPath, qrSize } from './qr.js'
import { installStyles } from './styles.js'

const h = React.createElement

/** 主导航与主面板共用的面板 id。 */
const PANEL_ID = 'remote-link'

/** 侧栏行顺序：排在官方那几项之后，不抢位置。 */
const SIDEBAR_ORDER = 900

// ── 小工具 ────────────────────────────────────────────────────────────────

const div = (cls, ...kids) => h('div', { className: cls }, ...kids)
const span = (cls, ...kids) => h('span', { className: cls }, ...kids)

function btn(cls, props, ...kids) {
  return h('button', { type: 'button', className: cls, ...props }, ...kids)
}

/** 「3 分钟前」这种相对时间。 */
function ago(ts) {
  if (!ts) return '—'
  const diff = Date.now() - ts
  if (diff < 15_000) return '刚刚'
  if (diff < 60_000) return `${Math.floor(diff / 1000)} 秒前`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

/** 时钟：`20:41`。 */
function clock(ts) {
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '--:--'
  }
}

/** 把 UA 压成一句人话：`iPhone · Safari`。 */
function shortUA(ua) {
  if (!ua) return '未知设备'
  const device = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? 'Android'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Macintosh|Mac OS X/i.test(ua)
            ? 'Mac'
            : /Linux/i.test(ua)
              ? 'Linux'
              : '未知设备'
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua) && !/Chromium/i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua)
          ? 'Safari'
          : ''
  return browser ? `${device} · ${browser}` : device
}

/** 配对码分组显示，好念：`a1b2 c3d4`。 */
function groupCode(code) {
  if (!code) return ''
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code
}

/** 复制到剪贴板：clipboard API 优先，不可用时退回 execCommand。 */
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('浏览器拒绝了复制')
}

// ── 图标 ──────────────────────────────────────────────────────────────────

/**
 * 侧栏行的图标：一块屏幕 + 一部手机。
 *
 * 只用 `currentColor`：宿主那一行是原生按钮，图标必须跟着主题色走。
 */
export function RemoteLinkIcon({ size = 16 } = {}) {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    h('rect', {
      x: 1.2,
      y: 2.4,
      width: 10.4,
      height: 7.4,
      rx: 1.4,
      stroke: 'currentColor',
      strokeWidth: 1.25,
    }),
    h('path', { d: 'M4.4 12.2h4.2', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round' }),
    h('rect', {
      x: 10.4,
      y: 7.6,
      width: 4.4,
      height: 6.6,
      rx: 1.2,
      fill: 'var(--dsw-alias-bg-layer-1, #17171a)',
      stroke: 'currentColor',
      strokeWidth: 1.25,
    }),
    h('path', { d: 'M11.9 12.6h1.4', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round' }),
  )
}

// ── 卡片 ──────────────────────────────────────────────────────────────────

function Card({ title, hint, children }) {
  return div(
    'dshrl-card',
    div('dshrl-card-head', span('dshrl-card-title', title), hint ? span('dshrl-card-hint', hint) : null),
    children,
  )
}

function Row({ label, children, valueClass }) {
  return div(
    'dshrl-row',
    span('dshrl-row-label', label),
    h('span', { className: `dshrl-row-value ${valueClass || ''}` }, children),
  )
}

function Toggle({ on, onChange, disabled }) {
  return h('button', {
    type: 'button',
    className: `dshrl-toggle ${on ? 'is-on' : ''}`,
    role: 'switch',
    'aria-checked': on ? 'true' : 'false',
    disabled,
    onClick: () => onChange(!on),
  })
}

// ── 主组件 ────────────────────────────────────────────────────────────────

export function RemoteLinkPanel({ rpcCall }) {
  const rpcRef = React.useRef(rpcCall)
  rpcRef.current = rpcCall

  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [busy, setBusy] = React.useState(null)
  const [toast, setToast] = React.useState(null)
  const [portDraft, setPortDraft] = React.useState('')
  const [advanced, setAdvanced] = React.useState(false)
  const [tokenDraft, setTokenDraft] = React.useState('')

  const showToast = React.useCallback((text) => {
    setToast(text)
  }, [])

  React.useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 1900)
    return () => clearTimeout(timer)
  }, [toast])

  /** 轮询状态。只在页面可见时发请求 —— 后台标签页不该一直打主机。 */
  React.useEffect(() => {
    let alive = true
    let timer = 0

    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const next = await rpcRef.current('status')
          if (alive) {
            setData(next)
            setError(null)
          }
        } catch (e) {
          if (alive) setError(String(e?.message ?? e))
        }
      }
      if (alive) timer = setTimeout(tick, 3000)
    }

    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  const run = React.useCallback(
    async (action, payload, successText) => {
      setBusy(action)
      try {
        const next = await rpcRef.current(action, payload)
        if (next) setData(next)
        setError(null)
        if (successText) showToast(successText)
      } catch (e) {
        setError(String(e?.message ?? e))
      } finally {
        setBusy(null)
      }
    },
    [showToast],
  )

  const onCopy = async (text) => {
    try {
      await copyText(text)
      showToast('连接串已复制')
    } catch (e) {
      showToast(`复制失败：${String(e?.message ?? e)}`)
    }
  }

  const running = Boolean(data?.running)
  const upstreamOk = data?.upstream?.ok
  const devices = data?.devices ?? []
  const liveCount = devices.filter((d) => d.live > 0).length

  const link = data?.link || ''
  const qr = React.useMemo(() => (link ? qrPath(link) : ''), [link])
  const qrCount = React.useMemo(() => (link ? qrSize(link) : 25), [link])

  const statusText = running ? (upstreamOk === false ? '上游未就绪' : '运行中') : '已停止'
  const statusClass = running ? (upstreamOk === false ? 'is-err' : 'is-on') : 'is-off'

  return div(
    'dshrl-root',

    // ── 页头 ──
    div(
      'dshrl-head',
      div(
        'dshrl-head-main',
        h('h1', { className: 'dshrl-title' }, '远程接入'),
        h(
          'p',
          { className: 'dshrl-sub' },
          '手机连上这台电脑，用 DSH 的全部能力。服务只在这台机器上开一个带配对门的口子，DSH 本体仍然只听回环。',
        ),
      ),
      div('dshrl-pill', span(`dshrl-dot ${statusClass}`), statusText),
    ),

    // ── 错误横幅 ──
    error
      ? div(
          'dshrl-banner',
          h('span', null, '⚠'),
          div(null, span(null, error)),
          btn('dshrl-btn dshrl-btn-sm dshrl-btn-ghost', { onClick: () => setError(null) }, '知道了'),
        )
      : null,

    // ── 上游没起来时的提示 ──
    data && !upstreamOk && running
      ? div('dshrl-banner dshrl-banner-warn', h('span', null, '!'), div(null, '上游 DSH webServer 探测不到，手机打开会报 502。请确认 DSH 仍在运行。'))
      : null,

    // ── 主体 ──
    div(
      'dshrl-grid',

      // ═══ 左列 ═══
      div(
        'dshrl-col',

        // 接入服务
        h(
          Card,
          { title: '接入服务' },
          div(
            'dshrl-power',
            div(
              'dshrl-power-text',
              div('dshrl-power-title', running ? '手机可以连进来了' : '接入服务未启动'),
              div(
                'dshrl-power-desc',
                running
                  ? `对外 0.0.0.0:${data.port} → 本机 ${data.upstream?.authority || ''}`
                  : '启动后手机才能连；带配对码校验，局域网里其他人打不开会话。',
              ),
            ),
            running
              ? btn('dshrl-btn dshrl-btn-danger', { disabled: busy === 'stop', onClick: () => run('stop', {}, '已停止') }, busy === 'stop' ? '停止中…' : '停止接入')
              : btn(
                  'dshrl-btn dshrl-btn-primary',
                  { disabled: busy === 'start', onClick: () => run('start', {}, '已启动') },
                  busy === 'start' ? '启动中…' : '启动接入',
                ),
          ),

          h(
            'div',
            { className: 'dshrl-rows', style: { marginTop: '12px' } },
            // 端口
            div(
              'dshrl-row',
              span('dshrl-row-label', '端口'),
              h(
                'div',
                { className: 'dshrl-field', style: { marginLeft: 'auto', maxWidth: '190px' } },
                h('input', {
                  className: 'dshrl-input',
                  value: portDraft || String(data?.port ?? ''),
                  inputMode: 'numeric',
                  onChange: (e) => setPortDraft(e.target.value.replace(/[^\d]/g, '')),
                  placeholder: String(data?.port ?? ''),
                  'aria-label': '接入服务端口',
                }),
                btn(
                  'dshrl-btn dshrl-btn-sm',
                  {
                    disabled: busy === 'setPort' || !portDraft || portDraft === String(data?.port ?? ''),
                    onClick: () => {
                      run('setPort', { port: Number(portDraft) }, '端口已更新')
                      setPortDraft('')
                    },
                  },
                  '保存',
                ),
              ),
            ),
            // 上游
            h(
              Row,
              { label: '上游', valueClass: upstreamOk ? 'dshrl-ok' : 'dshrl-bad' },
              `${data?.upstream?.authority || '—'} ${upstreamOk ? '· 可达' : '· 不可达'}`,
            ),
            // 在线
            h(Row, { label: '在线设备' }, `${liveCount} 台活跃 / ${devices.length} 台记录`),
          ),

          // 自动启动
          div(
            'dshrl-switch',
            div(
              'dshrl-switch-text',
              div(null, 'DSH 启动时自动开启'),
              div('dshrl-switch-desc', '关掉后每次开机都要回来点一次「启动接入」'),
            ),
            h(Toggle, {
              on: Boolean(data?.autoStart),
              disabled: busy === 'setAutoStart',
              onChange: (next) => run('setAutoStart', { enabled: next }),
            }),
          ),
        ),

        // 配对码
        h(
          Card,
          { title: '配对码', hint: running ? '手机凭它换到访问凭证' : '启动后生成' },
          div(
            'dshrl-code',
            span(`dshrl-code-big ${running ? '' : 'is-muted'}`, running ? groupCode(data?.code) : '尚未启动'),
            running
              ? btn(
                  'dshrl-btn dshrl-btn-sm dshrl-btn-danger',
                  {
                    disabled: busy === 'regenerate',
                    onClick: () => {
                      if (!window.confirm('换一个配对码？已经连上的手机会全部断开，需要重新粘贴新连接串。')) return
                      run('regenerate', {}, '配对码已更换')
                    },
                  },
                  '换一个',
                )
              : null,
          ),
          running
            ? div(
                'dshrl-link',
                span('dshrl-link-text', null, link),
                btn('dshrl-btn dshrl-btn-sm', { onClick: () => onCopy(link) }, '复制'),
              )
            : null,
          running
            ? h(
                'p',
                { className: 'dshrl-sub', style: { marginTop: '10px' } },
                '换码等于吊销所有已配对设备 —— 配对凭证是整站一个，不能只踢一台。',
              )
            : null,
        ),

        // 已连接设备
        h(
          Card,
          { title: '已连接设备', hint: devices.length ? `${devices.length} 台` : '' },
          devices.length === 0
            ? div('dshrl-empty', running ? '还没有设备接入。手机上打开连接串就会出现在这里。' : '启动接入服务后再看。')
            : div(
                null,
                ...devices.map((d) =>
                  h(
                    'div',
                    { className: 'dshrl-device', key: d.key },
                    div(
                      'dshrl-device-main',
                      div('dshrl-device-ip', null, d.ip),
                      div('dshrl-device-meta', null, `${shortUA(d.ua)} · 请求 ${d.requests} · 最后活跃 ${ago(d.lastSeen)}`),
                    ),
                    d.live > 0 ? span('dshrl-badge is-live', `${d.live} 条连接`) : span('dshrl-badge', '空闲'),
                    btn(
                      'dshrl-btn dshrl-btn-sm',
                      {
                        title: '只断开当前连接；浏览器通常会在几秒内自动重连',
                        disabled: busy === 'kick',
                        onClick: () => run('kick', { key: d.key }, '已断开该设备的连接'),
                      },
                      '断开',
                    ),
                  ),
                ),
              ),
        ),
      ),

      // ═══ 右列 ═══
      div(
        'dshrl-col',

        // 扫码
        h(
          Card,
          { title: '扫码连接', hint: '手机相机直接扫' },
          link && qr
            ? div(
                null,
                div(
                  'dshrl-qr',
                  h(
                    'svg',
                    { viewBox: `0 0 ${qrCount} ${qrCount}`, shapeRendering: 'crispEdges', role: 'img', 'aria-label': '配对二维码' },
                    h('rect', { width: qrCount, height: qrCount, fill: '#fff' }),
                    h('path', { d: qr, fill: '#000' }),
                  ),
                ),
                h(
                  'div',
                  { className: 'dshrl-sub', style: { textAlign: 'center' } },
                  '扫码后浏览器会自己带上配对码，一次成功。',
                ),
              )
            : div('dshrl-qr-empty', '启动接入服务后，这里显示二维码'),
        ),

        // 手机怎么连
        h(
          Card,
          { title: '手机怎么连' },
          h(
            'ol',
            { className: 'dshrl-steps' },
            h('li', null, '手机和电脑连同一个 WiFi（或都连同一台手机的 hotspot）。'),
            h('li', null, '启动上面的接入服务，拿到配对码和连接串。'),
            h(
              'li',
              null,
              '在 Kxxy 里：概览 → 远程控制 → 添加电脑 → 粘贴连接串。或者直接扫左边的二维码。',
            ),
            h('li', null, '连上后手机就落在 DSH 的界面上，对话、会话、文件都能用。'),
          ),
        ),

        // 事件日志
        h(
          Card,
          { title: '接入日志', hint: data?.events?.length ? `${data.events.length} 条` : '' },
          data?.events?.length
            ? div(
                'dshrl-events',
                ...data.events.map((ev, i) =>
                  h(
                    'div',
                    { className: 'dshrl-event', key: `${ev.at}-${i}` },
                    span('dshrl-event-time', clock(ev.at)),
                    span(
                      `dshrl-event-text ${ev.level === 'error' ? 'dshrl-bad' : ev.level === 'warn' ? 'dshrl-warn' : ''}`,
                      ev.text,
                    ),
                  ),
                ),
              )
            : div('dshrl-empty', '还没有事件。'),
          data?.events?.length
            ? h(
                'div',
                { style: { marginTop: '10px' } },
                btn('dshrl-btn dshrl-btn-sm dshrl-btn-ghost', { disabled: busy === 'clearEvents', onClick: () => run('clearEvents') }, '清空'),
              )
            : null,
        ),

        // 高级
        h(
          Card,
          { title: '高级' },
          advanced
            ? div(
                null,
                h(
                  'div',
                  { className: 'dshrl-sub', style: { marginBottom: '8px' } },
                  '鉴权是自动的：插件向 DSH 取本进程的 launch token，连接器用它向本机换一个会话 cookie，手机侧全程看不到 token。只有自动取不到（例如 DSH 大版本改了方法）时才需要手工填一个。留空表示用自动取到的。',
                ),
                div(
                  'dshrl-field',
                  h('input', {
                    className: 'dshrl-input',
                    value: tokenDraft,
                    placeholder: data?.tokenSource === 'manual' ? '已手工指定（留空表示改回自动）' : '自动获取中，通常不需要填',
                    onChange: (e) => setTokenDraft(e.target.value),
                  }),
                  btn(
                    'dshrl-btn dshrl-btn-sm',
                    {
                      disabled: busy === 'setToken',
                      onClick: () => {
                        run('setToken', { token: tokenDraft }, tokenDraft ? 'token 已保存' : 'token 已清除')
                        setTokenDraft('')
                      },
                    },
                    '保存',
                  ),
                ),
                h(
                  'div',
                  { className: 'dshrl-rows', style: { marginTop: '10px' } },
                  h(
                    Row,
                    { label: '鉴权方式' },
                    data?.tokenSource === 'launch'
                      ? '本机 launch token（自动）'
                      : data?.tokenSource === 'manual'
                        ? '手工填写'
                        : '未取到 —— 手机会看到 401',
                  ),
                  h(
                    Row,
                    { label: '上游会话' },
                    data?.hasSession ? '已建立' : data?.hasToken ? '首次访问时自动换取' : '不可用',
                  ),
                  h(Row, { label: '插件版本' }, data?.version || '—'),
                  h(Row, { label: '运行环境' }, data?.node || '—'),
                ),
              )
            : btn('dshrl-btn dshrl-btn-sm', { onClick: () => setAdvanced(true) }, '展开'),
        ),
      ),
    ),

    // ── toast ──
    toast ? div('dshrl-toast', toast) : null,
  )
}

// ── 插件入口 ──────────────────────────────────────────────────────────────

export const name = 'dsh-remote-link-client'

/**
 * inject 声明。
 *
 * `slots` 是槽位服务本身；`connection` 用来发 RPC。两者都是宿主公开服务，
 * 缺任何一个插件都无法工作，因此是硬依赖（而非 `ctx.inject` 软取）。
 */
export const inject = ['slots', 'connection']

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  ctx.effect(() => installStyles(), 'dsh-remote-link: 注入样式')

  const rpcCall = async (method, payload, signal) => {
    const raw = await ctx.connection.rpc.call('/api', 'remote-link', { method, payload }, signal)
    if (raw?.ok === true) return raw.value
    if (raw?.ok === false) {
      const err = new Error(raw.error?.message || '远程接入请求失败')
      err.code = raw.error?.code
      throw err
    }
    return raw
  }

  // 主面板渲染体：`key` 必须与侧栏行的 `id` 一致。
  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        inject: () => ({ rpcCall }),
      },
      RemoteLinkPanel,
    ),
  )

  // 主导航里的那一行。渲染体是图标，标签由 `label` 提供。
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: SIDEBAR_ORDER,
        label: () => '远程接入',
      },
      RemoteLinkIcon,
    ),
  )
}
