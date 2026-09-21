# 工具链与配置约定

**改依赖、改包管理器配置、改 `lint-staged` / `tsconfig` / `engines` 之前读这份。**
不读的后果：pnpm 11 的三条变更、TS 被压在 6.x 的原因、`engines` 与 devDependencies 的
区别，每一条都有人踩过；`pre-commit` 的 `--config` 漏掉会让提交挂死 7 分钟。

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。现役禁令在 [CLAUDE.md](../CLAUDE.md)。

---

## 包管理器与语言版本

**包管理器是 pnpm 11**（`packageManager` 字段锁定具体版本）。pnpm 11 有两个会咬人的变更：

- **`package.json` 的 `pnpm` 字段不再被读取**，pnpm 设置一律写在 **`pnpm-workspace.yaml`**。本仓库不是 monorepo，那个文件没有 `packages` 字段，纯粹用来放配置。
- **`.npmrc` 已删除**。它当时只有一行 `manage-package-manager-versions=true`，而 pnpm 11 **默认就开启这个行为**（把 `packageManager` 改成一个不存在的版本，pnpm 会真的去 registry 拉取并报错，以此实测确认），所以那一行是多余的。注意：这个键**不能**搬进 `pnpm-workspace.yaml`——pnpm 会警告 "not recognized ... and were ignored"，而 `pnpm config get` 仍会把它回显出来，很容易误判成生效了。
- **依赖带构建脚本却没被显式放行时，`pnpm install` 直接退出码 1**（pnpm 10 只是警告）。所以 `pnpm-workspace.yaml` 里有 `allowBuilds: { esbuild: true }`——esbuild 是经 vite ← vitest 传递进来的。注意设置名：pnpm 11 用 `allowBuilds` 映射，取代了 pnpm 10 的 `onlyBuiltDependencies` 数组。

`pnpm-workspace.yaml` 里另有三条设置（`minimumReleaseAgeExcludePrune` / `trustPolicy` / `shellEmulator`）是 `@antfu/eslint-config` 带的 `eslint-plugin-pnpm` 强制要求的，缺任何一条 `pnpm lint` 都会报 `pnpm/yaml-enforce-settings`；这些键还受 `yaml/sort-keys` 约束，顺序不能随手调，改完跑 `pnpm lint:fix` 让它排。`trustPolicy: no-downgrade` 会让每次 install 多做一轮 lockfile 供应链校验（CI 实测约 6.6 秒 / 559 条；本地冷缓存时会到 18 秒左右）。

**TypeScript 被刻意压在 6.x**。最新是 7.0.2（Go 重写版），但 `@antfu/eslint-config` 依赖的 `typescript-eslint@8` peer 范围是 `>=4.8.4 <6.1.0`，装 7 会直接 unmet peer。6.0.3 是当前工具链能接受的最高版本，等 typescript-eslint 支持 7 之后再升（CTV-28，已放弃，见 [backlog.md](./backlog.md)）。

**`engines` 声明的是发布产物对使用者的要求**（`^20.19.0 || >=22.12.0`），与开发所需的 Node 版本是两回事。`dist/index.js` 把所有依赖都打包了进去（产物里只剩 `node:` 内置模块的引用），其中门槛最高的是 `@clack/prompts` 的 Node ≥ 20.12，所以 Node 20 用户仍然装得上、跑得起来。但**本地开发需要更高的 Node**——devDependencies 里 `tsdown` 要 `^22.18.0 || >=24.11.0`、`lint-staged` 要 `>=22.22.1`。不要因为升了 devDependencies 就去抬 `engines`，那会平白挡掉一批用户。

## npm 打包的隐藏规则

npm 打包时**无条件剔除 `.gitignore` 和 `.npmrc`**，与 `files` 字段怎么配无关。仓库里存在 `_gitignore` 这个奇怪文件名、以及 `RENAME_FILES` 这个机制，根源就在这里。

