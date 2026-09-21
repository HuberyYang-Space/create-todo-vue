# 迭代条目归档

已发布与已放弃的 `CTV-NN` 条目全表，按真实发布版本归档。**这是事实记录，不会再变。**

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。当前该做什么见 [roadmap.md](./roadmap.md)；
> 未决策的想法见 [backlog.md](./backlog.md)；按日期查历史见 [timeline.md](./timeline.md)。

**状态图例**：⬜ 待办　🚧 进行中　✅ 已完成　⏸️ 已搁置　❓ 待决策　❌ 已放弃

---


条目 ID 为 `CTV-NN`（create-todo-vue），全局递增、不回收、不重排。

**待办不再预先绑版本号。** 版本桶已经漂过两次：「v1.2.0 测试与 CI 地基」实际随 v1.1.0 发布，
「v1.4.0」桶里的 CTV-15 / 17 实际发成了 v1.2.0，候选池里的 CTV-29 也是。根因是 semver 由改动性质
决定、不由计划决定——做完什么才知道该发什么版。所以现在：**已发布的按真实版本归档**（事实，不会再变），
**未发布的按主题分组并排优先级**，发版时依据当时实际做完的内容定版本号。

## 已发布 · v1.1.0（2026-09-06）

线上已经在坑用户的东西、两条违反自身工程规范的配置，以及从零补齐的测试与 CI 地基。

## 止血与合规

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-01 | **下架两个 vitesse 模板** | `template-vitesse-base` 51 处、`vitesse-lite` 27 处 `catalog:frontend/dev/build/types`，但两个目录都**没有 `pnpm-workspace.yaml`**（catalog 的定义源）。pnpm 装报 catalog 未定义，npm/yarn/bun 压根不认这个协议。从 `FRAMEWORKS`、`HELP_MESSAGE`、README、`package.json` 的 `files` 四处摘除；**目录保留在仓库**留给 v1.3.0 修复。摘出 `files` 顺带也就不再把 antfu 的 FUNDING/LICENSE 发出去 | 小 |
| ✅ | CTV-02 | **顶层错误兜底** | `src/index.ts` 末尾是裸的 `init()`，无 `.catch()`、内部无 try/catch。任何异常都是 unhandled rejection + 原始栈，且 `spin` 卡在 running 态不收。顺带补 `prompts.intro()`——现在只有 `outro`，clack 的框线是断的 | 小 |
| ✅ | CTV-03 | **`-v, --version`** | mri 解析配置和 `HELP_MESSAGE` 里都没有。读版本号要注意别写死 `../package.json`（todo-scripts 的 HB-08 就是栽在这里，开发态一直读错版本还被 mock 掩盖了）。**实现**：`utils.ts` 新增 `findPackageJson(startDir)` 逐级向上查找 + `getVersion(startDir)` 读不到时返回 `'unknown'` 而非抛错，两者各有单测（含「一路到文件系统根都没有」的分支） | 小 |
| ✅ | CTV-04 | **修两条违反自身规范的配置** | ① `package.json` 的 `lint-staged` 写成 `"*": "eslint . --fix"`，那个 `.` 让每次提交对**整个仓库**跑 lint 而非暂存文件；② `.vscode/` 只有 `settings.json`，缺 `extensions.json`（@antfu/eslint-config README 明确要求两份都配） | 小 |
| ✅ | CTV-05 | **模板清单三处对齐** | 同一份清单手写了三遍：`FRAMEWORKS`（真值）、`HELP_MESSAGE`、README「当前可用模板」（原本只有 4 个）。**做 CTV-01 时被顺带完成**——下架必须同时改这三处，无法拆开。现已统一为 6 个内置 + 3 个 customCommand，且 `tests/constants.test.ts` 的两条断言（help 列出的名字都在 TEMPLATES 里 / help 覆盖全部内置模板）把这类漂移钉住了。**注意：漂移的根因（三份手写清单）没消除，只是这次对齐了；根治见 CTV-16** | 小 |
| ✅ | CTV-06 | **删掉空转的 workflow** | `.github/workflows/auto-update-readme.yml` 替换的 `{{REPO_NAME}}` / `{{USER_NAME}}` 占位符在 README 里**已经不存在**（`grep '{{' README.md` 零命中），每次 README push 都白跑一遍并永远打印 "No changes detected" | 小 |

