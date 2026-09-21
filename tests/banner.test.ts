import { describe, expect, it } from 'vitest'
import { renderBannerLines, resolveBannerMode } from '../src/banner'
import { PKG_NAME, REPO_URL } from '../src/constants'

/**
 * 头部字标。照搬 @huberyyang/todo-scripts 的实现与观感。
 *
 * 这里测的是**两个纯函数**：「该用哪种模式」和「某种模式下打出哪几行」。
 * 真正的 `banner()` 只是把 `process.stdout` 的状态喂给它们再逐行 print，
 * 那一层由 E2E 对着真实进程的 stdout 断言——两边刻意不重叠。
 */

/** 去掉颜色/超链接转义序列，只留可见字符。量宽度和判文本都得先过这一道 */
// eslint-disable-next-line no-control-regex
const ANSI = /\u001B\]8;;.*?\u0007|\u001B\[[\d;]*m/g
function plain(text: string): string {
  return text.replace(ANSI, '')
}

function lines(overrides: Partial<Parameters<typeof renderBannerLines>[0]> = {}) {
  return renderBannerLines({
    version: '1.10.0',
    author: 'HuberyYang',
    mode: 'gradient',
    supportsLink: false,
    ...overrides,
  })
}

describe('resolveBannerMode · 挑渲染模式', () => {
  it('终端够宽且能渲染时用渐变字标', () => {
    expect(resolveBannerMode(120, true)).toBe('gradient')
  })

  /**
   * 判据是两条**独立**的：不是 TTY / 不支持颜色（canRenderGradient 为 false），
   * 与宽度不够。分开测是因为「宽度够就渲染」这个变异只会在第二条上翻车。
   */
  it('不能渲染颜色时哪怕终端再宽也退回纯文本', () => {
    expect(resolveBannerMode(500, false)).toBe('plain')
  })

  it('终端太窄时退回纯文本', () => {
    expect(resolveBannerMode(40, true)).toBe('plain')
  })

  /** `process.stdout.columns` 取不到时 `banner()` 传进来的是 0 */
  it('拿不到终端宽度（0）时退回纯文本', () => {
    expect(resolveBannerMode(0, true)).toBe('plain')
  })
})

describe('renderBannerLines · 渐变模式', () => {
  it('首尾各留一个空行', () => {
    const out = lines()

    expect(out[0]).toBe('')
    expect(out.at(-1)).toBe('')
  })

  it('打出 ANSI Shadow 字标而不是纯品牌名', () => {
    const wordmark = lines()[1]

    expect(plain(wordmark)).toContain('█')
    expect(plain(wordmark).split('\n').length).toBeGreaterThan(1)
  })

  /**
   * ⚠️ **「字标上没上渐变色」这条没有自动化守卫。**
   *
   * gradient-string 底下是 chalk，而 chalk 在非 TTY 下 level 为 0，
   * `gradient(...).multiline(x)` 原样返回 x——测试进程里永远量不出颜色。
   * 拿 FORCE_COLOR 硬撑等于在测 chalk 而不是测这里的代码。
   * 配色只能在真实终端里看，改渐变色时别指望这个文件会变红。
   */
})

describe('renderBannerLines · 纯文本模式', () => {
  it('只打品牌名，不打字标', () => {
    const out = lines({ mode: 'plain' })

    expect(plain(out[1])).toBe('TODO-VUE')
  })
})

describe('renderBannerLines · 版本行', () => {
  it('形如 `v<版本> - <作者>`', () => {
    const out = lines({ version: '9.9.9', author: 'Somebody' })

    expect(plain(out[2])).toBe('v9.9.9 - Somebody')
  })

  /**
   * 终端不支持 OSC 8 超链接时，仓库地址无处可挂，只能单独明文补一行——
   * 否则用户连这个工具是哪个仓库都无从得知（截图里就是这一行）。
   */
  it('不支持超链接时补一行明文仓库地址', () => {
    const out = lines({ supportsLink: false })

    expect(plain(out[3])).toBe(`(${REPO_URL})`)
  })

  it('支持超链接时不再补那行明文地址', () => {
    const out = lines({ supportsLink: true })

    expect(out.map(plain)).not.toContain(`(${REPO_URL})`)
  })

  it('支持超链接时版本号链到 npm 包页', () => {
    const versionLine = lines({ supportsLink: true })[2]

    expect(versionLine).toContain(`https://www.npmjs.com/package/${PKG_NAME}`)
  })

  it('支持超链接时作者链到仓库', () => {
    const versionLine = lines({ supportsLink: true })[2]

    expect(versionLine).toContain(REPO_URL)
  })
})

/**
 * ⚠️ 阈值与字标宽度必须同进退。
 *
 * `BANNER_MIN_WIDTH` 是手工量出来再加余量的常量，而字标宽度取决于 `BRAND_NAME`
 * 有几个字母——改了品牌名却忘了改阈值，字标就会在刚好触发渐变的那档宽度上折行，
 * 而**所有其它测试照样全绿**（它们都不量宽度）。这条是那件事唯一的钉子。
 */
describe('字标宽度与触发阈值', () => {
  /** 逐列试探出「最窄的仍判为 gradient 的宽度」，免得为测试把阈值常量导出去 */
  function gradientThreshold(): number {
    for (let columns = 1; columns <= 500; columns++) {
      if (resolveBannerMode(columns, true) === 'gradient') {
        return columns
      }
    }
    return Number.POSITIVE_INFINITY
  }

  it('字标在触发渐变的最小宽度下放得进去，不会折行', () => {
    const wordmark = plain(lines()[1])
    const width = Math.max(...wordmark.split('\n').map(line => line.length))

    expect(width).toBeLessThanOrEqual(gradientThreshold())
  })
})
