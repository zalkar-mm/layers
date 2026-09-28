import { describe, expect, it } from 'vitest'

import {
  RENDER_STRATEGIES,
  type RenderStrategies,
} from '@/widgets/map-view/model/sync/render-strategies'

import { baseLayerRegistry } from '@/entities/layer'
import { layerId } from '@/entities/layer/config/layers/base-layers'

describe('карта стратегий отрисовки', () => {
  it('без описания одного из видов не компилируется', () => {
    // @ts-expect-error
    const withoutHeatmap: RenderStrategies = {
      fill: RENDER_STRATEGIES.fill,
      arrows: RENDER_STRATEGIES.arrows,
    }

    expect(Object.keys(withoutHeatmap)).toHaveLength(2)
  })

  it('порядок: заливки ниже heatmap, heatmap ниже стрелок', () => {
    const { fill, heatmap, arrows } = RENDER_STRATEGIES

    expect(fill.stackRank).toBeLessThan(heatmap.stackRank)
    expect(heatmap.stackRank).toBeLessThan(arrows.stackRank)
  })

  it('heatmap: вес по valueRange, палитра видна с малой плотности, интенсивность и радиус от zoom', () => {
    const style = RENDER_STRATEGIES.heatmap.style(
      {
        ...baseLayerRegistry.get(layerId('temperature')),
        valueRange: [10, 20],
        palette: ['#fff', '#000'],
        render: 'heatmap',
      },
      0.4,
    )
    const paint = new Map(style.paint)

    expect(paint.get('heatmap-weight')).toEqual([
      'interpolate',
      ['linear'],
      ['get', 'value'],
      10,
      0,
      20,
      1,
    ])
    expect(paint.get('heatmap-color')).toEqual([
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(0, 0, 0, 0)',
      0.02,
      '#fff',
      1,
      '#000',
    ])
    expect(paint.get('heatmap-intensity')).toBeGreaterThan(0)
    expect(paint.get('heatmap-radius')).toEqual(
      expect.arrayContaining(['interpolate', ['exponential', 2], ['zoom']]),
    )
    expect(paint.get('heatmap-opacity')).toBe(0.4)
  })
})
