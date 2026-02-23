import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { AlertTriangle, Bot, CheckCircle2, Loader2, Send, Settings, User } from 'lucide-react';
import {
  useProjectStore,
  createFanRack,
  createMatrixRack,
  createPosition,
  createStraightRack,
} from '../../store/projectStore';
import { useLibraryStore } from '../../store/libraryStore';
import { requestAiChat } from '../../services/aiService';
import { FrontViewPlannerPanel } from './FrontViewPlannerPanel';
import {
  Cue,
  FireworkEffect,
  FireworkType,
  FiringPattern,
  Project,
  Position,
  Rack,
  ShowEvent,
} from '../../types/domain';
import { generateTargets, normalizeFrontViewSpec, DEMO_FRONT_VIEW_INPUT } from '../../planner';
import type { TiltBoardPlan, Vector3 } from '../../planner/types';
import { AdvancedPlan, AdvancedCommand } from '../../types/advancedCommands';
import { interpretCommands } from '../../services/commandInterpreter';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

type PlanEventSpec = {
  name?: string;
  startTime?: number;
  positionId?: string;
  positionName?: string;
  positionIndex?: number;
  rackId?: string;
  rackName?: string;
  rackIndex?: number;
  pattern?: FiringPattern | string;
  interval?: number;
  tubeIndices?: number[];
  track?: string;
};

type PlanLayoutMode = 'symmetric' | 'free' | 'text';

type PlanEffectSpec = {
  effectId?: string;
  effectName?: string;
  effectType?: FireworkType | string;
  effectHeight?: number;
  effectColor?: string;
};

type PlanRackLoadSpec = PlanEffectSpec & {
  mode?: 'all' | 'perTube';
  tubeEffects?: Array<
    PlanEffectSpec & {
      tubeIndex?: number;
    }
  >;
};

type PlanRackConfigSpec = {
  startAngle?: number;
  endAngle?: number;
  tilt?: number;
  rows?: number;
  columns?: number;
  spacing?: number;
};

type PlanRackSpec = {
  name?: string;
  type?: 'fan' | 'straight' | 'matrix';
  tubeCount?: number;
  rotation?: number;
  config?: PlanRackConfigSpec;
  load?: PlanRackLoadSpec;
};

type PlanPositionSpec = {
  name?: string;
  coordinate?: { x?: number; z?: number };
  color?: string;
  racks?: PlanRackSpec[];
};

type FireworkPlan = {
  version?: 'v2';
  title?: string;
  duration?: number;
  layoutMode?: PlanLayoutMode;
  notes?: string[];
  tiltBoardPlan?: TiltBoardPlan;
  positions?: PlanPositionSpec[];
  events: PlanEventSpec[];
};

type PlanEnvelope = {
  assistantMessage?: string;
  plan?: FireworkPlan;
};

type PatternType = 'HEART' | 'TEXT' | 'CUBE';

type HeartPatternTemplate = {
  patternType: 'HEART';
  pattern?: PatternType;
  radius: number;
  center: [number, number];
};

type TextPatternTemplate = {
  patternType: 'TEXT';
  pattern?: PatternType;
  content: string;
  fontSize: number;
  center: [number, number];
};

type CubePatternTemplate = {
  patternType: 'CUBE';
  pattern?: PatternType;
  size: number;
  segments: number;
  center: [number, number];
};

type PatternTemplate = HeartPatternTemplate | TextPatternTemplate | CubePatternTemplate;

type PatternEnvelope = {
  assistantMessage?: string;
  patternType?: PatternType | string;
  pattern?: PatternType | string;
  radius?: number;
  center?: [number, number] | number[];
  content?: string;
  fontSize?: number;
  size?: number;
  segments?: number;
};

function isTextPatternTemplate(template: PatternTemplate): template is TextPatternTemplate {
  return template.patternType === 'TEXT';
}

type Notice = {
  type: 'success' | 'error';
  message: string;
};

type ChatHistoryItem = {
  id: string;
  prompt: string;
  jsonPlan?: FireworkPlan | string;
  assistantMessage?: string;
  type?: string;
  createdAt: string;
};

const MAX_INPUT_LENGTH = 500;
const MAX_CONTEXT_EFFECTS = 24;
const ALLOWED_PATTERNS: FiringPattern[] = [
  'all',
  'sequential',
  'reverse',
  'random',
  'wave',
  'spiral',
];
const SHOW_DURATION = 60;
const MIN_EVENT_COUNT = 12;
const TEXT_MAX_POINTS = 90;
const TEXT_MAX_POSITIONS = 180;
const TEXT_BURST_MIN = 42;
const TEXT_BURST_MAX = 68;
const TEXT_HEIGHT_SCALE = 0.45;
const PATTERN_SYNC_TIME = 0;
const PATTERN_LAUNCH_Z_OFFSET = 20;
const MIN_TUBE_TILT = 12;
const MAX_TUBE_TILT = 88;
const PATTERN_ACCENT_STEP = 7;
const CHAT_HISTORY_ENDPOINT = '/api/chat-history';
const DEFAULT_VIEWER = { x: 0, y: 50, z: 50 };
const HEIGHT_COMPENSATION_LIMIT = 12;
const PLAN_TRIGGER = '生成方案';
const QUOTE_TRIGGER_REGEX = /[""「『【】」』]/;

// ============================================================================
// 升级版 AI 人设：世界顶级烟花秀总导演
// ============================================================================

const MASTER_PERSONA = [
  '你是一位世界顶级的烟花秀总导演，拥有 20 年奥运会开幕式和国际庆典的编排经验。',
  '你不仅精通烟花技术，更是一位艺术家，能够用烟花讲述故事、传递情感、创造震撼人心的视觉体验。',
  '你的设计理念融合了东方美学的"起承转合"与西方交响乐的"乐章结构"，每一场秀都是精心编排的艺术作品。',
  '你充满激情，热爱你的工作，喜欢与客户分享你的创作灵感和设计思路。',
].join('\n');

const CHAT_SYSTEM_RULES = [
  MASTER_PERSONA,
  '',
  '## 对话模式',
  '当用户与你自由对话时：',
  '- 以专业而热情的语气回答问题',
  '- 分享你的经验和见解',
  '- 用生动的比喻和画面感描述烟花效果',
  '- 提供创意建议和技术指导',
  '',
  `当用户提到"${PLAN_TRIGGER}"或在引号内给出主题时，切换到方案生成模式。`,
].join('\n');

const ADVANCED_DIRECTIVES_EXAMPLE = `{
  "title": "星际穿越",
  "description": "我为您设计了一场名为《星际穿越》的烟花秀。开场使用金色排浪象征火箭启航，从中心向两侧展开，如同星辰散开；随后对称齐射营造宇宙深邃感；高潮部分采用密集爆发模拟星云爆炸，最后以三波终场收尾，寓意探索永无止境。整场秀时长60秒，节奏紧凑而富有张力。",
  "directives": [
    {
      "type": "wave",
      "time": 0,
      "pattern": "open_wings",
      "group": "all",
      "duration": 3,
      "shell": "Gold_Comet",
      "height": 120,
      "description": "金色彗星展翅启航"
    },
    {
      "type": "symmetry",
      "time": 5,
      "axis": "center",
      "positions": ["all"],
      "shell": "Blue_Burst",
      "delay": 200,
      "description": "蓝色爆发对称齐射"
    },
    {
      "type": "burst",
      "time": 15,
      "group": "all",
      "shell": "Multi_Color_Strobe",
      "count": 40,
      "interval": 80,
      "random": true,
      "description": "多彩闪光密集爆发"
    },
    {
      "type": "finale",
      "time": 55,
      "shell": "Gold_Silver_Mix",
      "waves": 3,
      "waveInterval": 500,
      "description": "金银混合三波终场"
    }
  ]
}`;

const TIMELINE_SYSTEM_RULES = [
  MASTER_PERSONA,
  '',
  '## 方案生成模式',
  '',
  '### 舞台结构说明（重要！）',
  '',
  '当前使用的是"标准专业舞台" (Standard Pro Stage)，结构如下：',
  '',
  '**前沿阵地 (Front)**：5 个扇形架，X轴排列',
  '- 用途：排浪、展翅、对称等动态效果',
  '- 指令中使用 group: "front" 或 group: "前沿" 来指定',
  '',
  '**中央阵地 (Mid)**：3 个直排架',
  '- 用途：节奏点、强调、对称中心',
  '- 指令中使用 group: "mid" 或 group: "中央" 来指定',
  '',
  '**后方阵地 (Rear)**：2 个大型矩阵',
  '- 用途：高空覆盖、密集爆发、终场齐射',
  '- 指令中使用 group: "rear" 或 group: "后方" 来指定',
  '',
  '**全场 (All)**：所有阵地',
  '- 指令中使用 group: "all" 来指定',
  '',
  '### 资产与主题对齐',
  '- 必须结合上下文 JSON 中的 stage.positions 和 library 列表使用已有阵地、炮架类型、效果名称，避免虚构硬件或素材',
  '- 阵地和炮架的使用要随主题呼应：庄重主题多用 rear/mid 对称，浪漫/抒情多用 front 排浪，科技/未来可多用矩阵扫射',
  '- 主题未给出时长时，默认时长 60 秒；如用户指定时长则遵循其要求',
  '- 整体效果要有节奏感和规律感，可用重复 motif（如两组开放排浪+对称）来形成结构',
  '',
  '### 第一步：理解与构思',
  '深入理解用户的需求：',
  '- 主题是什么？（国庆、婚礼、科技、浪漫...）',
  '- 想要什么氛围？（热烈、温馨、震撼、梦幻...）',
  '- 有什么特殊要求？（时长、色彩、节奏...）',
  '',
  '### 第二步：艺术解说',
  '在输出 JSON 之前，先用 description 字段向用户描述你的设计理念：',
  '- 这场秀叫什么名字？',
  '- 你的创作灵感是什么？',
  '- 每个段落想表达什么？',
  '- 为什么选择这些效果和节奏？',
  '',
  '用充满画面感的语言，让用户感受到你的专业和热情。',
  '',
  '### 第三步：使用高级指令',
  '',
  '**重要：你必须使用高级指令（High-Level Directives），而不是逐个生成底层事件！**',
  '',
  '可用的指令类型：',
  '',
  '1. **wave（排浪）** - 最重要的指令',
  '   - pattern 选项：',
  '     - "open_wings"：从中心向两边展开（展翅）',
  '     - "close_in"：从两边向中心合拢',
  '     - "left_to_right"：从左到右',
  '     - "right_to_left"：从右到左',
  '     - "center_out"：从中心向外',
  '     - "edges_in"：从边缘向内',
  '   - group: 指定阵地组（"front", "mid", "rear", "all"）',
  '   - duration: 该指令的持续时间（秒），建议 2-5 秒',
  '   - 用途：创造流动感、节奏感、对称美',
  '',
  '2. **symmetry（对称）**',
  '   - axis: "center"（中心对称）',
  '   - positions: ["all"] 或指定阵地',
  '   - 用途：营造平衡感、仪式感',
  '',
  '3. **salvo（齐射）**',
  '   - 用途：瞬间爆发、强烈冲击',
  '',
  '4. **cascade（级联）**',
  '   - positions: ["all"] 或指定阵地',
  '   - 用途：渐进式展开、层次感',
  '',
  '5. **burst（爆发）**',
  '   - group: 指定阵地组',
  '   - 用途：高密度快速点火、高潮部分',
  '',
  '6. **sweep（扫射）**',
  '   - 用途：扇形扫描、科技感',
  '',
  '7. **finale（终场）**',
  '   - 用途：大结局、全场齐射',
  '',
  '### 第四步：起承转合结构（重要！）',
  '',
  '**关键约束：如果用户没有明确指定时长，方案必须至少 60 秒！**',
  '',
  '**重要提示：系统会自动排队执行指令，你不需要手动计算 time 字段！**',
  '- 所有指令的 time 字段可以设置为 0',
  '- 系统会自动按顺序执行，确保指令不重叠',
  '- 每个指令的 duration 决定了它的持续时间',
  '',
  '每场秀都应该有清晰的结构：',
  '- **起（0-15s）**：开场，吸引注意，建立主题',
  '  - 推荐：2-3 个 wave（展翅），使用 front 阵地',
  '  - 每个指令 duration: 3-5 秒',
  '- **承（15-35s）**：铺垫，发展主题，建立节奏',
  '  - 推荐：3-4 个 cascade（级联）或 symmetry（对称），使用 mid 阵地',
  '  - 每个指令 duration: 4-6 秒',
  '- **转（35-55s）**：高潮，情绪爆发，密集点火',
  '  - 推荐：4-5 个 burst（爆发）或多个 wave，使用 all 阵地',
  '  - 每个指令 duration: 3-5 秒',
  '- **合（55-60s）**：收尾，升华主题，留下余韵',
  '  - 推荐：finale（终场），使用 rear 阵地',
  '  - duration: 5-8 秒',
  '',
  '### 第五步：烟花效果类型（effectType）',
  '',
  '每条指令必须包含 effectType 字段，从以下 8 种中选择：',
  '',
  '| effectType | 中文名 | 视觉特征 | 适用场景 |',
  '|---|---|---|---|',
  '| peony | 牡丹 | 球形均匀扩散，最经典效果，圆满饱满 | 开场、主体，几乎所有场景的基础效果 |',
  '| chrysanthemum | 菊花 | 细密拖尾，星点燃烧到轨迹末端才熄灭 | 需要持久视觉停留的段落，适合配对称 |',
  '| willow | 柳 | 长拖尾自然下垂如垂柳，滞空时间长 | 抒情段、留白段，营造诗意氛围 |',
  '| crossette | 十字星 | 星点到达顶端后二次分裂成十字闪烁 | 转折段，制造惊喜感和层次感 |',
  '| burst | 爆裂 | 短平快爆发，冲击力强，低空效果 | 节奏重音、低空冲击、与高空效果搭配 |',
  '| comet | 彗星 | 粗亮拖尾上升，尾迹醒目 | 开场上升段、引导观众视线向上 |',
  '| mine | 地雷 | 地面瞬间向上喷射扇形星点 | 低空前沿效果，与高空弹形成纵深层次 |',
  '| fountain | 喷泉 | 持续低空喷射金银火花，2-5秒持续 | 铺底效果、前沿持续画面，填充空档 |',
  '',
  '**高低空搭配原则：**',
  '- 高空效果：peony、chrysanthemum、willow（height 80-150m）',
  '- 中空效果：crossette、comet（height 50-100m）',
  '- 低空效果：burst、mine、fountain（height 10-50m）',
  '- 每个段落应混合高低空效果，形成纵深层次感',
  '',
  '### 第六步：主题色彩映射',
  '',
  '根据主题选择合适的 shell（效果）：',
  '- **国庆/庆典**：Red_Peony, Gold_Chrysanthemum, Red_Strobe',
  '- **浪漫/婚礼**：Pink_Peony, Purple_Crossette, Pink_Willow',
  '- **高科技/未来**：Blue_Burst, Cyan_Strobe, Blue_Crossette',
  '- **自然/梦幻**：Green_Willow, Silver_Palm, Multi_Color',
  '',
  '### 输出格式',
  '',
  '你必须输出以下格式的 JSON：',
  '',
  '```json',
  ADVANCED_DIRECTIVES_EXAMPLE,
  '```',
  '',
  '### 关键要求',
  '',
  '1. **description 字段是必须的**：用 2-4 句话描述你的设计理念',
  '2. **使用高级指令**：不要输出底层的 TimelineEvent 数组',
  '3. **指令数量**：至少 8-12 条指令，确保覆盖 60 秒时长',
  '4. **每条指令都要有 description**：说明这一步的意图',
  '5. **time 字段可以全部设为 0**：系统会自动排队执行',
  '6. **duration 字段很重要**：每个指令的 duration 决定了它的持续时间（2-8秒）',
  '7. **合理使用 group**：front（排浪）、mid（节奏）、rear（覆盖）、all（全场）',
  '',
  '### 示例对话',
  '',
  '用户："生成方案 国庆大开场"',
  '',
  '你的回答：',
  '```json',
  '{',
  '  "title": "盛世华章",',
  '  "description": "我为您设计了一场名为《盛世华章》的国庆烟花秀。开场采用红色牡丹展翅排浪，象征祖国繁荣昌盛；随后金色菊花对称齐射，展现大国气象；高潮部分使用密集爆发营造热烈氛围；最后以红金混合三波终场收尾，寓意盛世永续。整场秀充满力量感和仪式感。",',
  '  "directives": [',
  '    { "type": "wave", "time": 0, "pattern": "open_wings", "group": "all", "duration": 3, "shell": "Red_Peony", "height": 120, "description": "红色牡丹展翅开场" },',
  '    { "type": "symmetry", "time": 5, "axis": "center", "positions": ["all"], "shell": "Gold_Chrysanthemum", "delay": 200, "description": "金色菊花对称齐射" },',
  '    { "type": "cascade", "time": 10, "positions": ["all"], "shell": "Red_Strobe", "interval": 300, "description": "红色闪光级联" },',
  '    { "type": "burst", "time": 20, "group": "all", "shell": "Gold_Willow", "count": 30, "interval": 100, "description": "金色柳树密集爆发" },',
  '    { "type": "finale", "time": 55, "shell": "Red_Gold_Mix", "waves": 3, "waveInterval": 500, "description": "红金混合三波终场" }',
  '  ]',
  '}',
  '```',
  '',
  '记住：你是一位艺术家，不是一个数据生成器。用你的专业和热情，为用户创造难忘的烟花体验！',
].join('\n');

