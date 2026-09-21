import process from 'node:process'
import figlet from 'figlet'
import gradient from 'gradient-string'
import colors from 'picocolors'
import terminalLink from 'terminal-link'
import bannerFont from './assets/ansi-shadow-subset'
import { PKG_NAME, REPO_URL } from './constants'
import { getPkgMeta } from './utils'

/**
 * 头部字标。与 @huberyyang/todo-scripts 共用一套观感：同一个字体、同一组渐变色、
 * 同样的「版本 - 作者」尾行，两个工具摆在一起像一家出的。
 *
 * 本模块只负责**打这几行字**，不碰终端的其它状态（框线、光标那些归 `terminal.ts`）。
 * 三个只有它用得上的依赖（figlet / gradient-string / terminal-link）也收在这里，
 * 换字体或换渲染方式时只动这一个文件。
 */

const { bold, dim, isColorSupported } = colors

const BRAND_NAME = 'TODO-VUE'
const BANNER_FONT_NAME = 'create-todo-vue-banner'
/** figlet 的 'ANSI Shadow' 渲染 "TODO-VUE" 实测占 67 列宽，这里留一点余量 */
const BANNER_MIN_WIDTH = 72
const BANNER_GRADIENT_COLORS = ['#00c6ff', '#a34dff']

let isBannerFontRegistered = false

export type BannerMode = 'gradient' | 'plain'

export interface BannerInfo {
  version: string
  author: string
  mode: BannerMode
  /** 终端是否认 OSC 8 超链接。不认的话仓库地址只能明文单独占一行 */
  supportsLink: boolean
}

/**
 * 根据终端宽度和渲染能力，决定字标用渐变还是纯文本
 *
 * 纯函数，从不碰 `process.stdout`，好让这段判断被单测覆盖。
 * @param {number} columns - 终端可用的列宽
 * @param {boolean} canRenderGradient - 只有 stdout 是支持颜色的真实 TTY 时才为 true
 * @returns 该用哪种渲染模式
 */
export function resolveBannerMode(columns: number, canRenderGradient: boolean): BannerMode {
  if (!canRenderGradient) {
    return 'plain'
  }
  if (columns < BANNER_MIN_WIDTH) {
    return 'plain'
  }
  return 'gradient'
}

/**
 * 把字标渲染成待打印的若干行
 *
 * 同样是纯函数：环境探测全留给 `banner()`，这里只认参数。
 * @param {BannerInfo} info - 版本、作者与渲染能力
 * @returns 逐行的输出，直接按顺序 print 即可
 */
export function renderBannerLines(info: BannerInfo): string[] {
  const { version, author, mode, supportsLink } = info
  const out: string[] = ['']

  if (mode === 'gradient') {
    // figlet 的字体注册是全局副作用，重复注册纯属浪费——它每次都要重新解析整份字体文件
    if (!isBannerFontRegistered) {
      figlet.parseFont(BANNER_FONT_NAME, bannerFont)
      isBannerFontRegistered = true
    }
    const wordmark = figlet.textSync(BRAND_NAME, { font: BANNER_FONT_NAME })
    out.push(gradient(BANNER_GRADIENT_COLORS).multiline(wordmark))
  }
  else {
    out.push(bold(BRAND_NAME))
  }

  const versionLabel = dim(`v${version}`)
  const authorLabel = dim(author)
  const versionText = supportsLink
    ? terminalLink(versionLabel, `https://www.npmjs.com/package/${PKG_NAME}`)
    : versionLabel
  const authorText = supportsLink ? terminalLink(authorLabel, REPO_URL) : authorLabel

  out.push(`${versionText} ${dim('-')} ${authorText}`)
  if (!supportsLink) {
    out.push(dim(`(${REPO_URL})`))
  }
  out.push('')

  return out
}

/**
 * 打印头部字标
 *
 * 只有 stdout 是真实 TTY、支持颜色、且宽度够时才上渐变。win32 上光靠 picocolors
 * 不够——它报告支持颜色时并不检查是不是 TTY——所以这里显式查 `isTTY`，
 * 而不是从 `columns` 为 0 反推。
 * @param {string} startDir - 向上查找 package.json 的起点，由入口把 `import.meta.url`
 * 解析出的目录传进来（见 `src/index.ts` 里关于层级的那段注释）
 */
export function banner(startDir: string) {
  const { version, author } = getPkgMeta(startDir)
  const canRenderGradient = isColorSupported && Boolean(process.stdout.isTTY)
  const mode = resolveBannerMode(process.stdout.columns ?? 0, canRenderGradient)

  const lines = renderBannerLines({
    version,
    author,
    mode,
    supportsLink: terminalLink.isSupported,
  })
  for (const line of lines) {
    console.log(line)
  }
}
