import { Sparkles, Wand2, Zap } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useLibraryStore } from '../../store/libraryStore';
import {
  createQuickLaunchFinaleRequests,
  createQuickLaunchRandomShowRequests,
  createQuickLaunchSalvoRequests,
} from '../stage/quickLaunch';

type QuickLaunchBarProps = {
  compact?: boolean;
};

export function QuickLaunchBar({ compact = false }: QuickLaunchBarProps) {
  const quickLaunchMode = useProjectStore((state) => state.quickLaunchMode);
  const quickLaunchPreset = useProjectStore((state) => state.quickLaunchPreset);
  const quickLaunchCustomLabel = useProjectStore((state) => state.quickLaunchCustomLabel);
  const setQuickLaunchMode = useProjectStore((state) => state.setQuickLaunchMode);
  const setQuickLaunchPreset = useProjectStore((state) => state.setQuickLaunchPreset);
  const setQuickLaunchCustomLabel = useProjectStore((state) => state.setQuickLaunchCustomLabel);
  const enqueueQuickLaunches = useProjectStore((state) => state.enqueueQuickLaunches);
  const effects = useLibraryStore((state) => state.effects);
  const selectedEffect = useLibraryStore((state) => state.selectedEffect);
  const selectEffect = useLibraryStore((state) => state.selectEffect);

  return (
    <div className={`rounded-2xl border border-panel-border bg-app-bg/88 backdrop-blur-md shadow-glow px-3 py-2 flex flex-col gap-2 ${compact ? '' : 'max-w-[760px]'}`}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-main truncate">烟花舞台</div>
        <div className="text-[11px] text-text-secondary truncate">
          点舞台直接放烟花，可切换库效果或快速预设
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button
          className={`h-8 px-3 rounded-lg border ${quickLaunchMode === 'preset' ? 'border-primary bg-primary/15 text-primary' : 'border-panel-border bg-panel-bg text-text-secondary'}`}
          onClick={() => setQuickLaunchMode('preset')}
        >
          快速预设
        </button>
        <button
          className={`h-8 px-3 rounded-lg border ${quickLaunchMode === 'library' ? 'border-primary bg-primary/15 text-primary' : 'border-panel-border bg-panel-bg text-text-secondary'}`}
          onClick={() => setQuickLaunchMode('library')}
        >
          库效果
        </button>
      </div>

      <div className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`}>
        {quickLaunchMode === 'preset' ? (
          <>
            <select
              value={quickLaunchPreset}
              onChange={(event) => setQuickLaunchPreset(event.target.value as typeof quickLaunchPreset)}
              className={`h-9 rounded-xl border border-panel-border bg-panel-bg px-2 text-sm text-text-main ${compact ? 'flex-1 min-w-0' : 'min-w-[180px]'}`}
            >
              <option value="peony">牡丹</option>
              <option value="willow">垂柳</option>
              <option value="comet">彗星</option>
              <option value="ring">圆环</option>
              <option value="heart">爱心</option>
              <option value="star">星形</option>
              <option value="diamond">钻石</option>
              <option value="butterfly">蝴蝶</option>
              <option value="text-love">LOVE</option>
              <option value="text-520">520</option>
              <option value="text-custom">自定义文字</option>
            </select>
            {quickLaunchPreset === 'text-custom' && (
              <input
                value={quickLaunchCustomLabel}
                onChange={(event) => setQuickLaunchCustomLabel(event.target.value.toUpperCase().slice(0, 4))}
                placeholder="输入4位内文字"
                className="h-9 w-[108px] rounded-xl border border-panel-border bg-panel-bg px-2 text-sm text-text-main"
              />
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-2 max-w-full">
            {effects.slice(0, compact ? 5 : 8).map((effect) => {
              const selected = selectedEffect?.id === effect.id;
              return (
                <button
                  key={effect.id}
                  onClick={() => selectEffect(effect)}
                  className={`h-9 px-3 rounded-xl border text-sm inline-flex items-center gap-2 ${selected ? 'border-primary bg-primary/15 text-text-main shadow-glow' : 'border-panel-border bg-panel-bg text-text-secondary hover:text-text-main'}`}
                  title={effect.name}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: effect.color }} />
                  <span className="truncate max-w-[120px]">{effect.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          className="h-9 rounded-xl border border-panel-border bg-panel-bg px-3 text-sm text-text-main inline-flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => enqueueQuickLaunches(createQuickLaunchSalvoRequests([0, 0, -8], quickLaunchPreset, quickLaunchCustomLabel))}
          title="一键齐射"
          disabled={quickLaunchMode === 'library'}
        >
          <Zap size={15} /> 齐射
        </button>
        <button
          className="h-9 rounded-xl border border-panel-border bg-panel-bg px-3 text-sm text-text-main inline-flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => enqueueQuickLaunches(createQuickLaunchRandomShowRequests(quickLaunchPreset, quickLaunchCustomLabel))}
          title="随机秀"
          disabled={quickLaunchMode === 'library'}
        >
          <Wand2 size={15} /> 随机秀
        </button>
        <button
          className="h-9 rounded-xl border border-panel-border bg-panel-bg px-3 text-sm text-text-main inline-flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => enqueueQuickLaunches(createQuickLaunchFinaleRequests([0, 0, -8]))}
          title="终场秀"
          disabled={quickLaunchMode === 'library'}
        >
          <Sparkles size={15} /> 终场秀
        </button>
      </div>
    </div>
  );
}
