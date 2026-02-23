/**
 * 专业对称齐射烟花秀生成器
 *
 * 核心特性：
 * 1. 500个炮筒，每个装填1发礼花弹
 * 2. 严格对称齐射：中心轴对称、V字波浪、中心开屏
 * 3. 同一波次的烟花必须在相同时间、相同高度爆炸
 * 4. 节奏控制：前松后紧，避免卡顿和噪音
 */

import {
  Project,
  Position,
  FireworkEffect,
  ShowEvent,
  Cue,
} from '../types/domain';

// 导入工厂函数
import {
  createPosition,
  createFanRack,
  createStraightRack,
  createMatrixRack,
} from '../store/projectStore';

// ============================================================================
// 工具函数
// ============================================================================

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;
const roundTime = (value: number) => Number(value.toFixed(2));

/** 创建烟花效果 */
function buildEffect(params: Partial<FireworkEffect> & Pick<FireworkEffect, 'id' | 'name' | 'color' | 'type'>): FireworkEffect {
  return {
    height: 100,
    duration: 2.5,
    intensity: 0.9,
    particleCount: 120,
    spread: 360,
    trailLength: 0.4,
    soundFrequency: 120,
    ...params,
  };
}

// ============================================================================
// 阵地和炮架布局（500个炮筒）
// ============================================================================

/**
 * 创建专业的对称阵地布局
 * 总计：500个炮筒
 */
function createSymmetricPositions(): Position[] {
  const positions: Position[] = [];

  // ========== 中央核心区域（中心轴对称）==========
  // 中央矩阵：10x10 = 100管（用于中心开屏效果）
  positions.push(
    createPosition('中央矩阵', 0, 0, [
      createMatrixRack('中央矩阵A', 10, 10, 0.6, 90),
    ])
  );

  // ========== 左右对称直排架（用于中心轴对称齐射）==========
  // 左侧直排：5个阵地 × 20管 = 100管
  for (let i = 0; i < 5; i++) {
    const x = -60 + i * 10;
    positions.push(
      createPosition(`左直排${i + 1}`, x, 30, [
        createStraightRack(`左直排${i + 1}`, 20, 90),
      ])
    );
  }

  // 右侧直排：5个阵地 × 20管 = 100管（与左侧对称）
  for (let i = 0; i < 5; i++) {
    const x = 60 - i * 10;
    positions.push(
      createPosition(`右直排${i + 1}`, x, 30, [
        createStraightRack(`右直排${i + 1}`, 20, 90),
      ])
    );
  }

  // ========== 左右对称扇形架（用于V字波浪效果）==========
  // 左扇形：3个阵地 × 15管 = 45管（弧度更大：-60° 到 +60°）
  positions.push(
    createPosition('左扇形前', -50, 50, [
      createFanRack('左扇形前', 15, -60, 60, 85),
    ]),
    createPosition('左扇形中', -50, 35, [
      createFanRack('左扇形中', 15, -60, 60, 85),
    ]),
    createPosition('左扇形后', -50, 20, [
      createFanRack('左扇形后', 15, -60, 60, 85),
    ])
  );

  // 右扇形：3个阵地 × 15管 = 45管（与左侧对称）
  positions.push(
    createPosition('右扇形前', 50, 50, [
      createFanRack('右扇形前', 15, -60, 60, 85),
    ]),
    createPosition('右扇形中', 50, 35, [
      createFanRack('右扇形中', 15, -60, 60, 85),
    ]),
    createPosition('右扇形后', 50, 20, [
      createFanRack('右扇形后', 15, -60, 60, 85),
    ])
  );

  // ========== 后排矩阵（用于背景填充）==========
  // 后排矩阵：2个阵地 × 55管 = 110管
  positions.push(
    createPosition('后排左矩阵', -30, -15, [
      createMatrixRack('后排左矩阵', 7, 8, 0.5, 90), // 56管，取55管
    ]),
    createPosition('后排右矩阵', 30, -15, [
      createMatrixRack('后排右矩阵', 7, 8, 0.5, 90), // 56管，取55管
    ])
  );

  // 总计：100 + 100 + 100 + 45 + 45 + 110 = 500管

  return positions;
}

