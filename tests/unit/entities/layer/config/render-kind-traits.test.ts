import { describe, expect, it } from 'vitest'

import {
  RENDER_KIND_TRAITS,
  type RenderKindTraitsMap,
} from '@/entities/layer/config/render-kind-traits'

describe('свойства видов отрисовки', () => {
  it('без описания одного из видов карта не компилируется', () => {
    // @ts-expect-error
    const withoutHeatmap: RenderKindTraitsMap = {
      fill: RENDER_KIND_TRAITS.fill,
      arrows: RENDER_KIND_TRAITS.arrows,
    }

    expect(Object.keys(withoutHeatmap)).toHaveLength(2)
  })
})
