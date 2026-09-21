# 排期表 · 当前状态

**这是「接下来做什么」的唯一依据。每次开工先读本文件。**

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。已完成条目见 [archive.md](./archive.md)，
> 未决策的想法见 [backlog.md](./backlog.md)，每日流水见 [timeline.md](./timeline.md)，
> 开新会话的贴用文案与核实清单见 [kickoff.md](./kickoff.md)。

**状态图例**：⬜ 待办　🚧 进行中　✅ 已完成　⏸️ 已搁置　❓ 待决策　❌ 已放弃

---

## 📍 当前状态

⚠️ **本节是转述，可能已过期。开口之前按 [kickoff.md](./kickoff.md) 的核实清单自己跑一遍命令，以实际输出为准。**

| | |
|---|---|
| **已发布** | **v1.10.0**（2026-09-10 16:27 上线 npm 且为 `latest`，tag 与 GitHub Release 均已生成，Release workflow run 34455162869 与 main 上的 CI run 34455157644 均 success；tag `v1.10.0` 解引用后指向 `cc4f8b0`，`git branch --contains` 确认**只在 `main` 上——连续第五次在 main 上发版**。**真实 tarball 实测**：119 文件、7 模板、7 个 `_gitignore`、0 个裸 `.gitignore`，`package.json` 版本 1.10.0；**线上产物真跑**：intro 打出 `┌  create-todo-vue v1.10.0`，强制开色时 dim 只包住 `v1.10.0`（`ESC[2m…ESC[22m`），`--version` 仍是干净的 7 字节，`npx …@1.10.0 --version` 端到端返回 1.10.0，`vanilla-ts` 用 pnpm 装依赖退 0。发版后已把 `dev` 快进到 `main`，四个引用同步在 `cc4f8b0`）|
| **进行中** | 无 |
| **下一批** | CTV-46/47/48/49 已完成，**待发版**（CTV-47 是 breaking，版本号由 Hubery 定）。线上仍是 v1.10.0 |

> ✅ 线上已止血：v1.1.0 起 vitesse 模板不再发布（`npm pack` 当时实测 82 个文件中 vitesse 相关 0 个；CTV-30 后仓库里连副本都没有了，v1.8.0 的 tarball 是 119 文件）。
>
> ⚠️ **待办不再预标版本号**——版本桶漂过两次，改成主题分组 + 优先级，理由见下面「🗂 待办」一节。

---

## 🗂 待办

### 模板体系 · 阵容现代化

起因是 2026-09-21 实测 vitesse 装不上，顺势重估整个阵容。设计见
[specs/2026-09-21-template-lineup-modernization-design.md](./specs/2026-09-21-template-lineup-modernization-design.md)。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-46 | **六个内置模板依赖对齐官方 create-vite** | 8 处漂移，其中 `typescript ~5.9.3→~6.0.2` 跨大版本、`@vue/tsconfig ^0.8.1→^0.9.1` 因 0.x 的 `^` 不跨 minor 而锁死。**`@types/node` 只升到 `^24.13.5` 不升 26**——主版本要跟 `engines` 对齐。必须走四条验证标准第三条：真装真构建、npm 与 pnpm 都跑 | 中 |
| ✅ | CTV-47 | **删除 `custom-vitesse` / `custom-vitesse-lite`** | full 停更 7 个月且 catalog 仍锁 `vite ^7.3.1`；lite 锁 `pnpm@12.3.4`，pnpm 10 用户切换时 ENOEXEC 退 1。官方 create-vite 也不列 vitesse。⚠️ **breaking change**，发版时定 major 还是 minor | 小 |
| ✅ | CTV-48 | **`pnpm sync:check` 防漂移脚本** | 拉官方六个模板的 `package.json` 打印逐项 diff。联网，只手动跑，**不进 CI 也不进 E2E**。没有它三个月后会再漂一次——本轮的 8 处漂移就是这么攒出来的 | 小 |

以上三条 2026-09-21 立项、当日完成，六个提交在 `dev` 上待发版。**下一批做什么由 Hubery 定。**

### 工具链 · 同环境重复检测去冗余

Hubery 2026-09-21 指派，起因是 `@huberyyang/todo-scripts` 做过同类调整（HB-37 / HB-38）。
**边界由 Hubery 划定：只砍同一个环境内部的重复**——「本地跑一遍 + CI 再跑一遍」是刻意的跨环境
双保险，予以保留，所以 todo-scripts 的 HB-38（pre-commit 瘦身成只跑 `eslint --fix`）**本仓库不做**。

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-54 | **`bumpp --no-verify`** | `build:prod` 跑完全量门禁十几秒后，`bumpp` 的版本号提交触发 `pre-commit`，把 typecheck + lint:fix + test 原样再跑一遍（本机实测 ≈ **8.1s**），而 diff 只有一个版本号字段。`lint-staged` 的 glob 是 `'*'`，`package.json` 必然匹配，躲不掉。与 todo-scripts HB-37 同款 | 小 |
| ✅ | CTV-55 | **CI 同一 SHA 不再跑 2~3 轮** | 实测 `cc4f8b0`（v1.10.0）在 Actions 上跑了**三轮**完整门禁，日常提交稳定两轮。三处改动：`ci.yml` 的 push 从 `[main, dev]` 收成 `[dev]`（历史**零 merge commit**，到达 `main` 的树都已在同一 SHA 下检查过）、加 `concurrency` + `cancel-in-progress`、job 上加 `if` 跳过 `bumpp` 的发版提交。**`concurrency` 单独救不了**：三种 `github.ref` 互不相同，分不进同一组 | 小 |