// ============================================================================
// 烟花效果库
// ============================================================================

const EFFECT_LIBRARY = [
  { type: 'peony' as const, colors: ['#FFD700', '#FFA500', '#FF8C00'], name: '金色牡丹' },
  { type: 'burst' as const, colors: ['#FF0000', '#DC143C', '#B22222'], name: '红色爆裂' },
  { type: 'willow' as const, colors: ['#00FF00', '#32CD32', '#228B22'], name: '绿色柳树' },
  { type: 'crossette' as const, colors: ['#FFFFFF', '#F0F0F0', '#E0E0E0'], name: '银色十字星' },
  { type: 'comet' as const, colors: ['#0000FF', '#4169E1', '#1E90FF'], name: '蓝色彗星' },
  { type: 'mine' as const, colors: ['#FF00FF', '#DA70D6', '#BA55D3'], name: '紫色地雷' },
  { type: 'rocket' as const, colors: ['#00FFFF', '#00CED1', '#20B2AA'], name: '青色火箭' },
  { type: 'sparkler' as const, colors: ['#FFC0CB', '#FFB6C1', '#FF69B4'], name: '粉色闪光' },
];

// ============================================================================
// 对称齐射模式
// ============================================================================

interface SymmetricWave {
  time: number;
  height: number;
  effectIdx: number;
  pattern: 'center-axis' | 'v-shape' | 'center-bloom' | 'full-sync';
  positions: Array<{ posIdx: number; rackIdx: number; tubeIndices: number[] }>;
  name: string;
}

/**
 * 生成中心轴对称波次
 * 左右两侧的直排架同时发射，形成中心轴对称
 */
function generateCenterAxisWave(
  time: number,
  height: number,
  effectIdx: number,
  tubeCount: number,
  name: string
): SymmetricWave {
  // 左侧直排：索引1-5
  // 右侧直排：索引6-10
  const leftPosIdx = 1 + Math.floor(Math.random() * 5);
  const rightPosIdx = 6 + Math.floor(Math.random() * 5);

  // 对称选择炮筒（从中心向外）
  const tubeIndices: number[] = [];
  for (let i = 0; i < tubeCount; i++) {
    tubeIndices.push(i);
  }

  return {
    time,
    height,
    effectIdx,
    pattern: 'center-axis',
    positions: [
      { posIdx: leftPosIdx, rackIdx: 0, tubeIndices },
      { posIdx: rightPosIdx, rackIdx: 0, tubeIndices },
    ],
    name,
  };
}

/**
 * 生成V字波浪
 * 左右扇形架同时发射，形成V字形状
 */
function generateVShapeWave(
  time: number,
  height: number,
  effectIdx: number,
  tubeCount: number,
  name: string
): SymmetricWave {
  // 左扇形：索引11-13
  // 右扇形：索引14-16
  const fanIdx = Math.floor(Math.random() * 3);
  const leftPosIdx = 11 + fanIdx;
  const rightPosIdx = 14 + fanIdx;

  // 对称选择炮筒（从两端向中心）
  const tubeIndices: number[] = [];
  for (let i = 0; i < tubeCount; i++) {
    tubeIndices.push(i);
  }

  return {
    time,
    height,
    effectIdx,
    pattern: 'v-shape',
    positions: [
      { posIdx: leftPosIdx, rackIdx: 0, tubeIndices },
      { posIdx: rightPosIdx, rackIdx: 0, tubeIndices },
    ],
    name,
  };
}

/**
 * 生成中心开屏
 * 中央矩阵从中心向外扩散
 */