## 测试与 CI 地基

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-07 | **`src/utils.ts` 单测补齐** | 8 个纯函数目前零覆盖：`formatTargetDir` / `isValidPackageName` / `toValidPackageName` / `pkgFromUserAgent` / `getFullCustomCommand` / `getInstallCommand` / `isEmpty` / `emptyDir`。重点是 `getFullCustomCommand`——5 个包管理器 × 3 种 customCommand 形态的改写矩阵，纯字符串逻辑但分支最多，且每个分支都对应一个真实的包管理器怪癖。~~顺带把 `test` 从 `vitest`（watch）改成 `vitest run`，另加 `test:watch`~~ **这部分已在做 CTV-10 时提前完成**（它是 CI 的硬前置），本条剩下的纯粹是补单测。**已完成**：71 条断言覆盖 12 个导出函数（含 `getFullCustomCommand` 的 7×3 改写矩阵、`getLabel` 用注入的 color 函数避开 TTY 依赖、`copy`/`copyDir`/`isEmpty`/`emptyDir` 用临时目录）。**并用 13 个变异逐条证明断言有牙齿**（13/13 全被捕获）。占位测试 `expect('1').equal('1')` 已删除。**未覆盖**：`install()` 与私有的 `run()`——它们 spawn 子进程且调 `process.exit`，恰当的覆盖位置是 CTV-08 的 E2E | 中 |
| ✅ | CTV-08 | **E2E suite** | 真实 spawn `node bin/index.js <dir> -t <tpl> --overwrite` 到临时目录，断言：生成的文件树、`package.json` 的 `name` 被改写、`index.html` 的 `<title>` 被改写、`_gitignore` 落地成 `.gitignore`。参考 todo-scripts 的 `vitest.e2e.config.ts` 双 suite 结构（单测进 pre-commit 保持快，E2E 进发版门禁）。**绝不能带 `-i`**，否则测试会真的联网装依赖。**已完成**：31 条用例分两个文件（`scaffold` 22 条 + `cli-basics` 9 条），1.6s 跑完。非交互入口是 `-t <模板> --overwrite --no-immediate`——`--no-immediate` 让 mri 把 immediate 置 false，从而跳过确认框且不联网。`globalSetup` 先构建 dist/，子进程环境走白名单（尤其 `npm_config_user_agent`，否则跑测试的人用什么包管理器会改变断言）。**用 9 个变异验证**：8 个被捕获，第 9 个经核实是等价变异（去掉 `files.filter(f => f !== 'package.json')` 后那次多余拷贝会被后续写入覆盖，产物一致），非盲区 | 大 |
| ✅ | CTV-09 | **CI 质量门禁 workflow** | `ci.yml`：typecheck + lint + test + **build**，push（main / dev）与 PR 触发。todo-scripts 刻意没有独立 CI（它靠本地 pre-commit 三件套 + release gate 两道门），这里选择补上——本仓库的历史门禁太弱，多一道服务端检查值这个 Actions 时长。**已真实验证**：2026-09-04 推送 dev 触发 run 33871696605，gate job 20s success，日志确认 test 真跑了 12 条、build 真产出 dist/index.js | 小 |
| ✅ | CTV-10 | **tag 驱动的 release workflow** | tag↔`package.json` version 校验 + 门禁 + `changelogithub` 生成 Release。直接对齐 todo-scripts 的 `release.yml`（那份已在真实发版里验证过），注意 `pnpm/action-setup` 必须排在 `actions/setup-node` 前面，否则 `cache: pnpm` 找不到 pnpm。**与 todo-scripts 的唯一实质差异**：那边靠 `test:e2e` 的 globalSetup 顺带构建 dist/，这里没有 E2E（CTV-08），所以门禁里显式加了一步 `pnpm build`。**⚠️ 部分未真实验证**：前四步（checkout / action-setup / setup-node / `--frozen-lockfile`）与四道门禁已随 CTV-09 的 CI run 一并跑通；**仅剩 tag↔version 校验与 changelogithub 两段没在真实环境跑过**，要等下次 `pnpm release` 推 tag | 中 |
| ✅ | CTV-26 | **改掉名叫 `publish` 的 script** | `scripts.publish` = `bumpp && npm publish`。`publish` 是包管理器的 lifecycle 名，`pnpm publish` 会把它当钩子执行从而递归。现在靠 `release` 用 `npm-run-all2` 显式调用绕开，但这是个随时会踩的雷。最终选择**直接删掉**这个脚本、把三段串进 `release`（`npm-run-all2 build:prod && bumpp && npm publish`），与 todo-scripts 的形状一致——改名只是绕开，删掉才是消除 | 小 |
| ✅ | CTV-27 | **`typescript` 是未声明依赖** | 曾经 `pnpm typecheck` 跑 `tsc`，但 `typescript` 既不在 `devDependencies` 也不在 lockfile 里，本机靠全局的 `/Users/hubery/Library/pnpm/tsc` 撑着、CI 里也是从项目外找到的，版本完全没锁。**已于 2026-09-04 的依赖升级中解决**：`typescript` 成为显式 devDependency（`^6.0.3`），`node_modules/.bin/tsc` 现在真实存在 | 小 |

