/**
 * 二维码：把连接串做成能直接扫的图。
 *
 * 用 `qrcode-generator`（Kazuhiko Arase，MIT）而不是自己写编码器 —— QR 的
 * 纠错分块与掩码选择错一处就是「能看不能扫」，而这个包已被大量项目验证过。
 * 它会被打进 client bundle（约 20 KB），所以装插件的用户不需要任何 npm 安装。
 *
 * 渲染成**一条 path**：176px 的图有 30~50 行模块，逐个画 `<rect>` 会产生上千
 * 个节点，每次轮询重渲染都会卡一下。单 path 只有一个节点。
 *
 * @module dsh-remote-link/qr
 */

import qrcode from 'qrcode-generator'

/**
 * 生成二维码的 SVG path 数据（坐标系 = 模块坐标，由 viewBox 缩放）。
 *
 * @param {string} text 要编码的内容
 * @returns {string} `d` 属性；空字符串表示生成失败
 */
export function qrPath(text) {
  try {
    // 0 = 自动选版本；'M' 纠错（约 15% 冗余，屏幕扫描足够，也让码不至于太密）。
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    const count = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`
      }
    }
    return d
  } catch {
    return ''
  }
}

/** 二维码模块数（用于 viewBox）。失败时给一个安全值。 */
export function qrSize(text) {
  try {
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    return qr.getModuleCount()
  } catch {
    return 25
  }
}