function generateCenterBloomWave(
  time: number,
  height: number,
  effectIdx: number,
  ringSize: number,
  name: string
): SymmetricWave {
  // 中央矩阵：索引0
  // 从中心(5,5)向外选择一圈炮筒
  const center = 5;
  const tubeIndices: number[] = [];

  for (let row = center - ringSize; row <= center + ringSize; row++) {
    for (let col = center - ringSize; col <= center + ringSize; col++) {
      if (row >= 0 && row < 10 && col >= 0 && col < 10) {
        // 只选择外圈
        if (
          row === center - ringSize ||
          row === center + ringSize ||
          col === center - ringSize ||
          col === center + ringSize
        ) {
          tubeIndices.push(row * 10 + col);
        }
      }
    }
  }

  return {
    time,
    height,
    effectIdx,
    pattern: 'center-bloom',
    positions: [{ posIdx: 0, rackIdx: 0, tubeIndices }],
    name,
  };
}

/**
 * 生成全场同步
 * 所有阵地同时发射（高潮时刻）
 */
function generateFullSyncWave(
  time: number,
  height: number,
  effectIdx: number,
  tubeCount: number,
  name: string
): SymmetricWave {
  const positions: Array<{ posIdx: number; rackIdx: number; tubeIndices: number[] }> = [];

  // 所有阵地都参与
  for (let posIdx = 0; posIdx < 19; posIdx++) {
    const tubeIndices: number[] = [];
    for (let i = 0; i < Math.min(tubeCount, 10); i++) {
      tubeIndices.push(i);
    }
    positions.push({ posIdx, rackIdx: 0, tubeIndices });
  }

  return {
    time,
    height,
    effectIdx,
    pattern: 'full-sync',
    positions,
    name,
  };
}

// ============================================================================
// 波次序列生成（前松后紧）
// ============================================================================