> ⚠️ **CTV-07 只能覆盖 `src/utils.ts`**。给 `src/index.ts` 写单测必须先做 CTV-15——该前置已于 v1.2.0 解除。

## 已发布 · v1.2.0（2026-09-07）

`src/index.ts` 从 265 行的顶层自执行单函数拆成三层，并修掉两个使用者可感知的行为问题。
测试从 108 条涨到 166 条（单测）+ 39 条（E2E）。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-15 | **`src/index.ts` 拆分** | `init()` 单函数约 220 行，prompt / 决策 / 文件 IO / 子进程全混在一起，且顶层自执行导致无法被测试导入。参考 todo-scripts 的「纯决策层 + 副作用层」拆法：模块只导出 `main()`，由 `bin/index.js` 显式调用；把「该写哪些文件、该跳过什么」的判断收进一个不碰文件系统的纯函数。**已完成**（设计见 `docs/superpowers/specs/2026-09-07-ctv-15-index-split-design.md`）：新增 `src/plan.ts`（8 个纯函数）与 `src/scaffold.ts`（副作用层），`index.ts` 只剩编排并导出 `main()` / `runCli()`，`bin/index.js` 显式调用。**纯重构、行为零变化**——既有 4 个测试文件一行未动，E2E 31 条全绿，且重构前后各生成 vue-ts / vanilla / lit-ts 三份产物 + help/version 输出，48 个文件 `diff -r` 逐字节一致。单测 77 → 142。**22 个变异 22 个被捕获**。⚠️ 两条约束写进了代码注释：模板路径解析必须留在 `index.ts`（挪进子目录会让开发态静默解析到 `src/`），错误兜底必须留在编译产物里而非 `bin/`（`@clack/prompts` 是 devDependency，用户侧没有）。**刻意留白**：`main()` 里的 clack 交互仍只由 E2E 覆盖 | 大 |
| ✅ | CTV-17 | **未知参数校验** | mri 会静默吞掉未声明的 flag：`--overwirte` 拼错时会按默认行为跑完，无任何提示。todo-scripts 的 `findUnknownFlags()` 可直接借鉴。**已完成**：mri 配置提成 `ARGV_OPTIONS` 常量，已知参数清单由 `collectKnownFlags()` **从它派生**，不另抄名单——否则加一个新 flag 会被自己的校验拒掉（CTV-05 的三处清单漂移就是这个教训）。`findUnknownFlags()` 排除 `_` 后过滤，保留用户输入顺序。校验点排在 `--help` / `--version` **之后**，与 todo-scripts 次序一致；用 `console.error` 明文而非 clack（此时还没 `intro()`，框线会断），也不抛异常（抛了会走兜底打完整栈，而打错参数不是 bug），返回新常量 `EXIT_USAGE`。**实测出一个比条目描述更糟的后果**：`--overwirte my-app` 会让 mri 把 `my-app` 当成该 flag 的值吃掉，`_` 变空，于是项目名也丢了、CLI 转而追问项目名称。验证：单测 143 → 164、E2E 35 → 39，11 个变异 11 个被捕获，产物 48 文件 diff 零差异 | 小 |
| ✅ | CTV-29 | **取消操作时退出码是 0** | `cancel()` 之后 `init()` 直接 return，进程退 0。用户按 Ctrl+C 取消、或非交互环境下走到选择器却选不了（如 `-t` 传了无效模板名），调用方都会误判成「创建成功」。写 CTV-08 时实测确认：`-t nope` 在 stdin 关闭下退出码为 0 且什么都没生成。脚本化调用这个 CLI 的场景会踩。**已完成**：两处改动缺一不可——① `main()` 改为返回退出码，7 处取消点统一走 `cancelled()` 返回 1；② `runCli()` 开头预置 `process.exitCode = 1`，只有 `main()` 真的跑完才改回 0。**② 是设计阶段漏掉的那半边**，见时间轴。用 `process.exitCode` 而非 `process.exit()`，避免截断还没冲刷完的 stdout。退出码取 1 不取 130：非交互场景没人按过 Ctrl+C，报 130 是撒谎。验证：新增 4 条 E2E（3 条非交互 + 1 条真喂 Ctrl+C 字节），E2E 31 → 35、单测 142 → 143，5 个变异 5 个被捕获，产物 48 文件 diff 零差异 | 小 |

