import { useEffect, useState } from 'react';
import { Bot, Map, Sparkles, Timer, Wand2, Zap } from 'lucide-react';
import { Header } from './Header';
import { MapEditor } from '../map/MapEditor';
import { Stage3D } from '../stage/Stage3D';
import { Timeline } from '../timeline/Timeline';
import { useProjectStore } from '../../store/projectStore';
import {
  createQuickLaunchRandomShowRequests,
  createQuickLaunchSalvoRequests,
} from '../stage/quickLaunch';
import {
  getMobileWorkbenchSheetTitle,
  getMobileWorkbenchTabs,
  type MobileWorkbenchPanel,
} from './mobileWorkbench';

interface MainWorkbenchProps {
  onOpenManager?: () => void;
  onOpenAdmin?: () => void;
  onOpenAssistant?: () => void;
}

export function MainWorkbench({ onOpenManager, onOpenAdmin, onOpenAssistant }: MainWorkbenchProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobileWorkbenchPanel>('stage');
  const quickLaunchPreset = useProjectStore((state) => state.quickLaunchPreset);
  const setQuickLaunchPreset = useProjectStore((state) => state.setQuickLaunchPreset);
  const enqueueQuickLaunches = useProjectStore((state) => state.enqueueQuickLaunches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    const mobileTabs = getMobileWorkbenchTabs({ hasAssistant: !!onOpenAssistant });
    const isSheetOpen = activeMobilePanel !== 'stage';

    return (
      <div className="h-dvh w-screen bg-app-bg text-text-main overflow-hidden flex flex-col">
        <Header
          onOpenManager={onOpenManager}
          onOpenAdmin={onOpenAdmin}
          onOpenAssistant={onOpenAssistant}
          mobile
        />

        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0">
            <Stage3D />
            <div className="absolute inset-x-0 bottom-0 p-3 pb-20 pointer-events-none">
              <div className="pointer-events-auto rounded-2xl border border-panel-border bg-app-bg/88 backdrop-blur-md shadow-glow px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-main truncate">烟花舞台</div>
                  <div className="text-[11px] text-text-secondary truncate">
                    点舞台直接放烟花，先玩起来，再进编排
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <select
                    value={quickLaunchPreset}
                    onChange={(event) => setQuickLaunchPreset(event.target.value as typeof quickLaunchPreset)}
                    className="h-10 rounded-xl border border-panel-border bg-panel-bg px-3 text-sm text-text-main"
                  >
                    <option value="peony">牡丹</option>
                    <option value="willow">垂柳</option>
                    <option value="comet">彗星</option>
                  </select>
                  <button
                    className="h-10 rounded-xl border border-panel-border bg-panel-bg px-3 text-sm text-text-main inline-flex items-center gap-2"
                    onClick={() => enqueueQuickLaunches(createQuickLaunchSalvoRequests([0, 0, -8], quickLaunchPreset))}
                    title="一键齐射"
                  >
                    <Zap size={16} /> 齐射
                  </button>
                  <button
                    className="h-10 rounded-xl border border-panel-border bg-panel-bg px-3 text-sm text-text-main inline-flex items-center gap-2"
                    onClick={() => enqueueQuickLaunches(createQuickLaunchRandomShowRequests(quickLaunchPreset))}
                    title="随机秀"
                  >
                    <Wand2 size={16} /> 随机秀
                  </button>
                  <button
                    className="h-12 w-12 rounded-full bg-primary text-white shadow-glow flex items-center justify-center"
                    onClick={() => setActiveMobilePanel('timeline')}
                    title="打开时间轴"
                  >
                    <Timer size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-4 gap-2 rounded-2xl border border-panel-border bg-app-bg/92 backdrop-blur-md p-2 shadow-glow">
              {mobileTabs.map((tab) => {
                const isActive = activeMobilePanel === tab.id;
                const icon =
                  tab.id === 'stage' ? <Sparkles size={18} /> :
                  tab.id === 'timeline' ? <Timer size={18} /> :
                  tab.id === 'map' ? <Map size={18} /> :
                  <Bot size={18} />;

                return (
                  <button
                    key={tab.id}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] transition-all ${
                      isActive ? 'bg-primary text-white shadow-glow' : 'text-text-secondary hover:bg-panel-border'
                    }`}
                    onClick={() => setActiveMobilePanel(tab.id)}
                  >
                    {icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isSheetOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end">
            <button
              className="absolute inset-0"
              aria-label="关闭面板"
              onClick={() => setActiveMobilePanel('stage')}
            />

            <div className="relative min-h-[55vh] max-h-[82vh] rounded-t-3xl bg-app-bg border-t border-panel-border shadow-glow overflow-hidden flex flex-col">
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1.5 w-14 rounded-full bg-panel-border" />
              </div>
              <div className="px-4 pb-3 flex items-center justify-between border-b border-panel-border">
                <div className="text-sm font-semibold text-text-main">
                  {getMobileWorkbenchSheetTitle(activeMobilePanel as Exclude<MobileWorkbenchPanel, 'stage'>)}
                </div>
                <button
                  className="px-3 py-1 bg-panel-bg hover:bg-panel-border rounded text-sm text-text-main"
                  onClick={() => setActiveMobilePanel('stage')}
                >
                  关闭
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {activeMobilePanel === 'timeline' && <Timeline />}
                {activeMobilePanel === 'map' && <MapEditor />}
                {activeMobilePanel === 'assistant' && onOpenAssistant && (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
                    <div>
                      <div className="text-lg font-semibold text-text-main">打开 AI 编排</div>
                      <div className="mt-2 text-sm text-text-secondary">
                        手机端先保留核心入口，复杂编排页单独打开，避免把主舞台挤没。
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 rounded-xl bg-primary text-white shadow-glow"
                      onClick={onOpenAssistant}
                    >
                      进入 AI 助理
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-app-bg text-text-main overflow-hidden flex flex-col">
      <Header
        onOpenManager={onOpenManager}
        onOpenAdmin={onOpenAdmin}
        onOpenAssistant={onOpenAssistant}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[32%] min-w-[280px] border-r border-panel-border">
            <MapEditor />
          </div>
          <div className="flex-1">
            <Stage3D />
          </div>
        </div>
        <div className="h-[280px] min-h-[220px] border-t border-panel-border">
          <Timeline />
        </div>
      </div>
    </div>
  );
}
