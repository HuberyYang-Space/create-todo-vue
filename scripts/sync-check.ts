// CTV-48：拉官方 create-vite 的模板 package.json，跟我们的逐项比对。
// 联网，所以只手动跑——E2E 铁律是不联网，CI 里也不该因为上游发版而变红。
import process from 'node:process'

interface DepMap {
  [name: string]: string | undefined
}

interface DepDiff {
  name: string
  ours?: string
  theirs?: string
}

const TEMPLATES = ['vanilla', 'vanilla-ts', 'vue', 'vue-ts', 'lit', 'lit-ts']
const UPSTREAM = 'https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite'

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

async function main() {
  let drifted = 0
  for (const name of TEMPLATES) {
    const res = await fetch(`${UPSTREAM}/template-${name}/package.json`)
    if (!res.ok) {
      console.error(`✗ template-${name}: 拉取上游失败 HTTP ${res.status}`)
      drifted++
      continue
    }
    const theirs = flatten(await res.json())
    const ours = flatten(
      JSON.parse(await (await import('node:fs/promises')).readFile(
        new URL(`../template-${name}/package.json`, import.meta.url),
        'utf8',
      )),
    )
    const diff = diffDeps(ours, theirs)
    if (diff.length === 0) {
      console.log(`✓ template-${name}`)
      continue
    }
    drifted += diff.length
    console.log(`✗ template-${name}`)
    for (const d of diff)
      console.log(`    ${d.name}: 我们 ${d.ours ?? '（无）'} / 官方 ${d.theirs ?? '（无）'}`)
  }
  console.log(drifted === 0 ? '\n与官方一致。' : `\n共 ${drifted} 处漂移。`)
  process.exitCode = drifted === 0 ? 0 : 1
}

// 被测试 import 时不执行 main，只有直接跑脚本才执行
if (import.meta.url === `file://${process.argv[1]}`)
  await main()
