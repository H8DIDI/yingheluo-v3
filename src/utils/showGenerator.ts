/**
 * Epic Fireworks Show Generator
 *
 * 生成一场10分钟（600秒）的专业烟花秀
 * 严格遵循起承转合结构和排浪式齐射逻辑
 */

import {
  Project,
  Position,
  Rack,
  ShowEvent,
  FireworkEffect,
  FiringPattern,
} from '../types/domain';
import {
  createPosition,
  createFanRack,
  createStraightRack,
  createMatrixRack,
} from '../store/projectStore';

// ============================================================================
// 常量定义
// ============================================================================

const SHOW_DURATION = 600; // 10分钟
const MAX_SCENE_HEIGHT = 200; // 场景最大高度（米）
const SAFE_HEIGHT_RATIO = 0.8; // 安全高度比例

// 时间段定义（秒）
const OPENING_START = 0;
const OPENING_END = 60;
const PRE_FINALE_START = 480;
const PRE_FINALE_END = 540;
const FINALE_START = 540;
const FINALE_END = 600;

// 颜色主题
const COLOR_THEMES = {
  opening: ['#FFD700', '#C0C0C0', '#FFFFFF'], // 金银白
  red: ['#FF0000', '#FF4444', '#FF6666', '#DC143C'],
  blue: ['#0000FF', '#4169E1', '#1E90FF', '#00BFFF'],
  purple: ['#8B00FF', '#9370DB', '#BA55D3', '#DA70D6'],
  green: ['#00FF00', '#32CD32', '#00FA9A', '#7FFF00'],
  orange: ['#FF8C00', '#FFA500', '#FFB347', '#FF7F50'],
  finale: ['#FF0000', '#FFD700', '#0000FF', '#00FF00', '#FF00FF', '#FFFFFF'],
};

// 烟花效果类型权重
const EFFECT_TYPES = {
  opening: ['burst', 'peony', 'comet'] as FireworkEffect['type'][],
  acts: ['peony', 'willow', 'crossette', 'burst'] as FireworkEffect['type'][],
  preFinale: ['peony', 'crossette', 'burst', 'willow'] as FireworkEffect['type'][],
  finale: ['peony', 'burst', 'crossette', 'willow'] as FireworkEffect['type'][],
};

// ============================================================================
// 工具函数
// ============================================================================

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

/** 生成随机数（范围内） */
const random = (min: number, max: number) => Math.random() * (max - min) + min;

/** 生成随机整数 */
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));

/** 从数组中随机选择 */
const randomChoice = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

/** 限制高度在安全范围内 */
const safeHeight = (height: number) => Math.min(height, MAX_SCENE_HEIGHT * SAFE_HEIGHT_RATIO);

/** 四舍五入到小数点后2位 */
const round = (value: number) => Number(value.toFixed(2));

// ============================================================================
// 烟花效果生成
// ============================================================================

/** 创建烟花效果 */
function createEffect(
  name: string,
  type: FireworkEffect['type'],
  color: string,
  height: number,
  options: Partial<FireworkEffect> = {}
): FireworkEffect {
  return {
    id: nextId('effect'),
    name,
    type,
    color,
    height: safeHeight(height),
    duration: 2.5,
    intensity: 0.9,
    particleCount: 120,
    spread: 360,
    trailLength: 0.4,
    soundFrequency: 120,
    ...options,
  };
}

// ============================================================================
// 阵地和炮架布局
// ============================================================================