> ⚠️ **Release notes 只露出 2 条**：`refactor` 不在 changelogithub 的默认白名单里，CTV-15 那次 265 行的重构在发布说明里完全隐形。是否扩展类型见候选池 CTV-32。
>
> ⚠️ **发版后修了一个当场发现的缺陷**（`f73a15e`）：CTV-17 把 `ARGV_OPTIONS` 直接交给了 `mri`，而 mri 会**就地改写**传入的配置对象。线上 v1.2.0 未受影响（实测 8 个参数全部正常），但 CI 因测试文件调度顺序而挂。详见时间轴。

## 已发布 · v1.3.0（2026-09-07）

两个会给用户错误结果的输入处理、一条收尾提示，外加一轮拼写修正。测试从 166 涨到 182（单测）+ 50（E2E）。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-19 | **绝对路径 targetDir** | `root = path.join(cwd, targetDir)`，传绝对路径会拼成 `/cwd/abs/path`。~~上游 create-vite 有同样的问题，优先级低但值得修~~ **2026-09-07 实测推翻了「优先级低」这个判断**：传 `/abs/path/my-app` 会在 **cwd 下造出一整棵镜像目录树**（`<cwd>/private/tmp/.../my-app/`），用户要的位置根本不存在，而 CLI 报告创建成功。不是「不支持绝对路径」，是**静默在错误位置造垃圾**——这是剩余条目里唯一还真的坏着的。**已完成**：`root` 从 `path.join(cwd, targetDir)` 改为 `path.resolve`，并**从第 4 步末尾提到第 2 步之前**——位置和函数一样要紧，否则「目标已存在」的判断仍对着相对 cwd 的 `targetDir` 做。`emptyDir` 一并改用 `root`。customCommand 分支刻意不改：它把 `targetDir` 原样交给上游脚手架，spawn 继承同一个 cwd，绝对/相对上游都能自解析（**推理，未实测**，那三个变体会真联网所以不进 E2E）。验证：新增 3 条 E2E，其中「cwd 下的目录清单恰好等于 `[elsewhere]`」是回归钉子——只断言「产物在对的地方」不够，镜像树能让它以别的方式碰巧成立 | 小 |
| ✅ | CTV-20 | **`isEmpty` 对文件路径抛 ENOTDIR** | 目标名恰好是个已存在的**文件**时，`fs.readdirSync` 直接抛，错误信息对用户毫无意义。做完 CTV-02 至少不会是裸栈，但仍该单独判断并给人话。**已完成**：`utils.ts` 新增 `pathKind()` 分辨 missing/dir/file（用 `statSync` 跟随软链），第 2 步按它分三支——目录分支的三选项菜单**一字未改**，文件分支给两个选项（取消 / 删除该文件并继续），去掉物理上做不到的「忽略」；`--overwrite` 直接 `fs.rmSync`（不能复用 `emptyDir`，它内部同样是 `readdirSync`）。**连带处理**：`cli-basics` 里那条 ENOTDIR 用例原本是 CTV-02 错误兜底的**唯一 E2E 触发点**，本条让它不再抛异常，已换成「父级路径段是文件」（`taken/sub`）把钉子接住，而不是删掉。**遗留**：不传 `--overwrite` 的非交互场景不再抛栈，但会画出菜单后静默退 1——即 CTV-31 记录的行为，本批不处理 | 小 |
| ✅ | CTV-21 | **装完依赖后的 next-steps 提示** | `immediate === true` 分支只打一句「程序结束」，不告诉用户 `cd <dir> && npm run dev`；反倒是 `immediate === false` 分支有完整提示。装完依赖的人更需要知道下一步。**已完成**：`utils.ts` 新增 `getRunCommand()`（形状对齐 `getInstallCommand`，同一个 yarn 特例），`plan.ts` 的 `buildDoneMessage` 加第四个参数 `installed = false`——默认值让既有调用点与既有断言一行都不用改，「原有测试全绿」因此仍是干净信号。6 个内置模板 `scripts.dev` 全是 `vite`，写死 `dev` 不撒谎。**刻意只管内容不碰框线**（框线是 CTV-34，Hubery 定的单开单做）。**原本预计这条接线无法自动化覆盖**（`-i` 会真联网），实际找到了办法：把 `npm_config_user_agent` 设成 `true/1.0.0`，`install()` 于是 spawn `/usr/bin/true install`——真实存在、忽略参数、秒退 0、不联网，`-i` 之后那段代码被真正执行到。设计阶段承诺的「只能手工实跑」因此不成立，已改为 2 条 E2E | 小 |
| ✅ | CTV-18 | **拼写修正** | ~~`DEFAULTE_TARGETDIR`（应为 `DEFAULT_`）、`updateComtent`（应为 `updatedContent`）~~、`getLabel(variants: FrameworkVariant)` 单数概念用了复数参数名。**已完成**：`DEFAULTE_TARGETDIR` → `DEFAULT_TARGET_DIR`（顺带补上缺失的分隔符，Hubery 确认）3 处；`getLabel(variants)` → `getLabel(variant)`。**`updateComtent` 已不存在**——`git log -S` 确认它随 CTV-15 拆分（`d8f7548`）与 `write()` 一起消失，现为 `plan.ts` 的 `replaceHtmlTitle`，条目描述当时就已过期。纯改名无新行为可测，安全网是 `tsc`：故意漏改一处实测报 `TS2552` | 小 |

