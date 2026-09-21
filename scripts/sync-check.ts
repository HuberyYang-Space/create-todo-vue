// CTV-48：拉官方 create-vite 的模板 package.json，跟我们的逐项比对。
// 联网，所以只手动跑——E2E 铁律是不联网，CI 里也不该因为上游发版而变红。
import fs from 'node:fs/promises'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

interface DepMap {
  [name: string]: string | undefined
}

interface DepDiff {
  name: string
  ours?: string
  theirs?: string
}

interface Exemption {
  name: string
  reason: string
}

// 本仓库镜像 create-vite 的六个内置模板名。与 src/constants 的 FRAMEWORKS 是不同的源，
// 一致性由 tests/sync-check.test.ts 的一条断言钉住（脚本本身不 import src/，见该文件说明）。
export const MIRRORED_TEMPLATES = ['vanilla', 'vanilla-ts', 'vue', 'vue-ts', 'lit', 'lit-ts']
const UPSTREAM = 'https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite'

// 刻意偏离官方版本、不算漂移的依赖项，附上理由。
const EXEMPTIONS: Exemption[] = [
  { name: '@types/node', reason: '主版本跟 engines 声明的 Node 20/22 上限对齐，不追官方' },
]

/**
 * 比对两份依赖表，返回不一致项（按名字升序）。
 * 纯函数，网络部分留在外面，测试才不需要联网。
 */
export function diffDeps(ours: DepMap, theirs: DepMap): DepDiff[] {
  const names = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])].sort()
  return names
    .filter(name => ours[name] !== theirs[name])
    .map(name => ({ name, ours: ours[name], theirs: theirs[name] }))
}

/**
 * 合并 dependencies 与 devDependencies 成一张扁平表。
 * 同名依赖同时出现在两边时，devDependencies 的值覆盖 dependencies。
 */
export function flatten(pkg: { dependencies?: DepMap, devDependencies?: DepMap }): DepMap {
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

/**
 * 从一份 diff 里摘除命中例外表的项。
 * 命中的项单独打警告、不计入漂移，避免例外表之外的信息被吞掉。
 */
export function applyExemptions(diff: DepDiff[], exemptions: Exemption[]): { drift: DepDiff[], exempted: (DepDiff & { reason: string })[] } {
  const reasonByName = new Map(exemptions.map(e => [e.name, e.reason]))
  const drift: DepDiff[] = []
  const exempted: (DepDiff & { reason: string })[] = []
  for (const d of diff) {
    const reason = reasonByName.get(d.name)
    if (reason)
      exempted.push({ ...d, reason })
    else
      drift.push(d)
  }
  return { drift, exempted }
}

async function main() {
  let drifted = 0
  let failed = 0
  for (const name of MIRRORED_TEMPLATES) {
    let res: Response
    try {
      res = await fetch(`${UPSTREAM}/template-${name}/package.json`)
    }
    catch (err) {
      failed++
      console.error(`✗ template-${name}: 拉取上游失败（网络不可达）：${(err as Error).message}`)
      continue
    }
    if (!res.ok) {
      failed++
      console.error(`✗ template-${name}: 拉取上游失败 HTTP ${res.status}`)
      continue
    }
    const theirs = flatten(await res.json())
    const ours = flatten(
      JSON.parse(await fs.readFile(
        new URL(`../template-${name}/package.json`, import.meta.url),
        'utf8',
      )),
    )
    const { drift, exempted } = applyExemptions(diffDeps(ours, theirs), EXEMPTIONS)
    console.log(drift.length === 0 ? `✓ template-${name}` : `✗ template-${name}`)
    for (const e of exempted)
      console.log(`    ⚠ 刻意偏离（${e.reason}）：${e.name} 我们 ${e.ours ?? '（无）'} / 官方 ${e.theirs ?? '（无）'}`)
    if (drift.length > 0) {
      drifted += drift.length
      for (const d of drift)
        console.log(`    ${d.name}: 我们 ${d.ours ?? '（无）'} / 官方 ${d.theirs ?? '（无）'}`)
    }
  }
  if (failed > 0)
    console.error(`\n${failed} 个模板拉取失败，未参与比对，结果不完整。`)
  if (drifted > 0)
    console.log(`共 ${drifted} 处漂移。`)
  else if (failed === 0)
    console.log('与官方一致。')
  process.exitCode = (drifted === 0 && failed === 0) ? 0 : 1
}

// 被测试 import 时不执行 main，只有直接跑脚本才执行。
// import.meta.url 会做百分号编码（含空格/非 ASCII 路径时尤其明显），
// 手拼 `file://${process.argv[1]}` 不会，两者不等会导致这个判据静默失效。
if (import.meta.url === pathToFileURL(process.argv[1]).href)
  await main()
