/**
 * Stage Manager - 标准专业舞台管理
 *
 * 定义结构化的专业舞台布局，替代之前杂乱的 500 个炮筒
 */

import {
  Project,
  Position,
} from '../types/domain';

import {
  createPosition,
  createFanRack,
  createStraightRack,
  createMatrixRack,
} from '../store/projectStore';

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

/**
 * 创建标准专业舞台 (Standard Pro Stage)
 *
 * 布局结构：
 * - 前沿阵地 (Front): 5 个扇形架，X轴排列，用于"排浪"效果
 * - 中央阵地 (Mid): 3 个直排架，用于"节奏点"
 * - 后方阵地 (Rear): 2 个大型矩阵，用于"高空覆盖"
 *
 * 总计：约 200-300 个炮筒，布局合理
 */
export function createStandardProStage(): Position[] {
  const positions: Position[] = [];

  // ========== 前沿阵地 (Front): 5 个扇形架 ==========
  // 布局：X轴均匀分布，从左到右
  // 用途：排浪、展翅、对称等动态效果
  const frontCount = 5;
  const frontSpacing = 20; // 阵地间距
  const frontZ = 15; // Z轴位置（前方）

  for (let i = 0; i < frontCount; i++) {
    const x = (i - (frontCount - 1) / 2) * frontSpacing;
    const name = `前沿-${i + 1}`;

    positions.push(
      createPosition(name, x, frontZ, [
        createFanRack(`扇形架-${i + 1}`, 20, -45, 45, 85),
      ])
    );
  }

  // ========== 中央阵地 (Mid): 3 个直排架 ==========
  // 布局：X轴中心分布
  // 用途：节奏点、强调、对称中心
  const midCount = 3;
  const midSpacing = 15;
  const midZ = 0; // Z轴位置（中央）

  for (let i = 0; i < midCount; i++) {
    const x = (i - (midCount - 1) / 2) * midSpacing;
    const name = `中央-${i + 1}`;

    positions.push(
      createPosition(name, x, midZ, [
        createStraightRack(`直排架-${i + 1}`, 25, 90),
      ])
    );
  }

  // ========== 后方阵地 (Rear): 2 个大型矩阵 ==========
  // 布局：左右对称
  // 用途：高空覆盖、密集爆发、终场齐射
  const rearZ = -20; // Z轴位置（后方）

  positions.push(
    createPosition('后方-左', -25, rearZ, [
      createMatrixRack('矩阵-左', 10, 10, 0.8, 90),
    ]),
    createPosition('后方-右', 25, rearZ, [
      createMatrixRack('矩阵-右', 10, 10, 0.8, 90),
    ])
  );

  return positions;
}

/**
 * 创建标准专业舞台项目
 */
export function createStandardProStageProject(): Project {
  const positions = createStandardProStage();

  // 统计炮筒总数
  const totalTubes = positions.reduce(
    (sum, pos) => sum + pos.racks.reduce((rackSum, rack) => rackSum + rack.tubeCount, 0),
    0
  );

  console.log(`✅ 创建标准专业舞台：${positions.length} 个阵地，共 ${totalTubes} 个炮筒`);

  return {
    id: nextId('project'),
    name: '标准专业舞台',
    activityName: 'Standard Pro Stage',
    activityDetail:
      '结构化的专业舞台布局。前沿阵地 (5个扇形架) 用于排浪效果；中央阵地 (3个直排架) 用于节奏点；后方阵地 (2个矩阵) 用于高空覆盖。总计约 200-300 个炮筒，布局合理，适合各种主题的烟花秀编排。',
    positions,
    events: [],
    cues: [],
    duration: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    groundHeight: 0,
    mapBounds: {
      minX: -60,
      maxX: 60,
      minZ: -30,
      maxZ: 30,
    },
  };
}