> ⚠️ **CTV-20 把一个坏形态换成了另一个已知坏形态**：不传 `--overwrite` 的非交互场景不再抛 ENOTDIR 栈，但会画出菜单后静默退 1，即 CTV-31 记录的行为。净改善但不完整，CTV-31 仍卡在「只报错 vs 支持纯脚本模式」这个待决策上。
>
> ⚠️ **本批发现 E2E 可以真的驱动 clack 选择器**（helper 新增 `respondAfterStdout`）。此前 CTV-29 记为「进不了 E2E」的那条——非空目录时主动选中「取消操作」——现在有办法覆盖了，但**只对文件分支补了**，目录分支那条仍是空白。

## 待办 · 交互与提示

能用，但用户拿不到该有的信息。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-31 | **非交互环境下应给人话，而不是画个菜单然后静默死掉** | 做 CTV-29 时实测发现：`@clack/core@1.4.3` 的 prompt 在 stdin 不可读（EOF / 非 TTY）时 **promise 永不 settle**，`await` 之后的代码一行都不执行——`cancel()` 从来没被调用过。进程靠事件循环排空自然退出，于是用户/CI 日志里留下的是一个画到一半的选择器，没有任何解释。Node 在顶层 await 场景下会明说 `Detected unsettled top-level await` 并退 13，但我们的 await 在 `main()` 内部，所以什么提示都没有。CTV-29 让退出码不再撒谎，但没解决「不解释」。合理做法是开跑前检测 `process.stdin.isTTY`，需要交互时直接报一句人话。**⚠️ 2026-09-08 更正：原来写的「卡在哪」基于一个错误前提。** 原文说纯脚本模式「需要把所有 prompt 都做成可跳过」——逐个查过 `src/index.ts` 的 7 个提问点，**6 个已经可跳过**：项目名（位置参数）、同名文件与非空目录（`--overwrite`，两处）、选框架与选变体（`-t`，两处）、是否装依赖（`-i` / `--no-immediate`）。E2E 的「非交互三件套」跑 50 条用例走的就是这条全程无提问的路径。**唯一的洞是包名**（`index.ts:223`，条件是 `derivePackageName()` 的 `needsPrompt`，即 `!isValidPackageName(basename)`，只在目录名推不出合法包名时触发，如 `My App` / `.foo`）。所以两个选项的成本几乎一样，不再是「小 vs 大」的取舍。**新的卡点（仍待 Hubery 定）**：**A** 非 TTY 且需要提问时报人话 + 退 1；**B** = A + 补上包名那个洞（加 `--package-name`，或非 TTY 时直接用 `toValidPackageName()` 的结果不再追问），从此可以宣称「参数齐全就能全程无交互」。Claude 倾向 B。**2026-09-08 Hubery 选定 B + B1（新增 `--package-name`），已完成**，详见时间轴 | 小 |

## 已发布 · v1.4.0（2026-09-08）