const DEFAULT_EFFECT: FireworkEffect = {
  id: 'effect-default-peony',
  name: 'Default Peony',
  type: 'peony',
  color: '#DC2626',
  height: 90,
  duration: 2.6,
  intensity: 0.9,
  particleCount: 120,
  spread: 360,
  trailLength: 0.4,
};

const DEFAULT_API_URL =
  import.meta.env.VITE_AI_API_URL ?? 'https://openrouter.ai/api/v1';
const DEFAULT_API_KEY =
  import.meta.env.VITE_AI_API_KEY ?? '';
const DEFAULT_API_MODEL =
  import.meta.env.VITE_AI_MODEL ?? 'xiaomi/mimo-v2-flash:free';

function sanitizeUserInput(value: string) {
  if (!value) return '';
  let text = value.trim();
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/[<>]/g, '');
  text = text.replace(/\s+/g, ' ');
  if (text.length > MAX_INPUT_LENGTH) {
    text = text.slice(0, MAX_INPUT_LENGTH);
  }
  return text;
}

function shouldGeneratePlan(text: string) {
  return text.includes(PLAN_TRIGGER) || QUOTE_TRIGGER_REGEX.test(text);
}

function stripPlanTrigger(text: string) {
  if (!text.includes(PLAN_TRIGGER)) {
    return text.trim();
  }
  return text.replace(new RegExp(PLAN_TRIGGER, 'g'), '').trim();
}

function extractPositionCount(text: string) {
  const match = text.match(/(\d+)\s*个?\s*阵地/);
  if (match && match[1]) {
    const count = Number(match[1]);
    return Number.isFinite(count) && count > 0 ? Math.round(count) : null;
  }
  return null;
}


function extractTextToRender(text: string) {
  const quoted =
    text.match(/[“"「『](.+?)[”"」』]/) ||
    text.match(/【(.+?)】/);
  if (quoted && quoted[1]) {
    const value = quoted[1].trim();
    if (value.length > 1) return value;
  }

  if (/(文字|字样|字体|文字烟花|字形)/.test(text)) {
    const fallback = text.match(/(?:文字|字样|字体|字形)[^A-Za-z0-9\u4e00-\u9fa5]*([A-Za-z0-9\u4e00-\u9fa5]{2,12})/);
    if (fallback && fallback[1]) {
      return fallback[1].trim();
    }
  }

  const trimmed = text.trim();
  if (
    trimmed.length > 1 &&
    trimmed.length <= 8 &&
    /[\u4e00-\u9fa5]/.test(trimmed) &&
    !/(主题|方案|节奏|色彩|氛围)/.test(trimmed)
  ) {
    return trimmed;
  }

  return null;
}

function extractNumberByKeywords(text: string, keywords: string[]) {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}\\s*[:：]?\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

function extractPatternParamsFromText(text: string) {
  if (!text) return {};
  const centerY = extractNumberByKeywords(text, [
    '中心高度',
    '爆点高度',
    '高度',
    '爆高',
  ]);
  const radius = extractNumberByKeywords(text, ['半径', '心形半径']);
  const size = extractNumberByKeywords(text, ['尺寸', '边长', '大小']);
  const segments = extractNumberByKeywords(text, ['分段', '段数', 'segments', '细分']);
  const fontSize = extractNumberByKeywords(text, ['字号', '字体大小', '字高', '字大小']);
  return {
    centerY: centerY ?? undefined,
    radius: radius ?? undefined,
    size: size ?? undefined,
    segments: segments ?? undefined,
    fontSize: fontSize ?? undefined,
  };
}

type CanvasPoint = {
  x: number;
  y: number;
  z?: number;
};

function normalizePatternType(value: unknown): PatternType | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toUpperCase();
  if (key === 'HEART' || key === 'TEXT' || key === 'CUBE') {
    return key as PatternType;
  }
  return null;
}

function detectPatternTypeFromText(text: string) {
  if (/(爱心|心形|heart)/i.test(text)) return 'HEART';
  if (/(正方体|立方体|方块|立体方块|cube)/i.test(text)) return 'CUBE';
  if (/(文字|字样|字体|字形|文本|text)/i.test(text)) return 'TEXT';
  return null;
}

function normalizeCenter(value: unknown, fallback: [number, number]) {
  if (Array.isArray(value) && value.length >= 2) {
    const x = normalizeNumber(value[0]);
    const y = normalizeNumber(value[1]);
    return [
      typeof x === 'number' ? x : fallback[0],
      typeof y === 'number' ? y : fallback[1],
    ] as [number, number];
  }
  return fallback;
}

function normalizePatternTemplate(
  payload: PatternEnvelope,
  fallbackText: string
): { template: PatternTemplate | null; warnings: string[] } {
  const warnings: string[] = [];
  const rawType = normalizePatternType(payload.patternType);
  const aliasType = normalizePatternType(payload.pattern);
  const inferredType = detectPatternTypeFromText(fallbackText);
  const extracted = extractPatternParamsFromText(fallbackText);
  const patternType = rawType ?? aliasType ?? inferredType;

  if (!patternType) {
    return { template: null, warnings: ['AI 未返回 patternType。'] };
  }

  if (!rawType && aliasType) {
    warnings.push('AI 未返回 patternType，已使用 pattern 字段补齐。');
  } else if (!rawType && !aliasType && inferredType) {
    warnings.push('AI 未返回 patternType，已根据描述自动识别。');
  }

  const fallbackCenter: [number, number] = patternType === 'CUBE' ? [0, 55] : [0, 50];
  const fallbackCenterY =
    typeof extracted.centerY === 'number' ? extracted.centerY : fallbackCenter[1];
  const center = normalizeCenter(payload.center as [number, number] | undefined, [
    fallbackCenter[0],
    fallbackCenterY,
  ]);

  if (patternType === 'HEART') {
    const radius = clampNumber(
      normalizeNumber(payload.radius) ?? extracted.radius ?? 30,
      8,
      60
    );
    return {
      template: {
        patternType,
        pattern: 'HEART',
        radius,
        center,
      },
      warnings,
    };
  }

  if (patternType === 'CUBE') {
    const size = clampNumber(normalizeNumber(payload.size) ?? extracted.size ?? 25, 10, 60);
    const segments = clampNumber(
      Math.round(normalizeNumber(payload.segments) ?? extracted.segments ?? 4),
      1,
      10
    );
    return {
      template: {
        patternType,
        pattern: 'CUBE',
        size,
        segments,
        center,
      },
      warnings,
    };
  }

  const content =
    normalizeText(payload.content) || extractTextToRender(fallbackText) || '银河落';
  const fontSize = clampNumber(
    normalizeNumber(payload.fontSize) ?? extracted.fontSize ?? 20,
    12,
    46
  );
  return {
    template: {
      patternType,
      pattern: 'TEXT',
      content,
      fontSize,
      center,
    },
    warnings,
  };
}

function createPatternFallbackEnvelope(patternHint: PatternType | null, content: string): PatternEnvelope {
  const fallbackText = content.trim() || '银河落';
  if (patternHint === 'HEART') {
    return {
      patternType: 'HEART',
      pattern: 'HEART',
      radius: 32,
      center: [0, 50],
    };
  }
  if (patternHint === 'CUBE') {
    return {
      patternType: 'CUBE',
      pattern: 'CUBE',
      size: 28,
      segments: 4,
      center: [0, 55],
    };
  }
  return {
    patternType: 'TEXT',
    pattern: 'TEXT',
    content: fallbackText,
    fontSize: 22,
    center: [0, 50],
  };
}

function getTextPoints(text: string, fontSize: number) {
  if (typeof document === 'undefined') return null;
  const safeText = text.trim();
  if (!safeText) return null;

  const size = Math.round(fontSize);
  const padding = Math.max(6, Math.round(size * 0.3));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.font = `bold ${size}px "Microsoft YaHei", "SimHei", "Noto Sans CJK SC", sans-serif`;
  const metrics = ctx.measureText(safeText);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(size * 1.35 + padding * 2);
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.font = `bold ${size}px "Microsoft YaHei", "SimHei", "Noto Sans CJK SC", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(safeText, width / 2, height / 2);

  const data = ctx.getImageData(0, 0, width, height).data;
  const points: CanvasPoint[] = [];
  const outlinePoints: CanvasPoint[] = [];
  const sampleStep = Math.max(1, Math.min(6, Math.round(size / 6)));

  const isOn = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const idx = (y * width + x) * 4;
    return data[idx + 3] > 64;
  };

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      if (!isOn(x, y)) continue;
      points.push({ x, y });
      const edge =
        !isOn(x - 1, y) ||
        !isOn(x + 1, y) ||
        !isOn(x, y - 1) ||
        !isOn(x, y + 1);
      if (edge) outlinePoints.push({ x, y });
    }
  }

  const finalPoints = outlinePoints.length > 0 ? outlinePoints : points;
  if (finalPoints.length === 0) return null;

  return {
    points: finalPoints,
    width,
    height,
  };
}

const RAD_TO_DEG = 180 / Math.PI;

function buildFrontViewSpecForText(text: string, color: string) {
  const payload = JSON.parse(JSON.stringify(DEMO_FRONT_VIEW_INPUT));
  payload.content = {
    ...(payload.content ?? {}),
    text,
  };
  payload.visuals = {
    ...(payload.visuals ?? {}),
    color,
  };
  payload.duration = SHOW_DURATION;
  payload.seed = Date.now() % 1000000;
  return normalizeFrontViewSpec(payload);
}

function buildFrontViewPlan(text: string, color: string) {
  const spec = buildFrontViewSpecForText(text, color);
  const { warnings, tiltBoardPlan } = generateTargets(spec);
  return { warnings, tiltBoardPlan };
}

function normalizeRotation(value: number) {
  let normalized = value % 360;
  if (normalized < 0) normalized += 360;
  if (normalized >= 360) normalized -= 360;
  return normalized;
}

function computeTubeOrientation(aimDir: Vector3) {
  const horizontal = Math.sqrt(aimDir.x * aimDir.x + aimDir.z * aimDir.z);
  const tilt = clampNumber((Math.atan2(aimDir.y, Math.max(horizontal, 1e-6)) * RAD_TO_DEG), 0, 90);
  const rotation = normalizeRotation(Math.atan2(aimDir.x, aimDir.z) * RAD_TO_DEG);
  return { tilt, rotation };
}

function buildPlanFromTiltBoardPlan(
  tiltBoardPlan: TiltBoardPlan,
  template: TextPatternTemplate,
  points: CanvasPoint[],
  baseEffect: FireworkEffect,
  accentEffect: FireworkEffect | null
) {
  if (!tiltBoardPlan || tiltBoardPlan.tubes.length === 0) {
    return null;
  }
  const accentCandidates = points.length > 0 ? points : [{ x: 0, y: 0 }];
  const startTime = clampNumber(Number(tiltBoardPlan.burstTime ?? 1), 0.1, SHOW_DURATION - 0.2);
  const positionName = '图案阵地';
  const boardCenter = tiltBoardPlan.boardCenter;
  const positionSpec: PlanPositionSpec = {
    name: positionName,
    coordinate: {
      x: Number(boardCenter.x.toFixed(3)),
      z: Number(boardCenter.z.toFixed(3)),
    },
    racks: [],
  };
  const events: PlanEventSpec[] = [];

  tiltBoardPlan.tubes.forEach((tube, index) => {
    const accentPoint = accentCandidates[index % accentCandidates.length];
    const useAccent =
      accentEffect && shouldAccentPoint(accentPoint, index, template.patternType);
    const effect = useAccent ? accentEffect : baseEffect;
    const orientation = computeTubeOrientation(tube.aimDir);
    const rackName = `图案筒 ${index + 1}`;
    const rackSpec: PlanRackSpec = {
      name: rackName,
      type: 'straight',
      tubeCount: 1,
      rotation: Number(orientation.rotation.toFixed(2)),
      config: { tilt: Number(orientation.tilt.toFixed(2)) },
      load: {
        mode: 'perTube',
        effectId: effect.id,
        effectName: effect.name,
        effectType: effect.type,
        effectHeight: effect.height,
        effectColor: effect.color,
        tubeEffects: [
          {
            tubeIndex: 0,
            effectId: effect.id,
            effectName: effect.name,
            effectType: effect.type,
            effectHeight: effect.height,
            effectColor: effect.color,
          },
        ],
      },
    };
    positionSpec.racks!.push(rackSpec);
    events.push({
      name: `图案点火 ${index + 1}`,
      startTime,
      positionName,
      rackName,
      pattern: 'all',
      interval: 0,
      tubeIndices: [0],
    });
  });

  const plan: FireworkPlan = {
    version: 'v2',
    title: template.content ? `倾角板 · ${template.content}` : '倾角板图案',
    duration: SHOW_DURATION,
    layoutMode: 'text',
    notes: [
      `文字内容：${template.content}`,
      `板倾角：${tiltBoardPlan.boardPitchDeg.toFixed(1)}°`,
      `像素间距：${tiltBoardPlan.pixelSize.toFixed(2)} m`,
    ],
    positions: [positionSpec],
    events,
    tiltBoardPlan,
  };

  return plan;
}

function getHeartPoints(radius: number, sampleCount?: number) {
  const steps = Math.max(48, Math.round(sampleCount ?? radius * 2));
  const basePoints: CanvasPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    basePoints.push({ x, y });
  }
  if (basePoints.length === 0) return basePoints;
  const xs = basePoints.map((point) => point.x);
  const ys = basePoints.map((point) => point.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const scale = span > 0 ? (radius * 2) / span : 1;
  return basePoints.map((point) => ({ x: point.x * scale, y: point.y * scale }));
}

function getCubePoints(size: number, segments: number) {
  const steps = Math.max(1, Math.round(segments));
  const half = size / 2;
  const vertices: CanvasPoint[] = [
    { x: -half, y: -half, z: -half },
    { x: half, y: -half, z: -half },
    { x: half, y: half, z: -half },
    { x: -half, y: half, z: -half },
    { x: -half, y: -half, z: half },
    { x: half, y: -half, z: half },
    { x: half, y: half, z: half },
    { x: -half, y: half, z: half },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const points: CanvasPoint[] = [];
  const seen = new Set<string>();

  const pushPoint = (x: number, y: number, z: number) => {
    const key = `${x}|${y}|${z}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push({ x, y, z });
    }
  };

  edges.forEach(([start, end]) => {
    const a = vertices[start];
    const b = vertices[end];
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 0 : i / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const z = (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t;
      pushPoint(x, y, z);
    }
  });

  return points;
}

