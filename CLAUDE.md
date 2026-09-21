# CLAUDE.md

**本文件与整个 `.docs/` 都纳入版本管理**，跟着每个分支、每个 worktree、每次克隆走。
2026-09-21 改的：在此之前两者都被 `.gitignore` 排除，结果 worktree 里根本读不到，
一次 banner 改动整个做完才发现违反了「非交互三件套不可省 `--no-immediate`」——
**约定读不到，等于不存在**。它们不在 `package.json` 的 `files` 里，不会发进 npm 包。

只有 `spec.md` 仍然不进版本库。

`@huberyyang/create-todo-vue` 是仿 create-vite 的脚手架 CLI，**bin-only，没有 library API**。
本文件只放**现役禁令、隐式契约、踩过的坑及其理由**；叙述性内容（架构、排期、实测证据、设计记录）
在 [`.docs/`](.docs/)，按下面的索引按需读。

## 每次必读

- **每次开工** → 读 [`.docs/roadmap.md`](.docs/roadmap.md)。它是「接下来做什么」的**唯一依据**，
  末尾的维护规则要照做。不读的后果：自作主张挑条目、状态无人更新、候选池被擅自挪进待办。
  新会话的贴用文案与**六项核实清单**见 [`.docs/kickoff.md`](.docs/kickoff.md)。
- **每次提交** → 走 `/commit` skill，不要手写 `git add` + `git commit` 绕过去。
  绕过去会漏掉该 skill 的规则（如「除非明确要求，不加 `Co-Authored-By` trailer」），已踩过两次。
- **每次发版，以及改 `.github/workflows/` 之前** → 读 [`.docs/release.md`](.docs/release.md)：
  六步清单，外加 `release.yml` 那五处载重设计（随手改一处就会在发版当天炸）。
  **`npm login` 与 `pnpm release` 由 Hubery 亲自执行，Claude 到那一步停手**——不要拆成
  `bumpp` + `npm publish`，也不要另找认证方式：`npm publish` 要 2FA 码（实测 `EOTP`），
  `bumpp` 交互式会在工具调用里挂住。
- **本文件和 `.docs/` 里的一切状态转述都可能过期**，一律以核实清单那几条命令的实际输出为准。

## 工作流：功能开发一律走 superpowers 全流程

**这条没有例外，也不接受「这个改动很小所以跳过」的自我说服。** 条目看着小往往是因为还没想清楚——
CTV-01 是「删几行下架模板」，做起来牵出三份清单漂移；CTV-10 是「抄一份 release.yml」，
开工才发现 `test` 是 watch 模式、CI 会挂死。

1. 动手前先按 `superpowers:using-superpowers` 过一遍可用技能，别凭记忆。
2. 创造性工作先走 `superpowers:brainstorming`，产出设计并**等确认后**再写代码；架构量级的接着走 `writing-plans`。
3. 改代码走 `superpowers:test-driven-development`：先写会红的测试，看到它红，再实现。
4. 排查问题走 `superpowers:systematic-debugging`：先拿证据（日志、失败输出、最小复现），再改。
5. 收尾走 `superpowers:verification-before-completion`：跑命令、贴真实输出，然后才允许说「完成」或标 ✅。

### 本仓库特有的四条验证标准

- **表征测试必须用变异证明断言有牙齿**（一次就绿不构成证据）：逐个注入缺陷确认断言转红，
  再还原源码 diff 校验；报告写清捕获数与等价变异判断。证据见 [`.docs/testing.md`](.docs/testing.md)。
- **断言的期望值不要从被测数据派生。** 期望值和实际值来自同一个源，断言就退化成恒等式。判据：
  **问一句「改被测源码的哪一处能让这条断言变红」，答不上来就是恒等式。**
- **模板改动必须真装一次、真构建一次，而且 npm 与 pnpm 都要跑。** 单测里的静态断言只是**代理**，
  代理绿不等于事情对：2026-09-10 的全量验收查出三个缺陷，没一个能靠读代码或现有 342 条测试发现。
- **发布产物必须实测，不能拿本地构建代替。** `files` 字段配错、npm 剔除 `.npmrc`/`.gitignore`
  这类问题只在真实 tarball 里暴露。

## Commands

