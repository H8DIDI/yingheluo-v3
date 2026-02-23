import { ArrowLeft } from 'lucide-react';
import { AIAssistantPanel } from './AIAssistantPanel';

interface AIAssistantPageProps {
  onBack: () => void;
}

export function AIAssistantPage({ onBack }: AIAssistantPageProps) {
  return (
    <div className="h-screen w-screen bg-app-bg text-text-main overflow-hidden flex flex-col">
      <header className="h-14 bg-app-bg border-b border-panel-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-panel-border rounded transition-colors"
            title="返回工作台"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-lg font-bold">AI 助理</div>
            <div className="text-xs text-text-secondary">
              主题生成 · 方案补齐 · 一键应用到时间轴
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <AIAssistantPanel />
      </div>
    </div>
  );
}