/** 创建专业的阵地布局 */
function createPositions(): Position[] {
  const positions: Position[] = [];

  // 左翼区域：扇形架（3个阵地，每个11管）
  positions.push(
    createPosition('左翼前', -70, 30, [createFanRack('左翼扇形A', 11, -45, 45, 85)]),
    createPosition('左翼中', -70, 15, [createFanRack('左翼扇形B', 11, -45, 45, 85)]),
    createPosition('左翼后', -70, 0, [createFanRack('左翼扇形C', 11, -45, 45, 85)])
  );

  // 左前区域：矩阵架
  positions.push(
    createPosition('左前阵地', -50, 35, [
      createMatrixRack('左前矩阵A', 7, 7, 0.5, 90),
      createMatrixRack('左前矩阵B', 6, 6, 0.5, 90),
    ])
  );

  // 中央前区域：直排架（5个阵地，每个15管）
  for (let i = 0; i < 5; i++) {
    const x = -30 + i * 15;
    positions.push(
      createPosition(`中央前排${i + 1}`, x, 40, [
        createStraightRack(`中前直排${String.fromCharCode(65 + i)}`, 15, 90),
      ])
    );
  }

  // 中央核心区域：大型矩阵架
  positions.push(
    createPosition('中央核心', 0, 20, [
      createMatrixRack('中央矩阵A', 9, 9, 0.5, 90),
      createMatrixRack('中央矩阵B', 8, 8, 0.5, 90),
    ])
  );

  // 右前区域：矩阵架
  positions.push(
    createPosition('右前阵地', 50, 35, [
      createMatrixRack('右前矩阵A', 7, 7, 0.5, 90),
      createMatrixRack('右前矩阵B', 6, 6, 0.5, 90),
    ])
  );

  // 右翼区域：扇形架（3个阵地，每个11管）
  positions.push(
    createPosition('右翼前', 70, 30, [createFanRack('右翼扇形A', 11, -45, 45, 85)]),
    createPosition('右翼中', 70, 15, [createFanRack('右翼扇形B', 11, -45, 45, 85)]),
    createPosition('右翼后', 70, 0, [createFanRack('右翼扇形C', 11, -45, 45, 85)])
  );

  // 后排区域：直排架（3个阵地，每个20管）
  for (let i = 0; i < 3; i++) {
    const x = -30 + i * 30;
    positions.push(
      createPosition(`后排${i + 1}`, x, -20, [
        createStraightRack(`后排直排${String.fromCharCode(65 + i)}`, 20, 90),
      ])
    );
  }

  return positions;
}

// ============================================================================
// 波次生成逻辑（核心）
// ============================================================================

interface Wave {
  time: number;
  positionId: string;
  rackId: string;
  tubeIndices: number[];
  height: number;
  color: string;
  effectType: FireworkEffect['type'];
  pattern: FiringPattern;
}

/** 生成一个波次 */
function createWave(
  time: number,
  position: Position,
  rack: Rack,
  tubeCount: number,
  height: number,
  color: string,
  effectType: FireworkEffect['type'],
  pattern: FiringPattern = 'all'
): Wave {
  // 从炮架中随机选择未使用的炮筒
  const availableTubes = rack.tubes
    .filter((t) => !t.isFired && !t.loaded)
    .map((t) => t.index);

  // 如果可用炮筒不足，重置所有炮筒（模拟换弹）
  let tubeIndices: number[];
  if (availableTubes.length < tubeCount) {
    // 重置所有炮筒
    rack.tubes.forEach((t) => {
      t.isFired = false;
      t.loaded = false;
    });
    tubeIndices = rack.tubes.slice(0, tubeCount).map((t) => t.index);
  } else {
    tubeIndices = availableTubes.slice(0, tubeCount);
  }

  return {
    time: round(time),
    positionId: position.id,
    rackId: rack.id,
    tubeIndices,
    height: safeHeight(height),
    color,
    effectType,
    pattern,
  };
}

// ============================================================================
// 章节生成器
// ============================================================================

/** 开场爆发（0-60秒） */
function generateOpening(positions: Position[]): Wave[] {
  const waves: Wave[] = [];
  const colors = COLOR_THEMES.opening;
  const types = EFFECT_TYPES.opening;

  // 密集快节奏，每1-2秒一波
  for (let t = OPENING_START; t < OPENING_END; t += random(1, 2)) {
    const position = randomChoice(positions);
    const rack = randomChoice(position.racks);
    const tubeCount = randomInt(5, 10);
    const height = random(80, 100);
    const color = randomChoice(colors);
    const effectType = randomChoice(types);

    waves.push(createWave(t, position, rack, tubeCount, height, color, effectType, 'all'));
  }

  return waves;
}

