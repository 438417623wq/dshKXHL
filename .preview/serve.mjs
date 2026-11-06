/**
 * 本地预览服务：不装进 DSH 也能看到面板长什么样。
 *
 * 用法：
 *     node .preview/serve.mjs            # 默认 18888
 *     node .preview/serve.mjs 18889
 *
 * 然后浏览器打开 http://127.0.0.1:18888/（运行中）
 * 或 ?variant=stopped（未启动态）。
 */

import http from 'node:http'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const PORT = Number(process.argv[2] || 18888)

// 打包一个把 react / react-dom 摆到全局的小 bundle（模拟宿主的平台模块表）。
const esbuild = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild')
const built = spawnSync(
  `"${esbuild}" "${join(HERE, 'react-boot.js')}" --bundle --format=iife --platform=browser --target=chrome100 --outfile="${join(HERE, 'react.bundle.js')}" --log-level=warning`,
  { cwd: ROOT, shell: true, encoding: 'utf8' },
)
if (built.status !== 0) {
  console.error(built.stderr || built.stdout)
  process.exit(1)
}

const HTML = `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<title>远程接入 · 预览</title>
<style>
  :root {
    --dsw-alias-bg-layer-1: #17171a;
    --dsw-alias-bg-layer-2: #202024;
    --dsw-alias-bg-layer-3: #2a2a30;
    --dsw-alias-border-l2: #33333a;
    --dsw-alias-border-secondary: #3d3d46;
    --dsw-alias-label-primary: #e8e8ea;
    --dsw-alias-label-secondary: #b9b9c0;
    --dsw-alias-label-tertiary: #8b8b93;
    --dsw-alias-brand-primary: #4d6bfe;
    --dsw-alias-link: #7aa2ff;
    --dsw-alias-state-success-primary: #37c26a;
    --dsw-alias-state-warn-primary: #e0a13a;
    --dsw-alias-state-error-primary: #e5484d;
    --dsw-alias-interactive-bg-hover: #34343c;
  }
  html, body { margin: 0; height: 100%; background: var(--dsw-alias-bg-layer-1); }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif; }
  #root { height: 100%; }
</style>
</head>
<body>
<div id="root"></div>
<script>
  window.__diag = [];
  window.onerror = (m, s, l) => { window.__diag.push('ERROR ' + m + ' @' + s + ':' + l); document.title = window.__diag.join(' | ') };
  window.addEventListener('unhandledrejection', (e) => { window.__diag.push('REJECT ' + e.reason); document.title = window.__diag.join(' | ') });
</script>
<script src="/react.js"></script>
<script>window.__captured = null; window.__ModuleLoader__ = { load: (d) => { window.__captured = d } };</script>
<script src="/client.js"></script>
<script src="/driver.js"></script>
<script>window.__preview(new URLSearchParams(location.search).get('variant'));</script>
<script>
  // 溢出诊断：把「比视口宽」的元素找出来写进 title，便于 headless 抓取。
  setTimeout(() => {
    const vw = document.documentElement.clientWidth
    const bad = []
    document.querySelectorAll('#root *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 0.5) {
        const cls = typeof el.className === 'string' ? el.className : ''
        bad.push(el.tagName + '.' + cls.split(' ')[0] + '@' + Math.round(r.right))
      }
    })
    const rootRect = document.querySelector('.dshrl-root')?.getBoundingClientRect()
    document.title =
      'VW=' + vw + ' root=' + (rootRect ? Math.round(rootRect.width) : '-') + ' ' + (bad.slice(0, 6).join(' | ') || 'no-overflow')
  }, 1200)
</script>
</body></html>`

const server = http.createServer((req, res) => {
  const path = String(req.url || '/').split('?')[0]
  const send = (type, body) => {
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
    res.end(body)
  }
  try {
    if (path === '/' || path === '/index.html') return send('text/html; charset=utf-8', HTML)
    if (path === '/react.js') return send('text/javascript; charset=utf-8', readFileSync(join(HERE, 'react.bundle.js')))
    if (path === '/client.js') return send('text/javascript; charset=utf-8', readFileSync(join(ROOT, 'lib', 'client.js')))
    if (path === '/driver.js') return send('text/javascript; charset=utf-8', readFileSync(join(HERE, 'driver.js')))
    res.writeHead(404)
    res.end('not found')
  } catch (e) {
    res.writeHead(500)
    res.end(String(e?.message ?? e))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`预览已启动：http://127.0.0.1:${PORT}/`)
})
