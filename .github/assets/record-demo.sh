#!/usr/bin/env bash
# 重新生成 README 的演示 GIF：bash .github/assets/record-demo.sh
#
# 为什么不是 vhs：vhs 靠无头 Chromium 渲染 xterm.js 来截帧，在这台 macOS 上它
# 从未走到 ffmpeg（用 wrapper 验证过 ffmpeg 一次都没被调用，官方自带模板同样
# 失败）。asciinema + agg 这条链路不依赖浏览器，agg 直接画字形。
#
# 依赖：asciinema、agg（brew install asciinema agg）、expect（macOS 自带）。
set -euo pipefail

for bin in asciinema agg expect; do
  command -v "$bin" >/dev/null || { echo "缺少 $bin"; exit 1; }
done

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cast="$(mktemp -t ctv-demo)"

# 录的是本地构建产物，先保证它跟当前源码一致
(cd "$repo" && pnpm build >/dev/null)

# 120 列不是随手定的：resolveBannerMode() 在列宽 < 72（BANNER_MIN_WIDTH）时
# 退化成 plain，渐变字标根本不出现。28 行是刚好装下整个流程的高度。
asciinema rec --window-size 120x28 --overwrite \
  -c "expect $repo/.github/assets/demo.exp $repo $repo/.github/assets/demo-rc.sh" \
  "$cast"

agg --font-size 16 --theme dracula --idle-time-limit 1.2 --last-frame-duration 3 \
  "$cast" "$repo/.github/assets/demo.gif"

rm -f "$cast"
echo "已生成 .github/assets/demo.gif"
