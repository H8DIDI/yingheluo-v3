/**
 * Command Interpreter
 *
 * Translates high-level AI commands into detailed timeline events.
 * This keeps complex logic in the frontend and lets AI focus on high-level intent.
 */

import {
  AdvancedCommand,
  SalvoCommand,
  WaveCommand,
  SymmetryCommand,
  CascadeCommand,
  BurstCommand,
  SweepCommand,
  FinaleCommand,
} from '../types/advancedCommands';
import { ShowEvent, Position, FireworkEffect } from '../types/domain';

interface InterpreterContext {
  positions: Position[];
  effects: FireworkEffect[];
  duration: number;
}

interface InterpreterResult {
  events: ShowEvent[];
  warnings: string[];
}

/**
 * 炮筒使用追踪器
 * 用于确保每个炮筒只被使用一次
 */
class TubeUsageTracker {
  private usedTubes: Set<string>;

  constructor() {
    this.usedTubes = new Set();
  }

  /**
   * 标记炮筒为已使用
   */
  markUsed(positionId: string, rackId: string, tubeIndex: number): void {
    const key = `${positionId}-${rackId}-${tubeIndex}`;
    this.usedTubes.add(key);
  }

  /**
   * 检查炮筒是否已使用
   */
  isUsed(positionId: string, rackId: string, tubeIndex: number): boolean {
    const key = `${positionId}-${rackId}-${tubeIndex}`;
    return this.usedTubes.has(key);
  }

  /**
   * 获取阵地中未使用的炮筒
   */
  getAvailableTubes(positionId: string, rackId: string, totalTubes: number): number[] {
    const available: number[] = [];
    for (let i = 0; i < totalTubes; i++) {
      if (!this.isUsed(positionId, rackId, i)) {
        available.push(i);
      }
    }
    return available;
  }

  /**
   * 获取统计信息
   */
  getStats(): { used: number; total: number } {
    return {
      used: this.usedTubes.size,
      total: this.usedTubes.size, // 这里只是已使用的数量
    };
  }
}

/**
 * Main interpreter function with Auto-Sequencer
 *
 * 🔥 关键修复：实施"自动排队"机制 + 炮筒使用追踪
 * - 忽略 AI 返回的绝对时间
 * - 使用时间游标 (cursor) 强制指令依次执行
 * - 追踪炮筒使用状态，确保每个炮筒只使用一次
 * - 确保指令不重叠，时长 = 所有指令时长之和
 */
