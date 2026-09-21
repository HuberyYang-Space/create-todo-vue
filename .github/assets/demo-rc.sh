# demo.exp 用它启动 bash。准备工作全放这儿，是为了让它们发生在 clear 之前——
# 录进画面的只有一个干净的提示符。
PS1='$ '

# 画面里打的是真实用法，但 npm 被这个函数接管，转发到本仓库**刚构建出的**
# bin/index.js。registry 上的版本未必带着当前这版字标，真去 npm 拉会录到一个
# 看不见它的旧版本；执行的是同一份代码，画面与线上一致。
npm() {
  if [ "$1 $2" = "create @huberyyang/todo-vue" ]; then
    shift 2
    node "$REPO/bin/index.js" "$@"
  else
    command npm "$@"
  fi
}

cd "$(mktemp -d)"
clear
