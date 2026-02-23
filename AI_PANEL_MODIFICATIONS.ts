/**
 * Key Modifications for AIAssistantPanel.tsx
 *
 * This file shows the exact code changes needed.
 * Apply these changes to the existing AIAssistantPanel.tsx file.
 */

// ============================================================================
// 1. ADD THESE IMPORTS (after line 25)
// ============================================================================

import { AdvancedPlan } from '../../types/advancedCommands';
import { interpretCommands } from '../../services/commandInterpreter';
import {
  ADVANCED_TIMELINE_RULES,
  ADVANCED_CHAT_RULES,
  buildAdvancedContext,
} from '../../services/advancedPrompts';

// ============================================================================
// 2. REPLACE THESE CONSTANTS (lines 198-236)
// ============================================================================

// Replace:
// const CHAT_SYSTEM_RULES = [...].join('\n');
// const TIMELINE_SYSTEM_RULES = [...].join('\n');

// With:
const CHAT_SYSTEM_RULES = ADVANCED_CHAT_RULES;
const TIMELINE_SYSTEM_RULES = ADVANCED_TIMELINE_RULES;

// ============================================================================
// 3. ADD THIS HELPER FUNCTION (after line 1218, after parseAiPayload)
// ============================================================================

function isAdvancedPlan(data: any): data is AdvancedPlan {
  return (
    data &&
    typeof data === 'object' &&
    data.version === 'advanced-v1' &&
    Array.isArray(data.commands)
  );
}

// ============================================================================
// 4. MODIFY sendToAi FUNCTION - Context Building (around line 2469)
// ============================================================================

// Find this code:
// const promptLines = [
//   `主题: ${planText}`,
//   patternHint ? `图案倾向: ${patternHint}` : '图案未指定，请结合语义判断。',
//   textFallback ? `文字内容参考: ${textFallback}` : '',
//   `参考上下文(JSON): ${JSON.stringify(profile)}`,
// ].filter(Boolean);

// Replace with:
const advancedContext = buildAdvancedContext({
  positions: activeProject.positions.map((pos) => ({
    id: pos.id,
    name: pos.name,
    racks: pos.racks.map((rack) => ({
      id: rack.id,
      name: rack.name,
      type: rack.type,
      tubeCount: rack.tubeCount,
    })),
  })),
  effects: effects.slice(0, 20).map((eff) => ({
    id: eff.id,
    name: eff.name,
    type: eff.type,
    color: eff.color,
    height: eff.height,
  })),
  duration: SHOW_DURATION,
});

const promptLines = [
  `主题: ${planText}`,
  patternHint ? `图案倾向: ${patternHint}` : '',
  textFallback ? `文字内容参考: ${textFallback}` : '',
  advancedContext,
].filter(Boolean);

// ============================================================================
// 5. MODIFY sendToAi FUNCTION - Response Handling (around line 2505)
// ============================================================================

// Find this code (after parseAiPayload):
// const { data, error } = parseAiPayload(responseText);
// if (!data) {
//   const snippet = formatSnippet(responseText);
//   const detail = error || 'AI 返回无法解析 JSON';
//   throw new Error(snippet ? `${detail} | 响应片段: ${snippet}` : detail);
// }
// aiTimeline = data as AiTimelinePlan;
// assistantMessage = extractAssistantMessageFromPayload(data) ?? '';

// Replace with:
const { data, error } = parseAiPayload(responseText);
if (!data) {
  const snippet = formatSnippet(responseText);
  const detail = error || 'AI 返回无法解析 JSON';
  throw new Error(snippet ? `${detail} | 响应片段: ${snippet}` : detail);
}

// Check if it's an advanced plan
if (isAdvancedPlan(data)) {
  const advancedPlan = data as AdvancedPlan;
  assistantMessage = advancedPlan.assistantMessage || '';

  // Interpret commands into events
  const interpreterContext = {
    positions: activeProject.positions,
    effects,
    duration: SHOW_DURATION,
  };

  const { events: interpretedEvents, warnings: interpreterWarnings } = interpretCommands(
    advancedPlan.commands,
    interpreterContext
  );

  conversionWarnings.push(...interpreterWarnings);
  conversionWarnings.push(
    `✨ 使用高级指令系统：${advancedPlan.commands.length} 条宏指令 → ${interpretedEvents.length} 条时间轴事件`
  );

  // Convert to FireworkPlan format
  generatedPlan = {
    version: 'v2',
    title: advancedPlan.title || planText,
    duration: advancedPlan.duration || SHOW_DURATION,
    layoutMode: 'free',
    notes: [
      ...(advancedPlan.notes || []),
      `高级指令: ${advancedPlan.commands.map(c => c.type).join(', ')}`,
    ],
    positions: [], // Will be filled from existing project
    events: interpretedEvents.map((event) => ({
      name: event.name,
      startTime: event.startTime,
      positionId: event.positionId,
      positionName: undefined,
      positionIndex: undefined,
      rackId: event.rackId,
      rackName: undefined,
      rackIndex: undefined,
      pattern: event.pattern,
      interval: event.interval,
      tubeIndices: event.tubeIndices,
      track: event.track,
    })),
  };
} else {
  // Handle old format
  aiTimeline = data as AiTimelinePlan;
  assistantMessage = extractAssistantMessageFromPayload(data) ?? '';
}

// ============================================================================
// DONE!
// ============================================================================

/**
 * After applying these changes:
 *
 * 1. The AI will receive rich context about positions, racks, and effects
 * 2. The AI can output high-level commands like "wave", "symmetry", "cascade"
 * 3. The interpreter will translate these into detailed timeline events
 * 4. Users will see which commands were used in the warnings/notes
 *
 * Example AI output:
 * {
 *   "version": "advanced-v1",
 *   "title": "国庆盛典",
 *   "commands": [
 *     { "type": "wave", "pattern": "open_wings", "group": "all", ... },
 *     { "type": "symmetry", "axis": "center", ... },
 *     { "type": "finale", ... }
 *   ]
 * }
 *
 * This gets interpreted into hundreds of precise firing events automatically!
 */
