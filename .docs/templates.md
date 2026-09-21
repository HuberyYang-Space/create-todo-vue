# 模板体系

**改 `template-*` 之前读这份。** 不读的后果：`files` 字段、模板依赖、`template-vue-dev`
的剥离清单这三处都踩过「读代码判断不出来、只有真发一次 / 真装一次才暴露」的坑。

> 本文件随仓库走（2026-09-21 起 `.docs/` 已纳入版本管理，`package.json` 的 `files` 不含它，不会发进 npm 包）。现役禁令在 [CLAUDE.md](../CLAUDE.md)，本文件是它们背后的
> 实测证据与来龙去脉。

---

## 七个模板与 `files` 字段

七个 `template-*` 目录，每个都是一份完整可运行的项目，通过 `package.json` 的 `files` 字段发布。

**`files` 用的是 `template-*/**` 而不是 `template-*`，这个差别是致命的**（CTV-16 实测）：

| 写法 | 产物文件数 |
|---|---|
| `template-*` | 5（模板**全部丢失**） |
| `template-*` 加尾斜杠 | 5（同样全丢） |
| `template-**` | 5（同样全丢） |
| `template-*` + `/**` | 82 ✅ |
| 逐个列出目录名 | 82 |

> 表里的 82 是 CTV-16 当时的实测值。此后 CTV-25 给 4 个模板补了 README（→ 86），
> CTV-41 加了 `template-vue-dev` 的 33 个文件（→ **119**）。结论不变，变的只是基数。

裸目录名管用、通配到目录却不管用。**这只在真实 tarball 里暴露**，读代码判断不出来——`tests/e2e/pack.e2e.test.ts` 调真的 `npm pack --dry-run --json` 把它钉住了。通配的另一面风险（野目录被捎带发出去）由 `constants.test.ts` 那条「不许有孤儿 `template-*` 目录」的反向断言挡着，两者是配套的。

**模板依赖有两条硬约束，都是 2026-09-10 的全量验收实测查出来的**（CTV-42 / CTV-43），
它们的共同点是：**读代码判断不出来，只有真装一次、真构建一次才暴露**。

- **`vite` 主版本必须 ≥ 8。** vite 7 依赖 `esbuild`（`postinstall: node install.js`），
  而 pnpm 11 遇到未显式放行的 build script **直接退出码 1**（pnpm 10 只是警告）。
  当时六个内置模板全锁着 `vite ^7.3.1`，于是**用 pnpm 的用户全都装不上**——连带
  `pnpm build` / `pnpm dev` 一起挂（pnpm 跑 script 前的依赖状态检查会重跑 install），
  而 CTV-39 让 `-i` 透传退出码，用户看到的就是 `└ 依赖安装失败`。**线上 v1.8.0 同样中招。**
  vite 8 改用 rolldown，依赖树里连 esbuild 都不存在（实测 `esbuild@*` 包数为 0）。
  `constants.test.ts` 有断言钉着主版本号。**不要用「给每个模板补一份放行 esbuild 的
  `pnpm-workspace.yaml`」来绕**——那是治标，且会让模板与上游越差越远。
- **TS 模板里的 SFC 必须写 `<script setup lang="ts">`。** 少了 `lang="ts"`，vue-tsc
  认为这个 SFC 没有类型信息，import 它的 `main.ts` 报 `TS7016 implicitly has an 'any' type`，
  `vue-tsc -b && vite build` 直接失败——**与包管理器无关，npm 用户一样构建不了**。
  `template-vue-ts` 的两个 SFC 曾经就是裸的 `<script setup>`（多半是从 JS 版拷串了）。
  排除法留档：升 `@vue/tsconfig` 0.8.1 → 0.9.1 无效、升 `typescript` 5.9.3 → 6.0.3 无效，
  **只补 `lang="ts"` 就够**。`template-vue` 是 JS 模板，不带 lang 才是对的。

### CTV-46：六个内置模板依赖对齐官方 create-vite（2026-09-21）

六个模板（`template-vue-dev` 不在范围内，它有自己的活上游）依赖对齐上游 create-vite 官方当时的取值：

| 模板 | 改动 |
|:--|:--|
| `template-vanilla` | `vite` `^8.2.2` → `^8.3.0` |
| `template-vanilla-ts` | `typescript` `~5.9.3` → `~6.0.2`；`vite` 同上 |
| `template-vue` | `vue` `^3.5.27` → `^3.5.42`；`@vitejs/plugin-vue` `^6.0.8` → `^6.0.9`；`vite` 同上 |
| `template-vue-ts` | `vue`/`@vitejs/plugin-vue`/`vite` 同上；`@types/node` `^24.10.9` → `^24.13.5`；`@vue/tsconfig` `^0.8.1` → `^0.9.1`；`typescript` `~5.9.3` → `~6.0.2`；`vue-tsc` `^3.2.4` → `^3.3.11` |
| `template-lit` | `lit` `^3.3.2` → `^3.3.3`；`vite` 同上 |
| `template-lit-ts` | `lit` 同上；`typescript` 同 vanilla-ts；`vite` 同上 |

`@types/node` 停在官方的 `^24.13.5` 而非 npm 最新的 26.x——**这条方向是「不得过高」**，
要跟 `engines`（`^20.19.0 || >=22.12.0`）对齐，追最新等于给 Node 20 用户发错类型。
`constants.test.ts` 补了两条断言钉住：TS 模板 `typescript` 主版本 ≥ 6、`template-vue-ts`
的 `@types/node` 主版本 ≤ 24。

