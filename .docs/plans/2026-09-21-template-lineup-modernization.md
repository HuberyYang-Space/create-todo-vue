# 模板阵容现代化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把六个内置模板的依赖对齐 Vite 官方 create-vite，删掉两个已腐烂/不属官方阵容的 vitesse 转交变体，并加一个手动跑的防漂移脚本。

**Architecture:** 三条互相独立的改动，各自带测试与提交。CTV-46 只改六个 `template-*/package.json` 的版本号；CTV-47 只改 `src/constants/index.ts` 的注册表加五处测试与 README；CTV-48 新增 `scripts/sync-check.ts` 与一个纯函数单测。三者之间没有依赖，可按任意顺序执行，但建议按编号顺序以便发版时归档。

**Tech Stack:** TypeScript 6 / tsdown / vitest（单测 + E2E 两套配置）/ pnpm 11 / @antfu/eslint-config

**Spec:** [`.docs/specs/2026-09-21-template-lineup-modernization-design.md`](../specs/2026-09-21-template-lineup-modernization-design.md)

## Global Constraints

- **模板依赖版本以 create-vite 官方为准，不追 npm 最新。** 官方当前值（2026-09-21 实测）：
  `vite@^8.3.0`、`vue@^3.5.42`、`typescript@~6.0.2`、`@types/node@^24.13.5`、
  `@vue/tsconfig@^0.9.1`、`vue-tsc@^3.3.11`、`@vitejs/plugin-vue@^6.0.9`、`lit@^3.3.3`。
- **`@types/node` 主版本必须跟 `engines`（`^20.19.0 || >=22.12.0`）对齐，不得升到 26。**
- **`template-vue-dev` 不在本次同步范围内**——它来自 `Hub-yang/my-vue-dev-template`，有独立上游。
- **模板改动必须真装一次、真构建一次，npm 与 pnpm 都要跑**（四条验证标准第三条）。
- **E2E 不许联网**，`sync:check` 只能手动跑，不进 CI、不进 `build:prod`。
- 代码注释中文；commit message 英文走 Conventional Commits；提交走 `/commit` skill。
- `src/` 里不许出现 `process.exit()`。

---

### Task 1（CTV-46）：六个内置模板依赖对齐官方

**Files:**
- Modify: `template-vanilla/package.json`、`template-vanilla-ts/package.json`、
  `template-vue/package.json`、`template-vue-ts/package.json`、
  `template-lit/package.json`、`template-lit-ts/package.json`
- Modify: `tests/constants.test.ts`（在既有的 vite 主版本断言之后追加两条）
- Modify: `CLAUDE.md`（补契约第 3 条）、`.docs/templates.md`（收容被腾出的证据）

**Interfaces:**
- Consumes: 无（不依赖其它任务）
- Produces: 无新导出。后续任务不依赖本任务。

- [ ] **Step 1: 写两条会红的测试**

追加到 `tests/constants.test.ts` 里既有的 `it('内置模板的 vite 主版本不低于 8...')` 之后，
放在同一个 describe 内：

```ts
  /**
   * CTV-46：typescript 跨大版本对齐官方（5.9 → 6.0）。这三个模板不装 eslint，
   * 所以不受本仓库「TS 压在 6.x 是因为 typescript-eslint peer 卡 <6.1.0」那条约束——
   * 那条只管本仓库和 template-vue-dev。
   */
  it('TS 模板的 typescript 主版本不低于 6（对齐官方 create-vite）', () => {
    for (const name of ['vanilla-ts', 'lit-ts', 'vue-ts']) {
      const pkg = JSON.parse(fs.readFileSync(
        path.join(repoRoot, `template-${name}`, 'package.json'),
        'utf-8',
      ))
      const range: string | undefined = pkg.devDependencies?.typescript
      expect(range, `template-${name} 没有声明 typescript`).toBeTruthy()
      const major = Number.parseInt(range!.replace(/^\D*/, ''), 10)
      expect(major, `template-${name} 声明的是 typescript ${range}，官方已在 ~6.0.2`)
        .toBeGreaterThanOrEqual(6)
    }
  })

  /**
   * CTV-46：@types/node 的主版本要跟 engines（^20.19.0 || >=22.12.0）对齐。
   * npm 上最新是 26.x，官方刻意停在 24——追最新等于给 Node 20 用户发错类型。
   * 这条断言的方向是「不得过高」，专门挡住「顺手升到最新」。
   */
  it('@types/node 主版本不高于 24（要跟 engines 声明的 Node 版本对齐）', () => {
    const pkg = JSON.parse(fs.readFileSync(
      path.join(repoRoot, 'template-vue-ts', 'package.json'),
      'utf-8',
    ))
    const range: string | undefined = pkg.devDependencies?.['@types/node']
    expect(range, 'template-vue-ts 没有声明 @types/node').toBeTruthy()
    const major = Number.parseInt(range!.replace(/^\D*/, ''), 10)
    expect(major, `template-vue-ts 声明的是 @types/node ${range}，engines 只支持到 Node 22`)
      .toBeLessThanOrEqual(24)
  })
```

