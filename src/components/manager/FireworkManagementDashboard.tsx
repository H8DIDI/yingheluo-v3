import { useMemo, useState } from 'react';
import { FireworkManager } from './FireworkManager';
import { FireworkTypeManager } from './FireworkTypeManager';
import { MusicManager } from './MusicManager';
import { RackTemplateManager } from './RackTemplateManager';
import { ShowSettingsManager } from './ShowSettingsManager';

type TabKey = 'effects' | 'music' | 'racks' | 'types' | 'settings';

const TAB_LABELS: Record<TabKey, string> = {
  effects: '效果库',
  music: '音乐资产',
  racks: '炮架类型',
  types: '烟花种类',
  settings: '燃放参数',
};

export function FireworkManagementDashboard() {
  const [tab, setTab] = useState<TabKey>('effects');

  const content = useMemo(() => {
    switch (tab) {
      case 'music':
        return <MusicManager />;
      case 'racks':
        return <RackTemplateManager />;
      case 'types':
        return <FireworkTypeManager />;
      case 'settings':
        return <ShowSettingsManager />;
      case 'effects':
      default:
        return <FireworkManager />;
    }
  }, [tab]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-panel-border bg-app-bg flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-primary text-white shadow-glow'
                : 'bg-panel-bg text-text-secondary hover:bg-panel-border'
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">{content}</div>
    </div>
  );
}