/** 主题章节（60-480秒） */
function generateActs(positions: Position[]): Wave[] {
  const waves: Wave[] = [];
  const types = EFFECT_TYPES.acts;

  // 定义6个主题章节
  const acts = [
    { name: '红色激情', start: 60, end: 130, colors: COLOR_THEMES.red, tempo: 3 },
    { name: '蓝色海洋', start: 130, end: 200, colors: COLOR_THEMES.blue, tempo: 4 },
    { name: '紫色梦幻', start: 200, end: 270, colors: COLOR_THEMES.purple, tempo: 3.5 },
    { name: '绿色生机', start: 270, end: 340, colors: COLOR_THEMES.green, tempo: 3 },
    { name: '橙色温暖', start: 340, end: 410, colors: COLOR_THEMES.orange, tempo: 3.5 },
    { name: '彩虹交响', start: 410, end: 480, colors: [...COLOR_THEMES.red, ...COLOR_THEMES.blue], tempo: 2.5 },
  ];

  acts.forEach((act) => {
    for (let t = act.start; t < act.end; t += random(act.tempo - 0.5, act.tempo + 0.5)) {
      const position = randomChoice(positions);
      const rack = randomChoice(position.racks);
      const tubeCount = randomInt(6, 10);
      const height = random(100, 140);
      const color = randomChoice(act.colors);
      const effectType = randomChoice(types);
      const pattern = randomChoice(['all', 'sequential', 'wave'] as FiringPattern[]);

      waves.push(createWave(t, position, rack, tubeCount, height, color, effectType, pattern));
    }
  });

  return waves;
}

/** 前终曲（480-540秒） */
function generatePreFinale(positions: Position[]): Wave[] {
  const waves: Wave[] = [];
  const types = EFFECT_TYPES.preFinale;

  // 节奏加快，多层级配合
  for (let t = PRE_FINALE_START; t < PRE_FINALE_END; t += random(1.5, 2.5)) {
    // 低空波次
    const lowPosition = randomChoice(positions);
    const lowRack = randomChoice(lowPosition.racks);
    const lowTubeCount = randomInt(7, 10);
    const lowHeight = random(80, 110);
    const lowColor = randomChoice([...COLOR_THEMES.red, ...COLOR_THEMES.orange]);
    const lowType = randomChoice(types);

    waves.push(createWave(t, lowPosition, lowRack, lowTubeCount, lowHeight, lowColor, lowType, 'all'));

    // 高空波次（延迟0.5秒）
    if (Math.random() > 0.3) {
      const highPosition = randomChoice(positions);
      const highRack = randomChoice(highPosition.racks);
      const highTubeCount = randomInt(5, 8);
      const highHeight = random(130, 160);
      const highColor = randomChoice([...COLOR_THEMES.blue, ...COLOR_THEMES.purple]);
      const highType = randomChoice(types);

      waves.push(createWave(t + 0.5, highPosition, highRack, highTubeCount, highHeight, highColor, highType, 'all'));
    }
  }

  return waves;
}

/** 终极高潮（540-600秒） */
function generateFinale(positions: Position[]): Wave[] {
  const waves: Wave[] = [];
  const colors = COLOR_THEMES.finale;
  const types = EFFECT_TYPES.finale;

  // 超密集齐射，每0.5-1秒一波
  for (let t = FINALE_START; t < FINALE_END; t += random(0.5, 1)) {
    // 多个阵地同时发射
    const numPositions = randomInt(2, 4);
    for (let i = 0; i < numPositions; i++) {
      const position = randomChoice(positions);
      const rack = randomChoice(position.racks);
      const tubeCount = randomInt(8, rack.tubeCount); // 尽可能多的炮筒
      const height = random(100, 160);
      const color = randomChoice(colors);
      const effectType = randomChoice(types);

      waves.push(createWave(t, position, rack, tubeCount, height, color, effectType, 'all'));
    }
  }

  // 最后5秒：全场齐射
  for (let t = 595; t < 600; t += 0.3) {
    positions.forEach((position) => {
      position.racks.forEach((rack) => {
        const tubeCount = rack.tubeCount;
        const height = random(120, 160);
        const color = randomChoice(colors);
        const effectType = randomChoice(types);

        waves.push(createWave(t, position, rack, tubeCount, height, color, effectType, 'all'));
      });
    });
  }

  return waves;
}