上面用的 `fs` / `path` / `repoRoot` 在 `tests/constants.test.ts` 里都已存在
（既有的 vite 主版本断言就是这么写的），**照抄它的形状，不要新造 helper 抽象**。

- [ ] **Step 2: 跑测试确认第一条红、第二条绿**

Run: `pnpm vitest run tests/constants.test.ts`
Expected: `typescript 主版本不低于 6` **FAIL**（当前是 `~5.9.3`，major 解析为 5）；
`@types/node 主版本不高于 24` PASS（当前 `^24.10.9`，本就满足——它是防回退的守卫，不是本次要修的红灯）。

- [ ] **Step 3: 改六个模板的 package.json**

逐项替换（只改版本号字符串，不动 key 顺序、不动 scripts）：

| 文件 | 改动 |
|:--|:--|
| `template-vanilla/package.json` | `"vite": "^8.2.2"` → `"^8.3.0"` |
| `template-vanilla-ts/package.json` | `"typescript": "~5.9.3"` → `"~6.0.2"`；`"vite": "^8.2.2"` → `"^8.3.0"` |
| `template-vue/package.json` | `"vue": "^3.5.27"` → `"^3.5.42"`；`"@vitejs/plugin-vue": "^6.0.8"` → `"^6.0.9"`；`"vite": "^8.2.2"` → `"^8.3.0"` |
| `template-vue-ts/package.json` | `"vue": "^3.5.27"` → `"^3.5.42"`；`"@types/node": "^24.10.9"` → `"^24.13.5"`；`"@vitejs/plugin-vue": "^6.0.8"` → `"^6.0.9"`；`"@vue/tsconfig": "^0.8.1"` → `"^0.9.1"`；`"typescript": "~5.9.3"` → `"~6.0.2"`；`"vite": "^8.2.2"` → `"^8.3.0"`；`"vue-tsc": "^3.2.4"` → `"^3.3.11"` |
| `template-lit/package.json` | `"lit": "^3.3.2"` → `"^3.3.3"`；`"vite": "^8.2.2"` → `"^8.3.0"` |
| `template-lit-ts/package.json` | `"lit": "^3.3.2"` → `"^3.3.3"`；`"typescript": "~5.9.3"` → `"~6.0.2"`；`"vite": "^8.2.2"` → `"^8.3.0"` |

- [ ] **Step 4: 跑测试确认转绿**