function normalizePoints2d(points: CanvasPoint[], options?: { invertY?: boolean }) {
  if (points.length === 0) return { points: [], aspect: 1 };
  const invertY = options?.invertY ?? true;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const widthSpan = Math.max(1, maxX - minX);
  const heightSpan = Math.max(1, maxY - minY);
  const aspect = heightSpan / widthSpan;

  const normalized = points.map((point) => ({
    x: (point.x - minX) / widthSpan - 0.5,
    y: invertY ? 0.5 - (point.y - minY) / heightSpan : (point.y - minY) / heightSpan - 0.5,
  }));

  return { points: normalized, aspect };
}

function normalizePoints3d(points: CanvasPoint[]) {
  if (points.length === 0) return { points: [] };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const widthSpan = Math.max(1, maxX - minX);
  const heightSpan = Math.max(1, maxY - minY);
  const depthSpan = Math.max(1, maxZ - minZ);

  const normalized = points.map((point) => ({
    x: (point.x - minX) / widthSpan - 0.5,
    y: (point.y - minY) / heightSpan - 0.5,
    z: ((point.z ?? 0) - minZ) / depthSpan - 0.5,
  }));

  return { points: normalized };
}

function downsamplePoints(points: CanvasPoint[], maxPoints: number) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
}

function shouldAccentPoint(point: CanvasPoint, index: number, patternType: PatternType) {
  if (patternType === 'CUBE') {
    const edge = Math.max(
      Math.abs(point.x),
      Math.abs(point.y),
      Math.abs(point.z ?? 0)
    );
    return edge > 0.46 && index % 2 === 0;
  }
  return index % PATTERN_ACCENT_STEP === 0;
}

function fitCanvasHeight(centerY: number, height: number) {
  const safeCenter = clampNumber(centerY, TEXT_BURST_MIN, TEXT_BURST_MAX);
  const availableAbove = TEXT_BURST_MAX - safeCenter;
  const availableBelow = safeCenter - TEXT_BURST_MIN;
  const maxHeight = Math.max(
    1,
    Math.min(height, 2 * Math.min(availableAbove, availableBelow))
  );
  const scale = maxHeight / height;
  return { centerY: safeCenter, height: maxHeight, scale };
}

function computeTubeAim(
  launcher: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number }
) {
  const dx = target.x - launcher.x;
  const dz = target.z - launcher.z;
  const dy = target.y - launcher.y;
  const horizontal = Math.sqrt(dx * dx + dz * dz);
  const pitchRad = Math.atan2(dy, Math.max(horizontal, 0.001));
  const yawRad = Math.atan2(dx, dz);
  const pitch = clampNumber((pitchRad * 180) / Math.PI, MIN_TUBE_TILT, MAX_TUBE_TILT);
  const yaw = (yawRad * 180) / Math.PI;
  return {
    pitch: Number(pitch.toFixed(2)),
    yaw: Number(yaw.toFixed(2)),
  };
}

function computeHeightCompensation(
  worldX: number,
  worldZ: number,
  baseY: number,
  center: { x: number; y: number; z: number }
) {
  // Depth-based compensation keeps the pattern aligned to the front view plane.
  const baseDistance = Math.hypot(
    DEFAULT_VIEWER.x - center.x,
    DEFAULT_VIEWER.y - center.y,
    DEFAULT_VIEWER.z - center.z
  );
  if (!Number.isFinite(baseDistance) || baseDistance <= 0) return 0;
  const pointDistance = Math.hypot(
    DEFAULT_VIEWER.x - worldX,
    DEFAULT_VIEWER.y - baseY,
    DEFAULT_VIEWER.z - worldZ
  );
  const scale = clampNumber(pointDistance / baseDistance, 0.7, 1.4);
  const compensatedY = center.y + (baseY - center.y) * scale;
  return clampNumber(compensatedY - baseY, -HEIGHT_COMPENSATION_LIMIT, HEIGHT_COMPENSATION_LIMIT);
}

function pickTextBaseEffect(effects: FireworkEffect[], text: string) {
  const findByName = (keyword: string) =>
    effects.find((effect) => effect.name.toLowerCase().includes(keyword));
  const findByColor = (color: string) =>
    effects.find((effect) => effect.color.toLowerCase() === color.toLowerCase());

  if (text.includes('红')) {
    return findByName('red') || findByColor('#ff0000');
  }
  if (text.includes('黄') || text.includes('金')) {
    return findByName('gold') || findByName('golden') || findByColor('#ffd700');
  }
  if (text.includes('蓝')) {
    return findByName('blue') || findByColor('#0088ff');
  }
  if (text.includes('紫')) {
    return findByName('purple') || findByColor('#9b59b6');
  }
  if (text.includes('绿')) {
    return findByName('green') || findByColor('#00ff00');
  }
  return effects.find((effect) => effect.type === 'burst') || effects[0] || null;
}

function pickAccentEffect(effects: FireworkEffect[], baseEffect: FireworkEffect) {
  const baseColor = baseEffect.color.toLowerCase();
  const candidates = effects.filter((effect) => effect.id !== baseEffect.id);
  const differentColor = candidates.filter(
    (effect) => effect.color.toLowerCase() !== baseColor
  );
  const pickByType = (list: FireworkEffect[], types: FireworkType[]) =>
    types.reduce<FireworkEffect | null>(
      (found, type) => found || list.find((effect) => effect.type === type) || null,
      null
    );

  return (
    pickByType(differentColor, ['crossette', 'burst', 'willow', 'peony']) ||
    pickByType(candidates, ['crossette', 'burst', 'willow', 'peony']) ||
    candidates[0] ||
    null
  );
}

function mapBurstHeightToEffectHeight(burstHeight: number) {
  const safe = clampNumber(burstHeight, TEXT_BURST_MIN, TEXT_BURST_MAX);
  const height = safe / TEXT_HEIGHT_SCALE;
  return clampNumber(Number(height.toFixed(1)), 80, 180);
}

function buildTextPlan(
  template: PatternTemplate,
  effects: FireworkEffect[],
  requestedCount?: number | null
) {
  const warnings: string[] = [];
  const center = {
    x: template.center[0],
    y: template.center[1],
    z: 0,
  };
  const textTemplate = isTextPatternTemplate(template) ? template : null;

  const baseEffect = textTemplate
    ? pickTextBaseEffect(effects, textTemplate.content) ?? DEFAULT_EFFECT
    : effects[0] ?? DEFAULT_EFFECT;
  const accentEffect = pickAccentEffect(effects, baseEffect);

  let points: CanvasPoint[] = [];
  let width = 60;
  let height = 30;
  let depth = 0;
  let depthScale = 1;
  let label = '图案';
  let title = '几何图案';
  let notes: string[] = [];

  if (textTemplate) {
    const content = textTemplate.content.trim() || '银河落';
    const fontSize = textTemplate.fontSize;
    const textResult = getTextPoints(content, fontSize);
    if (!textResult) return null;
    const normalized = normalizePoints2d(textResult.points, { invertY: true });
    points = normalized.points;
    const baseWidth = clampNumber(fontSize * Math.max(2, content.length) * 0.7, 30, 90);
    width = baseWidth;
    height = clampNumber(baseWidth * normalized.aspect, 18, 60);
    label = '文字';
    title = `文字烟花：${content}`;
    notes = [`文字内容：${content}`, '文字图案映射到空中画布。'];
  } else if (template.patternType === 'HEART') {
    const radius = template.radius;
    const heartPoints = getHeartPoints(radius, radius * 4);
    const normalized = normalizePoints2d(heartPoints, { invertY: false });
    points = normalized.points;
    width = clampNumber(radius * 2, 20, 90);
    height = clampNumber(width * normalized.aspect, 20, 90);
    label = '爱心';
    title = '爱心烟花';
    notes = [`爱心半径：${radius}`, `中心高度：${center.y}`];
  } else if (template.patternType === 'CUBE') {
    const size = template.size;
    const segments = template.segments;
    const cubePoints = getCubePoints(size, segments);
    const normalized = normalizePoints3d(cubePoints);
    points = normalized.points;
    width = size;
    height = size;
    depth = size;
    depthScale = size;
    label = '立方体';
    title = '立方体烟花';
    notes = [`立方体尺寸：${size}`, `分段：${segments}`];
  } else {
    return null;
  }

  if (points.length === 0) return null;

  if (typeof requestedCount === 'number' && Number.isFinite(requestedCount)) {
    const targetCount = Math.max(1, Math.round(requestedCount));
    if (targetCount < MIN_EVENT_COUNT) {
      warnings.push(`图案至少需要 ${MIN_EVENT_COUNT} 个点位，已自动提升密度。`);
    }
    const target = Math.max(targetCount, MIN_EVENT_COUNT);
    if (target > 0 && target < points.length) {
      warnings.push('点位数量较多，已根据要求进行抽样。');
      points = downsamplePoints(points, target);
    }
  }

  if (template.patternType === 'CUBE') {
    if (points.length > TEXT_MAX_POSITIONS) {
      warnings.push('立体图案点位过多，已自动降采样。');
      points = downsamplePoints(points, TEXT_MAX_POSITIONS);
    }
  } else {
    if (points.length > TEXT_MAX_POINTS) {
      warnings.push('平面图案点位过多，已自动降采样。');
      points = downsamplePoints(points, TEXT_MAX_POINTS);
    }
  }

  const heightFit = fitCanvasHeight(center.y, height);
  height = heightFit.height;
  center.y = heightFit.centerY;
  width = width * heightFit.scale;
  depth = depth * heightFit.scale;
  depthScale = depthScale * heightFit.scale;
  notes = [
    ...notes,
    `画布中心：(${center.x}, ${center.y})`,
    `画布尺寸：${width.toFixed(1)} × ${height.toFixed(1)}`,
  ];
  if (template.patternType === 'CUBE') {
    notes.push(`画布深度：${depth.toFixed(1)}`);
  }

  const mappedPoints: CanvasPoint[] = [];
  points.forEach((point) => {
    mappedPoints.push({ x: point.x, y: point.y, z: point.z ?? 0 });
  });

  const frontViewPlan = textTemplate
    ? buildFrontViewPlan(textTemplate.content, baseEffect.color)
    : null;
  if (frontViewPlan) {
    warnings.push(...frontViewPlan.warnings);
    if (frontViewPlan.tiltBoardPlan && textTemplate) {
      const customPlan = buildPlanFromTiltBoardPlan(
        frontViewPlan.tiltBoardPlan,
        textTemplate,
        mappedPoints,
        baseEffect,
        accentEffect
      );
      if (customPlan) {
        return { plan: customPlan, warnings };
      }
    }
  }

  const orderedPoints = [...mappedPoints].sort(
    (a, b) =>
      (a.z ?? 0) - (b.z ?? 0) ||
      a.x - b.x ||
      b.y - a.y
  );
  notes = [
    ...notes,
    '点火方式：齐射同步',
    `同步时间：${PATTERN_SYNC_TIME.toFixed(1)}s`,
  ];
  const positions: PlanPositionSpec[] = [];
  const events: PlanEventSpec[] = [];
  const syncTime = PATTERN_SYNC_TIME;
  const yaw = 0;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);

  orderedPoints.forEach((point, index) => {
    const localX = point.x * width;
    const localY = point.y * height;
    const localZ =
      template.patternType === 'CUBE' ? (point.z ?? 0) * depthScale : 0;

    const rotatedX = localX * cosYaw - localZ * sinYaw;
    const rotatedZ = localX * sinYaw + localZ * cosYaw;
    const targetX = Number(clampNumber(center.x + rotatedX, -50, 50).toFixed(2));
    const targetZ = Number(
      clampNumber(center.z + rotatedZ, -50, 50).toFixed(2)
    );
    const baseTargetY = center.y + localY;
    const targetY =
      template.patternType === 'CUBE'
        ? baseTargetY + computeHeightCompensation(targetX, targetZ, baseTargetY, center)
        : baseTargetY;
    const launchX = targetX;
    const launchZ = clampNumber(
      center.z - PATTERN_LAUNCH_Z_OFFSET,
      -50,
      50
    );
    const aim = computeTubeAim(
      { x: launchX, y: 0, z: launchZ },
      { x: targetX, y: targetY, z: targetZ }
    );

    const burstHeight = clampNumber(targetY, TEXT_BURST_MIN, TEXT_BURST_MAX);
    const effectHeight = mapBurstHeightToEffectHeight(burstHeight);
    const rotation = aim.yaw;
    const tilt = aim.pitch;
    const useAccent =
      accentEffect && shouldAccentPoint(point, index, template.patternType);
    const effect = useAccent && accentEffect ? accentEffect : baseEffect;

    const idx = positions.length + 1;
    const positionName = `${label}点 ${idx}`;
    const rackName = `${label}筒 ${idx}`;

    positions.push({
      name: positionName,
      coordinate: { x: launchX, z: launchZ },
      color: effect.color,
      racks: [
        {
          name: rackName,
          type: 'straight',
          tubeCount: 1,
          rotation,
          config: { tilt },
          load: {
            mode: 'perTube',
            effectId: effect.id,
            effectName: effect.name,
            effectType: effect.type,
            tubeEffects: [
              {
                tubeIndex: 0,
                effectId: effect.id,
                effectName: effect.name,
                effectType: effect.type,
                effectHeight,
                effectColor: effect.color,
              },
            ],
          },
        },
      ],
    });

    events.push({
      name: `${label}点火 ${idx}`,
      startTime: syncTime,
      positionName,
      rackName,
      pattern: 'all',
      interval: 0,
      tubeIndices: [0],
    });
  });

  const plan: FireworkPlan = {
    version: 'v2',
    title,
    duration: SHOW_DURATION,
    layoutMode: 'free',
    notes,
    positions,
    events,
  };

  return { plan, warnings };
}

