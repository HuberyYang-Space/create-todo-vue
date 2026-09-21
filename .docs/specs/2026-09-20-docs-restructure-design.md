# 协作目录与 CLAUDE.md 重构（2026-09-20）

按全局 CLAUDE.md「开发协作标准」一节重排协作上下文：**约束性内容留 CLAUDE.md（每轮常驻），
叙述性内容外放 `.docs/`（按需读）**。目的是压低每次会话的冷启动成本。

## 重构前

| 文件 | 体量 | 问题 |
|:--|--:|:--|
| `CLAUDE.md` | 40 KB / 333 行 | 约束与叙述混在一起，每轮全量常驻 |
| `ROADMAP.md` | 119 KB | 纯叙述性内容（进度、待办、时间轴）却放在根目录 |
| `docs/superpowers/specs/` | 17 KB / 2 份 | 入库，与 `.docs/` 规范不一致 |

## 四个拍板的决定（Hubery，2026-09-20）

1. **`.docs/` 全部不纳入版本管理**，与 CLAUDE.md / spec.md 同一套心智。
   ⚠️ **这条已于 2026-09-21 推翻**：CTV-49 在 git worktree 里开工，`CLAUDE.md` 与 `.docs/` 都读不到，整件事做完才发现违反了一条现役禁令。约定读不到等于不存在，故两者都改为纳入版本管理。
2. **ROADMAP.md 整体搬进 `.docs/` 并按节拆分**，根目录不再保留。
3. **`docs/superpowers/specs/` 迁到 `.docs/specs/`**，以后新 spec 也写这里。
   代价是那两份文档从版本库删除（git 历史仍可翻到）。
4. **CLAUDE.md 激进瘦身，目标 ≤ 12 KB。**

## 切分判据

**不按篇幅切，按「读者什么时候需要它」切。** 每份 `.docs/` 文件对应一个明确的触发时刻，
CLAUDE.md 里就能为它写出一条三段式索引（触发条件 → 读哪份 → 不读的后果）。

| 文件 | 触发时刻 |
|:--|:--|
| `roadmap.md` | 每次开工（常驻索引，无触发条件可挂） |
| `kickoff.md` | 开新会话 |
| `backlog.md` | 冒出新想法 |
| `archive.md` / `timeline.md` | 按 CTV-NN 查 / 按日期查 |
| `architecture.md` | 改 `src/` 之前 |
| `templates.md` | 改 `template-*` 之前 |
| `testing.md` | 写测试之前 |
| `release.md` | 每次发版（常驻）、改 workflow 之前 |
| `toolchain.md` | 改依赖或配置之前 |

## 压缩时的取舍

**压缩的是证据，不是理由。** 规则明确：理由要跟着禁令走，没有理由的禁令会被下一个会话
当成疏漏「顺手改正」。所以每条禁令都保留一句为什么，实测数字、排除法过程、历史论证外放。

## 验证（2026-09-20 实测）

- `CLAUDE.md` 12 285 字节（预算 12 288），40 KB → 12 KB。
- 41 条文档内链逐条 `test -e`，0 条失效。
- 内容无损：原 CLAUDE.md 228 条非空行 / 原 ROADMAP.md 239 条非空行逐行比对，
  未原样保留的分别是 32 / 25 行，全部核实为有意改写（标题改名、路径更新、Commands 重排）。
- `pnpm typecheck` 退 0、`pnpm lint` 退 0、`pnpm test` 253 passed (8 files)。
- `git check-ignore` 确认 `.docs/` 被忽略。

## 遗留

- **CLAUDE.md 余量只剩 3 字节。** 下次要加禁令时，必须同步把另一条的证据外放，
  不能直接往上堆。
- 过程中查出原 CLAUDE.md 的 `build:prod` 描述已过期（漏了 `test:e2e`），新版按
  `package.json` 更正。
