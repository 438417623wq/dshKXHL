/**
 * 本地预览用的 React 引导：把宿主平台模块表里的 react / react-dom 摆到全局，
 * 后面的 client bundle 就能像在 DSH 里一样 `require('react')`。
 *
 * 仅开发期使用，不进产物、不随插件发布。
 */
import * as React from 'react'
import { createRoot } from 'react-dom/client'

window.React = React
window.__createRoot = createRoot