// ============================================================================
// 波次转换为事件
// ============================================================================

/** 将波次转换为ShowEvent，并装填炮筒 */
function wavesToEvents(waves: Wave[], positions: Position[]): ShowEvent[] {
  const events: ShowEvent[] = [];

  waves.forEach((wave, index) => {
    const position = positions.find((p) => p.id === wave.positionId);
    if (!position) return;

    const rack = position.racks.find((r) => r.id === wave.rackId);
    if (!rack) return;

    // 创建烟花效果
    const effect = createEffect(
      `${wave.effectType}-${wave.color}`,
      wave.effectType,
      wave.color,
      wave.height,
      {
        intensity: wave.effectType === 'burst' ? 1.0 : 0.9,
        particleCount: wave.effectType === 'peony' ? 150 : 120,
        duration: wave.effectType === 'willow' ? 3.5 : 2.5,
      }
    );

    // 装填炮筒
    wave.tubeIndices.forEach((tubeIndex) => {
      const tube = rack.tubes[tubeIndex];
      if (tube) {
        tube.loaded = true;
        tube.effect = effect;
        tube.isFired = false;
      }
    });

    // 创建事件
    const event: ShowEvent = {
      id: nextId('event'),
      name: `Wave ${index + 1}`,
      startTime: wave.time,
      positionId: wave.positionId,
      rackId: wave.rackId,
      tubeIndices: wave.tubeIndices,
      pattern: wave.pattern,
      interval: wave.pattern === 'sequential' ? 100 : undefined,
      track: `track-${position.name}`,
    };

    events.push(event);
  });

  return events;
}

// ============================================================================
// 主生成函数
// ============================================================================

/**
 * 生成史诗级烟花秀
 * @returns 完整的Project对象
 */
export function generateEpicShow(): Project {
  console.log('🎆 开始生成史诗级烟花秀...');

  // 1. 创建阵地布局
  const positions = createPositions();
  console.log(`✅ 创建了 ${positions.length} 个阵地`);

  // 统计炮筒总数
  const totalTubes = positions.reduce(
    (sum, pos) => sum + pos.racks.reduce((rackSum, rack) => rackSum + rack.tubeCount, 0),
    0
  );
  console.log(`✅ 总计 ${totalTubes} 个炮筒`);

  // 2. 生成所有波次
  const openingWaves = generateOpening(positions);
  const actsWaves = generateActs(positions);
  const preFinaleWaves = generatePreFinale(positions);
  const finaleWaves = generateFinale(positions);

  const allWaves = [...openingWaves, ...actsWaves, ...preFinaleWaves, ...finaleWaves];
  console.log(`✅ 生成了 ${allWaves.length} 个波次`);
  console.log(`   - 开场: ${openingWaves.length} 波`);
  console.log(`   - 主题章节: ${actsWaves.length} 波`);
  console.log(`   - 前终曲: ${preFinaleWaves.length} 波`);
  console.log(`   - 终极高潮: ${finaleWaves.length} 波`);

  // 3. 转换为事件
  const events = wavesToEvents(allWaves, positions);
  console.log(`✅ 创建了 ${events.length} 个发射事件`);

  // 4. 创建项目
  const project: Project = {
    id: nextId('project'),
    name: '史诗级烟花秀 - 10分钟交响曲',
    activityName: '盛大庆典',
    activityDetail: '专业编排的10分钟烟花表演，包含开场、主题章节、前终曲和终极高潮',
    positions,
    events,
    duration: SHOW_DURATION,
    createdAt: new Date(),
    updatedAt: new Date(),
    groundHeight: 0,
  };

  console.log('🎆 烟花秀生成完成！');
  return project;
}
