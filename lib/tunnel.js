/**
 * 外网接入口探测。
 *
 * 只做「看装没装 + 算出地址」，**不托管任何子进程**。
 *
 * 不托管是有意的：
 * - Tailscale 登录之后地址就已经在系统里（100.x.y.z），`tailscale ip -4` 读一下
 *   就够了，隧道的生命周期归 Tailscale 自己的后台服务 —— 我们再去托管子进程，
 *   只会多出「插件关了隧道还开着」「两份 tailscaled 抢同一块网卡」这类事故。
 * - Cloudflare quick tunnel 必须起进程，而且域名每次重启都变。托管它意味着要接
 *   stdout 解析域名、管重启退避、随 DSH 退出清理，收益不值这份复杂度。所以这里
 *   只判断装没装，把命令给用户自己跑。
 *
 * 探测结果带缓存：面板每 3 秒轮询一次，每次真去 exec 会让系统进程表一直在动
 * （Windows 上尤其明显）。
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

/** 探测结果缓存多久。改动网络环境后用户会点「重新检测」，不必等这个。 */
const TTL_MS = 60_000

/** 单条命令的超时。tailscale 偶尔会卡在状态查询上，1.5 秒足够且不拖住面板。 */
const EXEC_TIMEOUT_MS = 1_500

/**
 * 各平台的默认安装路径。
 *
 * 光靠 PATH 不够：Windows 装 Tailscale 时不写用户 PATH（服务模式装到
 * Program Files），macOS 的 GUI 版可执行文件在 .app 包里 —— 两条都得认。
 */
const DEFAULT_PATHS = {
  win32: {
    tailscale: [
      'C:\\Program Files\\Tailscale\\tailscale.exe',
      'C:\\Program Files (x86)\\Tailscale\\tailscale.exe',
    ],
    cloudflared: [
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    ],
  },
  darwin: {
    tailscale: [
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
      '/opt/homebrew/bin/tailscale',
      '/usr/local/bin/tailscale',
    ],
    cloudflared: ['/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared'],
  },
  linux: {
    tailscale: ['/usr/bin/tailscale', '/usr/local/bin/tailscale'],
    cloudflared: ['/usr/bin/cloudflared', '/usr/local/bin/cloudflared'],
  },
}

const INSTALL_URL = {
  tailscale: 'https://tailscale.com/download',
  cloudflare: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
}

let cache = null

/** 跑一条命令，返回 stdout（失败返回 null，绝不抛）。 */
function run(bin, args) {
  try {
    const out = execFileSync(bin, args, {
      timeout: EXEC_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      encoding: 'utf8',
    })
    return String(out || '')
  } catch {
    // 没装、没登录、超时、权限不足，全部归到「拿不到」——
    // 面板只需要知道能不能用，不需要区分是哪一种失败。
    return null
  }
}

/**
 * 找出可执行文件：先试 PATH 里的裸名字，再试平台默认路径。
 * 返回能真正跑起来的那个路径（`--version` 有输出才算）。
 */
function findBin(name) {
  if (run(name, ['--version']) !== null) return name
  const paths = DEFAULT_PATHS[process.platform]?.[name] ?? []
  for (const p of paths) {
    if (!existsSync(p)) continue
    if (run(p, ['--version']) !== null) return p
  }
  return null
}

/**
 * Tailscale 的 IPv4 地址。
 *
 * 只看 100.64.0.0/10（Tailscale 的 CGNAT 段）里的地址，别的一律忽略：
 * 用户电脑上经常还有 Docker（172.17.x.x）、虚拟网卡的东西，取错了给出去的
 * 就是一条手机根本连不上的地址。
 */
function tailscaleAddress(bin) {
  const out = run(bin, ['ip', '-4'])
  if (!out) return ''
  for (const line of out.split(/\r?\n/)) {
    const ip = line.trim()
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/.test(ip)) return ip
  }
  return ''
}

function probeTailscale() {
  const bin = findBin('tailscale')
  if (!bin) {
    return {
      kind: 'tailscale',
      label: 'Tailscale',
      installed: false,
      ready: false,
      address: '',
      hint: '装一个 Tailscale，手机登录同一个账号就能在外网连回来 —— 不用公网 IP，也不用路由器设置。',
      installUrl: INSTALL_URL.tailscale,
    }
  }
  const address = tailscaleAddress(bin)
  return {
    kind: 'tailscale',
    label: 'Tailscale',
    installed: true,
    ready: Boolean(address),
    address,
    hint: address
      ? '手机装同一个 Tailscale 账号，在外网也能直接连这个地址。'
      : '装了但没登录（或者没连上），先在电脑上打开 Tailscale 登录一次。',
    installUrl: INSTALL_URL.tailscale,
  }
}

function probeCloudflare() {
  const bin = findBin('cloudflared')
  return {
    kind: 'cloudflare',
    label: 'Cloudflare 隧道',
    installed: Boolean(bin),
    // 永远 false：quick tunnel 的域名要起进程之后才知道，而且每次重启都变。
    ready: false,
    address: '',
    hint: bin
      ? '在电脑上跑一次下面这条命令，终端会打印一条 https 地址，把连接串里的 IP 换成它就行。手机什么都不用装。'
      : '装 cloudflared 之后可以在电脑上起一条临时隧道，手机不用装任何东西。',
    installUrl: INSTALL_URL.cloudflare,
    command: `cloudflared tunnel --url http://127.0.0.1:{{PORT}}`,
  }
}

/**
 * 探测本机可用的外网通道。
 *
 * @param {{ force?: boolean }} [options] force=true 时跳过缓存（面板上的「重新检测」）
 * @returns {Array<object>} 固定的两条（tailscale / cloudflare），顺序稳定，
 *   前端可以直接按下标画，不用处理「有时有有时没有」。
 */
export function detectTunnels(options = {}) {
  const now = Date.now()
  if (!options.force && cache && now - cache.at < TTL_MS) return cache.value

  const value = [probeTailscale(), probeCloudflare()]
  cache = { at: now, value }
  return value
}

/** 仅供自测：把缓存清掉，避免用例之间互相污染。 */
export function resetTunnelCache() {
  cache = null
}

/**
 * 把探测结果拼成可直接发给手机的连接串。
 *
 * 拼装放在这里而不是 detectTunnels 里：配对码会变（换码 / 重启），
 * 而「装没装、地址是多少」不会。混在一起的结果就是缓存命中时发出一串过期的码。
 */
export function tunnelLinks(tunnels, { port, code, pairPath, label }) {
  const suffix = `code=${encodeURIComponent(code)}&label=${encodeURIComponent(label || '电脑')}`
  return tunnels.map((t) => ({
    ...t,
    command: t.command ? t.command.replace('{{PORT}}', String(port)) : '',
    url: t.ready && code ? `http://${t.address}:${port}${pairPath}?${suffix}` : '',
  }))
}
