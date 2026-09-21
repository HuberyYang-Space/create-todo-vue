# 架构综述

**改 `src/` 之前读这份。** 不读的后果：会破坏几条没有编译期保护的隐式契约——
退出码透传、终端框线与光标的还原、模板目录解析对 `dist/` 层级的依赖，
它们出错时不报错，只是行为变错。

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。现役禁令在 [CLAUDE.md](../CLAUDE.md)，本文件是它们背后的
> 结构说明与实测证据。

---

## 这是什么

`@huberyyang/create-todo-vue` 是一个脚手架 CLI，仿 [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite) / [create-vue](https://github.com/vuejs/create-vue) 实现，发布到 npm，通过 `npm create @huberyyang/todo-vue` 调用。

**bin-only，没有 library API**——`package.json` 里没有 `main`/`exports`/`types` 字段，唯一对外接口是 `bin.create-todo-vue`。

做的事：交互式选模板 → 把仓库内置的 `template-*` 目录整个拷到目标目录 → 改写 `package.json` 的 `name` 和 `index.html` 的 `<title>` → 可选立即装依赖。


## 模块与链路

**入口链路**：`bin/index.js` 只有一行 `import '../dist/index.js'`，`dist/index.js` 是 tsdown 打包 `src/index.ts` 的产物。

**`src/index.ts` 导出 `main()` 与 `runCli()`，不再顶层自执行**（CTV-15 改的，`bin/index.js` 显式调用 `runCli()`）。这跟 `@huberyyang/todo-scripts` 的结构一致，好处是这个文件**可以被测试导入**——`tests/entry.test.ts` 就直接调 `main()`。守住这条不变量的是 E2E 而不是 `entry.test.ts`：实测把顶层 `main()` 加回去，`entry.test.ts` 仍全绿（首次 import 时自执行已经发生，而那条用例只断言导出类型），E2E 才会红 2 条。

`main()` 顺序编号成 5 步（取项目名 → 处理已存在的目标 → 取包名 → 选框架/预设 → 问是否装依赖），CTV-15 已把纯决策抽进 `plan.ts`、副作用抽进 `scaffold.ts`。

**`git init` 不占编号**（CTV-22）：它排在 `scaffoldTemplate()` 之后、第 5 步之前，是「创建项目」的收尾动作。**位置要紧**——装依赖失败那一支会直接 `return status`，挪到它后面会让「装依赖失败但项目已经建好了」的路径整个跳过 git init。先用 `findGitDir(root)` 向上找 `.git`，找到就只打一句提示不建（避免嵌套仓库；`emptyDir()` 刻意保留 `.git`，所以 `--overwrite` 一个已有仓库的目录之后也会命中这一支）。**失败只 warn、不改退出码**——这跟 install 失败刻意不同：那边透传退出码是因为装依赖本身就是用户诉求（CTV-39），而 git init 是附加动作，让它把一次成功的创建变成失败是撒谎。`custom-*` 那条路径不做 git init（目录不归我们管）。

**开框用 `terminal.open()`、收尾用 `terminal.close()`，不要直接调 `prompts.intro/outro`**——绕过去就等于把状态机架空（CTV-34）。

**7 个提问点全部包在 `ask()` 里**（CTV-31），每处都要传「这一步在问什么」和「非交互下该改用哪个参数」。加新提问点时别忘了这一层，漏掉的那个会退回「画半截菜单然后静默死掉」。

**包名的解析刻意排在第 2 步（破坏性操作）之前**，而提问仍留在第 3 步。理由是校验必须先于副作用：放到第 3 步再判的话，`--overwrite` 会先把目标目录清空，然后才告诉用户 `--package-name` 写错了。E2E 有一条专门的次序守卫钉着这一点。

**`src/help.ts`（CTV-16）** 只干一件事：把 `FRAMEWORKS` 渲染成 help 里「可用模板」那一块。**它不 import `constants`**——反过来 `constants` 要 import 它来拼 `HELP_MESSAGE`，两边互相 import 就成了循环依赖，所以数据一律靠参数传进来。

排版是确定性算法（列宽 = 最长模板名 + 2、按 80 列折行、按框架分组上色），**刻意不复刻旧版的手工对齐**：旧版第一块列宽 14、custom 块 21，折行位置也是手挑的，复刻那些等于把随意决定重新编码成数据。

**`src/terminal.ts`（CTV-34/36/37）** 是终端状态的主人：`intro()` 之后有两样东西是我们弄出来的、退出前必须还原——**clack 的框线**（`┌` 要有配对的 `└`）和**被 prompt 隐藏的光标**。

它存在的理由不是三处忘了收尾，而是**「谁负责关框」没有主人**。实测过：`main()` 有 7 类退出路径，改之前 6 条里有 4 条框只开不关，其中两条（转交上游、崩溃兜底）连 CTV-34/36/37 三个条目都没点到，而 CTV-31 自己刚刚又漏了一处。现在状态收在这里，由 `runCli()` 的 `finally` 无条件兜底。

改这块之前必须知道的：

- **`close()` 必须幂等**。`finally` 会无条件调它，而成功路径自己已经调过了；不幂等就会打出两个 `└`。
- **`cancel()` 要调 `markClosed()` 认领**——它自己打了 `└  操作已取消`，不认领的话 `finally` 会再补一条。
- **`restoreCursor()` 只在开过框之后才写**。做本条目时真踩过：无条件写会让 `$(create-todo-vue --version)` 从 5 个字节变成 12 个，版本号后面挂着 `ESC[?25h`。光标是被框里的 prompt 隐藏的，没开过框的路径没人动过它。
- **`src/` 里不许出现 `process.exit()`**——CTV-39 之后一个都没有了，只剩 `process.exitCode`。它会跳过 `finally`，兜底就形同虚设；仓库另有一条旧教训是它会截断没冲刷完的 stdout。转交上游那处是 `return status ?? EXIT_OK`，`utils.ts` 的 `run()` 是 `return status ?? 1`。
- **失败也要把退出码原样带出来**（CTV-39）。`install()` 返回包管理器的退出码，`main()` 直接 `return status`。压成 1 会让调用方分不清「装不上」和「参数写错」，而且透传是**既有行为**（实测退 7 原样出去）。「把 `run()` 改成抛异常」是最省事的写法，也正是会弄丢它的写法。

**`src/banner.ts`（CTV-49）** 打 `main()` 开头那几行字：ANSI Shadow 渲染的 `TODO-VUE` 渐变字标，底下一行 `v1.10.0 - HuberyYang`。观感与 `@huberyyang/todo-scripts` 刻意一致（同字体、同渐变色、同尾行格式），两个工具摆在一起像一家出的。

模块只负责**打这几行字**，终端的其它状态（框线、光标）仍归 `terminal.ts`。三个只有它用得上的依赖（figlet / gradient-string / terminal-link）也收在这里。

两条隐式契约，改之前先看：

- **`banner(ENTRY_DIR)` 必须排在 `--version` / `--help` / 参数校验之后、`terminal.open()` 之前。** 排到前面会污染 `$(create-todo-vue --version)` 的输出（同 `restoreCursor()` 那条教训）；排到后面字标会被打进 clack 的框里，把 `┌` 和后续提示冲散。`tests/e2e/banner.e2e.test.ts` 两头都有钉子。
- **`BANNER_MIN_WIDTH`（72）必须 ≥ 字标实际渲染宽度（67）。** 阈值是手量的常量，宽度取决于 `BRAND_NAME` 有几个字母——改了品牌名却忘了改阈值，字标会在刚好触发渐变的那档宽度上折行，而其它测试照样全绿。`tests/banner.test.ts` 用「逐列试探出触发阈值再比宽度」的方式钉住，不为测试把常量导出去。

**字体是裁过的子集**（`src/assets/ansi-shadow-subset.ts`）：完整 ANSI Shadow 有 102 个字形，字标只用 8 个，裁完产物从 107.3 kB 降到 97.8 kB。**FIGfont 的字形按位置排列，删不得**——用不到的换成空字形、位置照旧。代价是「改了 `BRAND_NAME` 却没同步子集」会让新字母**安静地渲染成空白**，不报错也不变窄，所以单测改成拿**未裁剪的原始字体**渲染出的点阵逐字比对整幅字标，而不是抽查。

**版本号从框顶搬到了字标下面。** CTV-45 要的是「界面上能看出跑的是哪一版」，字标尾行已经满足，框顶再写一遍就是同屏重复，所以 `terminal.open()` 的标题收窄成纯 `create-todo-vue`，`plan.ts` 的 `buildIntroTitle()` 随之删除（零消费方）。**CTV-45 的两条 E2E 守卫跟着搬进 `banner.e2e.test.ts`，没有被放弃**——哪天字标也被拿掉，那两条必须再找新家。

**README 的演示 GIF 录的就是这几行字。** `.github/assets/demo.gif` 是一段真实终端录像，
改了 `BRAND_NAME`、渐变配色或尾行格式之后它就过期了——跑 `bash .github/assets/record-demo.sh`
重录一遍即可，脚本会自己先 `pnpm build`（录的是本地构建产物）。录制链路是 asciinema + agg，
**不是 vhs**（vhs 靠无头 Chromium 截帧，在这台机器上从未走到 ffmpeg，经过见
[timeline.md](./timeline.md) 的 CTV-57）。最容易忘的前提是**列宽**：`demo.exp` 里写死 120 列，
低于 `BANNER_MIN_WIDTH` 就会走 plain 分支，录出来的字标是纯文本、一点渐变都没有。

**渐变着色没有自动化守卫。** gradient-string 底下是 chalk，chalk 在非 TTY 下 level 为 0，`gradient(...).multiline(x)` 原样返回 x——测试进程里永远量不出颜色，拿 `FORCE_COLOR` 硬撑等于在测 chalk。配色只能在真实终端里看。

**`src/interactive.ts`（CTV-31）** 是 `src/` 里唯一碰 `process.stdin` 事件的地方。它导出 `ask(prompt, step, hint, stdin?)` 与 `NonInteractiveError`，职责只有一件：**不让一个永远等不到输入的 prompt 无声无息地拖死进程**。

做法是 `Promise.race([prompt, stdin 抵达 EOF])`，EOF 赢就抛 `NonInteractiveError`，由 `runCli()` 分流出来打人话、不打调用栈。几条实测出来的约束，改之前先看：

- **判据不能用 `process.stdin.isTTY`**（条目原文是这么写的，已证伪）：管道也不是 TTY——`stdio:'pipe'`、shell 的 `echo x |`、`stdio:'inherit'` 下 `isTTY` 一律是 `undefined`。按它判会打红 E2E 里 4 条靠管道喂按键的用例，也会误伤真实的 `echo | cli`。
- **'end' 和 'close' 两个事件都要听**。实测：`end()` 发 `['end','close']`，而 `destroy()` 只发 `['close']`、`destroy(err)` 发 `['error','close']`——后两种（stdin 被关掉、读 stdin 报 EIO）同样永远给不出输入。这条是**变异测试逼出来的**，只听 'end' 一度全绿存活。
- **挂 'end'/'close' 监听不会把字节从 clack 手里抢走**（实测确认，只有 'data' 监听和 `resume()` 会让流进入流动模式）。这是那 4 条管道用例能继续绿的原因，它们同时就是这条不变量的回归钉子。
- **prompt 赢了必须在 `finally` 里摘掉监听**，否则一次运行经过多个提问点会累积，撞上 Node 默认 10 个上限的警告。

**`src/constants/index.ts`** 持有四样东西：

- `FRAMEWORKS`：两层树，`Framework`（vanilla / vue / lit，共 3 个）→ `variants: FrameworkVariant[]`。`custom-*` 不是顶层框架，它们是 vue 底下的转交变体（曾经还有两个 vitesse，CTV-47 已删）。每个节点自带 picocolors 的 `color` 函数，终端标题由 `getLabel()` 渲染。
  - `getLabel()` 的 `link` 渲染成**下划线的裸 URL、不带括号**，跟在 `display` 后面。带 `link` 的目前是 `custom-nuxt` / `custom-vike-vue` / `vue-dev`（CTV-58）。
  - **`↗` 是写在 `display` 里的约定符号，专表「转交给上游脚手架」**，所以只挂在 `custom-*` 上；`vue-dev` 虽然也亮出上游仓库，但它是内置模板，**不加这个箭头**。加了会让人以为选它会联网转交。
  - 选项那一行末尾带括号的那截是 clack 的 `hint`，内容是**转交命令**、且只在选中时显示，与 `link` 无关。
- `TEMPLATES`：从 `FRAMEWORKS` 派生（flatMap 出所有 variant 名），用于校验 `-t` 传进来的值。
- `HELP_MESSAGE`：「参数」那一块仍是手写的（有 `ARGV_OPTIONS ↔ HELP_MESSAGE` 双向断言盯着）；**「可用模板」那一块已由 `FRAMEWORKS` 派生**（CTV-16），渲染在 `src/help.ts`。
- `RENAME_FILES`：拷贝时的文件名映射，目前只有 `_gitignore` → `.gitignore`。

**七个内置模板各带一份占位 `README.md`，内容就是模板名**（`# vue-ts`），CTV-25 定的。它**不走任何改写**——`package.json` 的 `name` 与 `index.html` 的 `<title>` 会被改成包名，README 刻意不改，是留给用户的一张白纸。此前只有 vue / vue-ts 有 README 且是 Vite 官方模板的英文原文（讲的是上游模板的事）。钉子有两处：`constants.test.ts` 断言七个模板目录都有 README 且内容恰好是 `# <模板名>`；`scaffold.e2e.test.ts` 用「目录叫 my-app、模板叫 vanilla」的场景断言生成后仍是 `# vanilla`，钉住「不被改写」。

**两条互斥的执行路径**。变体带 `customCommand` 时（`custom-create-vue` / `custom-nuxt` / `custom-vike-vue`），完全不走内置模板：`getFullCustomCommand()` 把指令按包管理器改写后 `spawn.sync` 转交给上游脚手架，然后 `process.exit(status)`。不带 `customCommand` 才走下面的拷贝逻辑。

`getFullCustomCommand()` 把 `npm create` / `npm exec` 前缀重写成当前包管理器的等价形式，五个包管理器各有各的怪癖：bun 用 `bun x create-`、deno 要 `deno run -A npm:create-` 才有权限、pnpm 不支持 `--` 语法、yarn 1.x 在 `create` 里不认 `@latest`。这是本仓库分支最多的纯函数。

**模板目录的解析方式**：`path.resolve(fileURLToPath(import.meta.url), '../..', 'template-<name>')`。它依赖「`dist/index.js` 恰好位于仓库根目录下一层」这个事实——改 `tsdown.config.ts` 的 `outDir` 会让它静默指向错误位置，且不会有任何编译期报错。

**`write()` 的三条特例**：传了 `content` 就直接写；文件名是 `index.html` 时读模板内容、正则替换 `<title>` 后再写；其余走 `copy()`（递归目录拷贝）。`package.json` 被排除在批量拷贝之外，单独读出来改 `name` 再写。

## 第三方库会就地改写你传进去的对象

**永远不要把模块级常量直接交给第三方库，先确认它会不会改写入参。** 拿不准就传副本（`structuredClone`）。

`mri` 就是这样：它会把 options 对象改得面目全非——`alias` 的值从字符串变成数组、`alias.help` 变成 `[]`、`boolean` 每调用一次就把别名再追加一轮且**无上限增长**（实测 4 次调用从 4 项涨到 13 项，测试进程里涨到 193 项）。CTV-17 把模块级的 `ARGV_OPTIONS` 直接传了进去，紧接着 `collectKnownFlags()` 读到的就是被污染的数据。

**`Object.freeze` 挡不住这类问题**（已实测，别再试）：第三方库多是 CJS、非严格模式，对冻结对象赋值只会**静默失败**而不抛错；而且浅冻结管不到嵌套的 `alias` 与 `boolean`，它们照样被改。

**这类污染最阴险的地方是它在生产里往往不显形**——真实 CLI 进程只解析一次参数，那一轮污染后结果碰巧仍然正确（线上 v1.2.0 实测无影响）。它只在测试里暴露，而且**依赖测试文件的调度顺序**：`vitest.config.ts` 里 `isolate: false`，一个调用 `main()` 的测试文件会污染其后收集的文件。本地和 dev 的 CI 都绿、main 的 CI 却红，就是这么来的；用 `--no-file-parallelism` 可以拿到确定性复现。

推论：**给共享状态写断言时用绝对值，别用「操作前后相等」**。后者在状态已经被同文件其它用例弄脏时会一路绿着骗人。

**这类污染现在有两条钉子盯着**，都在 `tests/entry.test.ts`，期望值一律硬编码（从被测常量派生就退化成恒等式）：
`ARGV_OPTIONS` 一条（CTV-17 换来的），模板注册表 `FRAMEWORKS` / `RENAME_FILES` 一条（CTV-33 补的）。

**CTV-33 已把 `src/` 扫过一遍，没有第三处**：第三方库只有 mri / cross-spawn / @clack/prompts / picocolors 四个，
`FRAMEWORKS` 交给 clack 的两处是 `.map()` 返回**全新对象字面量**，其余常量只流向自有纯函数。加新代码时仍要守这条规则，
但不必再重扫一遍历史代码。

**特别注意派生物挡不住这类污染**：`TEMPLATES` 与 `HELP_MESSAGE` 都在模块加载时求值一次，之后再改 `FRAMEWORKS`
它们不会跟着变——所以 `constants.test.ts` 那些断言对注册表被改写这件事是瞎的。实测：注入一行
`FRAMEWORKS[0].variants[0].name = …`，补钉子之前 239 条单测全绿、一条都没红。

