/**
 * 面板样式。
 *
 * 全部用 DSH 的 `--dsw-alias-*` 主题变量，跟随界面明暗 —— 面板里不写死任何
 * 颜色，否则用户切主题时会留下一块「外来」区域。
 *
 * 注入方式与官方插件一致：`document.head` 里插一个 `<style>`，随 effect 卸载
 * 移除。用 `data-dsh-remote-link` 标记，避免 HMR 重载后堆出多份。
 */

const STYLE_ID = 'dsh-remote-link-styles'

const CSS = `
.dshrl-root {
  height: 100%;
  overflow: auto;
  padding: 22px 24px 40px;
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #e8e8ea);
  font-size: 13.5px;
  line-height: 1.55;
}

.dshrl-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}
.dshrl-head-main { flex: 1; min-width: 0; }
.dshrl-title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: .2px;
}
.dshrl-sub {
  margin: 4px 0 0;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  font-size: 12.5px;
}

.dshrl-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  background: var(--dsw-alias-bg-layer-2, #202024);
  font-size: 12.5px;
  white-space: nowrap;
}
.dshrl-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #8b8b93);
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 12%, transparent);
}
.dshrl-dot.is-on {
  background: var(--dsw-alias-state-success-primary, #37c26a);
  animation: dshrl-pulse 2.4s ease-in-out infinite;
}
.dshrl-dot.is-off { background: var(--dsw-alias-label-tertiary, #8b8b93); }
.dshrl-dot.is-err { background: var(--dsw-alias-state-error-primary, #e5484d); }
@keyframes dshrl-pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: .45 }
}

.dshrl-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
@media (max-width: 900px) {
  .dshrl-grid { grid-template-columns: minmax(0, 1fr); }
}

.dshrl-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.dshrl-card {
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-2, #202024);
  padding: 16px 16px 15px;
  min-width: 0;
}
.dshrl-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.dshrl-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
  letter-spacing: .3px;
}
.dshrl-card-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
}

.dshrl-power {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.dshrl-power-text { flex: 1; min-width: 150px; }
.dshrl-power-title { font-size: 15px; font-weight: 600; }
.dshrl-power-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  word-break: break-all;
}

.dshrl-btn {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-secondary, #3d3d46);
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-primary, #e8e8ea);
  border-radius: 9px;
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background .14s, border-color .14s, opacity .14s;
  white-space: nowrap;
}
.dshrl-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #34343c); }
.dshrl-btn:disabled { opacity: .5; cursor: default; }
.dshrl-btn-primary {
  background: var(--dsw-alias-brand-primary, #4d6bfe);
  border-color: transparent;
  color: #fff;
  font-weight: 500;
}
.dshrl-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.dshrl-btn-danger { color: var(--dsw-alias-state-error-primary, #e5484d); }
.dshrl-btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 7px; }
.dshrl-btn-ghost { background: none; border-color: transparent; color: var(--dsw-alias-link, #7aa2ff); }

.dshrl-code {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.dshrl-code-big {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--dsw-alias-label-primary, #fff);
}
.dshrl-code-big.is-muted { color: var(--dsw-alias-label-tertiary, #8b8b93); font-size: 15px; letter-spacing: 0; }

.dshrl-link {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  padding: 8px 10px;
}
.dshrl-link-text {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dshrl-qr {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  margin: 0 auto 12px;
  width: max-content;
  max-width: 100%;
}
.dshrl-qr svg { display: block; width: 176px; height: 176px; }
.dshrl-qr-empty {
  height: 176px;
  display: grid;
  place-items: center;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  font-size: 12.5px;
  text-align: center;
  padding: 0 20px;
}

.dshrl-rows { display: flex; flex-direction: column; }
.dshrl-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--dsw-alias-border-l2, #33333a);
  min-width: 0;
}
.dshrl-row:first-child { border-top: none; }
.dshrl-row-label { color: var(--dsw-alias-label-tertiary, #8b8b93); font-size: 12.5px; flex: none; }
.dshrl-row-value {
  margin-left: auto;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
  font-size: 12.5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshrl-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshrl-ok { color: var(--dsw-alias-state-success-primary, #37c26a); }
.dshrl-bad { color: var(--dsw-alias-state-error-primary, #e5484d); }
.dshrl-warn { color: var(--dsw-alias-state-warn-primary, #e0a13a); }

.dshrl-device {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--dsw-alias-border-l2, #33333a);
  min-width: 0;
}
.dshrl-device:first-child { border-top: none; }
.dshrl-device-main { min-width: 0; flex: 1; }
.dshrl-device-ip { font-size: 13px; font-weight: 500; }
.dshrl-device-meta {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshrl-badge {
  flex: none;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-secondary, #b9b9c0);
}
.dshrl-badge.is-live {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #37c26a) 18%, transparent);
  color: var(--dsw-alias-state-success-primary, #37c26a);
}

/* 外网通道的三种状态。用颜色区分「可用 / 未就绪 / 未安装」——
   文字标签本身已经说清了，颜色只是让眼睛先扫到哪条能点。 */
.dshrl-badge.is-ok {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #37c26a) 18%, transparent);
  color: var(--dsw-alias-state-success-primary, #37c26a);
}
.dshrl-badge.is-warn {
  background: color-mix(in srgb, var(--dsw-alias-state-warning-primary, #f5a623) 18%, transparent);
  color: var(--dsw-alias-state-warning-primary, #f5a623);
}
.dshrl-badge.is-off {
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-tertiary, #8b8b93);
}

.dshrl-tuns {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dshrl-tun {
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  padding: 10px 12px;
}
.dshrl-tun-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dshrl-tun-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #fff);
}
/* 卡片里已经有边框了，里面这条地址不能再叠一层视觉重量 */
.dshrl-tun .dshrl-link {
  margin-top: 8px;
  background: var(--dsw-alias-bg-layer-2, #1f1f24);
}
.dshrl-tun .dshrl-sub {
  margin-top: 8px;
}

.dshrl-empty {
  padding: 18px 0 8px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary, #8b8b93);
  font-size: 12.5px;
}

.dshrl-field { display: flex; gap: 8px; align-items: center; }
.dshrl-input {
  flex: 1;
  min-width: 0;
  appearance: none;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 8px;
  color: var(--dsw-alias-label-primary, #e8e8ea);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  padding: 7px 9px;
  outline: none;
}
.dshrl-input:focus { border-color: var(--dsw-alias-brand-primary, #4d6bfe); }

.dshrl-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0 0;
  border-top: 1px solid var(--dsw-alias-border-l2, #33333a);
  margin-top: 10px;
}
.dshrl-switch-text { flex: 1; min-width: 0; }
.dshrl-switch-desc { font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #8b8b93); }
.dshrl-toggle {
  position: relative;
  flex: none;
  width: 40px; height: 22px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-secondary, #3d3d46);
  background: var(--dsw-alias-bg-layer-1, #17171a);
  cursor: pointer;
  transition: background .16s, border-color .16s;
  padding: 0;
}
.dshrl-toggle::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #8b8b93);
  transition: transform .16s, background .16s;
}
.dshrl-toggle.is-on {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 30%, transparent);
  border-color: var(--dsw-alias-brand-primary, #4d6bfe);
}
.dshrl-toggle.is-on::after {
  transform: translateX(18px);
  background: var(--dsw-alias-brand-primary, #4d6bfe);
}

.dshrl-steps { margin: 0; padding: 0; list-style: none; counter-reset: s; }
.dshrl-steps li {
  position: relative;
  counter-increment: s;
  padding: 0 0 12px 30px;
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary, #b9b9c0);
}
.dshrl-steps li:last-child { padding-bottom: 0; }
.dshrl-steps li::before {
  content: counter(s);
  position: absolute;
  left: 0; top: 1px;
  width: 19px; height: 19px;
  border-radius: 50%;
  display: grid; place-items: center;
  font-size: 11px;
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  color: var(--dsw-alias-label-secondary, #b9b9c0);
}
.dshrl-steps code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  background: var(--dsw-alias-bg-layer-1, #17171a);
  border: 1px solid var(--dsw-alias-border-l2, #33333a);
  border-radius: 5px;
  padding: 1px 5px;
}

.dshrl-events { display: flex; flex-direction: column; gap: 7px; max-height: 210px; overflow: auto; }
.dshrl-event { display: flex; gap: 8px; font-size: 11.5px; min-width: 0; }
.dshrl-event-time { flex: none; color: var(--dsw-alias-label-tertiary, #8b8b93); font-family: ui-monospace, monospace; }
.dshrl-event-text { min-width: 0; word-break: break-word; color: var(--dsw-alias-label-secondary, #b9b9c0); }

.dshrl-banner {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 34%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 10%, transparent);
  font-size: 12.5px;
  color: var(--dsw-alias-label-primary, #e8e8ea);
}
.dshrl-banner-warn {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13a) 34%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13a) 10%, transparent);
}

.dshrl-toast {
  position: fixed;
  left: 50%;
  bottom: 30px;
  transform: translateX(-50%);
  background: var(--dsw-alias-bg-layer-3, #2a2a30);
  border: 1px solid var(--dsw-alias-border-secondary, #3d3d46);
  color: var(--dsw-alias-label-primary, #e8e8ea);
  border-radius: 9px;
  padding: 9px 16px;
  font-size: 12.5px;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .28);
}
`

/** 注入样式；返回卸载函数。 */
export function installStyles() {
  const existing = document.getElementById(STYLE_ID)
  if (existing) existing.remove()
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.dataset.dshRemoteLink = '1'
  el.textContent = CSS
  document.head.appendChild(el)
  return () => {
    el.remove()
  }
}
