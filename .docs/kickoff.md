# 新会话冷启动

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。

## 给 Hubery：开场贴这段

开新会话时把下面这段整个贴进去就行，不用再手写状态——状态由 [roadmap.md](./roadmap.md)
的「📍 当前状态」承载，那里是最新的。**每次收工前记得让 Claude 更新它。**

```text
接手 create-todo-vue（~/Desktop/code/create-todo-vue）。本次做 <条目 ID>。

开工前先读三份东西，按顺序：
1. CLAUDE.md —— 现役禁令、每次必读的常驻索引、以及开头那节「功能开发一律走
   superpowers 全流程」。那节没有例外，不接受「改动小所以跳过」。
   特别留意「四条验证标准」。需要细节时按它的「改之前先读」索引去翻 .docs/。
2. .docs/roadmap.md —— 「📍 当前状态」和「🗂 待办」是唯一排期依据，
   文件末尾的维护规则要照做。.docs/backlog.md 里的条目未经我点头不许动。
3. git log --oneline -10 —— 看最近做了什么。

读完先告诉我：当前状态（你自己核实，别信我转述）、你对这个条目的理解、
以及你打算怎么做。设计等我确认才动代码。

几条最容易踩的：
- CLAUDE.md 和整个 .docs/ 都已纳入版本管理（2026-09-21 改的），跟着分支和 worktree 走，
  改了就要跟着一起提交。它们不在 package.json 的 files 里，不会发进 npm 包。只有 spec.md 仍不进版本库。
- 没跑过验证不许标 ✅，报告里要贴真实命令输出。
- 给存量代码补的测试「一次就绿」不算证据，要用变异测试证明断言有牙齿。
- 断言的期望值不要从被测数据派生。判据：问一句「改被测源码的哪一处能让这条
  断言变红」，答不上来就是恒等式。
- 校验脚本要验范围不能只验起点；变异脚本要确认变异串恰好命中一次且真写进了盘，
  改完还要还原 + diff 校验。
- 不许报我没验证过的因果关系。
- 发版我自己来：npm login 和 pnpm release 由我执行，你到那一步停手，把该发的
  版本号告诉我。发版前后的准备和验证仍然归你。
- 会话回复中文；代码注释中文；commit message 英文（以项目 CLAUDE.md 为准）。
- 我说「提交」时走 /commit skill，该 skill 规定不加 Co-Authored-By trailer。
```

## 给 Claude：开口之前先核实这六项

读完上面那几份文件后，**不要照抄 [roadmap.md](./roadmap.md) 或 [CLAUDE.md](../CLAUDE.md)
里的状态转述**——它们可能已经过期，一律以下面这些命令的实际输出为准：

| 要核实的 | 怎么核实 |
|:--|:--|
| 四个引用是否同步 | `for r in main dev origin/main origin/dev; do echo "$r $(git rev-parse --short $r)"; done`<br>⚠️ 原来写的 `git rev-parse --short main dev origin/main origin/dev` **是坏的**——git 2.52.0 实测报 `fatal: Needed a single revision`，`--short` 只接受单个 revision（2026-09-09 撞到并改掉）|
| 线上是什么版本 | `npm view @huberyyang/create-todo-vue version` |
| tag 指向哪个 commit | `git rev-parse v<版本>^{commit}`——**必须带 `^{commit}`**：tag 是 annotated 的，裸的 `git rev-parse --short v1.9.0` 返回的是 **tag 对象**的 SHA，看着像「tag 不指向 main」（2026-09-10 撞到并查清）|
| 本地版本号 | `node -p "require('./package.json').version"` |
| 工作区是否干净 | `git status --short` |
| 门禁是否绿 | `pnpm build:prod`（typecheck + lint:fix + 单测 + build + E2E） |

**发版前**还要多查两项：`dev` 有没有合回 `main`（在 `main` 上发版，否则 tag 不在默认
分支——v1.5.1 就踩过），以及 README 是否需要同步（逐条对照本批改动看参数说明、
退出码、可用模板、快速开始示例、徽章）。详见 [release.md](./release.md)。