⚠️ **CTV-55 的代价，接受前先看清**：绕过 `dev` 直推 `main` 的 hotfix 将没有 CI。`main` 没有分支
保护，这条靠约定而非机制兜着。发版那棵树仍有 `release.yml` 的 tag 门禁接住，不会裸奔。

### 仓库 · 归属迁移

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-56 | **仓库迁到组织后的元数据同步** | Hubery 把仓库迁到了组织 `HuberyYang-Space`，旧路径 `Hub-yang/create-todo-vue` 只剩重定向。同步 6 处：`package.json` 的 `homepage`/`repository`/`bugs`、README 两个徽章（含 shields 的 workflow status 路径）、`src/constants` 的 `REPO_URL`。**刻意不动的两类**：README 署名 `https://github.com/Hub-yang`（个人账号仍在），以及所有 `Hub-yang/my-vue-dev-template` 引用（那个仓库没迁，`gh api` 核实过）。顺带改掉 [backlog.md](./backlog.md) 里 CTV-23 那句已失效的「确认仓库没转移过」 | 小 |

### 界面 · 品牌观感

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-49 | **照搬 todo-scripts 的 TUI 字标** | `main()` 开头打 ANSI Shadow 渲染的 `TODO-VUE` 渐变字标 + `v1.10.0 - HuberyYang` 尾行，观感与 `@huberyyang/todo-scripts` 一致。字标文本与「框顶是否保留版本号」两处由 Hubery 拍板（选 `TODO-VUE` 而非 `CREATE-TODO-VUE`——后者 117 列，绝大多数终端会直接退化成纯文本；框顶去版本号，避免同屏重复）。字体裁成只含 8 个字形的子集，产物 107.3 → 97.8 kB。**CTV-45 的两条 E2E 守卫跟着版本号搬进 `banner.e2e.test.ts`，没有放弃**。详见 [architecture.md](./architecture.md) 的 `src/banner.ts` 一节 | 小 |

⚠️ **本条目是 2026-09-21 补登记的**，开工时没走维护规则第 2 条（先标 🚧）。根因是那次在 git worktree 里开工，而 `CLAUDE.md` 与 `.docs/` 当时都被 `.gitignore` 排除、worktree 里读不到，整个任务做完才发现违反了「非交互三件套不可省 `--no-immediate`」。**已把 `CLAUDE.md` 与整个 `.docs/` 都纳入版本管理**，以后 worktree 与新克隆都读得到禁令和索引。

条目 ID 为 `CTV-NN`（create-todo-vue），全局递增、不回收、不重排；新条目接着 archive 里
的最大编号往下排。**待办不再预先绑版本号**——版本桶漂过两次（「v1.2.0 测试与 CI 地基」
实际随 v1.1.0 发布，「v1.4.0」桶里的 CTV-15 / 17 实际发成了 v1.2.0），根因是 semver 由
改动性质决定、不由计划决定。所以未发布的按主题分组并排优先级，发版时依据当时实际做完
的内容定版本号。

---

## 🔧 维护规则

**这一节主要给 Claude 读。**

1. **挑活**：Hubery 从表里挑条目（可以直接报 ID，如「做 CTV-01」）。Claude 不自作主张选条目。
2. **开工**：立即把该条目状态改为 🚧，并在「📍 当前状态 · 进行中」填上 ID 和条目名。然后**走 [CLAUDE.md](../CLAUDE.md) 的「功能开发一律走 superpowers 全流程」**（brainstorming → 设计确认 → TDD → 验证），条目再小也不跳过。
3. **完成**：条目做完**且通过验证**（`pnpm typecheck` / `lint` / `test` 全绿，必要时附真实运行输出）后，状态改 ✅，清空「进行中」，并在 [timeline.md](./timeline.md) 补一行。**没验证过不许标 ✅。**
4. **发版**：走 [release.md](./release.md) 的六步发版清单——发版前合回 `main`、**检查 README 是否需要同步更新**；发版后把 `dev` 快进到 `main`、在 [timeline.md](./timeline.md) 记一行（版本号 / npm 是否上线 / tag 与 Release 是否生成）、更新本文件的「📍 当前状态 · 已发布」，并对**真正发出去的产物**做验证而不是本地构建。**版本号在发版时才确定**（由那一批改动的性质定 semver），发完把这批条目挪进 [archive.md](./archive.md) 里新的「已发布 · vX.Y.Z」小节归档。
5. **新想法**：会话中冒出的新功能想法，追加到 [backlog.md](./backlog.md)，**不擅自挪进本文件的待办**。进不进待办、排在哪个主题、优先级多高，都是 Hubery 的决定。
6. **ID 不回收**：`CTV-NN` 全局递增，条目就算跨分组挪动或被放弃，编号也不重排、不复用。
7. **不删历史**：已完成的条目留在 [archive.md](./archive.md) 里，标 ✅ 即可，不要删。
8. **依赖关系要写明**：条目之间有前置依赖的（如 CTV-14 依赖 CTV-08），用 ⚠️ 块标出来，别让人做到一半才发现。