Run: `pnpm vitest run tests/constants.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: 真装真构建（四条验证标准第三条，不能跳）**

对 `vanilla-ts`、`vue-ts`、`lit-ts` 三个 TS 模板（TS 跨了大版本，它们是风险面）
各做一遍，**npm 与 pnpm 都跑**。在仓库外的临时目录操作：

```bash
cd "$(mktemp -d)"
node /绝对路径/create-todo-vue/bin/index.js probe-vue-ts -t vue-ts --overwrite --no-immediate
cd probe-vue-ts
npm install   && npm run build   ; echo "npm  build 退出码 $?"
rm -rf node_modules package-lock.json
pnpm install  && pnpm build      ; echo "pnpm build 退出码 $?"
```

Expected: 四条命令退出码全部为 0。
**`vue-ts` 尤其要看 `vue-tsc -b` 这一步**——CTV-43 的 `TS7016` 就是只有真构建才暴露的，
而本次动的正是 `typescript` 与 `@vue/tsconfig` 两个直接影响它的包。
**把真实输出贴进报告**，不要只说「通过」。

- [ ] **Step 6: 在 CLAUDE.md 补契约第 3 条，并腾出体积**

⚠️ `CLAUDE.md` 当前 12 285 字节，预算 12 288，**只剩 3 字节**。先腾后加：

腾：把「模板」一节里 `vite` 主版本那条的证据句删短——
`- **`vite` 主版本必须 ≥ 8。** vite 7 依赖 esbuild 的 build script，pnpm 11 遇到未放行的 build script
**直接退出码 1**，用 pnpm 的用户全都装不上。**不要用「给每个模板补一份放行 esbuild 的
`pnpm-workspace.yaml`」来绕。**`
改成
`- **`vite` 主版本必须 ≥ 8。** vite 7 带 esbuild 的 build script，pnpm 11 未放行会直接退 1，
用 pnpm 的用户全装不上。**不要用「给模板补一份放行 esbuild 的 `pnpm-workspace.yaml`」来绕。**`

加：在同一节追加
`- **模板依赖版本以 create-vite 官方为准，不追 npm 最新。** `@types/node` 主版本要跟 `engines`
对齐（官方停在 24 而非 26，追最新等于给 Node 20 用户发错类型）。同步方式见 `pnpm sync:check`。`

然后 `wc -c CLAUDE.md` 确认 ≤ 12288。删掉的证据原文追加进 `.docs/templates.md`。

- [ ] **Step 7: 跑完整门禁并提交**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: 三条全绿。然后走 `/commit` skill 提交，message 用英文，形如
`chore(templates): align built-in template deps with upstream create-vite`。

---

### Task 2（CTV-47）：删除两个 vitesse 转交变体

**Files:**
- Modify: `src/constants/index.ts:102-119`（删两个变体对象与那段注释）
- Modify: `tests/constants.test.ts:39-40`（硬编码清单）、`tests/constants.test.ts:315-316`（注释举例）
- Modify: `tests/entry.test.ts:113-114`（注册表污染钉子的硬编码期望）
- Modify: `tests/utils.test.ts:177-235`（fixture 改指 `nuxi init`）
- Modify: `README.md:98-99`（删两行）
- Modify: `CLAUDE.md`（补契约第 1、2 条）

**Interfaces:**
- Consumes: 无
- Produces: `TEMPLATES` 从 12 项减到 10 项。`FRAMEWORKS` 的 vue 分支 variants 从 6 减到 4。

- [ ] **Step 1: 先改期望值，让测试变红**

`tests/constants.test.ts` 第 39-40 行，删掉这两行：

```text
      'custom-vitesse',
      'custom-vitesse-lite',
```

`tests/entry.test.ts` 第 113-114 行，删掉同样两行。

`README.md` 第 98-99 行，删掉：

```markdown
- `custom-vitesse` → `degit antfu-collective/vitesse`（Vitesse）
- `custom-vitesse-lite` → `degit antfu-collective/vitesse-lite`（Vitesse Lite）
```

- [ ] **Step 2: 跑测试确认它红**

Run: `pnpm vitest run tests/constants.test.ts tests/entry.test.ts`
Expected: **FAIL**。至少三条：`TEMPLATES 恰好是 FRAMEWORKS 派生出的全部变体名`（实际仍有 12 项）、
`README 与 TEMPLATES 对不上`、`entry.test.ts` 的注册表钉子。
**看到红再往下走**——没红说明改错了地方。

- [ ] **Step 3: 从注册表里删掉两个变体**

`src/constants/index.ts`，删掉第 102-119 行整块（含 CTV-30 那段注释与两个变体对象）：

```text
      // CTV-30：vitesse 曾经是仓库内置的两份副本，因为用了 pnpm 的 catalog: 协议
      // 却没有对应的 pnpm-workspace.yaml 而 100% 装不上，v1.1.0 下架。
      // 现在改为转交上游，仓库里不再留副本。
      // 注意仓库地址：上游已从 antfu/ 迁到 antfu-collective/，旧地址靠 GitHub 重定向撑着。
      {
        name: 'custom-vitesse',
        display: 'Vitesse ↗',
        link: 'https://github.com/antfu-collective/vitesse',
        color: greenBright,
        customCommand: 'npm exec degit antfu-collective/vitesse TARGET_DIR',
      },
      {
        name: 'custom-vitesse-lite',
        display: 'Vitesse Lite ↗',
        link: 'https://github.com/antfu-collective/vitesse-lite',
        color: greenBright,
        customCommand: 'npm exec degit antfu-collective/vitesse-lite TARGET_DIR',
      },
```

**第 20 行的 `greenBright` import 不要动**——已查实它在 `custom-create-vue`（第 92 行）
与 `custom-nuxt`（第 99 行）仍在使用，删掉会把这两个变体的配色弄丢。

- [ ] **Step 4: 跑测试确认转绿**

Run: `pnpm vitest run tests/constants.test.ts tests/entry.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: 修掉两处会变成孤儿的引用**

