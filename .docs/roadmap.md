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
| **已发布** | **v1.11.0**（2026-09-21 核实：`npm view @huberyyang/create-todo-vue version` 返回 `1.11.0`，本地 `package.json` 同为 1.11.0；tag `v1.11.0` 解引用后指向 `99405a6`，`git branch --contains` 显示它同时在 `main` 与 `dev` 上——发版后 `dev` 已快进到 `main`，四个引用同步在 `15aeb79`。**本行只写本次实测到的东西**，tarball 与线上产物的逐项验证见 [timeline.md](./timeline.md) 对应那天的记录）|
| **进行中** | 无 |
| **下一批** | CTV-57 / CTV-58 已完成，**待发版**。CTV-46/47/48/49/54/55/56 已随 v1.11.0 发布并归档到 [archive.md](./archive.md) |

> ✅ 线上已止血：v1.1.0 起 vitesse 模板不再发布（`npm pack` 当时实测 82 个文件中 vitesse 相关 0 个；CTV-30 后仓库里连副本都没有了，v1.8.0 的 tarball 是 119 文件）。
>
> ⚠️ **待办不再预标版本号**——版本桶漂过两次，改成主题分组 + 优先级，理由见下面「🗂 待办」一节。

---

## 🗂 待办

### 界面 · 品牌观感

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-58 | **`vue-dev` 预设改名并亮出上游仓库** | Hubery 提的。`TypeScript + 工具链` → `Vue Dev Template`，并给它补上 `link` 指向 [`Hub-yang/my-vue-dev-template`](https://github.com/Hub-yang/my-vue-dev-template)，渲染走既有的 `getLabel`，与 Nuxt / Vike 同一套裸 URL 样式（实测两者的转义码同为 `ESC[39m ESC[4m`）。**刻意不加 `↗`**——那个箭头在这份列表里专表「转交给上游脚手架」，`vue-dev` 是内置模板。URL 保持个人账号 `Hub-yang`（那个仓库没跟着迁组织）。新增 1 条钉子，3 个变异 3 个被捕获 | 小 |

### 文档 · README 终端演示

| 状态 | ID | 条目 | 说明 | 成本 |
|:--:|:--|:--|:--|:--:|
| ✅ | CTV-57 | **README 加终端演示 GIF** | Hubery 提的。`.github/assets/` 下三件套：`demo.exp`（expect 驱动交互）、`demo-rc.sh`（准备步骤，放在 clear 之前所以不入画）、`record-demo.sh`（串 build → asciinema → agg）。**先试 vhs，放弃了**：它靠无头 Chromium 渲染 xterm.js 截帧，在这台 macOS 上从未走到 ffmpeg，官方自带模板同样失败。改用 asciinema + agg，不依赖浏览器。产物 117K / 9.2s，`.github/` 不在 `files` 里，不进 npm 包 | 中 |

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
