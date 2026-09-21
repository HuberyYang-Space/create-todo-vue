import type { Fixture } from './helpers/fixture'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from './helpers/cli'
import { createFixture } from './helpers/fixture'

/**
 * 头部字标真的打在了用户的 stdout 上。
 *
 * 单测只管两个纯函数（该用哪种模式、某种模式下有哪几行），**把它们接到进程上**
 * 这一层只有这里管：环境探测对不对、打在哪一步、有没有污染到不该有它的路径。
 *
 * E2E 的子进程 stdin 是 'ignore'、`NO_COLOR=1`、`TERM=dumb`，于是必然走纯文本分支，
 * 也必然认不得 OSC 8 超链接——断言按这个前提写。渐变那一支在这里不可达，
 * 只能在真实终端里看（见 `src/banner.ts` 与 `tests/banner.test.ts` 的说明）。
 *
 * ⚠️ 文案硬编码，不从 `src/` 派生——期望值从被测源码来就退化成恒等式了。
 */
describe('头部字标', () => {
  let fixture: Fixture

  beforeEach(() => {
    fixture = createFixture()
  })

  afterEach((ctx) => {
    fixture.cleanup(ctx.task.result?.state === 'fail')
  })

  it('主流程开头打出品牌名', async () => {
    const result = await runCli(fixture, ['-t', 'vanilla', '--overwrite', '--no-immediate'])

    expect(result.stdout).toContain('TODO-VUE')
  })

  /** 终端不认超链接时，仓库地址只能明文单独占一行，否则用户无从得知这是哪个仓库 */
  it('不支持超链接的终端上补一行明文仓库地址', async () => {
    const result = await runCli(fixture, ['-t', 'vanilla', '--overwrite', '--no-immediate'])

    expect(result.stdout).toContain('(https://github.com/Hub-yang/create-todo-vue)')
  })

  /**
   * 顺序是关键：字标必须整个打完才轮到 clack 开框。
   * 排到 `intro()` 之后的话，字标会被打进框里、把 `┌` 和后续提示冲散。
   */
  it('字标排在 clack 的框线之前', async () => {
    const result = await runCli(fixture, ['-t', 'vanilla', '--overwrite', '--no-immediate'])

    const brandAt = result.stdout.indexOf('TODO-VUE')
    const frameAt = result.stdout.indexOf('┌')
    expect(brandAt).toBeGreaterThanOrEqual(0)
    expect(frameAt).toBeGreaterThanOrEqual(0)
    expect(brandAt).toBeLessThan(frameAt)
  })

  /**
   * CTV-45：界面上要能看出跑的是哪一版。
   *
   * 起因是 2026-09-10 的一次误诊：pnpm 默认的 `minimumReleaseAge`（24 小时内发布的
   * 版本一律不取）让 `pnpm create` 静默回退到 v1.6.1，而界面上没有任何版本线索，
   * 于是在一个早已修掉的旧版上白测了一轮。
   *
   * ⚠️ **这两条原本钉在框顶那一行**（`┌  create-todo-vue v1.9.0`）。版本号搬到字标
   * 下面之后，框顶不再带版本——守卫跟着搬到这里，条目本身没有被放弃。要是哪天字标
   * 也被拿掉，这两条必须再找个新家，不能直接删。
   *
   * 两条刻意分开：上面一条钉「真的打出来了、形状对」，下面一条钉「跟 `--version`
   * 不会漂」。期望值不从 `src/` 派生——版本号取自**另一条 CLI 路径的实际输出**，
   * 两者不同源，才不会退化成恒等式。
   */
  it('字标下面那行带上版本号与作者', async () => {
    const result = await runCli(fixture, ['-t', 'vanilla', '--overwrite', '--no-immediate'])

    expect(result.stdout).toMatch(/^v\d+\.\d+\.\d+ - HuberyYang$/m)
  })

  it('字标下面那行的版本号与 --version 的输出一致', async () => {
    const version = (await runCli(fixture, ['--version'])).stdout.trim()
    const result = await runCli(fixture, ['-t', 'vanilla', '--overwrite', '--no-immediate'])

    expect(result.stdout).toContain(`v${version} - HuberyYang`)
  })

  /**
   * ⚠️ `--version` 的 stdout 必须干净到能直接被 `$(...)` 吃掉。
   * 既有的「--version 输出与 package.json 一致」用整行相等钉着同一件事，
   * 这条是从反面再钉一次：字标一旦排到版本分支之前，两条会一起红。
   */
  it('--version 不打字标', async () => {
    const result = await runCli(fixture, ['--version'])

    expect(result.stdout).not.toContain('TODO-VUE')
  })

  it('--help 不打字标', async () => {
    const result = await runCli(fixture, ['--help'])

    expect(result.stdout).not.toContain('TODO-VUE')
  })

  /** 参数本身就写错时连框都不开，字标同样不该出现——那一屏只该有错误信息 */
  it('未知参数不打字标', async () => {
    const result = await runCli(fixture, ['--nope'])

    expect(result.exitCode).toBe(1)
    expect(result.stdout).not.toContain('TODO-VUE')
  })
})
