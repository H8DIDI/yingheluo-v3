import type { FireworkEffect } from '../../types/domain';
import { buildBurstPattern } from './burstPatterns';

export type ShapeBurstPattern = 'ring' | 'heart' | 'star' | 'diamond' | 'butterfly' | 'text-love' | 'text-520';

export function buildShapeBurstPattern(
  pattern: ShapeBurstPattern,
  count: number,
  scale: number
): Array<[number, number, number]> {
  return buildBurstPattern(pattern, count, scale);
}

export function buildShapeQuickLaunchEffect(
  pattern: ShapeBurstPattern,
  id: string
): FireworkEffect {
  return {
    id,
    name:
      pattern === 'ring' ? 'Shape Ring' :
      pattern === 'heart' ? 'Shape Heart' :
      pattern === 'star' ? 'Shape Star' :
      pattern === 'diamond' ? 'Shape Diamond' :
      pattern === 'butterfly' ? 'Shape Butterfly' :
      pattern === 'text-love' ? 'Shape LOVE' :
      'Shape 520',
    type: 'burst',
    color:
      pattern === 'ring' ? '#FDE047' :
      pattern === 'heart' ? '#F472B6' :
      pattern === 'star' ? '#60A5FA' :
      pattern === 'diamond' ? '#22D3EE' :
      pattern === 'butterfly' ? '#C084FC' :
      pattern === 'text-love' ? '#FB7185' :
      '#818CF8',
    height: 100,
    duration:
      pattern === 'ring' ? 1.9 :
      pattern === 'heart' ? 2.2 :
      pattern === 'butterfly' ? 2.3 :
      pattern === 'text-love' || pattern === 'text-520' ? 2.35 :
      2,
    intensity: 1,
    particleCount:
      pattern === 'ring' ? 140 :
      pattern === 'heart' ? 180 :
      pattern === 'diamond' ? 180 :
      pattern === 'butterfly' ? 220 :
      pattern === 'text-love' ? 240 :
      pattern === 'text-520' ? 220 :
      160,
    spread: 360,
    trailLength: 0.55,
    burstPattern: pattern,
    burstLabel: pattern === 'text-love' ? 'LOVE' : pattern === 'text-520' ? '520' : undefined,
  };
}
