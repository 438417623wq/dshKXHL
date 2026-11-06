#!/usr/bin/env node
/**
 * 打包 client bundle → `lib/client.js`。
 *
 * ## 为什么要有这一步
 *
 * DSH 的 client 半边不是普通 npm 模块：宿主在浏览器里从
 * `exports["./client"]` 拿到产物，产物必须自己调
 * `window.__ModuleLoader__.load({ id, factory })` 注册 —— **它只认这一处注册**，
 * 不认批量脚本、也不认 ESM 的默认导出。`id` 还必须等于加载行的包名
 * （宿主按包名建 client entry id），不等时页面永远等不到 bundle 且无任何报错。
 *
 * ## 产物是提交进仓库的
 *
 * 用户装插件时**不需要** node / esbuild —— `lib/client.js` 已经在仓库里。
 * 这个脚本只给改代码的人用。
 *
 * 用法：
 *
 *     node scripts/build-client.mjs
 *     ESBUILD_BIN=/path/to/esbuild node scripts/build-client.mjs
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = join(ROOT, 'src', 'client', 'index.js')
const OUT = join(ROOT, 'lib', 'client.js')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const id = pkg.name
if (typeof id !== 'string' || id.length === 0) {
  throw new Error('package.json 的 name 缺失 —— 无法确定 client entry id')
}

/** 依次尝试的 esbuild 位置。 */
const CANDIDATES = [
  process.env.ESBUILD_BIN,
  join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild'),
  join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild'),
  join(ROOT, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, process.platform === 'win32' ? 'esbuild.exe' : 'esbuild'),
].filter(Boolean)

const ARGS = [
  '--bundle',
  '--format=cjs',
  '--platform=browser',
  '--target=chrome100',
  // charset=utf8：默认 ascii 会把中文转义成 \uXXXX，产物不可读、也没法用文本断言校验。
  '--charset=utf8',
  // 宿主 PLATFORM_MODULES 提供的模块：必须 external，否则同一份 React 被打进产物，
  // 与平台模块表冲突（两套 hooks 互不认账，组件一挂就报 invalid hook call）。
  '--external:react',
  '--external:react-dom',
  '--external:@deepseek-ai/dsh-client-ui-primitives',
  '--legal-comments=none',
  '--log-level=warning',
]

function run(bin) {
  // shell:true 是为了让 Windows 的 .cmd 能被执行；这里所有路径都来自本文件或
  // package.json，没有用户输入拼接，不存在注入面。
  const cmd = `"${bin}" "${ENTRY}" ${ARGS.join(' ')}`
  return spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

let bundled = null
let usedBin = null
const failures = []

for (const bin of CANDIDATES) {
  const result = run(bin)
  if (result.error) {
    failures.push(`${bin}: ${result.error.message}`)
    continue
  }
  if (result.status === 0 && result.stdout?.trim()) {
    bundled = result.stdout
    usedBin = bin
    break
  }
  failures.push(`${bin}: exit ${result.status} ${(result.stderr || '').trim().split('\n').slice(-3).join(' ')}`)
}

if (!bundled) {
  console.error('找不到可用的 esbuild。请先安装：npm i -D esbuild，或用 ESBUILD_BIN 指定路径。')
  for (const line of failures) console.error(`  · ${line}`)
  process.exit(1)
}

/**
 * 产物外壳。
 *
 * ⚠️ `factory(require)` 拿到的是宿主的模块加载器：external 的 `react` 在
 * bundle 里就是 `require("react")`，由宿主解析到自己的 React 实例。
 */
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(id)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${bundled}
    return module.exports;
  }
});
`

// 写盘前从最终文本回读注册 id —— 拼 header 时用变量、再拿变量去 startsWith 是恒真判断，
// 这里用独立正则重新读，才能真的拦住「产物注册了别的 id」。
const readId = wrapped.match(/__ModuleLoader__\.load\(\{\s*id:\s*("(?:[^"\\]|\\.)*")/)
if (!readId) {
  console.error('内部错误：产物里没有 __ModuleLoader__.load({ id: … }) 这处注册')
  process.exit(1)
}
if (readId[1] !== JSON.stringify(id)) {
  console.error(`内部错误：产物注册 id 是 ${readId[1]}，与 package.json 的 name ${JSON.stringify(id)} 不一致`)
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, wrapped, 'utf8')
console.log(`已写入 ${OUT}`)
console.log(`  注册 id : ${id}`)
console.log(`  体积    : ${(Buffer.byteLength(wrapped) / 1024).toFixed(1)} KB`)
console.log(`  esbuild : ${usedBin}`)