`tests/constants.test.ts` 第 315-316 行的注释，`custom-vitesse` ⊂ `custom-vitesse-lite`
这个举例已不存在，改用仍然成立的一对：

```ts
  // help 里「可用模板」区块的所有词。**按空白切成词、而不是拿 HELP_MESSAGE 做子串匹配**：
  // 模板名之间存在包含关系（`vue` 是 `vue-ts` 的子串，`lit` 是 `lit-ts` 的子串），
  // 子串匹配会让「漏掉短的那个」全绿蒙混过去。
```

`tests/utils.test.ts` 第 177-178 行的 fixture 改指到仍在阵容里的 nuxt，
并把下面 177-235 行区间内所有 `antfu-collective/vitesse-lite` / `antfu-collective/vitesse`
的期望值同步改掉：

```ts
  const DEGIT = 'npm exec nuxi init TARGET_DIR'
```

`DEGIT_LITE` 那一组整组删掉——它原本只是为了覆盖「同一前缀的第二个指令」，
而 `custom-create-vue`（`npm create`）与 `custom-vike-vue`（`npm create -- `）已经覆盖了
另外两种前缀语法。**改完必须重跑 `pnpm vitest run tests/utils.test.ts` 确认五个包管理器
的改写分支仍然各有断言**（`npm exec` → `pnpm dlx` / `yarn dlx` / `bun x` / `deno run -A npm:`）。

- [ ] **Step 6: 在 CLAUDE.md 补契约第 1、2 条**

在「模板」一节追加：

```markdown
- **只镜像 vanilla / vue / lit 三个框架**，官方 create-vite 其余十几个（react / svelte /
  solid / preact / qwik / angular…）刻意不补——库的重心是 Vue，补齐会让模板目录、tarball
  体积与测试矩阵成倍增长。**这不是疏漏，不要「顺手补上」。**
- **`custom-*` 只列官方 create-vite 列的转交目标。** 自己加的要自担上游腐烂风险：
  vitesse 是 CTV-30 自己加的，停更 7 个月、catalog 还锁着 vite 7 才被发现（CTV-47 已删）。
```

同样受 12 288 字节预算约束，不够就继续外放证据到 `.docs/templates.md`。

- [ ] **Step 7: 跑完整门禁（含 E2E）并提交**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```
Expected: 全绿。E2E 必须跑——`cli-basics.e2e.test.ts` 与 `scaffold.e2e.test.ts` 都有
依赖模板清单的断言。然后走 `/commit` skill，message 形如
`feat(templates)!: drop the two vitesse passthrough variants`。
**`!` 标记是有意的**：这是 breaking change。

---

### Task 3（CTV-48）：`pnpm sync:check` 防漂移脚本

**Files:**
- Create: `scripts/sync-check.ts`
- Modify: `tsconfig.json`（`include` 加 `"scripts"`）
- Create: `tests/sync-check.test.ts`
- Modify: `package.json`（加一条 script）
- Modify: `.docs/toolchain.md`（记一段用法与「为什么不进 CI」）

**Interfaces:**
- Consumes: 无
- Produces: `scripts/sync-check.ts` 导出纯函数
  `diffDeps(ours: Record<string,string>, theirs: Record<string,string>): Array<{ name: string, ours?: string, theirs?: string }>`，
  按 `name` 升序返回两边不一致的项；两边都有且相等的不返回。

- [ ] **Step 1: 写会红的单测**

新建 `tests/sync-check.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { diffDeps } from '../scripts/sync-check.ts'

