/**
 * 🎆 Spectacular Fireworks Show Generator
 * 
 * 设计理念：模拟真实的大型烟花秀编排
 * 参考：浏阳国际烟花大赛、马耳他国际烟花节、日本花火大会
 * 
 * 核心特点：
 * 1. 800管专业阵地布局（前线弧形 + 两翼包围 + 中央矩阵 + 后排高空）
 * 2. 5分钟精编脚本，起承转合完整
 * 3. 每个章节有独立的色彩主题和情绪
 * 4. 波次间有呼吸感：密集→留白→更密集
 * 5. 对称与不对称交替，避免视觉疲劳
 * 6. 利用新物理引擎的全部能力（高空牡丹、长拖尾柳、地面喷泉等）
 */

import {
  Project,
  Position,
  FireworkEffect,
  ShowEvent,
  Cue,
  FireworkType,
} from '../types/domain';

import {
  createPosition,
  createFanRack,
  createStraightRack,
  createMatrixRack,
} from '../store/projectStore';

// ─── Utilities ──────────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;
const round = (v: number) => Number(v.toFixed(2));
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function buildEffect(
  params: Partial<FireworkEffect> & Pick<FireworkEffect, 'id' | 'name' | 'color' | 'type'>
): FireworkEffect {
  return {
    height: 120,
    duration: 2.5,
    intensity: 0.9,
    particleCount: 140,
    spread: 360,
    trailLength: 0.4,
    soundFrequency: 120,
    ...params,
  };
}

// ─── Color Palettes (Emotion-Driven) ────────────────────────────────────────

const PALETTES = {
  // 序幕：庄重的金银
  prelude: {
    primary: ['#FFD700', '#FFC125', '#DAA520'],
    accent: ['#C0C0C0', '#D4D4D4', '#FFFFFF'],
  },
  // 第一章：热情红橙
  passion: {
    primary: ['#FF2400', '#FF4500', '#DC143C'],
    accent: ['#FF8C00', '#FFA500', '#FFD700'],
  },
  // 第二章：梦幻蓝紫
  dream: {
    primary: ['#4169E1', '#1E90FF', '#00BFFF'],
    accent: ['#8A2BE2', '#9370DB', '#DA70D6'],
  },
  // 第三章：自然绿金
  nature: {
    primary: ['#00FF7F', '#32CD32', '#7FFF00'],
    accent: ['#FFD700', '#F0E68C', '#BDB76B'],
  },
  // 终章：万紫千红
  finale: {
    primary: ['#FF0000', '#FF00FF', '#FFD700', '#00FF00', '#00BFFF', '#FFFFFF'],
    accent: ['#FF4500', '#FF1493', '#FFA500', '#00FA9A', '#7B68EE', '#F5F5DC'],
  },
};

// ─── Effect Presets ─────────────────────────────────────────────────────────

interface EffectPreset {
  type: FireworkType;
  height: number;
  duration: number;
  intensity: number;
  particleCount: number;
  trailLength: number;
  spread: number;
}

const PRESETS: Record<string, EffectPreset> = {
  // 高空大牡丹 — 最壮观的球形效果
  grandPeony: {
    type: 'peony', height: 250, duration: 3.5, intensity: 1.0,
    particleCount: 200, trailLength: 0.35, spread: 360,
  },
  // 标准牡丹
  peony: {
    type: 'peony', height: 160, duration: 2.5, intensity: 0.9,
    particleCount: 140, trailLength: 0.3, spread: 360,
  },
  // 垂柳 — 长长的金色拖尾
  willow: {
    type: 'willow', height: 200, duration: 4.0, intensity: 0.85,
    particleCount: 160, trailLength: 0.9, spread: 360,
  },
  // 菊花 — 细密球形，燃到最后
  chrysanthemum: {
    type: 'chrysanthemum', height: 180, duration: 3.0, intensity: 0.95,
    particleCount: 180, trailLength: 0.75, spread: 360,
  },
  // 十字星 — 分裂效果
  crossette: {
    type: 'crossette', height: 150, duration: 2.0, intensity: 0.9,
    particleCount: 120, trailLength: 0.4, spread: 360,
  },
  // 彗星 — 单颗大拖尾上升
  comet: {
    type: 'comet', height: 180, duration: 3.0, intensity: 0.8,
    particleCount: 80, trailLength: 0.85, spread: 120,
  },
  // 地雷 — 地面喷射
  mine: {
    type: 'mine', height: 60, duration: 1.5, intensity: 1.0,
    particleCount: 100, trailLength: 0.2, spread: 180,
  },
  // 低空爆裂 — 短平快
  lowBurst: {
    type: 'burst', height: 80, duration: 1.5, intensity: 0.95,
    particleCount: 100, trailLength: 0.25, spread: 360,
  },
  // 超高空爆裂 — finale 专用
  skyBurst: {
    type: 'burst', height: 300, duration: 3.0, intensity: 1.0,
    particleCount: 220, trailLength: 0.4, spread: 360,
  },
};