**`typescript` 跨了大版本（5.9 → 6.0），是本次风险面**：`vanilla-ts` / `lit-ts` / `vue-ts`
三个 TS 模板各自在系统外的临时目录（`mktemp -d`）真实 `npm install && npm run build`、
`pnpm install && pnpm build` 各跑一遍，**12 条命令全部退出码 0**。`vue-ts` 的
`vue-tsc -b`（本次同时动了 `typescript` 与 `@vue/tsconfig` 两个直接影响它的包，CTV-43
的 `TS7016` 就是只有真构建才暴露）npm 与 pnpm 下均无报错，构建产物正常生成。

六个来自 Vite 官方模板；**第七个 `template-vue-dev` 是 CTV-41 从 Hubery 自己的
[`Hub-yang/my-vue-dev-template`](https://github.com/Hub-yang/my-vue-dev-template) 拷进来的**，
它是唯一有活上游的模板，因此有几条别处没有的约束：

- **上游更新后这里不会自动跟上，靠手动同步。** 选内置而不是 `custom-` 转交上游是 Hubery 定的
  （2026-09-09），代价就是这个。同步时必须重做下面这几项剥离，否则钉子会红。
- **必须剥掉上游的身份信息**：`package.json` 的 `author` / `homepage` / `repository` / `bugs` /
  `license` / `packageManager` 都已删掉，`LICENSE` 与 `pnpm-lock.yaml` 不拷。理由是这些字段是
  **机器读的**——用户拿模板建了项目再 `npm publish`，npm 页面的「Repository」「Report issues」
  会指回上游，别人提的 issue 落到错的仓库。`constants.test.ts` 有两条断言钉着（对**所有**模板生效）。
  **页面上可见的署名不在此列**：`src/components/BaseFooter.vue` 里那个指向上游仓库的 GitHub 图标
  是 Hubery 明确要求保留的（作为项目宣传），用户想删随手就删。
- **它是唯一带 `pnpm-workspace.yaml` 的模板**，且**刻意只有一条** `allowBuilds: { '@parcel/watcher': false }`。
  这条不是可选项：2026-09-09 实测，没有这个文件时在生成出来的项目里跑 `pnpm install` 会**退出码 1**
  并报 `[ERR_PNPM_IGNORED_BUILDS]`（pnpm 10 只是警告，pnpm 11 直接失败），而 CTV-39 让 `-i` 把安装
  退出码原样透传，于是用 pnpm 的用户选「立即安装依赖」直接看到创建失败。**刻意不抄上游那份文件里的
  `minimumReleaseAgeExclude` / `trustPolicyExclude`**——它们绑着具体版本号，拷进来当天就开始过期。
- **不要为了让 `pnpm lint` 变绿而往这个文件里加 `trustPolicy`**（CTV-44 踩过，代价是把 install 炸掉）。
  它自带的 `@antfu/eslint-config` 会带上 `eslint-plugin-pnpm`，那个插件强制要求
  `minimumReleaseAgeExcludePrune` / `shellEmulator` / `trustPolicy` 三条设置，缺任何一条
  `pnpm lint` 就退 1。照单全收看着顺理成章，**但 `trustPolicy: no-downgrade` 会让这个模板的
  `pnpm install` 直接退出码 1**——2026-09-10 实测 `ERR_PNPM_TRUST_DOWNGRADE`，`semver@6.3.1`
  经 `vite-plugin-vue-devtools` → `vite-plugin-vue-inspector` → `@babel/core` 传递进来。
  **让 lint 变绿的代价是让装依赖变红，那笔账不划算。** 正解是在模板的 `eslint.config.ts` 里把
  `pnpm/yaml-enforce-settings` 关掉：那三条本来就是仓库开发者的偏好，不该强加给刚生成的项目。
  两条断言配套钉着（不许加回 `trustPolicy` / 不许删掉那段关闭），少一条就会有一头退 1。
  **本仓库自己那份 `pnpm-workspace.yaml` 仍然带着三条**——它的依赖树不触发降级，两边不是一回事。
- **`.husky/` 只拷 `commit-msg` 与 `pre-commit` 两个钩子，不拷 `_/`**：那 16 个是 husky 自己生成的运行时，
  `prepare: husky` 在装依赖时会重建；而且 `.husky/_/.gitignore` 会再踩一次「npm 无条件剔除 .gitignore」的坑。
- **三份 `.d.ts`（`auto-imports` / `components` / `typed-router`）是生成物但必须拷**：不拷的话用户没跑过
  dev 就 `pnpm build`（`vue-tsc --noEmit`）会类型报错。已实测拷了之后 build 退出码 0。
- `vite.config.ts` 里 `server.proxy` 的 `'/api': { target: '' }` 是上游留的占位。**实测过它是安全的**：
  dev server 正常启动、首页 200，只有真的请求 `/api` 才返回 502，且之后 server 仍存活。故保留。

两个 vitesse 模板曾经也在这里，因为 `catalog:` 没有定义源而 100% 装不上，v1.1.0 下架、CTV-30 删除目录
并改为 `custom-*` 转交上游，现在仓库里已经没有它们的副本了。