```bash
pnpm build:prod     # typecheck && lint:fix && test && build && test:e2e（发版前置全量门禁）
pnpm test           # vitest run —— 单测，已排除 tests/e2e/**
pnpm test:e2e       # 真 fork CLI 到临时目录跑
pnpm preview        # 构建后在本仓库里真跑一次 CLI
pnpm release        # build:prod && bumpp --no-verify && npm publish —— 由 Hubery 执行
# 其余：dev / build / typecheck / lint / lint:fix / taze，以及 test:watch 等 watch 变体
```

跑单个文件：`pnpm vitest run tests/utils.test.ts`。**脚本不依赖任何全局工具**——不要引入
`nr` / `npm-run-all2` 串联，统一用 `&&`；**不要把 `test` 改回 watch 模式**（CI 会挂死）；
**不要新增名叫 `publish` 的 script**（那是 lifecycle 名，`pnpm publish` 当钩子跑会递归）。

## 改之前先读

- **改 `src/` 任何一处之前 → 读 [`.docs/architecture.md`](.docs/architecture.md) → 不读的后果**：
  会破坏几条没有编译期保护的隐式契约（退出码透传、终端框线与光标还原、模板目录解析对 `dist/`
  层级的依赖）——它们出错时不报错，只是行为变错。
- **改 `template-*` 之前 → 读 [`.docs/templates.md`](.docs/templates.md) → 不读的后果**：
  `files` 字段、模板依赖、`template-vue-dev` 的剥离清单三处都踩过「读代码判断不出来、
  只有真发一次或真装一次才暴露」的坑。
- **写或改测试之前 → 读 [`.docs/testing.md`](.docs/testing.md) → 不读的后果**：E2E 会在别人机器上
  红（包管理器环境泄漏）、会真的联网装依赖，或写出一条永远不会变红的恒等式断言。
- **改依赖、包管理器配置、`lint-staged` / `tsconfig` / `engines` 之前 →
  读 [`.docs/toolchain.md`](.docs/toolchain.md) → 不读的后果**：pnpm 11 的三条变更、TS 被压在 6.x
  的原因、`engines` 与 devDeps 的区别都有人踩过；`pre-commit` 漏掉 `--config` 会让提交挂死 7 分钟。
- **想知道某条目当初为什么那么做 → 查 [`.docs/archive.md`](.docs/archive.md)（按 CTV-NN）或
  [`.docs/timeline.md`](.docs/timeline.md)（按日期）→ 不查的后果**：把论证过并放弃的方案重做一遍。
- **有新想法但没被点头 → 写进 [`.docs/backlog.md`](.docs/backlog.md)，不要挪进待办**；
  设计记录写进 [`.docs/specs/`](.docs/specs/)。

## 现役禁令

### 源码（`src/`）

- **`src/` 里不许出现 `process.exit()`**，只用 `process.exitCode`。它会跳过 `runCli()` 的
  `finally`，终端状态兜底就形同虚设；另有旧教训是它会截断没冲刷完的 stdout。
- **失败也要把退出码原样带出来。** `install()` 返回包管理器的退出码，`main()` 直接 `return status`；
  压成 1 会让调用方分不清「装不上」和「参数写错」。**「把 `run()` 改成抛异常」是最省事的写法，
  也正是会弄丢它的写法。**
- **开框用 `terminal.open()`、收尾用 `terminal.close()`，不要直接调 `prompts.intro/outro`**——
  绕过去就等于把状态机架空。`close()` 必须幂等；`cancel()` 要调 `markClosed()` 认领；
  `restoreCursor()` 只在开过框之后才写（无条件写会污染 `--version` 的输出）。
- **新增提问点必须包在 `ask()` 里**（传「在问什么」与「非交互下改用哪个参数」），漏掉的会退回
  「画半截菜单然后静默死掉」。判据**不能用 `process.stdin.isTTY`**（管道也不是 TTY）；
  `'end'` 和 `'close'` 两个事件都要听。
- **包名的解析必须排在破坏性操作（处理已存在目标）之前**，校验先于副作用；提问仍留在第 3 步，
  E2E 有次序守卫钉着。
- **`git init` 失败只 warn、不改退出码**，且必须排在 `scaffoldTemplate()` 之后、装依赖之前。
- **`src/help.ts` 不许 import `constants`**（反向 import 会成循环依赖），数据靠参数传进来。
- **`banner()` 必须排在 `--version` / `--help` / 参数校验之后、`terminal.open()` 之前**——
  排前面污染 `--version` 输出，排后面字标被打进 clack 的框里，两头都有 E2E 钉着。
