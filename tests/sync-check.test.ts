import { describe, expect, it } from 'vitest'
import { diffDeps, flatten } from '../scripts/sync-check.ts'

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
