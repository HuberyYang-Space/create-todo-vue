import { describe, expect, it } from 'vitest'
import { diffDeps } from '../scripts/sync-check.ts'

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