- **改 `BRAND_NAME` 要同时改 `BANNER_MIN_WIDTH` 与字体子集**（`src/assets/ansi-shadow-subset.ts`）：
  阈值低于字标实际宽度会折行，子集漏掉的字母会**安静渲染成空白**，不报错也不变窄。
- **永远不要把模块级常量直接交给第三方库**，拿不准就传副本（`structuredClone`）。
  `mri` 会就地改写 options 对象且无上限增长。**`Object.freeze` 挡不住**（已实测，别再试）。

### 模板（`template-*`）

- **`package.json` 的 `files` 必须写 `template-*/**`**，裸写法会让七个模板一个都发不出去，
  而本地开发看不出来。
- **任何模板只要带 `.gitignore` 或 `.npmrc`，必须存成 `_` 前缀并加进 `RENAME_FILES`**——
  npm 打包无条件剔除这两个文件名。
- **`vite` 主版本必须 ≥ 8，TS 模板 SFC 必须带 `lang="ts"`**——少一样都要真装真建才暴露，
  不要补 `pnpm-workspace.yaml` 放行 esbuild 来绕。
- **模板依赖版本对齐 create-vite 官方、不追 npm 最新**；例外与用法见
  [`.docs/toolchain.md`](.docs/toolchain.md)。加删内置模板要同步脚本里的 `MIRRORED_TEMPLATES`
  （`tests/sync-check.test.ts` 钉一致性）。
- **`template-vue-dev` 不许加回 `trustPolicy`，也不许删掉 `eslint.config.ts` 里关闭
  `pnpm/yaml-enforce-settings` 的那段**——lint 变绿的代价是 install 退 1，两条断言配套钉着。
- **只镜像 vanilla / vue / lit 三个框架**，其余十几个（react / svelte / solid…）刻意不补，
  补齐会让模板与测试矩阵成倍增长。**不要「顺手补上」。**
- **`custom-*` 只列官方 create-vite 列的转交目标**，自己加的自担上游腐烂风险：
  vitesse 是 CTV-30 自己加的，停更 7 个月才被发现（CTV-47 已删）。
- **所有模板都要剥掉上游身份信息**（`author`/`homepage`/`repository`/`bugs`/`license`/
  `packageManager`、`LICENSE`、lockfile）——机器读的字段，别人 issue 会落错仓库；页面署名不在此列。
- **七个模板各带一份占位 `README.md`（内容恰好是 `# <模板名>`，不走改写），不许有孤儿
  `template-*` 目录**（没登记进 `FRAMEWORKS` 的会被通配发出去），两条都有断言钉着。

### 发布与工具链

- **`pnpm-workspace.yaml` 里那三条 eslint-plugin-pnpm 强制的设置不能删**（缺一条 `pnpm lint` 退 1），
  且受 `yaml/sort-keys` 约束，改完跑 `pnpm lint:fix` 让它排。**`.npmrc` 已删除不要加回来。**
- **不要因为升了 devDependencies 就去抬 `engines`**，它声明的是发布产物对使用者的要求。
- **`pre-commit` 里的 `--config` 是必需的，不能省成裸的 `npx lint-staged`**——省略会让提交挂死。
- **`.docs/` 进版本库之后就归 `pnpm lint` 管了。** 表格单元格里的 `|` 必须转义成 `\|`，**哪怕它在
  行内代码里**（表格切分先于行内代码解析，不转义会把一行切成更多列、多出的内容被静默丢弃）；
  标题层级不许跳级。文档里的**代码块**刻意不做风格检查（`eslint.config.ts` 的 `ctv/docs-snippets`）——
  那些片段有原样引用的上游代码，被本仓库规则改写后就不再是被引用的那份了。
- **不要复活 `.github/renovate.json5`**——它从未生效，且配置本身就是坏的。
- **改 `tsdown.config.ts` 的 `outDir` 会让模板目录解析静默指向错误位置**，且无编译期报错。

## Conventions

- **代码注释：中文。** 不要徒增注释，只写代码本身表达不出的「为什么」。
- **commit message：英文**，走 Conventional Commits，type 白名单在 `commitlint.config.ts`
  （比默认多了 `merge` 和 `update`）。
- **会话回复：中文**——包括普通对话、计划、spec 文档，以及任何 skill / subagent 返回的最终输出
  （子代理的英文原文要转述成中文再呈现）。