vitesse 从「仓库内置两份坏副本」改成「转交上游」，并补全 `--help` 里一直没写的 5 个 `custom-*`。
**刻意单独发一版**：新变体走 `customCommand`，按仓库惯例不进 E2E，天生带一块「按设计不测」的区域。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-30 | **vitesse 改为 customCommand 转交上游** | 删掉 `template-vitesse-base` / `template-vitesse-lite` 两个目录（115 文件 / 568 KB），在 `FRAMEWORKS` 的 vue 分组下加变体转交上游。`getFullCustomCommand()` 已能改写 `npm exec `，**src/ 确实零新代码**。**已完成，上了两个变体**（`custom-vitesse` / `custom-vitesse-lite`）而非条目原拟的一个——下架的是两个目录，上游 `antfu-collective/vitesse` 与 `antfu-collective/vitesse-lite` 都还活着，只恢复一个会让「lite 去哪了」无解。**条目里「需同步 HELP_MESSAGE」这句基于一个错误前提**：help 的「可用模板」区块原本只列 6 个内置模板，现存三个 `custom-*` 一个都没列，而它们都是 `-t` 真正接受的合法值——等于 `--help` 对 5 个合法值闭口不谈。按 Hubery 决定**一并补全全部 5 个 `custom-*`**。验证：`build:prod` 退出 0（typecheck / lint:fix / 198 单测 / build / 50 E2E），单测 182 → 198、E2E 50 条不变，`npm pack` 仍 82 文件 / vitesse 命中 0（确认删目录不动发布产物），**9/9 变异被捕获**，两个变体各联网实跑一次成功 | 小 |

> ⚠️ 本版**没有**移除任何已发布的东西：两个 vitesse 目录从 v1.1.0 起就不在 `package.json` 的 `files` 里，
> 发布产物实测仍是 82 个文件，所以是 minor 不是 major。
>
> ⚠️ **用户可感知的取舍**：转交上游的 vitesse 项目**不享受内置模板的两项处理**——`package.json` 的 `name`
> 和 `index.html` 的 `<title>` 不会被改写成项目名（degit 是原样克隆）。与三个既有 customCommand 变体一致，
> 是这条路径的固有特性，不是缺陷。已写进 README。**实测补充**：上游 vitesse 的 `package.json` 压根没有 `name`
> 字段（`private: true`）、`index.html` 也没有 `<title>`（标题由 unhead 运行时管）；vitesse-lite 则有
> `<title>Vitesse Lite</title>`。所以这条取舍对用户的实际影响比字面上小。

