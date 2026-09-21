# 模板阵容现代化（2026-09-21）

起因：Hubery 实测 vitesse 模板装不上，顺势重新评估整个模板阵容——
「依赖过时了要及时更新，社区模板不再维护就放弃」。

## 定位（Hubery 2026-09-21 拍板）

**create-todo-vue = create-vite 的中文增强版**，不是 Vue 专用脚手架。
vanilla / lit 保留。

这个定位决定了「现代化」的判据：**不是「npm 上最新是什么」，而是「Vite 官方模板现在用什么」**。
六个内置模板是官方模板的副本，自己拍版本号等于主动制造漂移。

## 调查结论（2026-09-21 实测）

### 上游维护状态（`gh api`）

| 上游 | 最近推送 | star | 判断 |
|:--|:--|--:|:--|
| `vuejs/create-vue` | 2026-09-18 | 4404 | 活跃 |
| `nuxt/nuxt` | 2026-09-20 | 60883 | 活跃 |
| `vikejs/vike-vue` | 2026-09-19 | 57 | 活跃但小众，**属官方阵容故保留** |
| `antfu-collective/vitesse` | **2026-02-25** | 9437 | **停更 7 个月，catalog 仍锁 `vite ^7.3.1`** |
| `antfu-collective/vitesse-lite` | 2026-09-08 | 1252 | 活跃，但锁 `packageManager: pnpm@12.3.4` |

**官方 create-vite 的 Vue 分支只列 `custom-create-vue` / `custom-nuxt` / `custom-vike-vue`，没有 vitesse。**
两个 vitesse 是 CTV-30 自己加的私货。

### vitesse-lite 装不上的根因

pnpm 12 改了包布局：`bin/pnpm` 指向一个**没有 shebang** 的占位文件
（`# pnpm's native binary replaces this file during installation`），靠自己的 `install.js`
在安装时换成原生二进制。pnpm 10.x 的版本切换器直接 `spawnSync` 该路径 → **ENOEXEC → 退 1**；
pnpm 11 换了启动方式故无事。

实测矩阵（本机默认 pnpm 是 **10.28.2**，不是 11.25.0——后者是本仓库 `packageManager` 切出来的）：

| 场景 | 实跑的 pnpm | 结果 |
|:--|:--|:--|
| lite + 默认 pnpm 10.28.2 | 切换失败 | **退 1** |
| lite + pnpm 11.25.0 | 切到 12.3.4 | 退 0，33s |
| full + 默认 pnpm 10.28.2 | 切到 10.30.2 | 退 0，14m40s |

⚠️ 排查期间两次被环境误导（误以为在跑 pnpm 11、误以为 ENOEXEC 是缓存损坏），
是靠 `ps` 查实际进程和 `file` 查 bin 形态才纠正的。**观测手段本身要先自证可信。**

### 我们六个内置模板与官方的漂移（8 处）

| 依赖 | 我们 | 官方 | 说明 |
|:--|:--|:--|:--|
| `typescript` | `~5.9.3` | `~6.0.2` | 落后一个大版本；这三个模板不装 eslint，不受 `typescript-eslint` peer 约束 |
| `@vue/tsconfig` | `^0.8.1` | `^0.9.1` | 0.x 的 `^` 不跨 minor，等于锁死 |
| `vite` | `^8.2.2` | `^8.3.0` | |
| `vue` | `^3.5.27` | `^3.5.42` | |
| `vue-tsc` | `^3.2.4` | `^3.3.11` | |
| `@vitejs/plugin-vue` | `^6.0.8` | `^6.0.9` | |
| `lit` | `^3.3.2` | `^3.3.3` | |
| `@types/node` | `^24.10.9` | `^24.13.5` | **不要升到 26**：主版本要跟 `engines`（Node 20/22）对齐，npm 最新的 26 会给 Node 20 用户发错类型 |

`template-vue-dev` 不在此列——它来自 `Hub-yang/my-vue-dev-template`，有独立上游。

## 决定

1. **删除 `custom-vitesse` 与 `custom-vitesse-lite`**（Hubery 拍板）。理由：与官方阵容对齐、
   full 已腐烂、彻底消除 pnpm 12 问题；「有主张的 Vue + 工具链」这个生态位已由
   `template-vue-dev` 占着。
2. **六个内置模板依赖对齐官方**（上表 8 处）。
3. **加 `pnpm sync:check` 防漂移脚本**：拉官方六个模板的 `package.json` 打印逐项 diff。
   **联网，只手动跑，不进 CI 也不进 E2E**（E2E 铁律是不联网）。
4. **维持 vanilla / vue / lit 三框架**，官方其余十几个不补。

## 要写进 CLAUDE.md 的三条契约（Hubery 已同意）

1. 只镜像 vanilla / vue / lit 三个框架，官方其余不补。
   不写明的话，下个会话会把「官方有 react 我们没有」当成疏漏补上。
2. `custom-*` 只列官方列的。自己加的转交目标要自担上游腐烂风险——vitesse 停更 7 个月才被发现。
3. 模板依赖版本以 create-vite 官方为准，不追 npm 最新；`@types/node` 主版本跟 `engines` 对齐。

## 影响面

- `src/constants/index.ts`：删两个变体。
- `tests/utils.test.ts`：16 处 vitesse 是 `getFullCustomCommand()` 的**字符串 fixture**，
  函数行为不受影响，但要改指到仍在阵容里的 `nuxi init`，否则留下指向已下架模板的孤儿 fixture。
  `npm exec` 这条改写分支由 nuxt 继续覆盖，不丢覆盖率。
- `tests/constants.test.ts` / `entry.test.ts` / `scaffold.e2e.test.ts` / `cli-basics.e2e.test.ts`：
  注册表断言与 help 输出断言要同步。
- `README.md`：可用模板一节。
- 模板目录：**一个都不动**（vitesse 副本早在 CTV-30 就删光了）。

## 拆分

- **CTV-46** 六个内置模板依赖对齐官方
- **CTV-47** 删除两个 vitesse 转交变体
- **CTV-48** `sync:check` 防漂移脚本

## 版本号

**CTV-47 是 breaking change**——脚本里写死 `-t custom-vitesse` 的用户升级后直接失败。
先例是 v1.1.0 下架 vitesse 模板时按 minor 发的。**major 还是 minor 由 Hubery 在发版时定**
（semver 由改动性质定，不由计划定）。

## 验证要求

CTV-46 **必须走四条验证标准的第三条**：真装一次、真构建一次，npm 与 pnpm 都跑。
TS 跨大版本（5.9 → 6.0）尤其要真跑 `vue-tsc`——CTV-43 的 TS7016 就是只有真构建才暴露的。