function buildProjectProfile(project: Project, effects: FireworkEffect[]) {
  const rackStats: Record<string, number> = {};
  const stagePositions = project.positions.map((position) => {
    const rackBriefs = position.racks.map((rack) => {
      const config = (rack.config as any) || {};
      rackStats[rack.type] = (rackStats[rack.type] || 0) + 1;

      return {
        id: rack.id,
        name: rack.name,
        type: rack.type,
        tubeCount: rack.tubeCount,
        tilt: typeof config.tilt === 'number' ? config.tilt : undefined,
        startAngle: typeof config.startAngle === 'number' ? config.startAngle : undefined,
        endAngle: typeof config.endAngle === 'number' ? config.endAngle : undefined,
        rows: typeof config.rows === 'number' ? config.rows : undefined,
        columns: typeof config.columns === 'number' ? config.columns : undefined,
      };
    });

    return {
      id: position.id,
      name: position.name,
      coordinate: position.coordinate,
      racks: rackBriefs,
    };
  });

  const totalTubes = stagePositions.reduce(
    (sum, pos) => sum + pos.racks.reduce((rackSum, rack) => rackSum + rack.tubeCount, 0),
    0
  );
  const totalRacks = stagePositions.reduce((sum, pos) => sum + pos.racks.length, 0);

  return {
    constraints: {
      duration: SHOW_DURATION,
      defaultDuration: SHOW_DURATION,
      minEvents: MIN_EVENT_COUNT,
      patterns: ALLOWED_PATTERNS,
      layout: {
        symmetry: 'x-axis',
        order: 'left-to-right',
        range: [-50, 50],
      },
      rhythm: '需要整体节奏与重复性，建议使用排浪+对称 motif 保持连贯',
    },
    project: {
      id: project.id,
      name: project.name,
      duration: project.duration || SHOW_DURATION,
      eventCount: project.events.length,
      stageTheme: project.activityName || project.activityDetail || '',
      totalPositions: stagePositions.length,
      totalRacks,
      totalTubes,
    },
    stage: {
      totalPositions: stagePositions.length,
      totalRacks,
      totalTubes,
      rackStats,
      positions: stagePositions,
    },
    library: effects.slice(0, MAX_CONTEXT_EFFECTS).map((effect) => ({
      id: effect.id,
      name: effect.name,
      type: effect.type,
      color: effect.color,
      height: effect.height,
      duration: effect.duration,
    })),
  };
}