## 待办 · 模板体系

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-16 | **模板元数据外置，help 由数据派生** | 加一个模板要同时改 `FRAMEWORKS`、`HELP_MESSAGE`、README、`package.json` 的 `files` 四处，`HELP_MESSAGE` 还是手写对齐的 ASCII 表格。应让 help 从 `FRAMEWORKS` 派生（这样 CTV-05 那类漂移在结构上就不可能发生），并考虑 `files` 改用 `template-*` 通配 | 中 |
| ❌ | CTV-11 | ~~catalog 展开为真实版本号~~ | 随 CTV-30 作废。转交上游后仓库里不再有 vitesse 的 `package.json`。**CTV-30 顺带拿到了实证**：degit 下来的上游项目自带 `pnpm-workspace.yaml`，50 处（lite 26 处）`catalog:` 引用逐条比对**全部可解析**——CTV-01 那个病根本不在上游，是当初拷贝副本时把定义源漏掉了 | 中 |
| ❌ | CTV-12 | ~~`_npmrc` → `.npmrc` 重命名机制~~ | 随 CTV-30 作废——vitesse 是唯一带 `.npmrc` 的模板。**但「npm 打包会无条件剔除 `.npmrc` 和 `.gitignore`」这个约束依然成立**，已记在 CLAUDE.md「npm 打包的隐藏规则」一节；将来任何新模板带这两个文件时仍需走 `RENAME_FILES`。**CTV-30 实测确认转交上游这条路径完全绕开了该约束**：degit 走 git 而不走 npm 打包，`.npmrc` 与 `.gitignore` 都原样落地 | 小 |
| ❌ | CTV-13 | ~~清理模板里的上游身份文件~~ | 随 CTV-30 作废。副本删掉后，antfu 的 FUNDING.yml 与 LICENSE 自然不存在 | 小 |
| ❌ | CTV-14 | ~~重新上架 + E2E 钉住~~ | 随 CTV-30 作废。转交上游的变体会真的联网跑 degit，按既有惯例不进 E2E（三个现有 customCommand 变体同样不进） | 小 |
| ✅ | CTV-42 | **6 个内置模板锁死 vite 7，pnpm 用户装不上** | 2026-09-10 全量验收实测：`vanilla` / `vanilla-ts` / `vue` / `vue-ts` / `lit` / `lit-ts` 都写着 `vite: ^7.3.1`，vite 7 依赖 `esbuild@0.28.2`（`postinstall: node install.js`），**pnpm 11 遇到未显式放行的 build script 直接退出码 1**（`ERR_PNPM_IGNORED_BUILDS`），连带 `pnpm build` / `pnpm dev` 一起挂（pnpm 跑 script 前的 `runDepsStatusCheck` 会重跑 install）。而 CTV-39 让 `-i` 原样透传退出码，**用 pnpm 的用户选「立即安装依赖」直接看到 `└ 依赖安装失败` + 退 1**。**线上 v1.8.0 同样中招**（下载 tarball 实测）。三条对照钉死根因：`vue-dev` 用 vite 8（rolldown，**零 esbuild**）→ 退 0；上游 `create-vite` 现在也是 vite 8 → 退 0；npm 用户完全不受影响。修法是**升到 `vite ^8.2.2` 对齐上游**（有 `@vitejs/plugin-vue` 的同步升 `^6.0.8`），已在沙箱实测 6/6 `pnpm install` 与 `pnpm build` 全退 0、esbuild 包数归零。备选的「每个模板补一份放行 esbuild 的 `pnpm-workspace.yaml`」同样实测有效，但治标且与上游越差越远，**Hubery 2026-09-10 选定升级方案** | 中 |
| ✅ | CTV-43 | **`template-vue-ts` 构建失败，与包管理器无关** | 同一次验收实测：`npm run build` 退出码 2，`src/main.ts(3,17): error TS7016: Could not find a declaration file for module './App.vue'`。根因是 `src/App.vue` 与 `src/components/HelloWorld.vue` 写的是 `<script setup>`，**缺 `lang="ts"`**（上游 create-vite 的 vue-ts 两个都有），于是 vue-tsc 认为 SFC 无类型信息。**排除法已做完**：升 `@vue/tsconfig` 0.8.1 → 0.9.1 无效、升 `typescript` 5.9.3 → 6.0.3 无效，**只补 `lang="ts"` → build 退 0**。这条与 CTV-42 独立：npm 用户也一样构建不了 | 小 |
| ✅ | CTV-44 | **`template-vue-dev` 开箱 `lint` 退 1（6 个错误）** | 用户拿到模板第一次跑 `pnpm lint` 就红。三类：① `pnpm-workspace.yaml` 缺 `minimumReleaseAgeExcludePrune` / `shellEmulator` / `trustPolicy` 三条（`eslint-plugin-pnpm` 的 `pnpm/yaml-enforce-settings` 强制，与本仓库自己那份吃同一条规矩，CTV-41 拷贝时只带了 `allowBuilds`）；② `package.json` 的 key 顺序（`private` / `version` 应排在 `type` 之后，`jsonc/sort-keys`）；③ `src/components/BaseFooter.vue` 一处 `vue/max-attributes-per-line`。**已确认是模板自带、不是 CLI 改写引入**（模板原文 key 顺序与生成物逐一比对一致）。本仓库 `eslint.config.ts:11` 忽略 `template-*`，所以门禁看不见——**刻意不改这个忽略**：CLAUDE.md 记着用本仓库 eslint 去 lint 模板会挂死 7 分钟（模板的 `eslint.config.ts` 依赖本仓库没装的插件）。**⚠️ 修法中途翻过一次车，留档**：最初按字面把三条设置补进 `pnpm-workspace.yaml`，lint 确实绿了，但重测发现 **`pnpm install` 反而退 1**——`trustPolicy: no-downgrade` 触发 `ERR_PNPM_TRUST_DOWNGRADE`，`semver@6.3.1` 经 `vite-plugin-vue-devtools` → `vite-plugin-vue-inspector` → `@babel/core` 传递进来。**让 lint 变绿的代价是把装依赖炸掉，那笔账不划算**（装不上比 lint 红严重得多，CTV-39 让 `-i` 透传退出码）。改为在模板的 `eslint.config.ts` 里关掉 `pnpm/yaml-enforce-settings`：那三条本来就是仓库开发者的偏好，不该强加给刚生成的项目。`pnpm-workspace.yaml` 回到只有 `allowBuilds` 一条。**这一轮反转本身就是「模板改动必须真装一次」这条新验证标准的实证**——静态断言当时全绿 | 小 |

---

## 已发布 · v1.8.0（2026-09-09）