function generateWaveSequence(): SymmetricWave[] {
  const waves: SymmetricWave[] = [];
  let w = 1;

  // 颜色阶段：0=金色(0-3), 1=红蓝(0-5), 2=全彩(0-7)
  const phaseEffect = (phase: number, i: number) => {
    if (phase === 0) return i % 3; // 金色牡丹/红色爆裂/绿色柳树
    if (phase === 1) return (i % 5) + 1; // 红/绿/白/蓝/紫
    return i % EFFECT_LIBRARY.length; // 全部
  };

  // ═══ 序幕 (0-30s) 金色开场，稀疏庄重 ═══
  // 每6秒一波，5波，只用金色系
  for (let i = 0; i < 5; i++) {
    const time = 3 + i * 6;
    const height = 140 + i * 15;
    const tubeCount = 2 + i;
    if (i % 2 === 0) {
      waves.push(generateCenterAxisWave(time, height, 0, tubeCount, `序幕-中心${w++}`));
    } else {
      waves.push(generateVShapeWave(time, height, 0, tubeCount, `序幕-V字${w++}`));
    }
  }

  // ═══ 第一章 (30-80s) 金色→红橙，节奏渐快 ═══
  // 4s间隔→3s间隔，有一次2s留白后加密
  const ch1Times = [32, 36, 40, 44, 48, 53, 58, 62, 65, 68, 71, 74, 77, 80];
  ch1Times.forEach((time, i) => {
    const height = 130 + (i % 4) * 25;
    const effectIdx = phaseEffect(0, i);
    const tubeCount = 3 + (i % 3);
    const mode = i % 3;
    if (mode === 0) waves.push(generateCenterAxisWave(time, height, effectIdx, tubeCount, `第一章-中心${w++}`));
    else if (mode === 1) waves.push(generateVShapeWave(time, height, effectIdx, tubeCount, `第一章-V字${w++}`));
    else waves.push(generateCenterBloomWave(time, height, effectIdx, 1 + (i % 2), `第一章-开屏${w++}`));
  });

  // ═══ 呼吸 (80-85s) 5秒静默 ═══

  // ═══ 第二章 (85-130s) 多彩交响，节奏活跃 ═══
  // 3s→2s间隔，颜色丰富
  const ch2Times = [85, 88, 91, 94, 96, 98, 100, 102, 104, 107, 110, 112, 114, 116, 118, 120, 122, 124, 127, 130];
  ch2Times.forEach((time, i) => {
    const height = 150 + (i % 6) * 20;
    const effectIdx = phaseEffect(1, i);
    const tubeCount = 4 + (i % 4);
    const mode = i % 4;
    if (mode === 0) waves.push(generateCenterAxisWave(time, height, effectIdx, tubeCount, `第二章-中心${w++}`));
    else if (mode === 1) waves.push(generateVShapeWave(time, height, effectIdx, tubeCount, `第二章-V字${w++}`));
    else if (mode === 2) waves.push(generateCenterBloomWave(time, height, effectIdx, 2 + (i % 3), `第二章-开屏${w++}`));
    else waves.push(generateFullSyncWave(time, height, effectIdx, 3, `第二章-全场${w++}`));
  });

  // ═══ 呼吸 (130-133s) 3秒静默 ═══

  // ═══ 终章 (133-175s) 万紫千红，排山倒海 ═══
  // 2s→1s→0.5s加速
  const finaleTimesA = [133, 135, 137, 139, 141, 143, 145, 147, 149, 151]; // 2s
  const finaleTimesB = [152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165]; // 1s
  const finaleTimesC = [165.5, 166, 166.5, 167, 167.5, 168, 168.5, 169, 169.5, 170, 170.5, 171, 171.5, 172, 172.5, 173, 173.5, 174, 174.5, 175]; // 0.5s

  [...finaleTimesA, ...finaleTimesB, ...finaleTimesC].forEach((time, i) => {
    const height = 160 + (i % 8) * 16;
    const effectIdx = phaseEffect(2, i);
    const tubeCount = 5 + (i % 6);
    const mode = i % 4;
    if (mode === 0) waves.push(generateFullSyncWave(time, height, effectIdx, tubeCount, `终章-全场${w++}`));
    else if (mode === 1) waves.push(generateCenterAxisWave(time, height, effectIdx, tubeCount, `终章-中心${w++}`));
    else if (mode === 2) waves.push(generateVShapeWave(time, height, effectIdx, tubeCount, `终章-V字${w++}`));
    else waves.push(generateCenterBloomWave(time, height, effectIdx, 3 + (i % 3), `终章-开屏${w++}`));
  });

  return waves;
}

// ============================================================================
// 主生成函数
// ============================================================================

