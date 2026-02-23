# Advanced AI Assistant System

## 概述

本系统为烟花编排 AI 助手提供了强大的高级指令能力，让 AI 能够理解和生成复杂的编排模式（如排浪、对称、级联等），而无需计算每个炮筒的具体坐标和点火时间。

## 核心设计理念

**关键原则**：将"排浪"和"对称"的逻辑封装成工具/指令，让内置 AI 可以调用，而不是让内置 AI 去计算每一个点的坐标。

### 架构

```
用户输入 → AI 理解意图 → 输出高级指令 → 前端解释器 → 详细时间轴事件
```

## 文件结构

### 1. 类型定义 (`src/types/advancedCommands.ts`)

定义了 7 种高级指令类型：

- **SalvoCommand** (齐射): 多个炮筒同时点火
- **WaveCommand** (排浪): 按照对称模式依次点火
- **SymmetryCommand** (对称): 镜像对称点火
- **CascadeCommand** (级联): 多个阵地依次点火
- **BurstCommand** (爆发): 高密度快速点火
- **SweepCommand** (扫射): 扇形扫射
- **FinaleCommand** (终场): 全场大终结

### 2. 指令解释器 (`src/services/commandInterpreter.ts`)

负责将高级指令翻译成详细的时间轴事件：

- `interpretCommands()`: 主解释函数
- `calculateWaveSequence()`: 计算排浪序列
  - `open_wings`: 从中心向两边展开
  - `close_in`: 从两边向中心合拢
  - `left_to_right`: 从左到右
  - `right_to_left`: 从右到左
- `createSymmetricPairs()`: 创建对称配对
- 各种辅助函数处理具体的指令类型

### 3. 增强的 System Prompt (`src/services/advancedPrompts.ts`)

包含：

- **ADVANCED_MASTER_PERSONA**: AI 的角色定位
- **ADVANCED_TIMELINE_RULES**: 详细的指令使用规则和示例
- **ADVANCED_CHAT_RULES**: 对话模式的规则
- **buildAdvancedContext()**: 动态注入当前工程信息

## 使用示例

### AI 输入（用户请求）

```
生成方案 国庆大开场，要有排浪和对称效果
```

### AI 输出（高级指令）

```json
{
  "version": "advanced-v1",
  "title": "国庆盛典开场秀",
  "duration": 60,
  "commands": [
    {
      "type": "wave",
      "time": 0,
      "pattern": "open_wings",
      "group": "all",
      "duration": 3,
      "shell": "Red_Peony",
      "description": "红色牡丹展翅开场"
    },
    {
      "type": "symmetry",
      "time": 5,
      "axis": "center",
      "positions": ["all"],
      "shell": "Gold_Chrysanthemum",
      "delay": 200,
      "description": "对称金菊齐射"
    }
  ]
}
```

### 解释器输出（详细事件）

解释器会自动将上述 2 条高级指令翻译成几十条详细的时间轴事件，包括：
- 每个炮筒的精确点火时间
- 对称配对的计算
- 排浪序列的生成
- 所有的数学计算和逻辑处理

## 集成步骤

### 1. 导入新模块

在 `AIAssistantPanel.tsx` 中添加：

```typescript
import { AdvancedPlan } from '../../types/advancedCommands';
import { interpretCommands } from '../../services/commandInterpreter';
import {
  ADVANCED_TIMELINE_RULES,
  ADVANCED_CHAT_RULES,
  buildAdvancedContext,
} from '../../services/advancedPrompts';
```

### 2. 替换 System Prompt

```typescript
const CHAT_SYSTEM_RULES = ADVANCED_CHAT_RULES;
const TIMELINE_SYSTEM_RULES = ADVANCED_TIMELINE_RULES;
```

### 3. 注入上下文信息

在发送给 AI 的 prompt 中包含：

```typescript
const advancedContext = buildAdvancedContext({
  positions: [...],  // 当前阵地信息
  effects: [...],    // 可用效果列表
  duration: 60,      // 时长
});
```

### 4. 处理 AI 响应

```typescript
if (isAdvancedPlan(data)) {
  const { events, warnings } = interpretCommands(
    data.commands,
    { positions, effects, duration }
  );
  // 使用解释后的事件
}
```

## 优势

### 1. AI 侧

- ✅ 只需输出高级意图，无需计算坐标
- ✅ 更容易理解和生成正确的方案
- ✅ 输出更简洁（2-10 条指令 vs 几百条事件）
- ✅ 更符合人类的思维方式

### 2. 前端侧

- ✅ 复杂逻辑在前端代码中，易于维护和调试
- ✅ 可以精确控制每个细节
- ✅ 性能更好（本地计算）
- ✅ 可以添加更多高级指令类型

### 3. 用户侧

- ✅ 更智能的 AI 响应
- ✅ 更复杂的编排效果
- ✅ 更快的生成速度
- ✅ 更好的艺术表现力

## 扩展性

### 添加新指令类型

1. 在 `advancedCommands.ts` 中定义新的接口
2. 在 `commandInterpreter.ts` 中实现解释逻辑
3. 在 `advancedPrompts.ts` 中添加使用说明
4. 更新 AI 示例

### 示例：添加 "Spiral" 指令

```typescript
// 1. 定义类型
export interface SpiralCommand extends BaseCommand {
  type: 'spiral';
  center: string;  // 中心阵地
  radius: number;  // 半径
  turns: number;   // 圈数
  shell: string;
}

// 2. 实现解释器
function interpretSpiral(command: SpiralCommand, context: InterpreterContext): ShowEvent[] {
  // 计算螺旋路径
  // 生成事件序列
}

// 3. 更新文档
// 在 ADVANCED_TIMELINE_RULES 中添加说明和示例
```

## 测试

参考 `AI_RESPONSE_EXAMPLES.json` 中的示例进行测试：

1. 国庆大开场
2. 浪漫婚礼
3. 高科技未来感
4. 简单对称排浪

## 注意事项

1. **版本标识**: AI 输出必须包含 `"version": "advanced-v1"` 才会触发解释器
2. **向后兼容**: 系统仍然支持旧的时间轴格式
3. **错误处理**: 解释器会捕获错误并返回警告信息
4. **性能**: 解释器在前端运行，计算速度很快

## 文档文件

- `INTEGRATION_GUIDE.md`: 详细的集成指南
- `AI_PANEL_MODIFICATIONS.ts`: 具体的代码修改点
- `AI_RESPONSE_EXAMPLES.json`: AI 响应示例
- 本文件 (`ADVANCED_AI_SYSTEM.md`): 系统概述

## 下一步

1. 应用 `AI_PANEL_MODIFICATIONS.ts` 中的修改到 `AIAssistantPanel.tsx`
2. 测试各种场景
3. 根据需要添加更多指令类型
4. 优化 AI prompt 以获得更好的响应

---

**核心思想**: AI 负责艺术创意，前端负责技术实现。这种分工让系统更强大、更灵活、更易维护。
