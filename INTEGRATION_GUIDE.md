/**
 * Integration Guide for Advanced Commands in AIAssistantPanel
 *
 * This file documents the changes needed to integrate the advanced command system.
 */

// ============================================================================
// STEP 1: Add imports at the top of AIAssistantPanel.tsx (after line 25)
// ============================================================================

import { AdvancedPlan, AdvancedCommand } from '../../types/advancedCommands';
import { interpretCommands } from '../../services/commandInterpreter';
import {
  ADVANCED_TIMELINE_RULES,
  ADVANCED_CHAT_RULES,
  buildAdvancedContext,
} from '../../services/advancedPrompts';

// ============================================================================
// STEP 2: Replace CHAT_SYSTEM_RULES and TIMELINE_SYSTEM_RULES constants
// (around lines 198-236)
// ============================================================================

// OLD:
// const CHAT_SYSTEM_RULES = [
//   MASTER_PERSONA,
//   '你与用户自由对话...',
// ].join('\n');
//
// const TIMELINE_SYSTEM_RULES = [
//   MASTER_PERSONA,
//   '你必须以"起承转合"的结构思考...',
// ].join('\n');

// NEW:
const CHAT_SYSTEM_RULES = ADVANCED_CHAT_RULES;
const TIMELINE_SYSTEM_RULES = ADVANCED_TIMELINE_RULES;

// ============================================================================
// STEP 3: Add function to detect advanced plan format
// (add after parseAiPayload function, around line 1218)
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
// STEP 4: Modify the sendToAi function to handle advanced plans
// (in the sendToAi function, around line 2468-2576)
// ============================================================================

// After parsing AI response (around line 2505), add this check:

const { data, error } = parseAiPayload(responseText);
if (!data) {
  const snippet = formatSnippet(responseText);
  const detail = error || 'AI 返回无法解析 JSON';
  throw new Error(snippet ? `${detail} | 响应片段: ${snippet}` : detail);
}

// NEW: Check if it's an advanced plan
if (isAdvancedPlan(data)) {
  // Handle advanced plan
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

  // Convert to FireworkPlan format
  generatedPlan = {
    version: 'v2',
    title: advancedPlan.title || planText,
    duration: advancedPlan.duration || SHOW_DURATION,
    layoutMode: 'free',
    notes: advancedPlan.notes || [],
    positions: [], // Will be filled from existing project
    events: interpretedEvents.map((event, index) => ({
      name: event.name,
      startTime: event.startTime,
      positionId: event.positionId,
      rackId: event.rackId,
      pattern: event.pattern,
      interval: event.interval,
      tubeIndices: event.tubeIndices,
      track: event.track,
    })),
  };

  conversionWarnings.push(
    `使用高级指令系统生成了 ${advancedPlan.commands.length} 条宏指令，解析为 ${interpretedEvents.length} 条时间轴事件。`
  );
} else {
  // Handle old format (existing code)
  aiTimeline = data as AiTimelinePlan;
  assistantMessage = extractAssistantMessageFromPayload(data) ?? '';
}

// ============================================================================
// STEP 5: Update context injection in prompt
// (in the sendToAi function, around line 2469-2474)
// ============================================================================

// OLD:
// const promptLines = [
//   `主题: ${planText}`,
//   patternHint ? `图案倾向: ${patternHint}` : '图案未指定，请结合语义判断。',
//   textFallback ? `文字内容参考: ${textFallback}` : '',
//   `参考上下文(JSON): ${JSON.stringify(profile)}`,
// ].filter(Boolean);

// NEW:
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
// STEP 6: Update assistant message to mention advanced commands
// (around line 2619-2624)
// ============================================================================

// Add to the summary message:
const commandSummary = generatedPlan && isAdvancedPlan(data)
  ? `\n使用了 ${(data as AdvancedPlan).commands.length} 条高级指令（${(data as AdvancedPlan).commands.map(c => c.type).join(', ')}）`
  : '';

const assistantContent =
  assistantMessage || normalized.assistantMessage || fallbackAssistant
    ? `${assistantMessage || normalized.assistantMessage || fallbackAssistant}${summary ? `\n${summary}` : ''}${commandSummary}`
    : nextProject
      ? summary || '方案已生成，可应用到工作台。'
      : '未生成方案，请调整描述。';

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * These changes will:
 *
 * 1. Import the new advanced command types and interpreter
 * 2. Replace the old system prompts with enhanced versions
 * 3. Add detection for advanced plan format
 * 4. Integrate the command interpreter to translate high-level commands
 * 5. Inject rich context about positions, racks, and effects
 * 6. Provide feedback about which commands were used
 *
 * The AI will now be able to:
 * - Understand complex arrangements like "排浪" and "对称"
 * - Output high-level commands instead of hundreds of events
 * - Use the interpreter to calculate specific firing times and positions
 * - Generate more sophisticated and artistic firework shows
 */