describe('diffDeps', () => {
  it('两边完全一致时没有差异', () => {
    expect(diffDeps({ vite: '^8.3.0' }, { vite: '^8.3.0' })).toEqual([])
  })

  it('版本不同要报出来，并同时带上两边的值', () => {
    expect(diffDeps({ vite: '^8.2.2' }, { vite: '^8.3.0' }))
      .toEqual([{ name: 'vite', ours: '^8.2.2', theirs: '^8.3.0' }])
  })

  it('只有我们有的依赖（官方已删）要报出来', () => {
    expect(diffDeps({ foo: '^1.0.0' }, {}))
      .toEqual([{ name: 'foo', ours: '^1.0.0', theirs: undefined }])
  })

  it('只有官方有的依赖（我们漏了）要报出来', () => {
    expect(diffDeps({}, { bar: '^2.0.0' }))
      .toEqual([{ name: 'bar', ours: undefined, theirs: '^2.0.0' }])
  })

  it('结果按名字升序，跟入参顺序无关', () => {
    const out = diffDeps({ zzz: '1', aaa: '1' }, { zzz: '2', aaa: '2' })
    expect(out.map(d => d.name)).toEqual(['aaa', 'zzz'])
  })
})
```

- [ ] **Step 2: 跑测试确认它红**

Run: `pnpm vitest run tests/sync-check.test.ts`
Expected: FAIL，报找不到模块 `../scripts/sync-check.ts`。

- [ ] **Step 3: 写脚本**

新建 `scripts/sync-check.ts`，并把 `tsconfig.json` 的 `include` 从 `["src", "tests"]`
改成 `["src", "tests", "scripts"]`：

```ts
// CTV-48：拉官方 create-vite 的模板 package.json，跟我们的逐项比对。
// 联网，所以只手动跑——E2E 铁律是不联网，CI 里也不该因为上游发版而变红。

const TEMPLATES = ['vanilla', 'vanilla-ts', 'vue', 'vue-ts', 'lit', 'lit-ts']
const UPSTREAM = 'https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite'

/**
 * 比对两份依赖表，返回不一致项（按名字升序）。
 * 纯函数，网络部分留在外面，测试才不需要联网。
 */
export function diffDeps(ours, theirs) {
  const names = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])].sort()
  return names
    .filter(name => ours[name] !== theirs[name])
    .map(name => ({ name, ours: ours[name], theirs: theirs[name] }))
}

function flatten(pkg) {
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
```

两条约束：

- **`process.exitCode` 而不是 `process.exit()`**——虽然这是 `scripts/` 不是 `src/`，
  同一条理由成立（会截断未冲刷的 stdout）。
- **直接用 `node ./scripts/sync-check.ts` 跑，不引入 tsx/ts-node**。Node 22.18+ 与 24+
  默认支持类型剥离，而本仓库 devDependencies 里的 `tsdown` 已经要求 `^22.18.0 || >=24.11.0`，
  所以任何能开发本仓库的环境都跑得动。

- [ ] **Step 4: 跑测试确认转绿**

Run: `pnpm vitest run tests/sync-check.test.ts`
Expected: 5 条全部 PASS。

- [ ] **Step 5: 用变异证明断言有牙齿**

把 `diffDeps` 里的 `.sort()` 删掉，重跑测试：`结果按名字升序` 那条**必须变红**。
再把 `ours[name] !== theirs[name]` 改成 `===`，重跑：前四条**必须变红**。
两次都确认后**还原源码并 `git diff` 校验**，确保没留下改动。

- [ ] **Step 6: 加 script 并真跑一次**

`package.json` 的 `scripts` 里，在 `"taze"` 之前插入：

```text
    "sync:check": "node ./scripts/sync-check.ts",
```

**不要动 `build:prod`**——这个脚本联网，不进门禁。

Run: `pnpm sync:check`
Expected: 若 Task 1 已完成，六个模板全部 `✓`，退出码 0。若尚未完成，会列出 8 处漂移、退出码 1；
两种结果都算这一步通过，**要把真实输出贴进报告**。

- [ ] **Step 7: 记进 `.docs/toolchain.md` 并提交**

在 `.docs/toolchain.md` 的「本地门禁与依赖升级」一节追加一段，写清：用法、
**为什么不进 CI**（联网、会因上游发版而无故变红）、以及它与 `pnpm taze` 的分工
（taze 管「升到最新」，sync:check 管「跟官方一致」，本仓库要的是后者）。

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: 全绿。然后走 `/commit` skill，message 形如
`feat(scripts): add sync:check to detect template drift from create-vite`。

---

## 收尾（三条都做完之后）

- [ ] 在 [`.docs/roadmap.md`](../roadmap.md) 把 CTV-46/47/48 标 ✅、清空「进行中」，
      并在 [`.docs/timeline.md`](../timeline.md) 补一行（写清实测证据，不是「做完了」）。
- [ ] 把三条契约是否真的进了 `CLAUDE.md` 复核一遍，且 `wc -c CLAUDE.md` ≤ 12288。
- [ ] **版本号交给 Hubery 定**：CTV-47 是 breaking change，major 还是 minor 由改动性质定。
      Claude 到发版这一步停手。