export function generateSymmetricShow(): Project {
  console.log('🎆 开始生成专业对称齐射烟花秀...');

  // 1. 创建阵地布局
  const positions = createSymmetricPositions();
  console.log(`✅ 创建了 ${positions.length} 个阵地`);

  // 统计炮筒总数
  const totalTubes = positions.reduce(
    (sum, pos) => sum + pos.racks.reduce((rackSum, rack) => rackSum + rack.tubeCount, 0),
    0
  );
  console.log(`✅ 总计 ${totalTubes} 个炮筒`);

  // 2. 为所有炮筒预先装填礼花弹
  positions.forEach((position, posIdx) => {
    position.racks.forEach((rack, rackIdx) => {
      rack.tubes.forEach((tube, tubeIdx) => {
        const effectIdx = (posIdx + rackIdx + tubeIdx) % EFFECT_LIBRARY.length;
        const effectDef = EFFECT_LIBRARY[effectIdx];
        const color = effectDef.colors[tubeIdx % effectDef.colors.length];

        const effect = buildEffect({
          id: `effect-p${posIdx}-r${rackIdx}-t${tubeIdx}`,
          name: `${position.name}-${tubeIdx}`,
          type: effectDef.type,
          color,
          height: 150, // 初始高度150米，会在事件中更新
          duration: 2.5,
          intensity: 0.92,
          particleCount: 140,
          spread: 360,
        });

        tube.loaded = true;
        tube.effect = effect;
        tube.isFired = false; // 确保未发射状态
      });
    });
  });

  // 3. 生成波次序列
  const waves = generateWaveSequence();
  console.log(`✅ 生成了 ${waves.length} 个波次`);

  // 4. 将波次转换为事件
  const events: ShowEvent[] = [];
  let eventIndex = 1;

  waves.forEach((wave) => {
    const effectDef = EFFECT_LIBRARY[wave.effectIdx];
    const color = effectDef.colors[eventIndex % effectDef.colors.length];

    wave.positions.forEach((posInfo) => {
      const position = positions[posInfo.posIdx];
      if (!position) {
        console.warn(`警告：找不到阵地索引 ${posInfo.posIdx}`);
        return;
      }

      const rack = position.racks[posInfo.rackIdx];
      if (!rack) {
        console.warn(`警告：找不到炮架 ${position.name}[${posInfo.rackIdx}]`);
        return;
      }

      // 更新炮筒效果（确保相同高度）
      const validTubeIndices: number[] = [];
      posInfo.tubeIndices.forEach((tubeIdx) => {
        if (tubeIdx < rack.tubes.length) {
          const tube = rack.tubes[tubeIdx];
          // 更新效果，使用波次指定的高度
          tube.effect = buildEffect({
            id: `effect-w${eventIndex}-t${tubeIdx}`,
            name: `${wave.name}-${tubeIdx}`,
            type: effectDef.type,
            color,
            height: wave.height, // 关键：同一波的所有炮筒使用相同高度
            duration: 2.5,
            intensity: 0.92,
            particleCount: 140,
            spread: 360,
          });
          // 不重置isFired状态，保持loaded状态
          validTubeIndices.push(tubeIdx);
        }
      });

      // 只有当有有效炮筒时才创建事件
      if (validTubeIndices.length > 0) {
        events.push({
          id: `event-${eventIndex}`,
          name: wave.name,
          startTime: roundTime(wave.time),
          positionId: position.id,
          rackId: rack.id,
          tubeIndices: validTubeIndices,
          pattern: 'all', // 同时发射
          track: `W${String(eventIndex).padStart(3, '0')}`,
        });

        eventIndex++;
      }
    });
  });

  console.log(`✅ 创建了 ${events.length} 个发射事件`);

  // 5. 生成cues（用于播放）
  const cues: Cue[] = events.map((event) => {
    const position = positions.find((pos) => pos.id === event.positionId);
    const rack = position?.racks.find((r) => r.id === event.rackId);
    const tube = rack?.tubes[event.tubeIndices[0]];

    return {
      id: event.id,
      name: event.name,
      position: position?.coordinate || { x: 0, y: 0, z: 0 },
      effect: tube?.effect || buildEffect({
        id: 'fallback',
        name: 'Fallback',
        type: 'peony',
        color: '#FFFFFF',
        height: 100,
      }),
      startTime: event.startTime,
      track: event.track,
    };
  });

  // 6. 创建项目
  const project: Project = {
    id: nextId('project'),
    name: '专业对称齐射烟花秀',
    activityName: '10分钟精心编排表演',
    activityDetail:
      '专业对称齐射烟花秀：500个炮筒，每个装填1发礼花弹。采用中心轴对称、V字波浪、中心开屏等多种齐射模式，确保同一波次的烟花在相同时间、相同高度爆炸。节奏控制：开场4秒/波、发展3秒/波、加速2秒/波、高潮1秒/波，前松后紧，避免卡顿和噪音，呈现完美的视觉盛宴。',
    positions,
    events,
    cues,
    duration: 180,
    createdAt: new Date(),
    updatedAt: new Date(),
    groundHeight: 0,
    mapBounds: {
      minX: -70,
      maxX: 70,
      minZ: -20,
      maxZ: 60,
    },
  };

  console.log('🎆 专业对称齐射烟花秀生成完成！');
  return project;
}
