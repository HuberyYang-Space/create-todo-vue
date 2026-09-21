import antfu from '@antfu/eslint-config'

export default antfu({
  vue: false,
  typescript: true,
  rules: {
    'no-console': 'off',
  },
  ignores: [
    '**/node_modules/**',
    'template-*',
    '**/dist/**',
  ],
}, {
  // `.docs/` 进版本库之后 eslint 才够得着它。**markdown 结构照常检查**（表格列数、
  // 标题层级这类错误会让文档渲染出错，值得拦），但**里面的代码块不做风格检查**：
  // 那些片段有的是节选、有的是原样引用上游代码，让本仓库的缩进/引号规则去改写它们，
  // 改出来的东西就不再是它引用的那份代码了。
  files: ['.docs/**/*.md/**'],
  name: 'ctv/docs-snippets',
  rules: {
    'style/indent': 'off',
    'style/no-tabs': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
})