// ─── 800-Tube Professional Layout ───────────────────────────────────────────

/**
 * 专业阵地布局：800管
 * 
 * 俯视图（观众在下方）：
 * 
 *     后排高空 (4×25管直排 = 100管)
 *   ─────────────────────────────
 *        后方矩阵左  后方矩阵右
 *         (10×10)    (10×10) = 200管
 *   ─────────────────────────────
 *   左翼扇形(3×15)  中央前排(5×20)  右翼扇形(3×15)
 *     = 45管       直排 = 100管      = 45管
 *   ─────────────────────────────
 *        前线弧形 (7×15管扇形 = 105管)
 *   ─────────────────────────────
 *   地面喷泉左(1×20)  地面喷泉右(1×20) = 40管
 *   ─────────────────────────────
 *               [观众区]
 *
 * 还有中央核心矩阵 (13×13 = 169管，取165管)
 * 总计：100 + 200 + 45 + 100 + 45 + 105 + 40 + 165 = 800管
 */
function createSpectacularLayout(): Position[] {
  const positions: Position[] = [];

  // ═══ 前线弧形阵地 (105管) ═══
  // 7个扇形架，沿弧线排列，面向观众
  const arcPositions = 7;
  const arcSpread = 120; // 总弧度120°
  for (let i = 0; i < arcPositions; i++) {
    const angle = (-arcSpread / 2 + (arcSpread / (arcPositions - 1)) * i) * (Math.PI / 180);
    const radius = 60;
    const x = radius * Math.sin(angle);
    const z = 45 + radius * (1 - Math.cos(angle)) * 0.3;
    positions.push(
      createPosition(`前线${i + 1}`, x, z, [
        createFanRack(`前线扇形${i + 1}`, 15, -50, 50, 85),
      ])
    );
  }
  // positions[0..6]: 前线弧形

  // ═══ 左翼扇形 (45管) ═══
  for (let i = 0; i < 3; i++) {
    positions.push(
      createPosition(`左翼${i + 1}`, -65, 30 - i * 12, [
        createFanRack(`左翼扇形${i + 1}`, 15, -40, 40, 82),
      ])
    );
  }
  // positions[7..9]: 左翼

  // ═══ 中央前排直排 (100管) ═══
  for (let i = 0; i < 5; i++) {
    const x = -30 + i * 15;
    positions.push(
      createPosition(`中央前排${i + 1}`, x, 35, [
        createStraightRack(`中前直排${i + 1}`, 20, 90),
      ])
    );
  }
  // positions[10..14]: 中央前排

  // ═══ 右翼扇形 (45管) ═══
  for (let i = 0; i < 3; i++) {
    positions.push(
      createPosition(`右翼${i + 1}`, 65, 30 - i * 12, [
        createFanRack(`右翼扇形${i + 1}`, 15, -40, 40, 82),
      ])
    );
  }
  // positions[15..17]: 右翼

  // ═══ 中央核心矩阵 (165管) ═══
  // 13×13=169，但我们用 11×15=165
  positions.push(
    createPosition('中央核心', 0, 15, [
      createMatrixRack('核心矩阵', 11, 15, 0.6, 90),
    ])
  );
  // positions[18]: 中央核心

  // ═══ 后方矩阵 (200管) ═══
  positions.push(
    createPosition('后方矩阵左', -30, -10, [
      createMatrixRack('后方左', 10, 10, 0.7, 90),
    ]),
    createPosition('后方矩阵右', 30, -10, [
      createMatrixRack('后方右', 10, 10, 0.7, 90),
    ])
  );
  // positions[19..20]: 后方矩阵

  // ═══ 后排高空直排 (100管) ═══
  for (let i = 0; i < 4; i++) {
    const x = -45 + i * 30;
    positions.push(
      createPosition(`后排高空${i + 1}`, x, -25, [
        createStraightRack(`高空直排${i + 1}`, 25, 90),
      ])
    );
  }
  // positions[21..24]: 后排高空

  // ═══ 地面喷泉 (40管) ═══
  positions.push(
    createPosition('地面喷泉左', -20, 55, [
      createStraightRack('喷泉左', 20, 0),
    ]),
    createPosition('地面喷泉右', 20, 55, [
      createStraightRack('喷泉右', 20, 0),
    ])
  );
  // positions[25..26]: 地面喷泉

  return positions;
}