**任何模板只要带 `.gitignore` 或 `.npmrc`，就必须在仓库里存成 `_` 前缀并加进 `RENAME_FILES`**，否则用户拿到的项目里根本没有这个文件。这类问题在本地开发时完全看不出来（本地是直接读仓库目录），只有发布后才暴露——验证方式是 `npm pack --dry-run` 看文件清单，不能靠读代码判断。

**现在仓库里没有任何模板踩着这个坑**：七个内置模板各带一份 `_gitignore`，无一带 `.npmrc`，2026-09-21 从 registry 拉下来的 v1.11.0 真实 tarball 实测 7 个 `_gitignore`、0 个裸 `.gitignore`。曾经踩着的是 `template-vitesse-base` / `template-vitesse-lite`（`.npmrc` 发不出去），两个目录已随 CTV-30 删除、转交项也已随 CTV-47 下架。


## 本地门禁与依赖升级

本地第一道门禁是 husky 的 `pre-commit`，跑 `lint-staged`，配置在 **`lint-staged.config.mjs`**（不是 `package.json` 的字段——那份已移除，避免两个配置源打架）。三个任务都声明成零参函数（`() => 'pnpm typecheck'`），这是 lint-staged 官方指定的「不把匹配到的文件名追加为参数」写法：`tsc` 和 `vitest` 拿到一个任意的变更文件子集会行为错误。`commit-msg` 跑 `commitlint --edit`。

**`pre-commit` 里的 `--config` 是必需的，不能省成裸的 `npx lint-staged`**（2026-09-09 CTV-41 踩到）。
lint-staged 会为**每个暂存文件向上查找最近的配置**，而模板目录本身可能就带着一份——
`template-vue-dev/lint-staged.config.mjs` 的内容是 `{'*': 'eslint --fix'}`，它是那个模板的一部分，
不能删。不传 `--config` 时它会接管全部 33 个模板文件，用**本仓库的** eslint 去 `--fix` 它们，
而模板自己的 `eslint.config.ts` 依赖本仓库没装的插件（`@unocss/eslint-plugin` 等）——
实测直接挂起 7 分钟不返回，`kill -9` 都杀不掉，提交完全卡死。传了 `--config` 就禁用配置发现。
**以后任何新模板只要带 lint-staged / eslint 配置，都吃这一条保护。**

依赖升级只靠 `pnpm taze`（`npx taze major -r`）**手动**跑，没有自动化的依赖更新。

**曾经有一份 `.github/renovate.json5`，2026-09-09 删除了**（CTV-24）。它加于 2026-03-05，半年里一次都没生效过——0 个 PR、0 个 issue、0 个 `renovate/` 分支、0 条 renovate 提交，而它自己配的 `lockFileMaintenance` 本该每周一跑一次。Renovate App 从来没装上。**更彻底的是它本身就是坏的**：`renovate-config-validator` 实测报 `Invalid schedule: Failed to parse "after 10pm every Sunday and before 5am every Monday"`，就算装了 App 也只会得到一个配置错误。所以删掉它不是「关掉一个功能」，是清掉一份从未运行、且运行也会报错的死配置。**哪天想要自动依赖更新，从装 App 开始重来，不要复活那份配置。**

### `pnpm sync:check`（CTV-48）

手动跑的防漂移脚本，`node ./scripts/sync-check.ts`。它拉取官方 [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite) 六个模板（`vanilla` / `vanilla-ts` / `vue` / `vue-ts` / `lit` / `lit-ts`）的 `package.json`，跟本仓库对应 `template-*/package.json` 的 `dependencies` + `devDependencies` 逐项比对，打印不一致项并以退出码 0/1 报告结果。核心比对逻辑抽成纯函数 `diffDeps`（无网络依赖），由 `tests/sync-check.test.ts` 覆盖；两轮变异测试（删 `.sort()`、把 `!==` 改成 `===`）都证实断言会随之转红。

