#!/usr/bin/env node
/**
 * 安装 / 卸载器（跨平台）。
 *
 * 做的事只有三件，全部可逆：
 *   1. 在 profile 的 `node_modules` 下建一个指向本目录的链接（Windows 用
 *      junction，不需要管理员权限也不需要开发者模式）；
 *   2. 在 profile 的 `package.json` 里登记 `dependencies["dsh-remote-link"]`
 *      （`link:` 形式，与 DSH 自己的本地插件一致）；
 *   3. 把它加进 `dsh.profile.bundles` —— **真正决定加载的是这一项**，
 *      只写 dependencies 不会生效。
 *
 * 改动前一律备份成 `package.json.bak-<时间戳>`，卸载时把链接与两个登记项
 * 一起撤掉，profile 回到装之前的样子。
 *
 * 用法：
 *     node scripts/install.mjs                # 装
 *     node scripts/install.mjs --dry-run      # 只说要做什么
 *     node scripts/install.mjs --uninstall    # 卸
 *     node scripts/install.mjs --profile=web  # 指定别的 profile
 */

import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const PKG_NAME = 'dsh-remote-link'
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')))
const opts = Object.fromEntries(
  argv
    .filter((a) => a.startsWith('--') && a.includes('='))
    .map((a) => {
      const i = a.indexOf('=')
      return [a.slice(2, i), a.slice(i + 1)]
    }),
)

const isWindows = process.platform === 'win32'

function say(line = '') {
  process.stdout.write(`${line}\n`)
}
function ok(line) {
  say(`  \x1b[32m✓\x1b[0m ${line}`)
}
function warn(line) {
  say(`  \x1b[33m!\x1b[0m ${line}`)
}
function bad(line) {
  say(`  \x1b[31m✗\x1b[0m ${line}`)
}

// ── 定位 ──────────────────────────────────────────────────────────────────
const dshHome = process.env.DSH_HOME || join(os.homedir(), '.dsh')
const profileName = opts.profile || 'desktop'
const profileDir = join(dshHome, 'profiles', profileName)
const manifestPath = join(profileDir, 'package.json')
const linkPath = join(profileDir, 'node_modules', PKG_NAME)
const linkValue = `link:${REPO_ROOT.split('\\').join('/')}`

say()
say('\x1b[36mdsh-remote-link 安装器\x1b[0m')
say(`  插件目录  ${REPO_ROOT}`)
say(`  DSH 目录  ${dshHome}`)
say(`  profile   ${profileDir}`)
say()

if (!existsSync(manifestPath)) {
  bad(`找不到 ${manifestPath}`)
  warn('先启动一次 DSH 桌面端，让它把这个 profile 初始化出来，再回来运行本脚本。')
  process.exit(1)
}

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''))
} catch (e) {
  bad(`profile 清单不是合法 JSON：${e.message}`)
  warn('这个文件坏了的话 DSH 本身也起不来，先修它再装插件。')
  process.exit(1)
}
if (!manifest?.dsh?.profile) {
  bad('profile 清单里没有 dsh.profile 字段，这不像一个 DSH profile。')
  process.exit(1)
}

const dryRun = flags.has('--dry-run')
const uninstall = flags.has('--uninstall')

function backup() {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const dest = `${manifestPath}.bak-${stamp}`
  copyFileSync(manifestPath, dest)
  ok(`已备份清单 → ${dest}`)
}

