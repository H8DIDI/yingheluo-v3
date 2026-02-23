/**
 * 3分钟中型烟花秀生成器 - Grand Show Generator
 *
 * 核心特性：
 * 1. 500个炮筒：Group A (前线扇形300管) + Group B (后方矩阵200管)
 * 2. 对称齐射模式：Open Wings / Close In / Parallel Wall
 * 3. 3分钟精心编排：Opening (0-60s) -> Progression (60-120s) -> Climax (120-180s)
 * 4. 性能优化：Finale阶段打散发射时间，避免卡顿
 */

import {
  Project,
  Position,
  FireworkEffect,
  ShowEvent,
  Cue,
} from '../types/domain';

import {
  createPosition,
  createFanRack,
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
// 烟花效果库
// ============================================================================

const SHELL_TYPES = [
  { type: 'peony' as const, colors: ['#FF0000', '#DC143C', '#B22222'], name: 'Red Peony' },
  { type: 'willow' as const, colors: ['#FFD700', '#FFA500', '#FF8C00'], name: 'Gold Willow' },
  { type: 'burst' as const, colors: ['#C0C0C0', '#D3D3D3', '#E8E8E8'], name: 'Silver Wave' },
  { type: 'crossette' as const, colors: ['#00FF00', '#32CD32', '#228B22'], name: 'Green Crossette' },
  { type: 'comet' as const, colors: ['#0000FF', '#4169E1', '#1E90FF'], name: 'Blue Comet' },
  { type: 'mine' as const, colors: ['#FF00FF', '#DA70D6', '#BA55D3'], name: 'Purple Mine' },
  { type: 'rocket' as const, colors: ['#00FFFF', '#00CED1', '#20B2AA'], name: 'Cyan Rocket' },
  { type: 'sparkler' as const, colors: ['#FFC0CB', '#FFB6C1', '#FF69B4'], name: 'Pink Sparkler' },
];

// ============================================================================
// 500个炮筒布局策略
// ============================================================================

/**
 * 创建500个炮筒的专业布局
 * Group A: 前线扇形 300管
 * Group B: 后方矩阵 200管
 */
function create500TubesLayout(): Position[] {
  const positions: Position[] = [];

  // ========== Group A: 前线扇形 (300管) ==========
  // 布局：在X轴上呈宽大的弧形排列，角度从-60°到+60°线性渐变
  // 策略：15个阵地，每个阵地20管扇形炮架
  const groupACount = 15;
  const tubesPerFan = 20;
  const arcRadius = 80; // 弧形半径
  const arcStartAngle = -Math.PI / 3; // -60度
  const arcEndAngle = Math.PI / 3; // +60度
  const arcAngleStep = (arcEndAngle - arcStartAngle) / (groupACount - 1);

  for (let i = 0; i < groupACount; i++) {
    const angle = arcStartAngle + arcAngleStep * i;
    const x = arcRadius * Math.sin(angle);
    const z = arcRadius * Math.cos(angle);

    // 扇形炮架的朝向角度（从-60°到+60°）
    const fanStartAngle = -60 + (i / (groupACount - 1)) * 120;

    positions.push(
      createPosition(`前线扇形-${i + 1}`, x, z, [
        createFanRack(`扇形架-${i + 1}`, tubesPerFan, fanStartAngle - 30, fanStartAngle + 30, 85),
      ])
    );
  }

  // ========== Group B: 后方矩阵 (200管) ==========
  // 布局：10行 x 20列的矩形方阵，位于Group A后方
  // 策略：2个大型矩阵阵地，每个100管 (10x10)
  positions.push(
    createPosition('后方矩阵-左', -25, -30, [
      createMatrixRack('矩阵-左', 10, 10, 0.8, 90),
    ]),
    createPosition('后方矩阵-右', 25, -30, [
      createMatrixRack('矩阵-右', 10, 10, 0.8, 90),
    ])
  );

  return positions;
}

// ============================================================================
// 对称齐射核心算法
// ============================================================================

interface SymmetricalWaveParams {
  tubes: Array<{ posIdx: number; rackIdx: number; tubeIdx: number }>;
  startTime: number;
  patternType: 'open-wings' | 'close-in' | 'parallel-wall';
  height: number;
  shellType: typeof SHELL_TYPES[number];
}

interface WaveEvent {
  posIdx: number;
  rackIdx: number;
  tubeIdx: number;
  launchTime: number;
  targetHeight: number;
  shellType: typeof SHELL_TYPES[number];
}

/**
 * 创建对称齐射波次
 *
 * @param tubes - 选定的炮筒集合
 * @param startTime - 波次开始时间
 * @param patternType - 波次模式
 * @param height - 目标高度
 * @param shellType - 烟花类型
 * @returns 波次事件列表
 */
function createSymmetricalWave(params: SymmetricalWaveParams): WaveEvent[] {
  const { tubes, startTime, patternType, height, shellType } = params;
  const events: WaveEvent[] = [];

  // 确保高度不超过物理极限（150m物理极限）
  const safeHeight = Math.min(height, 150);

  if (patternType === 'open-wings') {
    // Pattern A "Open Wings" (大鹏展翅): 从中间向两边依次发射
    const mid = Math.floor(tubes.length / 2);

    for (let i = 0; i < tubes.length; i++) {
      const distanceFromCenter = Math.abs(i - mid);
      const delay = distanceFromCenter * 0.05; // 每个单位距离延迟0.05秒

      events.push({
        ...tubes[i],
        launchTime: roundTime(startTime + delay),
        targetHeight: safeHeight,
        shellType,
      });
    }
  } else if (patternType === 'close-in') {
    // Pattern B "Close In" (双龙戏珠): 从两边向中间依次发射
    const mid = Math.floor(tubes.length / 2);

    for (let i = 0; i < tubes.length; i++) {
      const distanceFromEdge = Math.min(i, tubes.length - 1 - i);
      const delay = (mid - distanceFromEdge) * 0.05;

      events.push({
        ...tubes[i],
        launchTime: roundTime(startTime + delay),
        targetHeight: safeHeight,
        shellType,
      });
    }
  } else if (patternType === 'parallel-wall') {
    // Pattern C "Parallel Wall" (排山倒海): 所有炮筒瞬间齐射
    for (let i = 0; i < tubes.length; i++) {
      events.push({
        ...tubes[i],
        launchTime: startTime,
        targetHeight: safeHeight,
        shellType,
      });
    }
  }

  return events;
}

// ============================================================================
// 3分钟脚本编排
// ============================================================================

/**
 * 生成3分钟时间轴数据
 */
function generate3MinuteScript(_positions: Position[]): WaveEvent[] {
  const allEvents: WaveEvent[] = [];

  // 准备炮筒索引
  // Group A: 前15个阵地 (索引0-14)，每个20管
  const groupATubes: Array<{ posIdx: number; rackIdx: number; tubeIdx: number }> = [];
  for (let posIdx = 0; posIdx < 15; posIdx++) {
    for (let tubeIdx = 0; tubeIdx < 20; tubeIdx++) {
      groupATubes.push({ posIdx, rackIdx: 0, tubeIdx });
    }
  }

  // Group B: 后2个阵地 (索引15-16)，每个100管
  const groupBTubes: Array<{ posIdx: number; rackIdx: number; tubeIdx: number }> = [];
  for (let posIdx = 15; posIdx < 17; posIdx++) {
    for (let tubeIdx = 0; tubeIdx < 100; tubeIdx++) {
      groupBTubes.push({ posIdx, rackIdx: 0, tubeIdx });
    }
  }

  // ========== 0-60s (Opening): Group A，10波 "Open Wings" ==========
  for (let wave = 0; wave < 10; wave++) {
    const startTime = wave * 6; // 每波间隔6秒
    const shellType = SHELL_TYPES[wave % SHELL_TYPES.length];

    // 每波使用30管（从Group A中选择）
    const tubesForWave = groupATubes.slice(wave * 30, (wave + 1) * 30);

    const waveEvents = createSymmetricalWave({
      tubes: tubesForWave,
      startTime,
      patternType: 'open-wings',
      height: 120,
      shellType,
    });

    allEvents.push(...waveEvents);
  }

  // ========== 60-120s (Progression): Group A + Group B，10波 "Close In" ==========
  for (let wave = 0; wave < 10; wave++) {
    const startTime = 60 + wave * 6; // 每波间隔6秒
    const shellType = SHELL_TYPES[(wave + 3) % SHELL_TYPES.length];

    // 每波使用50管（30管来自Group A，20管来自Group B）
    const groupATubesForWave = groupATubes.slice(300 - (wave + 1) * 30, 300 - wave * 30);
    const groupBTubesForWave = groupBTubes.slice(wave * 20, (wave + 1) * 20);
    const tubesForWave = [...groupATubesForWave, ...groupBTubesForWave];

    const waveEvents = createSymmetricalWave({
      tubes: tubesForWave,
      startTime,
      patternType: 'close-in',
      height: 150,
      shellType,
    });

    allEvents.push(...waveEvents);
  }

  // ========== 120-175s (Climax): Group B，每隔10秒一次 "Parallel Wall" ==========
  const climaxHeights = [60, 100, 140, 150]; // 高度递增，最后一个限制在150m
  const climaxTimes = [120, 130, 140, 150, 160];

  for (let i = 0; i < climaxTimes.length; i++) {
    const startTime = climaxTimes[i];
    const height = i < climaxHeights.length ? climaxHeights[i] : 150;
    const shellType = SHELL_TYPES[(i + 5) % SHELL_TYPES.length];

    // 使用剩余的Group B炮筒
    const tubesPerWave = 40; // 每波40管
    const tubesForWave = groupBTubes.slice(i * tubesPerWave, (i + 1) * tubesPerWave);

    const waveEvents = createSymmetricalWave({
      tubes: tubesForWave,
      startTime,
      patternType: 'parallel-wall',
      height,
      shellType,
    });

    allEvents.push(...waveEvents);
  }

  // ========== 175-180s (Finale): 全场齐射，打散0.1-0.2s ==========
  // 收集所有未使用的炮筒
  const usedTubes = new Set(allEvents.map(e => `${e.posIdx}-${e.rackIdx}-${e.tubeIdx}`));
  const remainingTubes: Array<{ posIdx: number; rackIdx: number; tubeIdx: number }> = [];

  [...groupATubes, ...groupBTubes].forEach(tube => {
    const key = `${tube.posIdx}-${tube.rackIdx}-${tube.tubeIdx}`;
    if (!usedTubes.has(key)) {
      remainingTubes.push(tube);
    }
  });

  // Finale齐射，打散发射时间
  const finaleStartTime = 175;
  const shellType = SHELL_TYPES[0]; // 使用第一种烟花类型

  remainingTubes.forEach((tube) => {
    const randomDelay = Math.random() * 0.2; // 0-0.2秒随机延迟
    allEvents.push({
      ...tube,
      launchTime: roundTime(finaleStartTime + randomDelay),
      targetHeight: 120, // Finale使用中等高度
      shellType,
    });
  });

  return allEvents;
}

// ============================================================================
// 主生成函数
// ============================================================================

export function generateGrandShow(): Project {
  console.log('🎆 开始生成3分钟中型烟花秀...');

  // 1. 创建500个炮筒布局
  const positions = create500TubesLayout();
  console.log(`✅ 创建了 ${positions.length} 个阵地`);

  // 统计炮筒总数
  const totalTubes = positions.reduce(
    (sum, pos) => sum + pos.racks.reduce((rackSum, rack) => rackSum + rack.tubeCount, 0),
    0
  );
  console.log(`✅ 总计 ${totalTubes} 个炮筒`);

  // 2. 生成3分钟时间轴
  const waveEvents = generate3MinuteScript(positions);
  console.log(`✅ 生成了 ${waveEvents.length} 个发射事件`);

  // 3. 为炮筒装填礼花弹并创建ShowEvent
  const events: ShowEvent[] = [];
  const eventsByPosition = new Map<string, Map<string, Map<number, WaveEvent[]>>>();

  // 按阵地、炮架、炮筒分组事件
  waveEvents.forEach(event => {
    const position = positions[event.posIdx];
    if (!position) return;

    const rack = position.racks[event.rackIdx];
    if (!rack) return;

    const posKey = position.id;
    const rackKey = rack.id;

    if (!eventsByPosition.has(posKey)) {
      eventsByPosition.set(posKey, new Map());
    }
    const rackMap = eventsByPosition.get(posKey)!;

    if (!rackMap.has(rackKey)) {
      rackMap.set(rackKey, new Map());
    }
    const tubeMap = rackMap.get(rackKey)!;

    if (!tubeMap.has(event.launchTime)) {
      tubeMap.set(event.launchTime, []);
    }
    tubeMap.get(event.launchTime)!.push(event);
  });

  // 为每个炮筒装填礼花弹
  positions.forEach((position, posIdx) => {
    position.racks.forEach((rack, rackIdx) => {
      rack.tubes.forEach((tube, tubeIdx) => {
        // 找到这个炮筒的发射事件
        const tubeEvent = waveEvents.find(
          e => e.posIdx === posIdx && e.rackIdx === rackIdx && e.tubeIdx === tubeIdx
        );

        if (tubeEvent) {
          const shellType = tubeEvent.shellType;
          const color = shellType.colors[tubeIdx % shellType.colors.length];

          const effect = buildEffect({
            id: `effect-p${posIdx}-r${rackIdx}-t${tubeIdx}`,
            name: `${position.name}-${tubeIdx}`,
            type: shellType.type,
            color,
            height: tubeEvent.targetHeight,
            duration: 2.5,
            intensity: 0.92,
            particleCount: 140,
            spread: 360,
          });

          tube.loaded = true;
          tube.effect = effect;
          tube.isFired = false;
        }
      });
    });
  });

  // 创建ShowEvent
  let eventIndex = 1;
  eventsByPosition.forEach((rackMap, posId) => {
    const position = positions.find(p => p.id === posId);
    if (!position) return;

    rackMap.forEach((tubeMap, rackId) => {
      const rack = position.racks.find(r => r.id === rackId);
      if (!rack) return;

      tubeMap.forEach((eventsAtTime, launchTime) => {
        const tubeIndices = eventsAtTime.map(e => e.tubeIdx);

        events.push({
          id: `event-${eventIndex}`,
          name: `Wave-${eventIndex}`,
          startTime: launchTime,
          positionId: position.id,
          rackId: rack.id,
          tubeIndices,
          pattern: 'all',
          track: `W${String(eventIndex).padStart(3, '0')}`,
        });

        eventIndex++;
      });
    });
  });

  console.log(`✅ 创建了 ${events.length} 个ShowEvent`);

  // 4. 生成cues（用于播放）
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

  // 5. 创建项目
  const project: Project = {
    id: nextId('project'),
    name: '3分钟中型烟花秀',
    activityName: 'Grand Show - 对称齐射编排',
    activityDetail:
      '500个炮筒精心编排的3分钟烟花秀。Group A (前线扇形300管) + Group B (后方矩阵200管)。采用Open Wings、Close In、Parallel Wall三种对称齐射模式。Opening (0-60s) -> Progression (60-120s) -> Climax (120-180s)，节奏层层递进，最后5秒全场Finale齐射。',
    positions,
    events,
    cues,
    duration: 180,
    createdAt: new Date(),
    updatedAt: new Date(),
    groundHeight: 0,
    mapBounds: {
      minX: -100,
      maxX: 100,
      minZ: -50,
      maxZ: 100,
    },
  };

  console.log('🎆 3分钟中型烟花秀生成完成！');
  return project;
}