**为什么不进 CI、不进 `build:prod`**：它真的联网（`fetch` 拉 `raw.githubusercontent.com`），会因为网络抖动或上游发版而让门禁无故变红——这与仓库 E2E「铁律是不联网」的原则冲突。只能手动跑，且本地跑时如果处在沙箱化环境（出站网络被拦截）会报一句人话（`拉取上游失败（网络不可达）：fetch failed`，见下）而不是甩栈，此时不代表模板真的漂移，先确认网络可达再看结果。

**与 `pnpm taze` 的分工**：`taze` 管「升到最新」（`npx taze major -r`，改本仓库自己 devDependencies 的版本策略）；`sync:check` 管「跟官方一致」——本仓库模板依赖故意锁定 create-vite 官方版本、不追 npm 最新（见上面「npm 打包的隐藏规则」一节与 `.docs/templates.md`），`sync:check` 就是用来发现这条约束是否已经漂移的探测器，两者职责不重叠。

**模板清单 `MIRRORED_TEMPLATES` 是脚本自己的一份显式清单**（CTV-53 之前是叫 `TEMPLATES` 的裸常量，跟 `src/constants` 的 `TEMPLATES` 撞名，且没有任何钉子）。脚本本身**不 import `src/constants` 的 `FRAMEWORKS`**——`src/constants/index.ts` 有一条 extensionless 的 `import '../help'`，`src/` 是写给 tsdown 打包的，`node --strip-types` 直接跑会在解析这条 import 时失败。一致性钉子只能放在 `tests/sync-check.test.ts` 里（vitest 有解析器）：从 `FRAMEWORKS` 派生出「不带 `customCommand` 的内置模板」，再减去显式声明的 `OWN_UPSTREAM = ['vue-dev']`（它有自己的上游 `Hub-yang/my-vue-dev-template`，不镜像 create-vite 官方），与 `MIRRORED_TEMPLATES` 比对，两边不同源所以不是恒等式。**加删内置模板时忘了同步这份清单，探测器只会安静漏检**，表现是「少打一行 ✓」，几乎不会被发现。

**例外表 `EXEMPTIONS`**：目前一条，`@types/node`（理由：主版本跟 `engines` 声明的 Node 20/22 上限对齐，故意不追官方，`tests/constants.test.ts` 有「不得过高」的断言挡着）。命中例外表的依赖项打一行 `⚠ 刻意偏离（理由）`、不计入 `drifted`，避免上游依赖升级触发一处「不该被修」的假警报。`applyExemptions` 是纯函数，`tests/sync-check.test.ts` 覆盖「命中例外的项不出现在 drift 里」与「没命中的项不受影响」两条，均已变异验证。

**拉取失败与真实漂移分开计数**（`failed` vs `drifted`）：HTTP 非 2xx 或 `fetch` 直接抛异常（断网 / DNS 失败）都计入 `failed`，`fetch` 套了 try/catch 打一句人话而不是甩栈；退出码在两种情况下都非 0，但输出能分清「拉不到」和「漂移了」。实测断网场景（把 `UPSTREAM` 临时指向不存在的域名）：六个模板全部打印 `拉取上游失败（网络不可达）：fetch failed`，末尾 `6 个模板拉取失败，未参与比对，结果不完整。`，不打印「与官方一致」，退出码 1。

**入口判据用 `pathToFileURL(process.argv[1]).href` 而不是手拼 `file://${process.argv[1]}`**（CTV-53）：`import.meta.url` 会做百分号编码，手拼的字符串不会，含空格或非 ASCII 字符的路径下两者永远不相等，`pnpm sync:check` 会**一个字不打、退出码 0 地跳过 `main()`**——对漂移报警器来说这是最坏的失败模式，看起来像「与官方一致」。已用探针验证：在名字带空格 / 非 ASCII 字符的目录里放同构的判据脚本，旧判据两种路径下都被跳过（打印 `MAIN SKIPPED`），新判据两种路径下都正确执行（打印 `MAIN EXECUTED`）。