// ─── Position Group Indices ─────────────────────────────────────────────────

const POS = {
  frontArc: range(7),           // 0-6
  leftWing: [7, 8, 9],         // 7-9
  centerFront: [10, 11, 12, 13, 14], // 10-14
  rightWing: [15, 16, 17],     // 15-17
  core: [18],                   // 18
  rearMatrix: [19, 20],        // 19-20
  rearHigh: [21, 22, 23, 24],  // 21-24
  fountain: [25, 26],          // 25-26
};

// ─── Wave Builder ───────────────────────────────────────────────────────────

interface WaveSpec {
  time: number;
  posIndices: number[];
  tubeSelector: 'all' | 'even' | 'odd' | 'first-half' | 'second-half' | 'random-n';
  tubeN?: number; // for 'random-n'
  preset: EffectPreset;
  palette: { primary: string[]; accent: string[] };
  useAccent?: boolean;
  pattern: 'all' | 'sequential' | 'wave' | 'reverse';
  interval?: number; // ms, for sequential/wave
  name: string;
}

function selectTubes(tubeCount: number, selector: string, n?: number): number[] {
  const all = range(tubeCount);
  switch (selector) {
    case 'even': return all.filter(i => i % 2 === 0);
    case 'odd': return all.filter(i => i % 2 === 1);
    case 'first-half': return all.slice(0, Math.ceil(tubeCount / 2));
    case 'second-half': return all.slice(Math.floor(tubeCount / 2));
    case 'random-n': {
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(n ?? 5, tubeCount));
    }
    default: return all;
  }
}

function buildWaveEvents(
  wave: WaveSpec,
  positions: Position[],
  eventIndex: { value: number },
  events: ShowEvent[],
): void {
  const colors = wave.useAccent ? wave.palette.accent : wave.palette.primary;

  wave.posIndices.forEach((posIdx, groupOrder) => {
    const position = positions[posIdx];
    if (!position) return;

    position.racks.forEach((rack, rackIdx) => {
      const tubeIndices = selectTubes(rack.tubeCount, wave.tubeSelector, wave.tubeN);
      if (tubeIndices.length === 0) return;

      // Load effects into tubes
      tubeIndices.forEach(tubeIdx => {
        const tube = rack.tubes[tubeIdx];
        if (!tube) return;
        const color = colors[(tubeIdx + groupOrder) % colors.length];
        tube.loaded = true;
        tube.isFired = false;
        tube.effect = buildEffect({
          id: `eff-${eventIndex.value}-${posIdx}-${rackIdx}-${tubeIdx}`,
          name: `${wave.name}`,
          type: wave.preset.type,
          color,
          height: wave.preset.height,
          duration: wave.preset.duration,
          intensity: wave.preset.intensity,
          particleCount: wave.preset.particleCount,
          trailLength: wave.preset.trailLength,
          spread: wave.preset.spread,
        });
      });

      events.push({
        id: `event-${eventIndex.value}`,
        name: wave.name,
        startTime: round(wave.time + groupOrder * 0.08), // slight cascade between positions
        positionId: position.id,
        rackId: rack.id,
        tubeIndices,
        pattern: wave.pattern,
        interval: wave.interval,
        track: `W${String(eventIndex.value).padStart(3, '0')}`,
      });
      eventIndex.value++;
    });
  });
}

// ─── 5-Minute Script ────────────────────────────────────────────────────────