function extractJsonBlock(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```json([\s\S]*?)```/i) || trimmed.match(/```([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1);
  }
  return candidate;
}

function parseAiPayload(text: string): { data: any | null; error?: string } {
  const candidate = extractJsonBlock(text);
  try {
    return { data: JSON.parse(candidate) };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'JSON parse failed',
    };
  }
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractAssistantMessageFromPayload(payload: any) {
  if (typeof payload?.assistantMessage === 'string') return payload.assistantMessage.trim();
  if (typeof payload?.message === 'string') return payload.message.trim();
  if (typeof payload?.reply === 'string') return payload.reply.trim();
  return undefined;
}

function extractAssistantMessage(text: string) {
  try {
    const parsed = parseAiPayload(text);
    if (parsed.data) {
      const message = extractAssistantMessageFromPayload(parsed.data);
      if (message) return message;
    }
  } catch {
    // ignore parse errors
  }
  const trimmed = text.trim();
  if (trimmed.length > 0 && trimmed.length < 240) {
    return trimmed;
  }
  return undefined;
}

function formatSnippet(value: string, limit = 240) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

function formatErrorDetail(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isConnectionError(message: string) {
  return /(HTTP|fetch|network|NetworkError|Failed to fetch|ECONN|timeout|unauthorized|forbidden)/i.test(
    message
  );
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applySymmetricLayout(positions: Position[]) {
  if (positions.length === 0) return;
  const count = positions.length;
  const spacing = count > 1 ? Math.min(10, 90 / (count - 1)) : 0;
  const averageZ =
    positions.reduce((sum, position) => sum + position.coordinate.z, 0) / count;
  const baseZ = clampNumber(Number(averageZ.toFixed(2)), -50, 50);
  const half = (count - 1) / 2;

  positions.forEach((position, index) => {
    const x = clampNumber(Number(((index - half) * spacing).toFixed(2)), -50, 50);
    position.coordinate = {
      ...position.coordinate,
      x,
      z: baseZ,
    };
  });
}

function normalizePlan(payload: any) {
  const warnings: string[] = [];
  const envelope = payload as PlanEnvelope;
  const rawPlan = (envelope?.plan ?? payload ?? {}) as Partial<FireworkPlan>;

  const plan: FireworkPlan = {
    version: 'v2',
    title: normalizeText(rawPlan.title),
    duration: SHOW_DURATION,
    layoutMode:
      rawPlan.layoutMode === 'text' || rawPlan.layoutMode === 'free'
        ? rawPlan.layoutMode
        : undefined,
    notes: Array.isArray(rawPlan.notes)
      ? rawPlan.notes.filter((note): note is string => typeof note === 'string').slice(0, 6)
      : undefined,
    positions: Array.isArray(rawPlan.positions) ? rawPlan.positions : [],
    events: Array.isArray(rawPlan.events) ? rawPlan.events : [],
  };

  if (!Array.isArray(rawPlan.events)) {
    warnings.push('AI 未返回事件列表，后续将自动补齐。');
  }

  if (!Array.isArray(rawPlan.positions)) {
    warnings.push('AI 未返回阵地信息，后续将自动补齐。');
  }

  plan.positions = (plan.positions ?? []).map((position) => {
    const rawPosition = position ?? {};
    const coordinate = (rawPosition as PlanPositionSpec).coordinate ?? {};
    const x = normalizeNumber(coordinate?.x);
    const z = normalizeNumber(coordinate?.z);
    return {
      name: normalizeText((rawPosition as PlanPositionSpec).name),
      color: normalizeText((rawPosition as PlanPositionSpec).color),
      coordinate: {
        x,
        z,
      },
      racks: Array.isArray((rawPosition as PlanPositionSpec).racks)
        ? (rawPosition as PlanPositionSpec).racks
        : [],
    };
  });

  plan.positions = plan.positions.map((position) => ({
    ...position,
    racks: (position.racks ?? []).map((rack) => ({
      name: normalizeText(rack.name),
      type: rack.type,
      tubeCount: normalizeNumber(rack.tubeCount),
      rotation: normalizeNumber(rack.rotation),
      config: rack.config ? { ...rack.config } : undefined,
      load: rack.load ? { ...rack.load } : undefined,
    })),
  }));

  plan.events = plan.events.map((event) => ({
    name: normalizeText(event.name),
    startTime: normalizeNumber(event.startTime),
    positionId: normalizeText(event.positionId),
    positionName: normalizeText(event.positionName),
    positionIndex:
      typeof event.positionIndex === 'number' && Number.isFinite(event.positionIndex)
        ? event.positionIndex
        : undefined,
    rackId: normalizeText(event.rackId),
    rackName: normalizeText(event.rackName),
    rackIndex:
      typeof event.rackIndex === 'number' && Number.isFinite(event.rackIndex)
        ? event.rackIndex
        : undefined,
    pattern: event.pattern,
    interval: normalizeNumber(event.interval),
    tubeIndices: Array.isArray(event.tubeIndices)
      ? event.tubeIndices.filter((idx) => Number.isInteger(idx))
      : undefined,
  }));

  const missingTimes = plan.events.filter((event) => typeof event.startTime !== 'number');
  if (missingTimes.length > 0 && plan.events.length > 0) {
    warnings.push('部分事件缺少时间，已自动均匀补齐。');
    const step = SHOW_DURATION / Math.max(1, plan.events.length + 1);
    plan.events.forEach((event, index) => {
      if (typeof event.startTime !== 'number') {
        event.startTime = Number((step * (index + 1)).toFixed(2));
      }
    });
  }

  if (plan.events.length > 0) {
    plan.events = plan.events.map((event) => ({
      ...event,
      startTime:
        typeof event.startTime === 'number'
          ? clampNumber(event.startTime, 0, SHOW_DURATION)
          : event.startTime,
    }));
  }

  if (plan.events.length > 0 && plan.events.length < MIN_EVENT_COUNT) {
    warnings.push(`事件数量不足，已自动补齐到 ${MIN_EVENT_COUNT} 条。`);
  }

  return { plan, assistantMessage: envelope?.assistantMessage, warnings };
}

function resolvePattern(value: unknown): FiringPattern {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (ALLOWED_PATTERNS.includes(lower as FiringPattern)) {
      return lower as FiringPattern;
    }
  }
  return 'all';
}

type AiTimelineEvent = {
  time?: number;
  type?: string;
  position_id?: string | number;
  position_name?: string;
  shell_type?: string;
  angle?: number;
  color?: string;
  pattern?: string;
  intensity?: number;
  trail?: string;
  phase?: string;
  description?: string;
  interval?: number;
  interval_ms?: number;
  uniformHeight?: number;
  targetHeight?: number;
};

type AiWave = {
  time?: number;
  launchTime?: number;
  description?: string;
  uniformHeight?: number;
  targetHeight?: number;
  tubes?: Array<number | string>;
  shellName?: string;
  shellType?: string;
  shellColor?: string;
  pattern?: string;
  angle?: number;
  phase?: string;
  intensity?: number;
};

interface AiTimelinePlan {
  meta?: {
    theme?: string;
    duration?: number;
    notes?: string;
  };
  timeline?: AiTimelineEvent[];
  waves?: AiWave[];
  showName?: string;
  show_name?: string;
}

type ThemeGroupKey = 'national' | 'romantic' | 'high-tech';
type ThemeGroup = ThemeGroupKey | null;

const THEME_COLOR_MAP: Record<ThemeGroupKey, string[]> = {
  national: ['red', 'gold', '#dc2626', '#ffd700'],
  romantic: ['pink', '#ff1493', '#f472b6', '#f9a8d4'],
  'high-tech': ['blue', 'cyan', '#0ea5e9', '#22d3ee'],
};

const TIMELINE_PHASE_KEYS = ['opening', 'transition', 'climax', 'finale'];
const TIMELINE_PHASE_LABELS = ['开场', '铺垫', '高潮', '收尾'];

function buildAiTimelineEntries(aiPlan: AiTimelinePlan): AiTimelineEvent[] {
  const timeline = Array.isArray(aiPlan.timeline) ? aiPlan.timeline : [];
  if (timeline.length > 0) return timeline;
  const waves = Array.isArray(aiPlan.waves) ? aiPlan.waves : [];
  if (waves.length === 0) return [];
  const entries: AiTimelineEvent[] = [];
  waves.forEach((wave, waveIndex) => {
    const baseTime = normalizeNumber(wave.time ?? wave.launchTime) ?? 0;
    const height = normalizeNumber(wave.uniformHeight ?? wave.targetHeight);
    const description =
      (wave.description || wave.shellName || `Wave ${waveIndex + 1}`).trim();
    const tubes =
      Array.isArray(wave.tubes) && wave.tubes.length > 0
        ? wave.tubes
        : [waveIndex + 1];
    tubes.forEach((tube, tubeIndex) => {
      const rawTube =
        typeof tube === 'string' ? tube.trim() : tube ?? `${waveIndex + 1}-${tubeIndex + 1}`;
      const tubeLabel =
        rawTube === '' || rawTube === null || rawTube === undefined
          ? `${waveIndex + 1}-${tubeIndex + 1}`
          : String(rawTube);
      entries.push({
        time: baseTime,
        description,
        shell_type: wave.shellName ?? wave.shellType,
        pattern: wave.pattern ?? 'all',
        angle: normalizeNumber(wave.angle),
        color: wave.shellColor,
        intensity: normalizeNumber(wave.intensity),
        phase: wave.phase,
        uniformHeight: height,
        targetHeight: height,
        position_id: `wave-${waveIndex + 1}-tube-${tubeLabel}`,
        position_name: `炮筒 ${tubeLabel}`,
      });
    });
  });
  return entries;
}

function inferThemeGroup(userText?: string, metaTheme?: string): ThemeGroup {
  const text = `${metaTheme ?? ''} ${userText ?? ''}`.toLowerCase();
  if (/(国庆|庆典|红金|祖国)/.test(text)) return 'national';
  if (/(浪漫|粉色|心)/.test(text)) return 'romantic';
  if (/(高科技|科技|未来|AI|未来感)/.test(text)) return 'high-tech';
  return null;
}

function normalizePositionIdentifier(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number') return `pos-${Math.round(value)}`;
  if (!value) return `pos-${fallback}`;
  const trimmed = String(value).trim();
  return trimmed === '' ? `pos-${fallback}` : trimmed;
}

function pickEffectForTimelineEntry(
  entry: AiTimelineEvent,
  effects: FireworkEffect[],
  fallbackEffect: FireworkEffect,
  themeGroup: ThemeGroup
): FireworkEffect {
  const normalizeToken = (token?: string) =>
    token ? token.toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
  const tokens = new Set<string>();
  [entry.shell_type, entry.type, entry.color, entry.description].forEach((value) => {
    const token = normalizeToken(value);
    if (token) tokens.add(token);
  });
  const safeThemeKey: ThemeGroupKey = themeGroup ?? 'national';
  THEME_COLOR_MAP[safeThemeKey].forEach((value) => {
    const token = normalizeToken(value);
    if (token) tokens.add(token);
  });

  const normalizedTokens = Array.from(tokens);
  const matchingEffect = effects.find((effect) =>
    normalizedTokens.some((token) => {
      const needle = token.toLowerCase();
      return (
        effect.id.toLowerCase().includes(needle) ||
        effect.name.toLowerCase().includes(needle) ||
        effect.color.toLowerCase().replace('#', '') === needle
      );
    })
  );
  if (matchingEffect) return matchingEffect;

  const colorMatch = effects.find((effect) =>
    THEME_COLOR_MAP[safeThemeKey].some((color) =>
      effect.color.toLowerCase().includes(color.replace('#', '').toLowerCase())
    )
  );
  if (colorMatch) return colorMatch;

  return fallbackEffect;
}

function convertAiTimelineToPlan(
  aiPlan: AiTimelinePlan,
  effects: FireworkEffect[],
  fallbackEffect: FireworkEffect,
  userKeyword: string,
  themeHint?: string
): { plan: FireworkPlan | null; warnings: string[] } {
  const warnings: string[] = [];
  const timelineEntries = buildAiTimelineEntries(aiPlan);
  if (timelineEntries.length === 0) {
    warnings.push('AI 未返回时间轴或排浪波次内容。');
    return { plan: null, warnings };
  }
  const duration = clampNumber(
    normalizeNumber(aiPlan.meta?.duration) ?? SHOW_DURATION,
    0,
    600
  );
  const normalized = timelineEntries
    .map((entry, index) => {
      const baseTime =
        normalizeNumber(entry.time) ?? normalizeNumber(entry.interval) ?? normalizeNumber(entry.interval_ms) ?? 0;
      return {
        ...entry,
        time: clampNumber(baseTime, 0, duration) ?? 0,
        bucketKey: normalizePositionIdentifier(entry.position_id ?? entry.position_name, index + 1),
      };
    })
    .sort((a, b) => a.time - b.time);

  const bucketMap = new Map<string, { label: string; entries: typeof normalized[number][] }>();
  normalized.forEach((entry) => {
    if (!bucketMap.has(entry.bucketKey)) {
      const baseLabel = entry.position_name?.trim() || `阵地 ${bucketMap.size + 1}`;
      bucketMap.set(entry.bucketKey, { label: baseLabel, entries: [] });
    }
    bucketMap.get(entry.bucketKey)!.entries.push(entry);
  });

  if (bucketMap.size === 0) {
    warnings.push('未能从时间轴推导出有效阵地。');
    return { plan: null, warnings };
  }

  const buckets = Array.from(bucketMap.values());
  const total = buckets.length;
  const spacing = total > 1 ? Math.min(18, 90 / (total - 1)) : 0;
  const themeGroup = inferThemeGroup(userKeyword, themeHint);
  const positions: PlanPositionSpec[] = [];
  const events: PlanEventSpec[] = [];

  buckets.forEach((bucket, bucketIndex) => {
    const x = clampNumber((bucketIndex - (total - 1) / 2) * spacing, -50, 50) ?? 0;
    const z = clampNumber(bucketIndex % 2 === 0 ? -12 : 12, -50, 50) ?? 0;
    const positionName = bucket.label || `阵地 ${bucketIndex + 1}`;
    const racks: PlanRackSpec[] = [];

    bucket.entries.forEach((entry, rackIndex) => {
      const rackName = `${positionName} 枪 ${rackIndex + 1}`;
      const effect = pickEffectForTimelineEntry(entry, effects, fallbackEffect, themeGroup);
      const rotation = normalizeNumber(entry.angle) ?? 0;
      const rack: PlanRackSpec = {
        name: rackName,
        type: 'straight',
        tubeCount: 1,
        rotation,
        config: { tilt: 90 },
        load: {
          mode: 'perTube',
          tubeEffects: [
            {
              tubeIndex: 0,
              effectId: effect.id,
              effectName: effect.name,
              effectType: effect.type,
              effectHeight: effect.height,
              effectColor: effect.color,
            },
          ],
        },
      };
      racks.push(rack);
      const patternValue = entry.pattern ?? entry.type;
      events.push({
        name: entry.description || entry.shell_type || rackName,
        startTime: clampNumber(entry.time, 0, duration) ?? 0,
        positionName,
        rackName,
        pattern: resolvePattern(patternValue),
        interval: normalizeNumber(entry.interval ?? entry.interval_ms ?? 0) ?? 0,
        tubeIndices: [0],
        track: `${positionName}-${rackName}`,
      });
    });

    positions.push({
      name: positionName,
      coordinate: { x, z },
      color: '#DC2626',
      racks,
    });
  });

  const missingPhases = TIMELINE_PHASE_KEYS
    .map((phase, idx) => {
      const phaseStart = (idx / 4) * duration;
      const phaseEnd = ((idx + 1) / 4) * duration;
      const hasPhase =
        normalized.some(
          (entry) =>
            (entry.phase?.toLowerCase() === phase) ||
            (entry.time >= phaseStart && entry.time < phaseEnd)
        );
      return hasPhase ? null : TIMELINE_PHASE_LABELS[idx];
    })
    .filter(Boolean);
  if (missingPhases.length > 0) {
    warnings.push(`未检测到${missingPhases.join('、')}阶段的节奏，请确认起承转合描述。`);
  }

  const explicitTheme = aiPlan.meta?.theme ?? aiPlan.showName ?? aiPlan.show_name;
  const normalizedShowName = aiPlan.showName ?? aiPlan.show_name;
  const showNameNote =
    normalizedShowName && normalizedShowName !== aiPlan.meta?.theme
      ? `剧目：${normalizedShowName}`
      : undefined;
  const plan: FireworkPlan = {
    version: 'v2',
    title: explicitTheme ? `${explicitTheme} 烟花秀` : 'AI 时间轴方案',
    duration,
    layoutMode: 'free',
    notes: [
      aiPlan.meta?.theme ? `主题：${aiPlan.meta.theme}` : undefined,
      showNameNote,
      aiPlan.meta?.notes ? `备注：${aiPlan.meta.notes}` : undefined,
      userKeyword ? `参考描述：${userKeyword}` : undefined,
    ].filter((note): note is string => Boolean(note)),
    positions,
    events,
  };

  return { plan, warnings };
}

function resolvePositionRack(positions: Position[], event: PlanEventSpec) {
  const normalize = (value?: string) => (value ?? '').trim().toLowerCase();

  let position =
    (event.positionId && positions.find((pos) => pos.id === event.positionId)) ||
    (event.positionName &&
      positions.find((pos) => normalize(pos.name) === normalize(event.positionName))) ||
    (typeof event.positionIndex === 'number' && positions[event.positionIndex]) ||
    positions[0];

  if (!position) return { position: null, rack: null };

  const racks = position.racks;
  let rack =
    (event.rackId && racks.find((item) => item.id === event.rackId)) ||
    (event.rackName && racks.find((item) => normalize(item.name) === normalize(event.rackName))) ||
    (typeof event.rackIndex === 'number' && racks[event.rackIndex]) ||
    racks[0];

  if (!rack && positions.length > 0) {
    const fallbackPosition = positions.find((pos) => pos.racks.length > 0);
    position = fallbackPosition ?? position;
    rack = position.racks[0];
  }

  return { position, rack };
}

function resolveEffect(
  spec: PlanEffectSpec | undefined,
  effects: FireworkEffect[],
  fallbackEffect: FireworkEffect
) {
  if (!spec) return fallbackEffect;
  const normalize = (value?: string) => (value ?? '').trim().toLowerCase();

  const byId = spec.effectId
    ? effects.find((effect) => effect.id === spec.effectId)
    : undefined;
  if (byId) return byId;

  const byName = spec.effectName
    ? effects.find((effect) => normalize(effect.name) === normalize(spec.effectName))
    : undefined;
  if (byName) return byName;

  const typeKey = spec.effectType ? String(spec.effectType).toLowerCase() : '';
  const byType = typeKey
    ? effects.find((effect) => effect.type === typeKey)
    : undefined;

  const baseEffect = byId ?? byName ?? byType ?? fallbackEffect;
  const heightOverride = normalizeNumber(spec.effectHeight);
  const colorOverride = normalizeText(spec.effectColor);

  if (heightOverride === undefined && !colorOverride && !spec.effectName) {
    return baseEffect;
  }

  const nextEffect: FireworkEffect = {
    ...baseEffect,
    height:
      heightOverride !== undefined
        ? clampNumber(heightOverride, 80, 180)
        : baseEffect.height,
    color: colorOverride ?? baseEffect.color,
    name: spec.effectName?.trim() || baseEffect.name,
    id: `${baseEffect.id}-h${Math.round(
      heightOverride ?? baseEffect.height
    )}-${(colorOverride ?? baseEffect.color).replace('#', '')}`,
  };

  return nextEffect;
}

function applyRackLoad(
  rack: Rack,
  load: PlanRackLoadSpec | undefined,
  effects: FireworkEffect[],
  fallbackEffect: FireworkEffect
) {
  if (!load) {
    rack.tubes.forEach((tube) => {
      tube.loaded = true;
      tube.effect = fallbackEffect;
      tube.isFired = false;
    });
    return;
  }

  const hasTubeEffects = Array.isArray(load.tubeEffects) && load.tubeEffects.length > 0;
  const perTube = load.mode === 'perTube' || hasTubeEffects;

  if (perTube && hasTubeEffects) {
    load.tubeEffects!.forEach((tubeSpec) => {
      const tubeIndex = normalizeNumber(tubeSpec.tubeIndex);
      if (typeof tubeIndex !== 'number') return;
      const tube = rack.tubes.find((item) => item.index === tubeIndex);
      if (!tube) return;
      const effect = resolveEffect(tubeSpec, effects, fallbackEffect);
      tube.loaded = true;
      tube.effect = effect;
      tube.isFired = false;
    });
    if (!rack.tubes.some((tube) => tube.loaded)) {
      rack.tubes.forEach((tube) => {
        tube.loaded = true;
        tube.effect = fallbackEffect;
        tube.isFired = false;
      });
    }
    return;
  }

  const effect = resolveEffect(load, effects, fallbackEffect);
  rack.tubes.forEach((tube) => {
    tube.loaded = true;
    tube.effect = effect;
    tube.isFired = false;
  });
}

function buildPositionsFromPlan(
  plan: FireworkPlan,
  effects: FireworkEffect[],
  fallbackEffect: FireworkEffect,
  requiredCount?: number | null
) {
  const warnings: string[] = [];
  const layoutMode = plan.layoutMode ?? 'symmetric';
  const sourcePositions = Array.isArray(plan.positions) ? plan.positions : [];
  const positions: Position[] = [];
  const targetCount =
    typeof requiredCount === 'number' && Number.isFinite(requiredCount) && requiredCount > 0
      ? Math.round(requiredCount)
      : null;
  const total = Math.max(1, targetCount ?? (sourcePositions.length > 0 ? sourcePositions.length : 3));
  const spacing = total > 1 ? Math.min(10, 90 / (total - 1)) : 0;
  const baseZ = 0;

  if (sourcePositions.length === 0) {
    warnings.push('已自动补齐阵地与炮架。');
  }
  if (targetCount && sourcePositions.length !== targetCount) {
    warnings.push(`阵地数量已调整为 ${targetCount} 个以符合用户要求。`);
  }

  const defaultRackSpec: PlanRackSpec = {
    name: '直排架 1',
    type: 'straight',
    tubeCount: 8,
    config: { tilt: 90 },
    load: { mode: 'all', effectType: 'peony' },
  };

  const buildDefaultPositionSpec = (index: number): PlanPositionSpec => ({
    name: `阵地 ${index + 1}`,
    coordinate: { x: (index - (total - 1) / 2) * spacing, z: baseZ },
    racks: [
      {
        ...defaultRackSpec,
        config: defaultRackSpec.config ? { ...defaultRackSpec.config } : undefined,
        load: defaultRackSpec.load ? { ...defaultRackSpec.load } : undefined,
      },
    ],
  });

  const positionSpecs = sourcePositions.length > 0 ? [...sourcePositions] : [];

  if (positionSpecs.length === 0) {
    positionSpecs.push(...Array.from({ length: total }, (_, index) => buildDefaultPositionSpec(index)));
  }

  if (positionSpecs.length < total) {
    const fallbackSpec = positionSpecs[positionSpecs.length - 1] ?? buildDefaultPositionSpec(0);
    for (let index = positionSpecs.length; index < total; index += 1) {
      positionSpecs.push({
        name: `阵地 ${index + 1}`,
        coordinate: fallbackSpec.coordinate ? { ...fallbackSpec.coordinate } : undefined,
        color: fallbackSpec.color,
        racks: (fallbackSpec.racks ?? [defaultRackSpec]).map((rack) => ({
          ...rack,
          config: rack.config ? { ...rack.config } : undefined,
          load: rack.load ? { ...rack.load } : undefined,
        })),
      });
    }
  }

  if (positionSpecs.length > total) {
    positionSpecs.length = total;
  }

  positionSpecs.forEach((positionSpec, positionIndex) => {
    const fallbackX = (positionIndex - (total - 1) / 2) * spacing;
    const fallbackZ = baseZ;
    const x = clampNumber(
      normalizeNumber(positionSpec.coordinate?.x) ?? fallbackX,
      -50,
      50
    );
    const z = clampNumber(
      normalizeNumber(positionSpec.coordinate?.z) ?? fallbackZ,
      -50,
      50
    );
    const name = positionSpec.name?.trim() || `阵地 ${positionIndex + 1}`;

    const rackSpecs = Array.isArray(positionSpec.racks) ? [...positionSpec.racks] : [];
    const racks: Rack[] = [];

    if (rackSpecs.length === 0) {
      warnings.push(`阵地「${name}」缺少炮架，已补齐默认炮架。`);
      rackSpecs.push({
        name: '直排架 1',
        type: 'straight',
        tubeCount: 8,
        config: { tilt: 90 },
        load: { mode: 'all', effectType: 'peony' },
      });
    }

    rackSpecs.forEach((rackSpec, rackIndex) => {
      const type = rackSpec.type ?? 'straight';
      const rackName = rackSpec.name?.trim() || `${type === 'matrix' ? '矩阵' : type === 'fan' ? '扇形架' : '直排架'} ${rackIndex + 1}`;
      const rotation = normalizeNumber(rackSpec.rotation) ?? 0;
      const config = rackSpec.config ?? {};

      let rack: Rack;
      if (type === 'fan') {
        const tubeCount = Math.max(1, Math.round(rackSpec.tubeCount ?? 5));
        const startAngle = normalizeNumber(config.startAngle) ?? -30;
        const endAngle = normalizeNumber(config.endAngle) ?? 30;
        const tilt = normalizeNumber(config.tilt) ?? 82;
        rack = createFanRack(rackName, tubeCount, startAngle, endAngle, tilt);
      } else if (type === 'matrix') {
        const rows = Math.max(1, Math.round(normalizeNumber(config.rows) ?? 5));
        const columns = Math.max(1, Math.round(normalizeNumber(config.columns) ?? 5));
        const spacingValue = normalizeNumber(config.spacing) ?? 0.5;
        const tilt = normalizeNumber(config.tilt) ?? 90;
        rack = createMatrixRack(rackName, rows, columns, spacingValue, tilt);
      } else {
        const tubeCount = Math.max(1, Math.round(rackSpec.tubeCount ?? 10));
        const tilt = normalizeNumber(config.tilt) ?? 90;
        rack = createStraightRack(rackName, tubeCount, tilt);
      }

      rack.rotation = rotation;
      applyRackLoad(rack, rackSpec.load, effects, fallbackEffect);
      racks.push(rack);
    });

    const position = createPosition(name, x, z, racks);
    if (positionSpec.color) {
      position.color = positionSpec.color;
    }
    positions.push(position);
  });

  if (layoutMode === 'symmetric') {
    applySymmetricLayout(positions);
  }

  return { positions, warnings };
}

function buildEventsFromPlan(positions: Position[], plan: FireworkPlan) {
  const warnings: string[] = [];
  if (positions.length === 0) {
    return { events: [], warnings: ['当前工程没有阵地，无法生成方案。'] };
  }

  const events: ShowEvent[] = [];
  const idPrefix = `ai-${Date.now()}`;
  const fallbackRacks = positions.flatMap((pos) =>
    pos.racks.map((rack) => ({ position: pos, rack }))
  );

  if (fallbackRacks.length === 0) {
    warnings.push('当前工程没有炮架，无法生成指令。');
  }

  const sourceEvents = plan.events.length > 0 ? [...plan.events] : [];

  if (sourceEvents.length < MIN_EVENT_COUNT && fallbackRacks.length > 0) {
    const needed = Math.max(0, MIN_EVENT_COUNT - sourceEvents.length);
    warnings.push('事件数量不足，已补齐默认节奏。');
    const spacing = SHOW_DURATION / Math.max(1, MIN_EVENT_COUNT + 1);
    for (let i = 0; i < needed; i += 1) {
      const entry = fallbackRacks[(sourceEvents.length + i) % fallbackRacks.length];
      sourceEvents.push({
        name: `补齐指令 ${sourceEvents.length + 1}`,
        startTime: Number(((sourceEvents.length + 1) * spacing).toFixed(2)),
        positionId: entry.position.id,
        rackId: entry.rack.id,
        pattern: 'all',
      });
    }
  }

  sourceEvents.forEach((event, index) => {
    const { position, rack } = resolvePositionRack(positions, event);
    if (!position || !rack) return;

    const startTimeRaw = typeof event.startTime === 'number' ? event.startTime : 0;
    const startTime = clampNumber(Number(startTimeRaw.toFixed(2)), 0, SHOW_DURATION);
    const pattern = resolvePattern(event.pattern);
    const interval =
      typeof event.interval === 'number' && Number.isFinite(event.interval)
        ? Math.max(0, Math.round(event.interval))
        : undefined;

    const tubeIndices = Array.isArray(event.tubeIndices)
      ? Array.from(
          new Set(
            event.tubeIndices.filter(
              (idx) => Number.isInteger(idx) && idx >= 0 && idx < rack.tubeCount
            )
          )
        )
      : [];

    events.push({
      id: `${idPrefix}-${index + 1}`,
      name: event.name?.trim() || `AI 指令 ${index + 1}`,
      startTime,
      positionId: position.id,
      rackId: rack.id,
      tubeIndices,
      pattern,
      interval,
      track: `${position.id}-${rack.id}`,
    });
  });

  return { events: events.sort((a, b) => a.startTime - b.startTime), warnings };
}

function buildCuesFromEvents(
  positions: Position[],
  events: ShowEvent[],
  fallbackEffect: FireworkEffect
): Cue[] {
  return events.map((event, index) => {
    const position = positions.find((pos) => pos.id === event.positionId);
    const rack = position?.racks.find((item) => item.id === event.rackId);
    const candidateTube = rack?.tubes[index % (rack?.tubes.length || 1)];
    const loadedTube = candidateTube?.loaded
      ? candidateTube
      : rack?.tubes.find((tube) => tube.loaded && tube.effect);
    const effect = loadedTube?.effect ?? fallbackEffect;

    return {
      id: event.id,
      name: event.name,
      position: position?.coordinate ?? { x: 0, y: 0, z: 0 },
      effect,
      startTime: event.startTime,
      track: event.track,
    };
  });
}

function computeMapBounds(positions: Position[]) {
  if (positions.length === 0) return undefined;
  const xs = positions.map((pos) => pos.coordinate.x);
  const zs = positions.map((pos) => pos.coordinate.z);
  const padding = 8;
  return {
    minX: Math.min(...xs) - padding,
    maxX: Math.max(...xs) + padding,
    minZ: Math.min(...zs) - padding,
    maxZ: Math.max(...zs) + padding,
  };
}

function buildProjectFromPlan(
  project: Project,
  plan: FireworkPlan,
  fallbackEffect: FireworkEffect,
  effects: FireworkEffect[],
  requiredPositionCount?: number | null
) {
  const { positions, warnings: positionWarnings } = buildPositionsFromPlan(
    plan,
    effects,
    fallbackEffect,
    requiredPositionCount
  );
  const { events, warnings: eventWarnings } = buildEventsFromPlan(positions, plan);
  const warnings = [...positionWarnings, ...eventWarnings];
  if (events.length === 0) {
    return { nextProject: null, warnings };
  }

  const duration = SHOW_DURATION;
  const cues = buildCuesFromEvents(positions, events, fallbackEffect);
  const mapBounds = computeMapBounds(positions);

  const nextProject: Project = {
    ...project,
    name: plan.title ? plan.title : project.name,
    positions,
    events,
    cues,
    duration,
    activityName: plan.title ? plan.title : project.activityName,
    updatedAt: new Date(),
    mapBounds: mapBounds ?? project.mapBounds,
  };

  return { nextProject, warnings };
}

export function AIAssistantPanel() {
  const { project, setProject } = useProjectStore(
    useShallow((state) => ({
      project: state.project,
      setProject: state.setProject,
    }))
  );
  const effects = useLibraryStore(
    useShallow((state) => state.effects)
  );

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [draftPlan, setDraftPlan] = useState<FireworkPlan | null>(null);
  const [draftProject, setDraftProject] = useState<Project | null>(null);
  const [planWarnings, setPlanWarnings] = useState<string[]>([]);

  // ── AI Settings (user-configurable via UI, persisted in localStorage) ──
  const [showSettings, setShowSettings] = useState(false);
  const [userApiUrl, setUserApiUrl] = useState(() =>
    localStorage.getItem('yhl_ai_url') || DEFAULT_API_URL
  );
  const [userApiKey, setUserApiKey] = useState(() =>
    localStorage.getItem('yhl_ai_key') || DEFAULT_API_KEY
  );
  const [userApiModel, setUserApiModel] = useState(() =>
    localStorage.getItem('yhl_ai_model') || DEFAULT_API_MODEL
  );

  const activeApiUrl = userApiUrl.trim() || DEFAULT_API_URL;
  const activeApiKey = userApiKey.trim() || DEFAULT_API_KEY;
  const activeApiModel = userApiModel.trim() || DEFAULT_API_MODEL;
  const hasApiConfig = activeApiUrl.length > 0;

  const saveSettings = () => {
    localStorage.setItem('yhl_ai_url', userApiUrl);
    localStorage.setItem('yhl_ai_key', userApiKey);
    localStorage.setItem('yhl_ai_model', userApiModel);
    setShowSettings(false);
    setNotice({ type: 'success', message: 'AI 设置已保存' });
  };

  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionDetail, setConnectionDetail] = useState<string | null>(null);
  const [lastAiError, setLastAiError] = useState<string | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const previewPositions = useMemo(
    () => draftProject?.positions ?? draftPlan?.positions ?? [],
    [draftProject, draftPlan]
  );
  const previewEvents = useMemo(
    () => draftProject?.events ?? draftPlan?.events ?? [],
    [draftProject, draftPlan]
  );
  const previewEventsToShow = useMemo(
    () => (showAllEvents ? previewEvents : previewEvents.slice(0, 12)),
    [previewEvents, showAllEvents]
  );
  const previewPositionNameById = useMemo(() => {
    const map = new Map<string, string>();
    previewPositions.forEach((position) => {
      if ('id' in position && position.id) {
        map.set(position.id, position.name || position.id);
      }
    });
    return map;
  }, [previewPositions]);
  const previewRackNameById = useMemo(() => {
    const map = new Map<string, string>();
    previewPositions.forEach((position) => {
      if (!('id' in position) || !position.id) return;
      position.racks?.forEach((rack) => {
        if (!('id' in rack) || !rack.id) return;
        map.set(`${position.id}:${rack.id}`, rack.name || rack.id);
      });
    });
    return map;
  }, [previewPositions]);

  const fetchChatHistory = useCallback(
    async (silent = false) => {
      setIsHistoryLoading(true);
      setHistoryError(null);
      try {
        const response = await fetch(`${CHAT_HISTORY_ENDPOINT}?type=plan`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('历史记录格式异常');
        }
        const normalized = data.map((item) => {
          const aiOutput = parseMaybeJson(item.aiOutput ?? item.ai_output ?? item.output);
          const jsonPlan =
            item.jsonPlan ??
            item.json_plan ??
            item.plan ??
            (aiOutput && typeof aiOutput === 'object' ? (aiOutput as any).jsonPlan ?? (aiOutput as any).plan : undefined);
          const assistantMessage =
            item.assistantMessage ??
            (aiOutput && typeof aiOutput === 'object' ? (aiOutput as any).assistantMessage ?? (aiOutput as any).message : undefined);
          const type =
            item.type ??
            (aiOutput && typeof aiOutput === 'object' ? (aiOutput as any).type : undefined);
          return {
            id: String(item.id ?? ''),
            prompt: String(item.prompt ?? ''),
            jsonPlan,
            assistantMessage,
            type,
            createdAt: String(item.createdAt ?? item.created_at ?? ''),
          } as ChatHistoryItem;
        });
        const filtered = normalized.filter((item) => item.type === 'plan' || item.jsonPlan);
        setChatHistory(filtered.slice(0, 10));
      } catch (err) {
        const detail = formatErrorDetail(err);
        setHistoryError(detail);
        if (!silent) {
          setNotice({ type: 'error', message: '历史记录加载失败。' });
        }
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [setNotice]
  );

  const persistChatHistory = useCallback(
    async (
      prompt: string,
      payload?: { plan?: FireworkPlan | null; assistantMessage?: string; type?: 'plan' | 'chat' }
    ) => {
      if (!prompt) return;
      const logType = payload?.type ?? (payload?.plan ? 'plan' : 'chat');
      const aiOutput =
        payload?.assistantMessage || payload?.plan
          ? {
              type: logType,
              assistantMessage: payload?.assistantMessage ?? '',
              jsonPlan: payload?.plan ?? undefined,
            }
          : undefined;

      try {
        const response = await fetch(CHAT_HISTORY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            jsonPlan: payload?.plan ?? undefined,
            assistantMessage: payload?.assistantMessage ?? undefined,
            type: logType,
            aiOutput,
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        fetchChatHistory(true);
      } catch (err) {
        const detail = formatErrorDetail(err);
        setHistoryError(detail);
        setNotice({ type: 'error', message: '历史记录保存失败。' });
      }
    },
    [fetchChatHistory, setHistoryError, setNotice]
  );

  const saveChatPlan = useCallback(
    async (prompt: string, plan: FireworkPlan, assistantMessage: string) => {
      try {
        const response = await fetch('/api/save-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            plan,
            assistantMessage,
            type: 'plan',
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        fetchChatHistory(true);
      } catch (err) {
        const detail = formatErrorDetail(err);
        setHistoryError(detail);
        setNotice({ type: 'error', message: '对话数据保存失败。' });
      }
    },
    [fetchChatHistory, setHistoryError, setNotice]
  );

  const resolveEventPositionName = (event: PlanEventSpec | ShowEvent) => {
    if ('positionName' in event && event.positionName) {
      return event.positionName;
    }
    if ('positionIndex' in event && typeof event.positionIndex === 'number') {
      const position = previewPositions[event.positionIndex];
      if (position?.name) return position.name;
    }
    if ('positionId' in event && event.positionId) {
      return previewPositionNameById.get(event.positionId) || '未命名阵地';
    }
    return '未命名阵地';
  };

  const resolveEventRackName = (event: PlanEventSpec | ShowEvent) => {
    if ('rackName' in event && event.rackName) {
      return event.rackName;
    }
    if (
      'positionIndex' in event &&
      typeof event.positionIndex === 'number' &&
      'rackIndex' in event &&
      typeof event.rackIndex === 'number'
    ) {
      const position = previewPositions[event.positionIndex];
      const rack = position?.racks?.[event.rackIndex];
      if (rack?.name) return rack.name;
    }
    if ('positionId' in event && 'rackId' in event && event.positionId && event.rackId) {
      return previewRackNameById.get(`${event.positionId}:${event.rackId}`) || '未命名炮架';
    }
    return '未命名炮架';
  };

  const profile = useMemo(() => {
    if (!project) return null;
    return buildProjectProfile(project, effects);
  }, [project, effects]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const sendToAi = async () => {
    const sanitized = sanitizeUserInput(input);
    if (!sanitized) {
      setNotice({ type: 'error', message: '请输入主题或问题。' });
      return;
    }

    const wantsPlan = shouldGeneratePlan(sanitized);
    const planText = wantsPlan ? stripPlanTrigger(sanitized) : '';
    if (wantsPlan && !planText) {
      setNotice({ type: 'error', message: `请在“${PLAN_TRIGGER}”后补充主题或需求。` });
      return;
    }
    const requestedPositionCount = wantsPlan ? extractPositionCount(planText) : null;
    const patternHint = wantsPlan ? detectPatternTypeFromText(planText) : null;
    const textFallback = wantsPlan ? extractTextToRender(planText) ?? '' : '';
    if (!hasApiConfig) {
      if (!wantsPlan || !patternHint) {
        setNotice({ type: 'error', message: '请点击右上角 ⚙️ 配置 AI 地址与密钥。' });
        return;
      }
    }
    if (wantsPlan && !project) {
      setNotice({ type: 'error', message: '当前没有可用工程，无法生成方案。' });
      return;
    }

    const userMessage: UiMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: sanitized,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsBusy(true);
    setLastAiError(null);

    const history = [...messages, userMessage].slice(-6).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    if (!wantsPlan) {
      try {
        const aiMessages = [
          { role: 'system' as const, content: CHAT_SYSTEM_RULES },
          ...history,
        ];
        const responseText = await requestAiChat(aiMessages, {
          apiUrl: activeApiUrl || undefined,
          apiKey: activeApiKey || undefined,
          model: activeApiModel || undefined,
        });
        setIsConnected(true);
        setConnectionDetail(null);
        const assistantContent = extractAssistantMessage(responseText) ?? responseText.trim();
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: assistantContent || '收到。',
            createdAt: Date.now(),
          },
        ]);
        persistChatHistory(sanitized, {
          assistantMessage: assistantContent || '收到。',
          type: 'chat',
        });
      } catch (err) {
        const detail = formatErrorDetail(err);
        setNotice({ type: 'error', message: 'AI 对话出错，请查看错误详情。' });
        setLastAiError(detail);
        if (isConnectionError(detail)) {
          setIsConnected(false);
          setConnectionDetail(`连接异常：${detail}`);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: `AI 对话出错：${detail}`,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const activeProject = project;
    if (!activeProject) {
      setNotice({ type: 'error', message: '当前没有可用工程，无法生成方案。' });
      setIsBusy(false);
      return;
    }

    try {
      const promptLines = [
        `主题: ${planText}`,
        `编排要求: 使用上下文中的阵地/炮架/效果资产，方案与主题色彩和阵地布局呼应；未说明时长默认 ${SHOW_DURATION} 秒；整体节奏要有规律感。`,
        patternHint ? `图案倾向: ${patternHint}` : '图案未指定，请结合语义判断。',
        textFallback ? `文字内容参考: ${textFallback}` : '',
        `参考上下文(JSON): ${JSON.stringify(profile)}`,
      ].filter(Boolean);

      const fallbackEffect = effects[0] ?? DEFAULT_EFFECT;
      let planDuration = SHOW_DURATION;
      let assistantMessage = '';
      let aiTimeline: AiTimelinePlan | null = null;
      let usedFallback = false;
      let fallbackReason = '';
      let fallbackTemplate: PatternTemplate | null = null;
      const conversionWarnings: string[] = [];
      let generatedPlan: FireworkPlan | null = null;
      const fallbackTemplateWarnings: string[] = [];
      const fallbackPlanWarnings: string[] = [];

      if (hasApiConfig) {
        try {
          const aiMessages = [
            { role: 'system' as const, content: TIMELINE_SYSTEM_RULES },
            ...history,
            {
              role: 'user' as const,
              content: promptLines.join('\n'),
            },
          ];
          const responseText = await requestAiChat(aiMessages, {
            apiUrl: activeApiUrl || undefined,
            apiKey: activeApiKey || undefined,
            model: activeApiModel || undefined,
          });
          setIsConnected(true);
          setConnectionDetail(null);

          const { data, error } = parseAiPayload(responseText);
          if (!data) {
            const snippet = formatSnippet(responseText);
            const detail = error || 'AI 返回无法解析 JSON';
            throw new Error(snippet ? `${detail} | 响应片段: ${snippet}` : detail);
          }

          // 检测是否为高级指令格式（新格式）
          const commandsList = data.directives || data.commands;

          if (commandsList && Array.isArray(commandsList)) {
            const advancedPlan = data as AdvancedPlan;
            assistantMessage = advancedPlan.description || advancedPlan.assistantMessage || '';
            planDuration =
              advancedPlan.duration && advancedPlan.duration > 0
                ? advancedPlan.duration
                : SHOW_DURATION;

            // ========== 智能场景检查 (Smart Stage Check) ==========
            // 检查当前场景容量
            const currentTubeCount = activeProject.positions.reduce(
              (sum, pos) => sum + pos.racks.reduce((rackSum, rack) => rackSum + rack.tubeCount, 0),
              0
            );
            const hasUsableStage =
              activeProject.positions.length > 0 &&
              activeProject.positions.some((pos) => pos.racks.length > 0) &&
              currentTubeCount > 0;

            // 🔧 修复：仅在无有效阵地/炮架时才自动切换标准舞台，避免覆盖用户自定义阵地
            let projectForDirectives = activeProject;

            if (!hasUsableStage) {
              console.log('🎉 场景炮筒不足或未配置阵地，使用标准专业舞台...');
              const { createStandardProStageProject } = await import('../../services/StageManager');
              projectForDirectives = createStandardProStageProject();

              conversionWarnings.push(
                `ℹ️ 自动使用标准专业舞台：前沿 5 个扇形架 + 中央 3 个直排架 + 后方 2 个矩阵（原场景阵地/炮架不足）`
              );
            }

            // 使用指令解释器将高级指令翻译成详细事件
            const interpreterContext = {
              positions: projectForDirectives.positions,
              effects,
              duration: planDuration,
            };

            const { events: interpretedEvents, warnings: interpreterWarnings } = interpretCommands(
              commandsList,
              interpreterContext
            );

            conversionWarnings.push(...interpreterWarnings);
            conversionWarnings.push(
              `✨ 使用高级指令系统：${commandsList.length} 条宏指令 → ${interpretedEvents.length} 条时间轴事件`
            );

            // 直接构建最终项目，保持 positions 和 events 的 ID 一致性
            const cues = interpretedEvents.map((event) => {
              const position = projectForDirectives.positions.find((pos) => pos.id === event.positionId);
              const rack = position?.racks.find((r) => r.id === event.rackId);
              const effectSpec: PlanEffectSpec = {
                effectName: event.effectName,
                effectHeight: event.effectHeight,
                effectColor: event.effectColor,
              };
              const effect = resolveEffect(effectSpec, effects, fallbackEffect);

              if (rack) {
                const targetTubes =
                  event.tubeIndices && event.tubeIndices.length > 0
                    ? event.tubeIndices
                    : rack.tubes.map((tube) => tube.index);

                targetTubes.forEach((tubeIndex) => {
                  const tube = rack.tubes[tubeIndex];
                  if (tube) {
                    tube.loaded = true;
                    tube.effect = effect;
                    tube.isFired = false;
                  }
                });
              }

              return {
                id: event.id,
                name: event.name,
                position: position?.coordinate || { x: 0, y: 0, z: 0 },
                effect,
                startTime: event.startTime,
                track: event.track,
              };
            });

            // 🔥 修复：计算实际的总时长（最后一个事件的结束时间）
            const actualDuration = interpretedEvents.length > 0
              ? Math.max(...interpretedEvents.map(e => e.startTime)) + 3 // 加上最后一个事件的持续时间
              : planDuration;

            // 直接设置 draftProject，跳过 buildProjectFromPlan
            const directProject: Project = {
              ...projectForDirectives,
              name: advancedPlan.title || planText,
              activityName: advancedPlan.title || planText,
              events: interpretedEvents,
              cues,
              duration: actualDuration,
              updatedAt: new Date(),
            };

            // 设置 draftProject 和 draftPlan
            setDraftProject(directProject);
            setDraftPlan({
              version: 'v2',
              title: advancedPlan.title || planText,
              duration: planDuration,
              layoutMode: 'free',
              notes: [
                `高级指令: ${commandsList.map((c: AdvancedCommand) => c.type).join(', ')}`,
              ],
              positions: [], // 不需要，因为我们直接使用 directProject
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
            });
            setPlanWarnings(conversionWarnings);
            setShowAllEvents(false);

            // 生成助手消息
            const positionCount = directProject.positions.length;
            const rackCount = directProject.positions.reduce((sum, position) => sum + position.racks.length, 0);
            const summary = `方案概要：${positionCount} 个阵地 / ${rackCount} 个炮架 / ${directProject.events.length} 条指令，时长 ${Math.round(directProject.duration)} 秒。`;
            const assistantContent = assistantMessage
              ? `${assistantMessage}\n${summary}`
              : summary;

            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}-assistant`,
                role: 'assistant',
                content: assistantContent,
                createdAt: Date.now(),
              },
            ]);

            // 保存到历史
            saveChatPlan(sanitized, {
              version: 'v2',
              title: advancedPlan.title || planText,
              duration: planDuration,
              layoutMode: 'free',
              notes: [],
              positions: [],
              events: [],
            }, assistantContent);

            if (autoApply) {
              setProject(directProject);
              setNotice({ type: 'success', message: '已应用 AI 方案到工作台。' });
            }

            // 跳过后续的通用处理流程
            setIsBusy(false);
            return;
          } else {
            // 旧格式：waves/timeline
            aiTimeline = data as AiTimelinePlan;
            assistantMessage = extractAssistantMessageFromPayload(data) ?? '';
          }
        } catch (err) {
          const detail = formatErrorDetail(err);
          usedFallback = true;
          fallbackReason = detail;
          setLastAiError(detail);
          if (isConnectionError(detail)) {
            setIsConnected(false);
            setConnectionDetail(`连接异常：${detail}`);
          } else {
            setIsConnected(true);
            setConnectionDetail(`响应解析异常：${detail}`);
          }
        }
      } else {
        usedFallback = true;
        fallbackReason = 'AI 未配置';
      }

      if (aiTimeline) {
        const timelineTheme =
          aiTimeline.meta?.theme ?? aiTimeline.showName ?? aiTimeline.show_name ?? planText;
        const conversion = convertAiTimelineToPlan(
          aiTimeline,
          effects,
          fallbackEffect,
          planText,
          timelineTheme
        );
        conversionWarnings.push(...conversion.warnings);
        if (conversion.plan) {
          generatedPlan = conversion.plan;
        } else {
          usedFallback = true;
          fallbackReason = conversion.warnings.join('；') || fallbackReason;
        }
      }

      if (!generatedPlan) {
        const normalizedTemplate = normalizePatternTemplate(
          createPatternFallbackEnvelope(patternHint, textFallback),
          planText
        );
        fallbackTemplateWarnings.push(...normalizedTemplate.warnings);
        if (!normalizedTemplate.template) {
          throw new Error('AI 未返回 patternType，无法生成图案。');
        }
        fallbackTemplate = normalizedTemplate.template;
        const fallbackPlan = buildTextPlan(fallbackTemplate, effects, requestedPositionCount);
        if (!fallbackPlan) {
          throw new Error('图案模板生成失败。');
        }
        generatedPlan = fallbackPlan.plan;
        fallbackPlanWarnings.push(...fallbackPlan.warnings);
        if (usedFallback && fallbackReason) {
          fallbackPlanWarnings.push(
            `AI 响应异常，已使用本地规则生成图案（${fallbackReason}）`
          );
        }
      }

      if (!generatedPlan) {
        throw new Error('未生成方案，请调整描述。');
      }

      const normalized = normalizePlan(generatedPlan);

      // 使用当前项目（不再进行扩容）
      const projectForBuild = activeProject;

      const { nextProject, warnings } = buildProjectFromPlan(
        projectForBuild,
        normalized.plan,
        fallbackEffect,
        effects,
        null
      );
      const allWarnings = [
        ...conversionWarnings,
        ...fallbackTemplateWarnings,
        ...fallbackPlanWarnings,
        ...normalized.warnings,
        ...warnings,
      ];

      setDraftPlan(normalized.plan);
      setShowAllEvents(false);
      setPlanWarnings(allWarnings);
      setDraftProject(nextProject);

      const positionCount = nextProject?.positions.length ?? 0;
      const rackCount = nextProject
        ? nextProject.positions.reduce((sum, position) => sum + position.racks.length, 0)
        : 0;
      const summary =
        nextProject
          ? `方案概要：${positionCount} 个阵地 / ${rackCount} 个炮架 / ${nextProject.events.length} 条指令，时长 ${Math.round(nextProject.duration)} 秒。`
          : '';

      const textTemplate =
        fallbackTemplate && isTextPatternTemplate(fallbackTemplate)
          ? fallbackTemplate
          : null;
      const fallbackAssistant = textTemplate
        ? `已生成“${textTemplate.content}”文字图案，空中画布将逐步显现字形。`
        : fallbackTemplate?.patternType === 'HEART'
          ? '已生成爱心图案，爆点高度已自动适配空间画布。'
          : fallbackTemplate?.patternType === 'CUBE'
            ? '已生成立方体图案，立体边缘将逐步点亮。'
            : '方案已生成，可应用到工作台。';

      const assistantContent =
        assistantMessage || normalized.assistantMessage || fallbackAssistant
          ? `${assistantMessage || normalized.assistantMessage || fallbackAssistant}${summary ? `\n${summary}` : ''}`
          : nextProject
            ? summary || '方案已生成，可应用到工作台。'
            : '未生成方案，请调整描述。';

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: assistantContent,
          createdAt: Date.now(),
        },
      ]);
      saveChatPlan(sanitized, normalized.plan, assistantContent);

      if (autoApply && nextProject) {
        setProject(nextProject);
        setNotice({ type: 'success', message: '已应用 AI 方案到工作台。' });
      }
    } catch (err) {
      const detail = formatErrorDetail(err);
      const message = hasApiConfig
        ? 'AI 对话出错，请查看错误详情。'
        : '请点击右上角 ⚙️ 配置 AI 地址与密钥。';
      setNotice({ type: 'error', message });
      setLastAiError(detail);
      if (isConnectionError(detail)) {
        setIsConnected(false);
        setConnectionDetail(`连接异常：${detail}`);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: `AI 对话出错：${detail}`,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConnect = async (silent = false) => {
    if (!hasApiConfig) {
      if (!silent) {
        setNotice({ type: 'error', message: '请点击右上角 ⚙️ 配置 AI 地址与密钥。' });
      }
      return;
    }
    setIsTesting(true);
    setConnectionDetail(null);
    try {
      const response = await requestAiChat(
        [
          {
            role: 'system',
            content: '仅返回 JSON {"ok": true}，不要附加其他文本。',
          },
          {
            role: 'user',
            content: 'ping',
          },
        ],
        {
          apiUrl: activeApiUrl || undefined,
          apiKey: activeApiKey || undefined,
          model: activeApiModel || undefined,
        }
      );
      const { data, error } = parseAiPayload(response);
      const ok = !!data && (data.ok === true || data.status === 'ok');
      const snippet = formatSnippet(response);
      const fallbackOk = !ok && snippet.length > 0;
      const detail = !ok && error ? `响应解析异常：${error}` : '';
      if (!silent) {
        setNotice({
          type: ok || fallbackOk ? 'success' : 'error',
          message: ok || fallbackOk ? '已连接。' : '连接异常，请查看详情。',
        });
      }
      if (ok || fallbackOk) {
        setIsConnected(true);
        setLastAiError(null);
        if (!ok && snippet) {
          setConnectionDetail(
            `连接成功，但响应未按预期返回 JSON。${detail ? `${detail}。` : ''}片段: ${snippet}`
          );
        } else {
          setConnectionDetail(null);
        }
      } else {
        setIsConnected(false);
        setConnectionDetail(detail || '连接响应为空。');
      }
    } catch (err) {
      const detail = formatErrorDetail(err);
      setIsConnected(false);
      setConnectionDetail(`连接异常：${detail}`);
      if (!silent) {
        setNotice({ type: 'error', message: '连接异常，请查看详情。' });
      }
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (!hasApiConfig) return;
    handleConnect(true);
  }, [hasApiConfig]);

  useEffect(() => {
    fetchChatHistory(true);
  }, [fetchChatHistory]);

  const handleApply = () => {
    if (!draftProject) {
      setNotice({ type: 'error', message: '当前没有可应用的方案。' });
      return;
    }
    setProject(draftProject);
    setNotice({ type: 'success', message: '方案已应用到工作台。' });
  };

  const handleResetChat = () => {
    setMessages([]);
    setDraftPlan(null);
    setDraftProject(null);
    setPlanWarnings([]);
    setShowAllEvents(false);
    setLastAiError(null);
  };

  return (
    <div className="h-full w-full p-4 bg-app-bg overflow-hidden">
      {notice && (
        <div
          className={`mb-3 px-3 py-2 rounded border text-sm flex items-center gap-2 ${
            notice.type === 'success'
              ? 'border-success/40 bg-success/15 text-success'
              : 'border-danger/50 bg-danger/15 text-danger'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 h-full">
        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-primary" />
              <div className="text-sm font-semibold text-text-main">AI 对话</div>
              <div className="text-xs text-text-secondary">
                大师模式 · 输入“生成方案”触发方案
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-text-secondary">
                {isBusy ? '处理中…' : '就绪'}
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 rounded hover:bg-panel-border/50 text-text-secondary hover:text-text-main transition-colors"
                title="AI 设置"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="px-4 py-3 border-b border-panel-border bg-app-bg/80 space-y-2">
              <div className="text-xs font-semibold text-text-main mb-2">⚙️ AI 配置</div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-text-secondary">API 地址</label>
                  <input
                    type="text"
                    value={userApiUrl}
                    onChange={(e) => setUserApiUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1"
                    className="w-full px-2 py-1 text-xs bg-app-bg border border-panel-border rounded text-text-main placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary">API 密钥</label>
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-2 py-1 text-xs bg-app-bg border border-panel-border rounded text-text-main placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary">模型</label>
                  <input
                    type="text"
                    value={userApiModel}
                    onChange={(e) => setUserApiModel(e.target.value)}
                    placeholder="xiaomi/mimo-v2-flash:free"
                    className="w-full px-2 py-1 text-xs bg-app-bg border border-panel-border rounded text-text-main placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveSettings}
                  className="px-3 py-1 text-xs bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1 text-xs text-text-secondary border border-panel-border rounded hover:bg-panel-border/50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                输入“生成方案 + 主题/节奏/色彩”生成方案，或直接聊天咨询
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`mt-0.5 h-8 w-8 shrink-0 rounded-full border flex items-center justify-center ${
                          isUser
                            ? 'border-primary/50 bg-primary/20 text-primary'
                            : 'border-panel-border bg-app-bg text-text-secondary'
                        }`}
                      >
                        {isUser ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className="max-w-[78%]">
                        <div
                          className={`text-[10px] mb-1 ${
                            isUser ? 'text-right text-text-secondary' : 'text-text-secondary'
                          }`}
                        >
                          {isUser ? '你' : 'AI'}
                        </div>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words border ${
                            isUser
                              ? 'bg-primary/25 text-text-main border-primary/50 rounded-br-sm'
                              : 'bg-app-bg text-text-secondary border-panel-border rounded-bl-sm'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-panel-border p-3 bg-app-bg">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isTesting ? 'bg-warning' : isConnected ? 'bg-success' : 'bg-danger'
                  }`}
                />
                <span>{isTesting ? '自动连接中' : isConnected ? '已连接' : '连接异常'}</span>
                {!isConnected && !isTesting && (
                  <span className="text-[10px] text-text-secondary">
                    可直接发送，系统会自动尝试连接
                  </span>
                )}
              </div>
            </div>
            {connectionDetail && (
              <div
                className={`mb-2 text-[10px] whitespace-pre-wrap rounded border px-2 py-1 ${
                  isConnected
                    ? 'border-warning/40 bg-warning/10 text-warning'
                    : 'border-danger/40 bg-danger/10 text-danger'
                }`}
              >
                连接详情：{connectionDetail}
              </div>
            )}
            {lastAiError && (
              <div className="mb-2 text-[10px] whitespace-pre-wrap rounded border border-danger/40 bg-danger/10 text-danger px-2 py-1">
                对话错误：{lastAiError}
              </div>
            )}
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (!isBusy && !isTesting) {
                    sendToAi();
                  }
                }
              }}
              className="w-full h-20 resize-none bg-panel-bg border border-panel-border rounded px-3 py-2 text-sm text-text-main"
              placeholder="输入“生成方案 + 需求”生成方案；不含“生成方案”则聊天（回车发送，Shift+回车换行）"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
              <div>已启用规则过滤与默认补齐 · 输入包含“生成方案”才会生成方案</div>
              <button
                onClick={sendToAi}
                disabled={isBusy || isTesting}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium ${
                  isBusy || isTesting
                    ? 'bg-panel-border text-text-secondary cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}
              >
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                发送
              </button>
            </div>
          </div>
        </div>

        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
            <div>
              <div className="text-sm font-semibold text-text-main">方案预览</div>
              <div className="text-xs text-text-secondary">可直接应用到时间轴</div>
            </div>
            <label className="text-xs text-text-secondary flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoApply}
                onChange={(event) => setAutoApply(event.target.checked)}
                className="accent-primary"
              />
              自动应用
            </label>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4 text-sm">
            {!draftPlan ? (
              <div className="text-text-secondary text-sm">
                {!hasApiConfig
                  ? '请点击右上角 ⚙️ 配置 AI 地址与密钥。'
                  : `输入包含“${PLAN_TRIGGER}”的描述后生成方案。`}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-app-bg border border-panel-border rounded-lg p-3">
                  <div className="text-sm font-semibold text-text-main">
                    {draftPlan.title || '未命名方案'}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    时长：{draftPlan.duration ? draftPlan.duration.toFixed(0) : '-'} 秒
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    事件数：{previewEvents.length}
                  </div>
                </div>

                {previewPositions.length > 0 && (
                  <div className="bg-app-bg border border-panel-border rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-2">阵地与炮架</div>
                    <div className="space-y-2 text-xs text-text-main">
                      {previewPositions.map((position, index) => (
                        <div key={`${position.name ?? 'pos'}-${index}`}>
                          <div>
                            {position.name || `阵地 ${index + 1}`}
                            {position.coordinate?.x !== undefined && position.coordinate?.z !== undefined && (
                              <span className="text-text-secondary">
                                {' '}
                                ({position.coordinate.x}, {position.coordinate.z})
                              </span>
                            )}
                          </div>
                          {position.racks && position.racks.length > 0 && (
                            <div className="text-text-secondary">
                              炮架：{position.racks.map((rack, rackIndex) => rack.name || `炮架 ${rackIndex + 1}`).join(' / ')}
                            </div>
                          )}
                          {position.racks && position.racks.length > 0 && (
                            <div className="text-text-secondary">
                              装填：
                              {position.racks.map((rack) => {
                                if ('tubes' in rack) {
                                  const names = Array.from(
                                    new Set(
                                      rack.tubes
                                        .map((tube) => tube.effect?.name)
                                        .filter((name): name is string => typeof name === 'string')
                                    )
                                  );
                                  return names.length > 0 ? names.join('/') : '默认';
                                }
                                if ('load' in rack && rack.load) {
                                  return rack.load.effectName || rack.load.effectId || rack.load.effectType || '默认';
                                }
                                return '默认';
                              }).join(' · ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {draftPlan.notes && draftPlan.notes.length > 0 && (
                  <div className="bg-app-bg border border-panel-border rounded-lg p-3">
                    <div className="text-xs text-text-secondary mb-2">补充说明</div>
                    <div className="space-y-1 text-xs text-text-main">
                      {draftPlan.notes.map((note, index) => (
                        <div key={`${note}-${index}`}>- {note}</div>
                      ))}
                    </div>
                  </div>
                )}

                {previewEvents.length > 0 && (
                  <div className="bg-app-bg border border-panel-border rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                      <div>燃放指令</div>
                      {previewEvents.length > 12 && (
                        <button
                          type="button"
                          onClick={() => setShowAllEvents((value) => !value)}
                          className="text-primary hover:text-primary-hover"
                        >
                          {showAllEvents ? '收起' : `显示全部 (${previewEvents.length})`}
                        </button>
                      )}
                    </div>
                    <div
                      className={`space-y-1 text-xs text-text-main ${
                        showAllEvents ? 'max-h-64 overflow-auto pr-1' : ''
                      }`}
                    >
                      {previewEventsToShow.map((event, index) => (
                        <div key={`${event.name ?? 'evt'}-${index}`}>
                          {typeof event.startTime === 'number'
                            ? `${event.startTime.toFixed(2)}s`
                            : '--'}{' '}
                          {event.name || `指令 ${index + 1}`} · {resolveEventPositionName(event)} /{' '}
                          {resolveEventRackName(event)} · {resolvePattern(event.pattern)} ·{' '}
                          {event.tubeIndices && event.tubeIndices.length > 0
                            ? `筒 ${event.tubeIndices.map((idx) => idx + 1).join(',')}`
                            : '全部'}
                        </div>
                      ))}
                      {!showAllEvents && previewEvents.length > 12 && (
                        <div className="text-text-secondary">…还有 {previewEvents.length - 12} 条</div>
                      )}
                    </div>
                  </div>
                )}

                {planWarnings.length > 0 && (
                  <div className="bg-danger/10 border border-danger/40 rounded-lg p-3 text-xs text-danger space-y-1">
                    {planWarnings.map((warning, index) => (
                      <div key={`${warning}-${index}`}>- {warning}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="bg-app-bg border border-panel-border rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                <div>编排历史（最近 10 条）</div>
                <button
                  type="button"
                  onClick={() => fetchChatHistory(false)}
                  className="text-primary hover:text-primary-hover"
                >
                  刷新
                </button>
              </div>
              {isHistoryLoading ? (
                <div className="text-xs text-text-secondary">加载中…</div>
              ) : historyError ? (
                <div className="text-xs text-danger">历史记录加载失败</div>
              ) : chatHistory.length === 0 ? (
                <div className="text-xs text-text-secondary">暂无编排记录</div>
              ) : (
                <div className="space-y-2 text-xs text-text-main">
                  {chatHistory.map((item) => (
                    <div key={item.id} className="border border-panel-border rounded p-2">
                      <div className="text-text-secondary">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '未知时间'}
                      </div>
                      <div className="mt-1">{formatSnippet(item.prompt || '未命名主题', 80)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <FrontViewPlannerPanel />
          </div>
          <div className="border-t border-panel-border p-3 bg-app-bg flex items-center gap-2">
            <button
              onClick={handleApply}
              disabled={!draftProject}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                draftProject
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
              }`}
            >
              应用方案
            </button>
            <button
              onClick={handleResetChat}
              className="px-3 py-2 rounded text-sm bg-panel-bg border border-panel-border text-text-secondary hover:bg-panel-border"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


