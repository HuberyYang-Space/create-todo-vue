import { describe, expect, it } from 'vitest'
import { applyExemptions, diffDeps, flatten, MIRRORED_TEMPLATES } from '../scripts/sync-check.ts'
import { FRAMEWORKS } from '../src/constants'

// vue-dev 有自己的上游（Hub-yang/my-vue-dev-template），不镜像 create-vite 官方，显式排除。
const OWN_UPSTREAM = ['vue-dev']

describe('diffDeps', () => {
  it('两边完全一致时没有差异', () => {
    expect(diffDeps({ vite: '^8.3.0' }, { vite: '^8.3.0' })).toEqual([])
  })

  it('版本不同要报出来，并同时带上两边的值', () => {
    expect(diffDeps({ vite: '^8.2.2' }, { vite: '^8.3.0' }))
      .toEqual([{ name: 'vite', ours: '^8.2.2', theirs: '^8.3.0' }])
  })

  it('只有我们有的依赖（官方已删）要报出来', () => {
    expect(diffDeps({ foo: '^1.0.0' }, {}))
      .toEqual([{ name: 'foo', ours: '^1.0.0', theirs: undefined }])
  })

  it('只有官方有的依赖（我们漏了）要报出来', () => {
    expect(diffDeps({}, { bar: '^2.0.0' }))
      .toEqual([{ name: 'bar', ours: undefined, theirs: '^2.0.0' }])
  })

  it('结果按名字升序，跟入参顺序无关', () => {
    const out = diffDeps({ zzz: '1', aaa: '1' }, { zzz: '2', aaa: '2' })
    expect(out.map(d => d.name)).toEqual(['aaa', 'zzz'])
  })
})

describe('flatten', () => {
  it('dependencies 与 devDependencies 都有时合并成一张表', () => {
    expect(flatten({ dependencies: { vue: '^3.5.0' }, devDependencies: { vite: '^8.3.0' } }))
      .toEqual({ vue: '^3.5.0', vite: '^8.3.0' })
  })

  it('只有 dependencies 时原样返回', () => {
    expect(flatten({ dependencies: { vue: '^3.5.0' } })).toEqual({ vue: '^3.5.0' })
  })

  it('只有 devDependencies 时原样返回', () => {
    expect(flatten({ devDependencies: { vite: '^8.3.0' } })).toEqual({ vite: '^8.3.0' })
  })

  it('两者都没有时返回空对象', () => {
    expect(flatten({})).toEqual({})
  })

  it('同名依赖同时出现在两边时，devDependencies 的值覆盖 dependencies', () => {
    expect(flatten({ dependencies: { vite: '^7.0.0' }, devDependencies: { vite: '^8.3.0' } }))
      .toEqual({ vite: '^8.3.0' })
  })
})

describe('applyExemptions', () => {
  it('命中例外表的项不出现在 drift 里，改进 exempted 并带上理由', () => {
    const diff = [{ name: '@types/node', ours: '^26.4.1', theirs: '^24.0.0' }]
    const { drift, exempted } = applyExemptions(diff, [{ name: '@types/node', reason: '对齐 engines 上限' }])
    expect(drift).toEqual([])
    expect(exempted).toEqual([{ name: '@types/node', ours: '^26.4.1', theirs: '^24.0.0', reason: '对齐 engines 上限' }])
  })

  it('没命中例外表的项留在 drift 里，不受例外表影响', () => {
    const diff = [{ name: 'vite', ours: '^8.2.2', theirs: '^8.3.0' }]
    const { drift, exempted } = applyExemptions(diff, [{ name: '@types/node', reason: '对齐 engines 上限' }])
    expect(drift).toEqual(diff)
    expect(exempted).toEqual([])
  })
})

describe('mirroredTemplates', () => {
  it('与 FRAMEWORKS 派生的内置模板集合一致（不含 custom-* 与自带上游的 vue-dev）', () => {
    // 与脚本里的 MIRRORED_TEMPLATES 是不同的源：这里从 FRAMEWORKS 派生，
    // 不是从被测数据本身派生，所以不是恒等式——改任一边都能让这条断言变红。
    const builtinTemplates = FRAMEWORKS
      .flatMap(f => f.variants?.length ? f.variants : [f])
      .filter(v => !('customCommand' in v && v.customCommand))
      .map(v => v.name)
      .filter(name => !OWN_UPSTREAM.includes(name))

    expect([...MIRRORED_TEMPLATES].sort()).toEqual([...builtinTemplates].sort())
  })
})