function generateScript(positions: Position[]): ShowEvent[] {
  const events: ShowEvent[] = [];
  const idx = { value: 1 };

  // ═══════════════════════════════════════════════════════════════════════
  // 序幕 PRELUDE (0-30s) — 庄严开场，金银交辉
  // 从中央核心开始，向两翼展开，建立场面
  // ═══════════════════════════════════════════════════════════════════════

  // 0s: 静默3秒...然后地面喷泉点燃
  buildWaveEvents({
    time: 3, posIndices: POS.fountain, tubeSelector: 'all',
    preset: { ...PRESETS.mine, height: 40, type: 'fountain' as FireworkType },
    palette: PALETTES.prelude, pattern: 'wave', interval: 80, name: '序幕·金泉涌',
  }, positions, idx, events);

  // 5s: 中央核心 — 少量金色牡丹升空
  buildWaveEvents({
    time: 5, posIndices: POS.core, tubeSelector: 'random-n', tubeN: 8,
    preset: PRESETS.peony,
    palette: PALETTES.prelude, pattern: 'sequential', interval: 300, name: '序幕·金花初绽',
  }, positions, idx, events);

  // 10s: 前线弧形中央3个 — 银色彗星上升
  buildWaveEvents({
    time: 10, posIndices: [2, 3, 4], tubeSelector: 'random-n', tubeN: 5,
    preset: PRESETS.comet,
    palette: PALETTES.prelude, useAccent: true, pattern: 'sequential', interval: 200, name: '序幕·银星引路',
  }, positions, idx, events);

  // 15s: 左右翼同时 — 对称展开金色扇面
  buildWaveEvents({
    time: 15, posIndices: [...POS.leftWing, ...POS.rightWing], tubeSelector: 'even',
    preset: PRESETS.peony,
    palette: PALETTES.prelude, pattern: 'all', name: '序幕·双翼展金',
  }, positions, idx, events);

  // 20s: 后排高空 — 4颗高空大牡丹，建立纵深
  buildWaveEvents({
    time: 20, posIndices: POS.rearHigh, tubeSelector: 'random-n', tubeN: 3,
    preset: PRESETS.grandPeony,
    palette: PALETTES.prelude, pattern: 'all', name: '序幕·高空金冠',
  }, positions, idx, events);

  // 25s: 全场短暂呼吸... 前线少量十字星点缀
  buildWaveEvents({
    time: 26, posIndices: [0, 6], tubeSelector: 'random-n', tubeN: 3,
    preset: PRESETS.crossette,
    palette: PALETTES.prelude, useAccent: true, pattern: 'all', name: '序幕·星光闪烁',
  }, positions, idx, events);

  // ═══════════════════════════════════════════════════════════════════════
  // 第一章 PASSION (30-90s) — 热情似火，红橙激荡
  // 节奏加快，从两翼向中央汇聚
  // ═══════════════════════════════════════════════════════════════════════

  // 30s: 左翼一轮红色牡丹
  buildWaveEvents({
    time: 30, posIndices: POS.leftWing, tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.passion, pattern: 'wave', interval: 100, name: '激情·左翼烈焰',
  }, positions, idx, events);

  // 33s: 右翼一轮红色牡丹（呼应）
  buildWaveEvents({
    time: 33, posIndices: POS.rightWing, tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.passion, pattern: 'wave', interval: 100, name: '激情·右翼呼应',
  }, positions, idx, events);

  // 36s: 中央前排 — 橙色低空爆裂，密集短促
  buildWaveEvents({
    time: 36, posIndices: POS.centerFront, tubeSelector: 'first-half',
    preset: PRESETS.lowBurst,
    palette: PALETTES.passion, useAccent: true, pattern: 'sequential', interval: 80, name: '激情·橙光排山',
  }, positions, idx, events);

  // 40s: 前线弧形全面开火 — 红色排浪
  buildWaveEvents({
    time: 40, posIndices: POS.frontArc, tubeSelector: 'even',
    preset: PRESETS.peony,
    palette: PALETTES.passion, pattern: 'wave', interval: 60, name: '激情·红浪翻涌',
  }, positions, idx, events);

  // 45s: 后方矩阵 — 十字星交叉
  buildWaveEvents({
    time: 45, posIndices: POS.rearMatrix, tubeSelector: 'random-n', tubeN: 15,
    preset: PRESETS.crossette,
    palette: PALETTES.passion, pattern: 'all', name: '激情·十字烈星',
  }, positions, idx, events);

  // 50s: 呼吸 — 仅地面喷泉低声细语
  buildWaveEvents({
    time: 50, posIndices: POS.fountain, tubeSelector: 'odd',
    preset: { ...PRESETS.mine, height: 30, type: 'fountain' as FireworkType },
    palette: PALETTES.passion, useAccent: true, pattern: 'sequential', interval: 150, name: '激情·喷泉细语',
  }, positions, idx, events);

  // 55s: 后排高空 — 大牡丹红色
  buildWaveEvents({
    time: 55, posIndices: POS.rearHigh, tubeSelector: 'random-n', tubeN: 6,
    preset: PRESETS.grandPeony,
    palette: PALETTES.passion, pattern: 'all', name: '激情·高空烈焰',
  }, positions, idx, events);

  // 60s: 核心矩阵 — 螺旋式密集发射
  buildWaveEvents({
    time: 60, posIndices: POS.core, tubeSelector: 'random-n', tubeN: 30,
    preset: PRESETS.peony,
    palette: PALETTES.passion, pattern: 'sequential', interval: 60, name: '激情·核心风暴',
  }, positions, idx, events);

  // 65-70s: 左右翼+前线交替快射
  for (let t = 65; t <= 70; t += 1.5) {
    const isLeft = (t - 65) % 3 < 1.5;
    buildWaveEvents({
      time: t, posIndices: isLeft ? POS.leftWing : POS.rightWing,
      tubeSelector: 'random-n', tubeN: 5,
      preset: PRESETS.lowBurst,
      palette: PALETTES.passion, pattern: 'all', name: `激情·交替${isLeft ? '左' : '右'}`,
    }, positions, idx, events);
  }

  // 75s: 全场中等密度齐射 — 第一章高潮
  buildWaveEvents({
    time: 75, posIndices: [...POS.frontArc, ...POS.centerFront], tubeSelector: 'odd',
    preset: PRESETS.peony,
    palette: PALETTES.passion, pattern: 'all', name: '激情·排浪高潮',
  }, positions, idx, events);

  // 80s: 柳树效果 — 长拖尾覆盖天空
  buildWaveEvents({
    time: 80, posIndices: POS.rearHigh, tubeSelector: 'first-half',
    preset: PRESETS.willow,
    palette: PALETTES.passion, useAccent: true, pattern: 'all', name: '激情·金柳垂天',
  }, positions, idx, events);

  // 85s: 短暂呼吸，为下一章过渡
  buildWaveEvents({
    time: 87, posIndices: [3], tubeSelector: 'random-n', tubeN: 3,
    preset: PRESETS.comet,
    palette: PALETTES.dream, pattern: 'sequential', interval: 500, name: '过渡·蓝星引领',
  }, positions, idx, events);

  // ═══════════════════════════════════════════════════════════════════════
  // 第二章 DREAM (90-180s) — 梦幻蓝紫，浪漫写意
  // 节奏放缓，强调美感和拖尾效果
  // ═══════════════════════════════════════════════════════════════════════

  // 90s: 蓝色柳树 — 从两翼同时升起
  buildWaveEvents({
    time: 90, posIndices: [...POS.leftWing, ...POS.rightWing], tubeSelector: 'first-half',
    preset: PRESETS.willow,
    palette: PALETTES.dream, pattern: 'all', name: '梦幻·蓝柳双垂',
  }, positions, idx, events);

  // 96s: 中央大牡丹 — 紫色
  buildWaveEvents({
    time: 96, posIndices: POS.core, tubeSelector: 'random-n', tubeN: 20,
    preset: PRESETS.grandPeony,
    palette: PALETTES.dream, useAccent: true, pattern: 'sequential', interval: 150, name: '梦幻·紫冠绽放',
  }, positions, idx, events);

  // 104s: 前线弧形 — 蓝色波浪，从左到右
  buildWaveEvents({
    time: 104, posIndices: POS.frontArc, tubeSelector: 'even',
    preset: PRESETS.peony,
    palette: PALETTES.dream, pattern: 'wave', interval: 120, name: '梦幻·蓝浪涟漪',
  }, positions, idx, events);

  // 112s: 菊花效果 — 细密拖尾
  buildWaveEvents({
    time: 112, posIndices: POS.rearHigh, tubeSelector: 'random-n', tubeN: 8,
    preset: PRESETS.chrysanthemum,
    palette: PALETTES.dream, pattern: 'all', name: '梦幻·菊瀑流光',
  }, positions, idx, events);

  // 120s: 呼吸 + 地面蓝色喷泉
  buildWaveEvents({
    time: 120, posIndices: POS.fountain, tubeSelector: 'all',
    preset: { ...PRESETS.mine, height: 35, type: 'fountain' as FireworkType },
    palette: PALETTES.dream, pattern: 'wave', interval: 100, name: '梦幻·蓝泉映月',
  }, positions, idx, events);

  // 126s: 后方矩阵 — 紫色十字星满天
  buildWaveEvents({
    time: 126, posIndices: POS.rearMatrix, tubeSelector: 'random-n', tubeN: 25,
    preset: PRESETS.crossette,
    palette: PALETTES.dream, useAccent: true, pattern: 'sequential', interval: 80, name: '梦幻·紫星漫天',
  }, positions, idx, events);

  // 135s: 蓝色彗星群 — 多轨上升
  buildWaveEvents({
    time: 135, posIndices: POS.centerFront, tubeSelector: 'random-n', tubeN: 6,
    preset: PRESETS.comet,
    palette: PALETTES.dream, pattern: 'sequential', interval: 400, name: '梦幻·蓝彗流星',
  }, positions, idx, events);

  // 142s: 柳树 + 牡丹混合 — 层次感
  buildWaveEvents({
    time: 142, posIndices: POS.rearHigh, tubeSelector: 'even',
    preset: PRESETS.willow,
    palette: PALETTES.dream, pattern: 'all', name: '梦幻·柳丝如梦',
  }, positions, idx, events);
  buildWaveEvents({
    time: 144, posIndices: POS.frontArc.slice(1, 6), tubeSelector: 'random-n', tubeN: 4,
    preset: PRESETS.peony,
    palette: PALETTES.dream, useAccent: true, pattern: 'all', name: '梦幻·紫花点缀',
  }, positions, idx, events);

  // 150-165s: 逐渐加密的蓝紫齐射
  for (let t = 150; t <= 165; t += 3) {
    const groupIdx = Math.floor((t - 150) / 3);
    const groups = [POS.leftWing, POS.rightWing, POS.centerFront, POS.frontArc.slice(0, 3), POS.frontArc.slice(4)];
    buildWaveEvents({
      time: t, posIndices: groups[groupIdx % groups.length],
      tubeSelector: 'random-n', tubeN: 6,
      preset: groupIdx % 2 === 0 ? PRESETS.peony : PRESETS.lowBurst,
      palette: PALETTES.dream, useAccent: groupIdx % 3 === 0,
      pattern: 'all', name: `梦幻·渐强${groupIdx + 1}`,
    }, positions, idx, events);
  }

  // 170s: 第二章小高潮 — 全蓝紫天幕
  buildWaveEvents({
    time: 170, posIndices: [...POS.rearHigh, ...POS.rearMatrix], tubeSelector: 'random-n', tubeN: 10,
    preset: PRESETS.grandPeony,
    palette: PALETTES.dream, pattern: 'all', name: '梦幻·天幕华章',
  }, positions, idx, events);

  // ═══════════════════════════════════════════════════════════════════════
  // 第三章 NATURE (180-240s) — 清新绿金，生机盎然
  // 中等节奏，变化丰富，为终章蓄力
  // ═══════════════════════════════════════════════════════════════════════

  // 180s: 绿色地雷开场 — 从地面爆发
  buildWaveEvents({
    time: 180, posIndices: POS.fountain, tubeSelector: 'all',
    preset: PRESETS.mine,
    palette: PALETTES.nature, pattern: 'all', name: '自然·绿芽破土',
  }, positions, idx, events);

  // 184s: 前线弧形 — 绿色牡丹排浪
  buildWaveEvents({
    time: 184, posIndices: POS.frontArc, tubeSelector: 'odd',
    preset: PRESETS.peony,
    palette: PALETTES.nature, pattern: 'wave', interval: 80, name: '自然·翠浪连绵',
  }, positions, idx, events);

  // 190s: 金色柳树覆盖 — 后排
  buildWaveEvents({
    time: 190, posIndices: POS.rearHigh, tubeSelector: 'all',
    preset: PRESETS.willow,
    palette: PALETTES.nature, useAccent: true, pattern: 'sequential', interval: 200, name: '自然·金柳万条',
  }, positions, idx, events);

  // 198s: 中央核心 — 绿色螺旋
  buildWaveEvents({
    time: 198, posIndices: POS.core, tubeSelector: 'random-n', tubeN: 40,
    preset: PRESETS.crossette,
    palette: PALETTES.nature, pattern: 'sequential', interval: 50, name: '自然·螺旋碧波',
  }, positions, idx, events);

  // 205s: 左右翼交替 — 绿金对话
  buildWaveEvents({
    time: 205, posIndices: POS.leftWing, tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.nature, pattern: 'all', name: '自然·左翼翠屏',
  }, positions, idx, events);
  buildWaveEvents({
    time: 207, posIndices: POS.rightWing, tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.nature, useAccent: true, pattern: 'all', name: '自然·右翼金屏',
  }, positions, idx, events);

  // 212s: 后方矩阵 — 高空大牡丹
  buildWaveEvents({
    time: 212, posIndices: POS.rearMatrix, tubeSelector: 'random-n', tubeN: 20,
    preset: PRESETS.grandPeony,
    palette: PALETTES.nature, pattern: 'all', name: '自然·碧空金冠',
  }, positions, idx, events);

  // 220-235s: 加速脉冲
  for (let t = 220; t <= 235; t += 2) {
    const pulse = Math.floor((t - 220) / 2);
    const posGroups = [POS.frontArc.slice(0, 4), POS.frontArc.slice(3), POS.centerFront, POS.leftWing, POS.rightWing, [...POS.rearMatrix], POS.core, POS.rearHigh];
    buildWaveEvents({
      time: t, posIndices: posGroups[pulse % posGroups.length],
      tubeSelector: 'random-n', tubeN: 8,
      preset: pulse % 3 === 0 ? PRESETS.lowBurst : pulse % 3 === 1 ? PRESETS.peony : PRESETS.crossette,
      palette: PALETTES.nature, useAccent: pulse % 2 === 0,
      pattern: 'all', name: `自然·脉冲${pulse + 1}`,
    }, positions, idx, events);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 终章 FINALE (240-300s) — 万紫千红，排山倒海
  // 最后60秒，密度指数级增长，最后10秒全场齐射
  // ═══════════════════════════════════════════════════════════════════════

  // 240s: 号角 — 全色彗星群升空
  buildWaveEvents({
    time: 240, posIndices: POS.centerFront, tubeSelector: 'all',
    preset: PRESETS.comet,
    palette: PALETTES.finale, pattern: 'wave', interval: 40, name: '终章·号角齐鸣',
  }, positions, idx, events);

  // 244s: 前线全面开火 — 多色排浪
  buildWaveEvents({
    time: 244, posIndices: POS.frontArc, tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.finale, pattern: 'wave', interval: 50, name: '终章·万花排浪',
  }, positions, idx, events);

  // 250s: 双翼 + 后方 — 层叠齐射
  buildWaveEvents({
    time: 250, posIndices: [...POS.leftWing, ...POS.rightWing], tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.finale, pattern: 'all', name: '终章·双翼齐飞',
  }, positions, idx, events);
  buildWaveEvents({
    time: 251, posIndices: POS.rearMatrix, tubeSelector: 'all',
    preset: PRESETS.grandPeony,
    palette: PALETTES.finale, pattern: 'all', name: '终章·后方连天',
  }, positions, idx, events);

  // 255s: 高空柳树幕布
  buildWaveEvents({
    time: 255, posIndices: POS.rearHigh, tubeSelector: 'all',
    preset: PRESETS.willow,
    palette: PALETTES.finale, pattern: 'all', name: '终章·金柳垂幕',
  }, positions, idx, events);

  // 260s: 核心矩阵密集发射
  buildWaveEvents({
    time: 260, posIndices: POS.core, tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.finale, pattern: 'sequential', interval: 30, name: '终章·核心爆发',
  }, positions, idx, events);

  // 265-280s: 每秒一波，轮转所有阵地
  const allGroups = [POS.frontArc, POS.leftWing, POS.centerFront, POS.rightWing, POS.core, POS.rearMatrix, POS.rearHigh, POS.fountain];
  for (let t = 265; t <= 280; t += 1) {
    const gi = Math.floor(t - 265) % allGroups.length;
    buildWaveEvents({
      time: t, posIndices: allGroups[gi],
      tubeSelector: 'random-n', tubeN: 12,
      preset: t % 3 === 0 ? PRESETS.grandPeony : t % 3 === 1 ? PRESETS.peony : PRESETS.crossette,
      palette: PALETTES.finale, useAccent: t % 2 === 0,
      pattern: 'all', name: `终章·狂澜${t - 264}`,
    }, positions, idx, events);
  }

  // 282s: 全场地面喷泉 + 地雷
  buildWaveEvents({
    time: 282, posIndices: POS.fountain, tubeSelector: 'all',
    preset: PRESETS.mine,
    palette: PALETTES.finale, pattern: 'all', name: '终章·地涌金莲',
  }, positions, idx, events);

  // 285s: 密集齐射 — 双层（前线+后排同时）
  buildWaveEvents({
    time: 285, posIndices: [...POS.frontArc, ...POS.rearHigh], tubeSelector: 'all',
    preset: PRESETS.peony,
    palette: PALETTES.finale, pattern: 'all', name: '终章·双层齐射',
  }, positions, idx, events);

  // 288-295s: 终极加速 — 每0.5秒一波
  for (let t = 288; t <= 295; t += 0.5) {
    const gi = Math.floor((t - 288) * 2) % allGroups.length;
    buildWaveEvents({
      time: t, posIndices: allGroups[gi],
      tubeSelector: 'random-n', tubeN: 15,
      preset: PRESETS.skyBurst,
      palette: PALETTES.finale,
      pattern: 'all', name: `终章·巅峰${Math.floor((t - 288) * 2) + 1}`,
    }, positions, idx, events);
  }

  // ══ 296-300s: 最后的狂欢 — 全场所有阵地倾巢而出 ══
  const GRAND_FINALE_POSITIONS = [
    ...POS.frontArc, ...POS.leftWing, ...POS.centerFront,
    ...POS.rightWing, ...POS.core, ...POS.rearMatrix, ...POS.rearHigh, ...POS.fountain,
  ];

  // 296s: 第一波全场
  buildWaveEvents({
    time: 296, posIndices: GRAND_FINALE_POSITIONS, tubeSelector: 'even',
    preset: PRESETS.skyBurst,
    palette: PALETTES.finale, pattern: 'all', name: '终章·万花齐放一',
  }, positions, idx, events);

  // 298s: 第二波全场（剩余炮筒）
  buildWaveEvents({
    time: 298, posIndices: GRAND_FINALE_POSITIONS, tubeSelector: 'odd',
    preset: PRESETS.grandPeony,
    palette: PALETTES.finale, useAccent: true, pattern: 'all', name: '终章·万花齐放二',
  }, positions, idx, events);

  // 299.5s: 最后一击 — 全部高空
  buildWaveEvents({
    time: 299.5, posIndices: POS.rearHigh, tubeSelector: 'all',
    preset: { ...PRESETS.skyBurst, height: 350, particleCount: 250 },
    palette: PALETTES.finale, pattern: 'all', name: '终章·最后礼炮',
  }, positions, idx, events);

  return events;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function generateSpectacularShow(): Project {
  console.log('🎆 开始生成5分钟震撼烟花秀...');

  const positions = createSpectacularLayout();
  const totalTubes = positions.reduce(
    (sum, pos) => sum + pos.racks.reduce((s, r) => s + r.tubeCount, 0), 0
  );
  console.log(`✅ 创建了 ${positions.length} 个阵地，共 ${totalTubes} 个炮筒`);

  const events = generateScript(positions);
  console.log(`✅ 生成了 ${events.length} 个发射事件`);

  const cues: Cue[] = events.map((event) => {
    const position = positions.find((p) => p.id === event.positionId);
    const rack = position?.racks.find((r) => r.id === event.rackId);
    const tube = rack?.tubes[event.tubeIndices[0]];
    return {
      id: event.id,
      name: event.name,
      position: position?.coordinate ?? { x: 0, y: 0, z: 0 },
      effect: tube?.effect ?? buildEffect({
        id: 'fb', name: 'Fallback', type: 'peony', color: '#FFFFFF', height: 100,
      }),
      startTime: event.startTime,
      track: event.track,
    };
  });

  const project: Project = {
    id: nextId('project'),
    name: '5分钟震撼烟花秀',
    activityName: 'Spectacular Show — 800管专业编排',
    activityDetail:
      '800管专业烟花秀，5分钟起承转合完整编排。' +
      '序幕(金银开场) → 第一章(热情红橙) → 第二章(梦幻蓝紫) → 第三章(自然绿金) → 终章(万紫千红排山倒海)。' +
      '前线弧形105管 + 双翼90管 + 中央前排100管 + 核心矩阵165管 + 后方矩阵200管 + 后排高空100管 + 地面喷泉40管。' +
      '每章有独立色彩主题和情绪节奏，波次间有呼吸感，终章最后4秒全场倾巢而出。',
    positions,
    events,
    cues,
    duration: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
    groundHeight: 0,
    mapBounds: {
      minX: -80,
      maxX: 80,
      minZ: -35,
      maxZ: 65,
    },
  };

  console.log('🎆 5分钟震撼烟花秀生成完成！');
  return project;
}