export function interpretCommands(
  commands: AdvancedCommand[],
  context: InterpreterContext
): InterpreterResult {
  const events: ShowEvent[] = [];
  const warnings: string[] = [];

  // 🔥 自动排队：时间游标，初始为 0
  let currentTime = 0;

  // 🔥 炮筒使用追踪器
  const tubeTracker = new TubeUsageTracker();

  console.log(`\n🎬 开始解析 ${commands.length} 条高级指令（自动排队模式 + 炮筒追踪）`);

  commands.forEach((command, index) => {
    try {
      // 🔥 强制覆盖 AI 返回的时间，使用当前游标时间
      const originalTime = command.time;
      command.time = currentTime;

      console.log(`\n📍 指令 ${index + 1}/${commands.length}: ${command.type}`);
      console.log(`   原始时间: ${originalTime.toFixed(2)}s → 强制时间: ${currentTime.toFixed(2)}s`);

      // 🔥 传递炮筒追踪器到指令解释函数
      const commandEvents = interpretCommand(command, context, tubeTracker);
      events.push(...commandEvents);

      // 🔥 计算这条指令的实际持续时间
      let commandDuration = 0;

      if (commandEvents.length > 0) {
        // 找到最晚的事件结束时间
        const lastEventTime = Math.max(...commandEvents.map(e => e.startTime));
        commandDuration = lastEventTime - currentTime;

        // 如果指令有 duration 字段，使用它作为最小持续时间
        if ('duration' in command && typeof command.duration === 'number') {
          commandDuration = Math.max(commandDuration, command.duration);
        }
      } else {
        // 如果没有生成事件，使用默认持续时间
        commandDuration = ('duration' in command && typeof command.duration === 'number')
          ? command.duration
          : 2;
      }

      // 🔥 添加 0.5 秒的间隔，让指令之间有呼吸感
      const gap = 0.5;
      currentTime += commandDuration + gap;

      console.log(`   持续时间: ${commandDuration.toFixed(2)}s, 下一指令开始于: ${currentTime.toFixed(2)}s`);

    } catch (error) {
      warnings.push(
        `指令 ${index + 1} (${command.type}) 解析失败: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error(`❌ 指令 ${index + 1} 解析失败:`, error);

      // 即使失败，也要移动游标，避免后续指令堆积
      currentTime += 2;
    }
  });

  const stats = tubeTracker.getStats();
  console.log(`\n✅ 解析完成: ${events.length} 个事件, 总时长: ${currentTime.toFixed(2)}s, 已使用炮筒: ${stats.used}\n`);

  return { events, warnings };
}

/**
 * Interpret a single command
 */
function interpretCommand(
  command: AdvancedCommand,
  context: InterpreterContext,
  tubeTracker: TubeUsageTracker
): ShowEvent[] {
  switch (command.type) {
    case 'salvo':
      return interpretSalvo(command, context, tubeTracker);
    case 'wave':
      return interpretWave(command, context, tubeTracker);
    case 'symmetry':
      return interpretSymmetry(command, context);
    case 'cascade':
      return interpretCascade(command, context);
    case 'burst':
      return interpretBurst(command, context);
    case 'sweep':
      return interpretSweep(command, context);
    case 'finale':
      return interpretFinale(command, context);
    default:
      throw new Error(`未知指令类型: ${(command as any).type}`);
  }
}

/**
 * Interpret Salvo Command - 齐射
 */
function interpretSalvo(command: SalvoCommand, context: InterpreterContext, tubeTracker: TubeUsageTracker): ShowEvent[] {
  const { positions } = context;
  const position = findPosition(command.positionName || command.positionId, positions);

  if (!position) {
    throw new Error(`未找到阵地: ${command.positionName || command.positionId}`);
  }

  const rack = command.rackName
    ? position.racks.find((r) => r.name === command.rackName)
    : position.racks[0];

  if (!rack) {
    throw new Error(`未找到炮架: ${command.rackName}`);
  }

  // 🔥 使用未使用的炮筒
  const availableTubes = tubeTracker.getAvailableTubes(position.id, rack.id, rack.tubeCount);
  const tubesToUse = command.tubes.filter(t => availableTubes.includes(t));

  if (tubesToUse.length === 0) {
    console.warn(`⚠️  Salvo: 阵地 ${position.name} 没有可用炮筒`);
    return [];
  }

  // 标记炮筒为已使用
  tubesToUse.forEach(t => tubeTracker.markUsed(position.id, rack.id, t));

  return [
    {
      id: `salvo-${Date.now()}-${Math.random()}`,
      name: command.description || `齐射 ${command.shell}`,
      startTime: command.time,
      positionId: position.id,
      rackId: rack.id,
      tubeIndices: tubesToUse,
      pattern: 'all',
      effectName: command.shell,
      effectHeight: command.height,
      track: `${position.id}-${rack.id}`,
    },
  ];
}

/**
 * Interpret Wave Command - 排浪
 */
function interpretWave(command: WaveCommand, context: InterpreterContext, tubeTracker: TubeUsageTracker): ShowEvent[] {
  const { positions } = context;
  const events: ShowEvent[] = [];

  // Get positions for the group
  const groupPositions =
    command.group === 'all'
      ? positions
      : positions.filter((p) =>
          p.name.toLowerCase().includes(command.group.toLowerCase())
        );

  if (groupPositions.length === 0) {
    throw new Error(`未找到组: ${command.group}`);
  }

  // Calculate firing sequence based on pattern
  const sequence = calculateWaveSequence(
    groupPositions,
    command.pattern,
    command.startPosition,
    command.endPosition
  );

  // 🔥 关键修复：Wave 指令应该逐个阵地发射
  // interval 是阵地之间的间隔，不是炮筒之间的间隔
  const interval = command.interval || (command.duration * 1000) / Math.max(sequence.length, 1);

  console.log(`🎆 Wave 指令解析:`, {
    commandTime: command.time,
    duration: command.duration,
    sequenceLength: sequence.length,
    calculatedInterval: interval,
    pattern: command.pattern,
  });

  sequence.forEach((item, index) => {
    const position = item.position;
    const rack = position.racks[0]; // Use first rack

    if (!rack) return;

    const eventStartTime = command.time + (index * interval) / 1000;

    // 🔥 修复：获取未使用的炮筒
    const availableTubes = tubeTracker.getAvailableTubes(position.id, rack.id, rack.tubeCount);

    if (availableTubes.length === 0) {
      console.warn(`⚠️  Wave: 阵地 ${position.name} 没有可用炮筒，跳过`);
      return;
    }

    // 🔥 修复：不再分批发射，每个阵地使用一定数量的未使用炮筒
    // 每个阵地使用 3-5 个炮筒
    const tubesPerPosition = Math.min(5, availableTubes.length);
    const tubesToUse = availableTubes.slice(0, tubesPerPosition);

    // 标记炮筒为已使用
    tubesToUse.forEach(t => tubeTracker.markUsed(position.id, rack.id, t));

    console.log(`  - Event ${index + 1}/${sequence.length}: startTime=${eventStartTime.toFixed(3)}s, position=${position.name}, tubes=${tubesToUse.length}/${availableTubes.length} available`);

    events.push({
      id: `wave-${Date.now()}-${index}`,
      name: command.description || `排浪 ${index + 1}`,
      startTime: eventStartTime,
      positionId: position.id,
      rackId: rack.id,
      tubeIndices: tubesToUse,
      pattern: 'all',
      interval: 0,
      effectName: command.shell,
      effectHeight: command.height,
      track: `${position.id}-${rack.id}`,
    });
  });

  console.log(`✅ Wave 指令生成了 ${events.length} 个事件，时间范围: ${events[0]?.startTime.toFixed(3)}s - ${events[events.length - 1]?.startTime.toFixed(3)}s`);

  return events;
}

/**
 * Calculate wave sequence based on pattern
 */
function calculateWaveSequence(
  positions: Position[],
  pattern: WaveCommand['pattern'],
  startIdx?: number,
  endIdx?: number
): Array<{ position: Position; tubes: number[] }> {
  const start = startIdx ?? 0;
  const end = endIdx ?? positions.length - 1;
  const subset = positions.slice(start, end + 1);

  console.log(`🔍 calculateWaveSequence: pattern=${pattern}, positions=${subset.length}`);

  switch (pattern) {
    case 'open_wings': {
      // 🔥 修复：从中心向两边展开，但不重复添加阵地
      // 正确的逻辑：先添加中心，然后交替添加左右两边
      const result: Array<{ position: Position; tubes: number[] }> = [];
      const mid = Math.floor(subset.length / 2);

      // 先添加中心阵地
      if (subset.length > 0) {
        const centerPos = subset[mid];
        result.push({
          position: centerPos,
          tubes: Array.from({ length: centerPos.racks[0]?.tubeCount || 1 }, (_, j) => j),
        });
      }

      // 然后交替添加左右两边
      for (let i = 1; i <= mid; i++) {
        // Add left
        if (mid - i >= 0) {
          const pos = subset[mid - i];
          result.push({
            position: pos,
            tubes: Array.from({ length: pos.racks[0]?.tubeCount || 1 }, (_, j) => j),
          });
        }
        // Add right
        if (mid + i < subset.length) {
          const pos = subset[mid + i];
          result.push({
            position: pos,
            tubes: Array.from({ length: pos.racks[0]?.tubeCount || 1 }, (_, j) => j),
          });
        }
      }

      console.log(`  ✅ open_wings: ${subset.length} positions → ${result.length} sequence items`);
      return result;
    }

    case 'close_in': {
      // 🔥 修复：从两边向中心合拢，但不重复添加阵地
      const result: Array<{ position: Position; tubes: number[] }> = [];
      const mid = Math.floor(subset.length / 2);

      // 交替添加左右两边
      for (let i = 0; i < mid; i++) {
        // Add from left
        const leftPos = subset[i];
        result.push({
          position: leftPos,
          tubes: Array.from({ length: leftPos.racks[0]?.tubeCount || 1 }, (_, j) => j),
        });

        // Add from right
        const rightPos = subset[subset.length - 1 - i];
        result.push({
          position: rightPos,
          tubes: Array.from({ length: rightPos.racks[0]?.tubeCount || 1 }, (_, j) => j),
        });
      }

      // 如果是奇数个阵地，添加中心阵地
      if (subset.length % 2 === 1) {
        const centerPos = subset[mid];
        result.push({
          position: centerPos,
          tubes: Array.from({ length: centerPos.racks[0]?.tubeCount || 1 }, (_, j) => j),
        });
      }

      console.log(`  ✅ close_in: ${subset.length} positions → ${result.length} sequence items`);
      return result;
    }

    case 'left_to_right': {
      const result = subset.map((pos) => ({
        position: pos,
        tubes: Array.from({ length: pos.racks[0]?.tubeCount || 1 }, (_, j) => j),
      }));
      console.log(`  ✅ left_to_right: ${subset.length} positions → ${result.length} sequence items`);
      return result;
    }

    case 'right_to_left': {
      const result = subset
        .slice()
        .reverse()
        .map((pos) => ({
          position: pos,
          tubes: Array.from({ length: pos.racks[0]?.tubeCount || 1 }, (_, j) => j),
        }));
      console.log(`  ✅ right_to_left: ${subset.length} positions → ${result.length} sequence items`);
      return result;
    }

    case 'center_out': {
      // Same as open_wings
      return calculateWaveSequence(positions, 'open_wings', startIdx, endIdx);
    }

    case 'edges_in': {
      // Same as close_in
      return calculateWaveSequence(positions, 'close_in', startIdx, endIdx);
    }

    default:
      const result = subset.map((pos) => ({
        position: pos,
        tubes: Array.from({ length: pos.racks[0]?.tubeCount || 1 }, (_, j) => j),
      }));
      console.log(`  ✅ default: ${subset.length} positions → ${result.length} sequence items`);
      return result;
  }
}

/**
 * Interpret Symmetry Command - 对称
 */
function interpretSymmetry(
  command: SymmetryCommand,
  context: InterpreterContext
): ShowEvent[] {
  const { positions } = context;
  const events: ShowEvent[] = [];

  // 处理 "all" 关键字
  let targetPositions: Position[];
  if (command.positions.length === 1 && command.positions[0].toLowerCase() === 'all') {
    // 使用所有阵地
    targetPositions = positions;
  } else {
    // 根据名称查找阵地
    targetPositions = command.positions
      .map((name) => findPosition(name, positions))
      .filter((p): p is Position => p !== null);
  }

  if (targetPositions.length === 0) {
    throw new Error('未找到对称阵地');
  }

  // Create symmetric pairs
  const pairs = createSymmetricPairs(targetPositions, command.axis);

  pairs.forEach((pair, pairIndex) => {
    pair.forEach((position, posIndex) => {
      const rack = position.racks[0];
      if (!rack) return;

      const delay = (command.delay || 0) * posIndex;

      events.push({
        id: `symmetry-${Date.now()}-${pairIndex}-${posIndex}`,
        name: command.description || `对称 ${pairIndex + 1}`,
        startTime: command.time + delay / 1000,
        positionId: position.id,
        rackId: rack.id,
        tubeIndices: [],
        pattern: 'all',
        effectName: command.shell,
        effectHeight: command.height,
        track: `${position.id}-${rack.id}`,
      });
    });
  });

  return events;
}

/**
 * Create symmetric pairs based on axis
 */
function createSymmetricPairs(
  positions: Position[],
  axis: 'center' | 'vertical' | 'horizontal'
): Position[][] {
  if (axis === 'center' || axis === 'vertical') {
    // Mirror across vertical center axis
    const sorted = positions.slice().sort((a, b) => a.coordinate.x - b.coordinate.x);
    const pairs: Position[][] = [];
    const mid = Math.floor(sorted.length / 2);

    for (let i = 0; i < mid; i++) {
      pairs.push([sorted[i], sorted[sorted.length - 1 - i]]);
    }

    // Add center position if odd number
    if (sorted.length % 2 === 1) {
      pairs.push([sorted[mid]]);
    }

    return pairs;
  } else {
    // Mirror across horizontal axis
    const sorted = positions.slice().sort((a, b) => a.coordinate.z - b.coordinate.z);
    const pairs: Position[][] = [];
    const mid = Math.floor(sorted.length / 2);

    for (let i = 0; i < mid; i++) {
      pairs.push([sorted[i], sorted[sorted.length - 1 - i]]);
    }

    if (sorted.length % 2 === 1) {
      pairs.push([sorted[mid]]);
    }

    return pairs;
  }
}

/**
 * Interpret Cascade Command - 级联
 */
function interpretCascade(
  command: CascadeCommand,
  context: InterpreterContext
): ShowEvent[] {
  const { positions } = context;
  const events: ShowEvent[] = [];

  // 处理 "all" 关键字
  let targetPositions: Position[];
  if (command.positions.length === 1 && command.positions[0].toLowerCase() === 'all') {
    // 使用所有阵地
    targetPositions = positions;
  } else {
    // 根据名称查找阵地
    targetPositions = command.positions
      .map((name) => findPosition(name, positions))
      .filter((p): p is Position => p !== null);
  }

  if (targetPositions.length === 0) {
    throw new Error('未找到级联阵地');
  }

  targetPositions.forEach((position, index) => {
    const rack = position.racks[0];
    if (!rack) return;

    events.push({
      id: `cascade-${Date.now()}-${index}`,
      name: command.description || `级联 ${index + 1}`,
      startTime: command.time + (index * command.interval) / 1000,
      positionId: position.id,
      rackId: rack.id,
      tubeIndices: [],
      pattern: command.pattern || 'all',
      effectName: command.shell,
      effectHeight: command.height,
      track: `${position.id}-${rack.id}`,
    });
  });

  return events;
}

/**
 * Interpret Burst Command - 爆发
 */
function interpretBurst(command: BurstCommand, context: InterpreterContext): ShowEvent[] {
  const { positions } = context;
  const events: ShowEvent[] = [];

  const groupPositions =
    command.group === 'all'
      ? positions
      : positions.filter((p) =>
          p.name.toLowerCase().includes(command.group.toLowerCase())
        );

  if (groupPositions.length === 0) {
    throw new Error(`未找到组: ${command.group}`);
  }

  // Collect all available tubes
  const allTubes: Array<{ position: Position; rack: any; tubeIndex: number }> = [];
  groupPositions.forEach((position) => {
    position.racks.forEach((rack) => {
      for (let i = 0; i < rack.tubeCount; i++) {
        allTubes.push({ position, rack, tubeIndex: i });
      }
    });
  });

  // Select tubes (random or sequential)
  const selectedTubes = command.random
    ? shuffleArray(allTubes).slice(0, command.count)
    : allTubes.slice(0, command.count);

  selectedTubes.forEach((tube, index) => {
    events.push({
      id: `burst-${Date.now()}-${index}`,
      name: command.description || `爆发 ${index + 1}`,
      startTime: command.time + (index * command.interval) / 1000,
      positionId: tube.position.id,
      rackId: tube.rack.id,
      tubeIndices: [tube.tubeIndex],
      pattern: 'all',
      effectName: command.shell,
      effectHeight: command.height,
      track: `${tube.position.id}-${tube.rack.id}`,
    });
  });

  return events;
}

/**
 * Interpret Sweep Command - 扫射
 */
function interpretSweep(command: SweepCommand, context: InterpreterContext): ShowEvent[] {
  const { positions } = context;
  const position = findPosition(command.positionName || command.positionId, positions);

  if (!position) {
    throw new Error(`未找到阵地: ${command.positionName || command.positionId}`);
  }

  // Find fan rack
  const fanRack = position.racks.find((r) => r.type === 'fan');
  if (!fanRack) {
    throw new Error('扫射指令需要扇形炮架');
  }

  const events: ShowEvent[] = [];
  const tubeCount = fanRack.tubeCount;
  const interval = (command.duration * 1000) / tubeCount;

  for (let i = 0; i < tubeCount; i++) {
    events.push({
      id: `sweep-${Date.now()}-${i}`,
      name: command.description || `扫射 ${i + 1}`,
      startTime: command.time + (i * interval) / 1000,
      positionId: position.id,
      rackId: fanRack.id,
      tubeIndices: [i],
      pattern: 'all',
      effectName: command.shell,
      effectHeight: command.height,
      track: `${position.id}-${fanRack.id}`,
    });
  }

  return events;
}

/**
 * Interpret Finale Command - 终场
 */
function interpretFinale(command: FinaleCommand, context: InterpreterContext): ShowEvent[] {
  const { positions } = context;
  const events: ShowEvent[] = [];

  const waves = command.waves || 3;
  const waveInterval = command.waveInterval || 500;

  for (let wave = 0; wave < waves; wave++) {
    positions.forEach((position, posIndex) => {
      position.racks.forEach((rack) => {
        events.push({
          id: `finale-${Date.now()}-${wave}-${posIndex}`,
          name: command.description || `终场 Wave ${wave + 1}`,
          startTime: command.time + (wave * waveInterval) / 1000,
          positionId: position.id,
          rackId: rack.id,
          tubeIndices: [],
          pattern: 'all',
          effectName: command.shell,
          effectHeight: command.height,
          track: `${position.id}-${rack.id}`,
        });
      });
    });
  }

  return events;
}

/**
 * Helper: Find position by name or ID
 */
function findPosition(nameOrId: string | undefined, positions: Position[]): Position | null {
  if (!nameOrId) return positions[0] || null;

  return (
    positions.find((p) => p.id === nameOrId || p.name === nameOrId) ||
    positions.find((p) =>
      p.name.toLowerCase().includes(nameOrId.toLowerCase())
    ) ||
    null
  );
}

/**
 * Helper: Shuffle array
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
