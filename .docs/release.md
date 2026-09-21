# 发版

**每次发版必读，发版前后都要照着走。** 六步清单缺一不可，漏掉任何一步的后果都写在条目里。

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。

---

## 发版流程

`pnpm release` = `build:prod`（typecheck + lint:fix + test + build + test:e2e）→ `bumpp --no-verify` → `npm publish`。

`--no-verify` 是 CTV-54 加的，**不要拿掉**：`bumpp` 的版本号提交会触发 husky 的 `pre-commit`，
把 `build:prod` 十几秒前刚跑完的 typecheck + lint:fix + test 原样再跑一遍（本机实测 2.03 + 4.88 + 1.15
≈ **8.1s**），而那个 diff 只有一个版本号字段，不可能由绿转红。`lint-staged` 的 glob 是 `'*'`，
`package.json` 必然匹配，所以躲不掉。**日常提交的 `pre-commit` 保持全量不变**——那是本地与 CI 之间
刻意的跨环境双保险，不在去重范围内。

`bumpp` 默认开启 `--commit --tag --push`，所以它会自动把发版提交和 `v*` tag 推到**当前分支**，那个 tag 又会触发 `release.yml`。**注意日常开发在 `dev` 分支、默认分支是 `main`**——在 dev 上发版会让 main 落后，发版前要先想清楚是合回 main 再发还是接受落后。

### 分工：`npm login` 与 `pnpm release` 由 Hubery 亲自执行

**Claude 不跑这两条命令，也不要试图绕开**——不要自己拆成 `bumpp` + `npm publish`，不要另找 registry 认证方式。两条都必须有人在场：

- `npm publish` 受 2FA 保护，要验证器上的一次性码（实测报 `npm error code EOTP`），Claude 拿不到；
- `bumpp` 默认交互式，会停在版本选择上，在非交互的工具调用里直接挂住。

**Claude 干的是它两侧的活**：发版前跑完门禁、同步 README、把 dev 合回 main，然后**停下来**，把「这批该发哪个版本号」（由改动性质定 semver，不由计划定）告诉 Hubery；发版后按清单收尾并验证真正发出去的产物。

⚠️ **`bumpp` 推 tag 与 `npm publish` 之间有一个不一致窗口**：tag 和 GitHub Release 已经生成，npm 上却还是旧版本。v1.3.0 实测踩到过（卡在 OTP），补一条 `npm publish --otp=<码>` 就收口。看到这个状态不要删 tag、不要重新 bump——补发就是正解。

### 发版清单

每次发版都要走完这几步，缺一不可：

1. **发版前：把 dev 合回 main**，在 main 上发。否则 tag 指向的不是默认分支，别人 clone 下来和 Release 的「Source code」都是旧代码。
2. **发版前：检查 README 是否需要同步。** 逐条对照本版改动看这几处——`参数说明`（新增/删除的 flag）、`当前可用模板`（模板增删）、`快速开始`的示例命令、徽章。README 是唯一面向使用者的文档，代码改了它没跟上，用户看到的就是错的。
3. **发版：由 Hubery 执行**（必要时先 `npm login`，然后 `pnpm release`）。**Claude 到这里停手**，理由见上面那节。
4. **发版后：`bumpp` 的发版提交只在 main 上**，记得把 `dev` 快进到 `main`，否则下一轮开工时 dev 上的版本号是错的。
5. **发版后：在 [timeline.md](./timeline.md) 记一行**，写清版本号、npm 是否上线、tag 与 GitHub Release 是否生成，并更新 [roadmap.md](./roadmap.md) 的「📍 当前状态 · 已发布」。
6. **发版后：验证的是真正发出去的产物**，不是本地构建。`npm view <pkg> version` 看版本，下载 tarball 核对文件清单，再 `npx <pkg>@<版本>` 真跑一次——本地 dist 正确不等于发布产物正确（`files` 字段配错、npm 剔除 `.npmrc`/`.gitignore` 这类问题只在这一步暴露）。

> changelogithub 默认只收 `feat` / `fix` / `perf` 这类类型，`docs` / `ci` / `build` / `test` / `chore` 的提交**不会出现在 Release notes 里**。v1.1.0 就是这样：7 个提交只露出 2 条。想让它们出现需要额外配置。