function writeManifest() {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

/** 当前 node_modules 里的链接指向哪里（不是链接就返回 null）。 */
function currentLinkTarget() {
  try {
    const st = lstatSync(linkPath)
    if (!st.isSymbolicLink() && !st.isDirectory()) return null
    return readlinkSync(linkPath)
  } catch {
    return null
  }
}

// ── 卸载 ──────────────────────────────────────────────────────────────────
if (uninstall) {
  say('卸载 dsh-remote-link')
  const bundles = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles : []
  const hadBundle = bundles.includes(PKG_NAME)
  const hadDep = Object.prototype.hasOwnProperty.call(manifest.dependencies || {}, PKG_NAME)

  if (dryRun) {
    if (hadBundle) ok(`将从 dsh.profile.bundles 移除 ${PKG_NAME}`)
    if (hadDep) ok(`将移除 dependencies.${PKG_NAME}`)
    ok(`将删除链接 ${linkPath}`)
    say('\n（--dry-run：什么都没改）')
    process.exit(0)
  }

  if (hadBundle || hadDep) {
    backup()
    if (hadDep) delete manifest.dependencies[PKG_NAME]
    manifest.dsh.profile.bundles = bundles.filter((b) => b !== PKG_NAME)
    writeManifest()
    ok('清单已还原')
  } else {
    ok('清单里本来就没有登记')
  }

  if (currentLinkTarget() !== null) {
    rmSync(linkPath, { recursive: true, force: true })
    ok('链接已删除')
  }

  say('\n卸载完成，重启 DSH 生效。')
  process.exit(0)
}

// ── 安装 ──────────────────────────────────────────────────────────────────
say('安装 dsh-remote-link')
say(`  依赖将写为 ${linkValue}`)

const alreadyLinked = currentLinkTarget() !== null
const deps = manifest.dependencies && typeof manifest.dependencies === 'object' ? manifest.dependencies : (manifest.dependencies = {})
const alreadyDep = Object.prototype.hasOwnProperty.call(deps, PKG_NAME)
if (!Array.isArray(manifest.dsh.profile.bundles)) manifest.dsh.profile.bundles = []
const alreadyBundle = manifest.dsh.profile.bundles.includes(PKG_NAME)

if (dryRun) {
  if (alreadyLinked) ok(`链接已存在：${linkPath}`)
  else ok(`将创建${isWindows ? '目录联接（junction）' : '符号链接'} ${linkPath} → ${REPO_ROOT}`)
  if (alreadyDep) ok('dependencies 已登记')
  else ok(`将添加 dependencies.${PKG_NAME} = ${linkValue}`)
  if (alreadyBundle) ok('bundles 已包含')
  else ok(`将把 ${PKG_NAME} 加进 dsh.profile.bundles`)
  say('\n（--dry-run：什么都没改）')
  process.exit(0)
}

if (alreadyLinked && alreadyDep && alreadyBundle) {
  ok('已经装好了，无需改动')
  say('\n如果导航里没有「远程接入」，重启一次 DSH（完全退出再打开）。')
  process.exit(0)
}

// 链接：先清掉旧链接再建，避免指向过期的工程目录。
if (alreadyLinked) {
  rmSync(linkPath, { recursive: true, force: true })
}
mkdirSync(dirname(linkPath), { recursive: true })
try {
  // Windows 用 junction：不需要管理员权限/开发者模式，pnpm 自己也是这么做的。
  symlinkSync(REPO_ROOT, linkPath, isWindows ? 'junction' : 'dir')
  ok(`已建立链接 ${linkPath} → ${REPO_ROOT}`)
} catch (e) {
  bad(`建链接失败：${e.message}`)
  warn('可以手工替代：把本目录复制到 profile 的 node_modules/dsh-remote-link 下。')
  process.exit(1)
}

if (!alreadyDep || !alreadyBundle) {
  backup()
  if (!alreadyDep) deps[PKG_NAME] = linkValue
  if (!alreadyBundle) manifest.dsh.profile.bundles.push(PKG_NAME)
  writeManifest()
  ok(`已更新 ${manifestPath}`)
}

say('')
say('\x1b[32m装好了。\x1b[0m')
say('')
say('下一步：')
say('  1. 重启 DSH 桌面端（完全退出再打开，不是关窗口）')
say('  2. 左侧导航会多出一行「远程接入」，点进去')
say('  3. 点「启动接入」，把二维码给手机扫，或复制连接串粘到 Kxxy')
say('')
warn('导航里没出现？先看 DSH 启动日志有没有 dsh-remote-link 的报错，')
warn('再运行 node scripts/selftest.mjs 自查（不依赖 DSH，47 项断言）。')
