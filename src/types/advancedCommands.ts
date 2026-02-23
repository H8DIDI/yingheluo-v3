/**
 * Advanced Command Schema for AI Assistant
 *
 * This file defines high-level commands that the AI can output,
 * which will be interpreted by the frontend into detailed timeline events.
 */

import { FiringPattern } from './domain';

/**
 * Base command interface
 */
export interface BaseCommand {
  type: string;
  time: number;
  description?: string;
}

/**
 * Salvo Command - 齐射
 * All tubes fire simultaneously
 */
export interface SalvoCommand extends BaseCommand {
  type: 'salvo';
  positionId?: string;
  positionName?: string;
  rackId?: string;
  rackName?: string;
  tubes: number[];  // Tube indices
  shell: string;    // Shell/effect name
  height?: number;  // Target height
}

/**
 * Wave Command - 排浪
 * Sequential firing with symmetry patterns
 */
export interface WaveCommand extends BaseCommand {
  type: 'wave';
  pattern: 'open_wings' | 'close_in' | 'left_to_right' | 'right_to_left' | 'center_out' | 'edges_in';
  group: string;    // Group identifier (e.g., 'group_a', 'all')
  duration: number; // Total duration of the wave in seconds
  interval?: number; // Interval between each tube firing (ms)
  shell: string;    // Shell/effect name
  height?: number;  // Target height
  startPosition?: number; // Starting position index
  endPosition?: number;   // Ending position index
}

/**
 * Symmetry Command - 对称
 * Mirror firing across an axis
 */
export interface SymmetryCommand extends BaseCommand {
  type: 'symmetry';
  axis: 'center' | 'vertical' | 'horizontal';
  positions: string[]; // Position IDs or names
  shell: string;
  height?: number;
  delay?: number; // Delay between symmetric pairs (ms)
}

/**
 * Cascade Command - 级联
 * Progressive firing across multiple positions
 */
export interface CascadeCommand extends BaseCommand {
  type: 'cascade';
  positions: string[]; // Position IDs or names in order
  shell: string;
  interval: number; // Interval between positions (ms)
  height?: number;
  pattern?: FiringPattern; // Pattern for each position
}

/**
 * Burst Command - 爆发
 * High-density rapid firing
 */
export interface BurstCommand extends BaseCommand {
  type: 'burst';
  group: string;
  shell: string;
  count: number;    // Number of tubes to fire
  interval: number; // Interval between fires (ms)
  height?: number;
  random?: boolean; // Random tube selection
}

/**
 * Sweep Command - 扫射
 * Fan-like sweeping pattern
 */
export interface SweepCommand extends BaseCommand {
  type: 'sweep';
  positionId?: string;
  positionName?: string;
  startAngle: number;
  endAngle: number;
  duration: number;
  shell: string;
  height?: number;
}

/**
 * Finale Command - 终场
 * Grand finale with all positions
 */
export interface FinaleCommand extends BaseCommand {
  type: 'finale';
  shell: string;
  height?: number;
  waves?: number; // Number of waves
  waveInterval?: number; // Interval between waves (ms)
}

/**
 * Union type of all advanced commands
 */
export type AdvancedCommand =
  | SalvoCommand
  | WaveCommand
  | SymmetryCommand
  | CascadeCommand
  | BurstCommand
  | SweepCommand
  | FinaleCommand;

/**
 * AI Response with advanced commands
 */
export interface AdvancedPlan {
  version?: 'advanced-v1';
  title?: string;
  description?: string;  // AI's artistic explanation
  duration?: number;
  theme?: string;
  notes?: string[];
  commands?: AdvancedCommand[];
  directives?: AdvancedCommand[];  // Alternative name for commands
  assistantMessage?: string;
}

/**
 * Context information for AI
 */
export interface AIContext {
  positions: Array<{
    id: string;
    name: string;
    rackCount: number;
    totalTubes: number;
    rackTypes: string[];
  }>;
  groups: Array<{
    id: string;
    name: string;
    positions: string[];
    totalTubes: number;
  }>;
  effects: Array<{
    id: string;
    name: string;
    type: string;
    color: string;
    height: number;
  }>;
  constraints: {
    duration: number;
    minEvents: number;
    patterns: string[];
  };
}
