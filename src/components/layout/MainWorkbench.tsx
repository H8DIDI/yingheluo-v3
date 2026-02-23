import { useEffect, useState } from 'react';
import { Header } from './Header';
import { MapEditor } from '../map/MapEditor';
import { Stage3D } from '../stage/Stage3D';
import { Timeline } from '../timeline/Timeline';

interface MainWorkbenchProps {
  onOpenManager?: () => void;
  onOpenAdmin?: () => void;
  onOpenAssistant?: () => void;
}

export function MainWorkbench({ onOpenManager, onOpenAdmin, onOpenAssistant }: MainWorkbenchProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen w-screen bg-app-bg text-text-main overflow-hidden flex flex-col">
        <Header
          onOpenManager={onOpenManager}
          onOpenAdmin={onOpenAdmin}
          onOpenAssistant={onOpenAssistant}
        />
        <div className="relative flex-1 overflow-hidden flex flex-col">
          <div className="relative h-[45vh] min-h-[260px]">
            <Stage3D />
            <div
              className="absolute top-3 right-3 w-28 h-28 border border-panel-border rounded overflow-hidden bg-panel-bg cursor-pointer shadow-lg"
              onClick={() => setShowMapOverlay(true)}
              title="打开二维编辑"
            >
              <div className="pointer-events-none h-full w-full">
                <MapEditor compact />
              </div>
            </div>
          </div>
          <div className="flex-1 border-t border-panel-border">
            <Timeline />
          </div>
        </div>

        {showMapOverlay && (
          <div className="fixed inset-0 z-50 bg-black/70 flex flex-col">
            <div className="p-3 bg-app-bg border-b border-panel-border flex items-center justify-between">
              <div className="text-sm font-semibold text-text-main">二维编辑</div>
              <button
                className="px-3 py-1 bg-panel-bg hover:bg-panel-border rounded text-sm text-text-main"
                onClick={() => setShowMapOverlay(false)}
              >
                关闭
              </button>
            </div>
            <div className="flex-1">
              <MapEditor />
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