`npm publish` 刻意**留在本地**：CI 里没有 npm 凭据，所以产物没有 provenance 证明。迁到 npm Trusted Publishing 是已知的待办（ROADMAP CTV-23），不是疏漏。

两个 workflow，门禁命令完全相同（`typecheck` / `lint` / `test` / `build` / `test:e2e`），刻意各写一遍而不抽成 `workflow_call`——五行的重复不值得引入一层间接：

⚠️ **门禁在两个 workflow 里各写一遍是刻意的，但同一棵树不该被跑两遍。** 2026-09-21 实测过代价：
`cc4f8b0`（v1.10.0）在 Actions 上跑了**三轮**完整门禁——CI on `main`、Release on tag、事后快进 `dev`
再一轮，命令一字不差；日常提交也稳定跑两轮（`4fa4519` / `b719f22` / `b11996e` 三组 run 的 SHA 逐一相同）。
CTV-55 后降到日常一轮、发版一轮。**`concurrency` 救不了这个**：`refs/heads/main`、`refs/heads/dev`
和 tag 的 `github.ref` 互不相同，分不进同一个组。

- **`ci.yml`**：push 到 `dev` 以及所有 PR 触发。检查当前 head，所以不带 `ref`、不带 `fetch-depth: 0`。
  - **只盯 `dev`、不盯 `main`**（CTV-55）：本仓库历史**零 merge commit**（`git log --merges` 为空），
    `dev` 与 `main` 之间一律快进，所以到达 `main` 的每一棵树都已经在**同一个 SHA** 下被这里检查过，
    两个都盯等于每个提交白跑两轮。唯一不经 `dev` 直接落在 `main` 的是 `bumpp` 的版本号提交，
    由 `release.yml` 的 tag 门禁接住。**代价**：绕过 `dev` 直推 `main` 的 hotfix 没有 CI，
    `main` 没有分支保护，这条靠约定兜着。
  - **`concurrency` 按 ref 分组 + `cancel-in-progress`**：同一分支连推两次时第一轮不再跑到底。
  - **job 上的 `if` 跳过发版提交**（CTV-55）：`pnpm release` 把它连同 tag 一起推到 `main`，
    `release.yml` 已经在那里跑过门禁，事后快进 `dev` 会让同一个 SHA 再跑一遍。判据是 `bumpp`
    固定的提交信息 `chore: release vX.Y.Z`；模板哪天变了只会退化成多跑一轮，**不可能放过没检查的树**。
    `pull_request` 事件没有 `head_commit`，所以表达式先短路掉它。整个表达式**必须用双引号包起来**——
    `'chore: release v'` 里的 `: ` 会让 YAML 把那行当成嵌套映射，`pnpm lint` 会直接报 parsing error。
- **`release.yml`**：`v*` tag 推送触发，另有 `workflow_dispatch`（带 `tag` 输入）用于给漏掉 Release 的旧 tag 补发。几处载重设计，改动前先理解：
  - 工作流级的 `env.TAG` 是被发布 tag 的唯一真值来源，`run` 步骤里读 `$TAG` 而不是把表达式插值进 shell。
  - `checkout` 带 `ref: <tag>`，这样 dispatch 补发时门禁跑的是**当时真正发布的那棵树**，而不是默认分支当前的 head。
  - `fetch-depth: 0` 是必需的：`changelogithub` 靠完整历史找上一个 tag，浅克隆会得到空 changelog。
  - `pnpm/action-setup` 必须排在 `actions/setup-node` 前面，否则 `cache: pnpm` 找不到 pnpm。
  - tag↔version 校验先断言 `$TAG` 以 `v` 开头再比对版本号：一个不带前缀的 dispatch 输入会通过版本比对，却让后续所有 tag 查找指向不存在的 ref。
  - 门禁用 `lint` 而非 `lint:fix`——CI 里自动修复会把问题藏起来。`build` 保留成独立一步（`test:e2e` 的 globalSetup 也会构建），这样构建失败会自报家门，而不是伪装成一个费解的 E2E 启动错误。
  - `changelogithub` 锁在 `@15`：不锁的 `dlx` 会让上游的破坏性变更在最糟糕的时刻炸掉一次发版。