新增第七个内置模板，外加提交时才暴露出来的一个工具链缺陷。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-41 | **把 `my-vue-dev-template` 加成一个模板** | **2026-09-09 完成，见时间轴。定案：走内置、模板名 `vue-dev`、演示内容保留结构精简正文、footer 的 GitHub 链接按 Hubery 要求保留作宣传。以下为立项时的原始记录：** **Hubery 提出。开工前必须先讨论名字**——`my-vue-dev-template` 里的 "my" 是作者视角，用户敲 `-t my-vue-dev-template` 会莫名其妙，且与现有命名体系（`vanilla` / `vue` / `lit` + `-ts` 后缀，`custom-` 前缀表示转交上游）不搭。**已核实的事实（不必重查）**：仓库 `Hub-yang/my-vue-dev-template`（public，2026-08-28 更新），本地在 `~/Desktop/code/my-vue-dev-template`；**它的 `package.json` 里 `name` 已经叫 `vue3-dev-template`**，这本身是一个候选名。技术栈：vite + vue3 + unocss + vueuse + vue-router（typed-router）+ element-plus 图标 + prismjs + sass + 自动导入 + `@antfu/eslint-config` + husky/commitlint + `@huberyyang/todo-scripts`。**两个已知会咬人的点都已排查**：`catalog:` 命中 **0**（不会重演 CTV-01 那个装不上的病）、无 `.npmrc`；但**有 `.gitignore`，必须存成 `_gitignore` 并走 `RENAME_FILES`**，否则 npm 打包会无条件剔除它（见 CLAUDE.md「npm 打包的隐藏规则」）。**比名字更根本的一个决策**：走**内置模板**还是 **`custom-` 转交上游（degit）**？CTV-30 刚把 vitesse 从「仓库内置副本」改成「转交上游」，教训是副本会漂移、会漏掉定义源；而这是 Hubery 自己会持续更新的仓库，正是那个场景。但转交上游要联网、不享受 `name`/`<title>` 改写、按惯例不进 E2E。**开工时还要处理**：拷进来的话得决定 `.husky` / `LICENSE` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `node_modules` 各自去留；新模板要按 CTV-25 补一份 `# <模板名>` 的占位 README；`FRAMEWORKS` 一改，E2E 的 `it.each(BUILTIN_TEMPLATES)` 会自动把它纳入覆盖 | 中 |

> ⚠️ **本版还带了一条没有 ID 的修复**（`d60f55c`，`fix: pin lint-staged to the root config`）：
> `.husky/pre-commit` 原本是裸的 `npx lint-staged`，而 lint-staged 会**为每个暂存文件向上查找最近的配置**。
> `template-vue-dev` 自带的 `lint-staged.config.mjs`（模板本身的一部分，不能删）于是接管了 33 个模板文件，
> 用本仓库的 eslint 去 `--fix` 它们 —— **实测卡死 7 分钟、`kill -9` 杀不掉**。传 `--config` 禁用配置发现即可。
> 这条不是 CTV-41 特有的，以后任何带 lint-staged / eslint 配置的模板都吃这层保护。已记进 CLAUDE.md。

---

## 已发布 · v1.10.0（2026-09-10）

一次误诊逼出来的可观测性补丁：界面上原本看不出跑的是哪一版。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-45 | **TUI 里看不出跑的是哪个版本** | 2026-09-10 排查「vanilla-ts + pnpm 装依赖失败」时暴露：Hubery 手动测到的其实是 pnpm 因默认 `minimumReleaseAge`（24h 内发布的版本一律不取）回退到的 **v1.6.1**——那版模板还锁着 `vite ^7.3.1`，pnpm 11 遇未放行的 esbuild build script 直接退 1（CTV-42 修过的坑），而线上 `latest` 当时已是 v1.9.0。**CLI 交互界面从头到尾不报版本号**，框顶只有 `create-todo-vue`，于是在旧版上白测一轮无从察觉。**做法**（2026-09-10 Hubery 选定「同行 + 灰色弱化」）：`plan.ts` 新增纯函数 `buildIntroTitle(version)`，intro 标题改成 `create-todo-vue ` + dim(`v1.9.0`)；`getVersion()` 读不到时返回 `'unknown'`，**此时不显示版本后缀**——`vunknown` 长得像个真版本号，比不显示更糟。`color` 做成参数而不是写死 `dim`（与 `getLabel()` 同形）：picocolors 在非 TTY 下不注入转义码，写死的话「版本那段确实被弱化了」根本钉不住——变异 M4 正是靠这个参数才被捕获。**2026-09-10 完成**：单测 249 → 253、E2E 98 → 100，typecheck / lint / test / test:e2e 全退 0。**6 个变异 6 个被捕获**，其中 M6（接线传错版本号）**只打红「与 `--version` 一致」那条、形状断言仍绿**，证明两条 E2E 缺一不可。真实运行实测：`┌  create-todo-vue v1.9.0`，强制开色时 dim 只包住 `v1.9.0`（`ESC[2m…ESC[22m`），`--version` 仍是干净的 6 字节（CTV-36 那条不变量没破） | 小 |

