import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore';
import { FireworkEffect, FireworkType } from '../../types';

const TYPE_LABELS: Record<FireworkType, string> = {
  peony: '牡丹',
  willow: '柳树',
  crossette: '十字',
  burst: '爆裂',
  fountain: '喷泉',
  rocket: '火箭',
  sparkler: '烟花棒',
  comet: '彗星',
  mine: '地雷',
  chrysanthemum: '菊花',
};

const TYPE_ORDER: FireworkType[] = [
  'peony',
  'chrysanthemum',
  'willow',
  'crossette',
  'burst',
  'fountain',
  'rocket',
  'sparkler',
  'comet',
  'mine',
];

const createDraftEffect = (): FireworkEffect => ({
  id: '',
  name: '',
  type: 'peony',
  color: '#DC2626',
  height: 90,
  duration: 2.6,
  intensity: 0.9,
  particleCount: 120,
  spread: 360,
  trailLength: 0.4,
  splitDelay: undefined,
  soundFrequency: undefined,
});

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeOptionalNumber = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const createEffectId = (name: string) => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return base ? `${base}-${random}` : `effect-${random}`;
};

const normalizeEffect = (effect: FireworkEffect): FireworkEffect => {
  const intensity = clampNumber(Number(effect.intensity) || 0, 0, 1);
  const trailLength = clampNumber(Number(effect.trailLength) || 0, 0, 1);
  return {
    ...effect,
    name: effect.name.trim(),
    color: effect.color.trim() || '#ffffff',
    height: clampNumber(Number(effect.height) || 0, 1, 300),
    duration: clampNumber(Number(effect.duration) || 0.1, 0.1, 30),
    intensity,
    particleCount: Math.max(1, Math.round(Number(effect.particleCount) || 1)),
    spread: clampNumber(Number(effect.spread) || 0, 0, 360),
    trailLength,
    splitDelay:
      effect.type === 'crossette'
        ? normalizeOptionalNumber(effect.splitDelay) ?? 0.5
        : undefined,
    soundFrequency: normalizeOptionalNumber(effect.soundFrequency),
  };
};

export function FireworkManager() {
  const {
    effects,
    selectedEffect,
    selectEffect,
    addEffect,
    updateEffect,
    deleteEffect,
  } = useLibraryStore(
    useShallow((state) => ({
      effects: state.effects,
      selectedEffect: state.selectedEffect,
      selectEffect: state.selectEffect,
      addEffect: state.addEffect,
      updateEffect: state.updateEffect,
      deleteEffect: state.deleteEffect,
    }))
  );

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FireworkType>('all');
  const [draft, setDraft] = useState<FireworkEffect | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreating) return;
    if (selectedEffect && effects.some((effect) => effect.id === selectedEffect.id)) return;
    if (effects.length > 0) {
      selectEffect(effects[0]);
    } else {
      selectEffect(null);
    }
  }, [effects, selectedEffect, isCreating, selectEffect]);

  useEffect(() => {
    if (isCreating) return;
    setDraft(selectedEffect ? { ...selectedEffect } : null);
    setIsDirty(false);
    setFormError(null);
  }, [selectedEffect, isCreating]);

  const typeStats = useMemo(() => {
    const stats: Partial<Record<FireworkType, number>> = {};
    effects.forEach((effect) => {
      stats[effect.type] = (stats[effect.type] ?? 0) + 1;
    });
    return stats;
  }, [effects]);

  const filteredEffects = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return effects.filter((effect) => {
      if (typeFilter !== 'all' && effect.type !== typeFilter) return false;
      if (!lowered) return true;
      return (
        effect.name.toLowerCase().includes(lowered) ||
        effect.id.toLowerCase().includes(lowered) ||
        effect.color.toLowerCase().includes(lowered)
      );
    });
  }, [effects, query, typeFilter]);

  const updateDraft = (updates: Partial<FireworkEffect>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
    setIsDirty(true);
    setFormError(null);
  };

  const updateDraftNumber = (field: keyof FireworkEffect, value: string) => {
    const parsed = Number(value);
    updateDraft({
      [field]: Number.isFinite(parsed) ? parsed : 0,
    } as Partial<FireworkEffect>);
  };

  const updateDraftOptionalNumber = (field: keyof FireworkEffect, value: string) => {
    if (!value.trim()) {
      updateDraft({ [field]: undefined } as Partial<FireworkEffect>);
      return;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      updateDraft({ [field]: parsed } as Partial<FireworkEffect>);
    }
  };

  const handleSelect = (effect: FireworkEffect) => {
    setIsCreating(false);
    selectEffect(effect);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setDraft(createDraftEffect());
    setIsDirty(true);
    setFormError(null);
    selectEffect(null);
  };

  const handleReset = () => {
    if (isCreating) {
      setDraft(createDraftEffect());
      setIsDirty(false);
      setFormError(null);
      return;
    }
    setDraft(selectedEffect ? { ...selectedEffect } : null);
    setIsDirty(false);
    setFormError(null);
  };

  const handleSave = () => {
    if (!draft) return;
    const normalized = normalizeEffect(draft);
    if (!normalized.name) {
      setFormError('请填写效果名称。');
      return;
    }

    if (isCreating) {
      const id = normalized.id.trim() || createEffectId(normalized.name);
      const nextEffect = { ...normalized, id };
      addEffect(nextEffect);
      selectEffect(nextEffect);
      setIsCreating(false);
      setDraft(nextEffect);
      setIsDirty(false);
      return;
    }

    updateEffect(normalized.id, normalized);
    selectEffect(normalized);
    setDraft(normalized);
    setIsDirty(false);
  };

  const handleDelete = () => {
    if (!draft) return;
    deleteEffect(draft.id);
    setIsCreating(false);
    setDraft(null);
    setIsDirty(false);
  };

  const canSave = !!draft && (isCreating || isDirty);

  return (
    <div className="h-full w-full p-4 bg-app-bg overflow-hidden">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 h-full">
        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
            <div>
              <div className="text-sm font-semibold text-text-main">烟花效果库</div>
              <div className="text-xs text-text-secondary">
                当前 {effects.length} 个效果 · 支持筛选与搜索
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 rounded flex items-center gap-2 text-xs font-medium bg-primary text-white hover:bg-primary-hover"
            >
              <Plus size={14} />
              新建效果
            </button>
          </div>

          <div className="px-4 pt-3 space-y-3">
            <div className="flex flex-wrap gap-2 text-[10px] text-text-secondary">
              <span className="px-2 py-1 rounded border border-panel-border bg-app-bg">
                总数 {effects.length}
              </span>
              {TYPE_ORDER.map((type) => {
                const count = typeStats[type];
                if (!count) return null;
                return (
                  <span
                    key={type}
                    className="px-2 py-1 rounded border border-panel-border bg-app-bg"
                  >
                    {TYPE_LABELS[type]} {count}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded bg-app-bg border border-panel-border text-text-main"
                  placeholder="搜索名称 / 编号 / 颜色"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as 'all' | FireworkType)
                }
                className="py-1.5 px-2 text-xs rounded bg-app-bg border border-panel-border text-text-main"
              >
                <option value="all">全部类型</option>
                {TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filteredEffects.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                没有匹配的效果
              </div>
            ) : (
              filteredEffects.map((effect) => {
                const isSelected = effect.id === selectedEffect?.id && !isCreating;
                return (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => handleSelect(effect)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-panel-border bg-app-bg hover:bg-panel-bg'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-white/30"
                        style={{ backgroundColor: effect.color }}
                      />
                      <div className="text-sm font-medium text-text-main">{effect.name}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {TYPE_LABELS[effect.type]} · 高度 {effect.height}m · 时长{' '}
                      {effect.duration}s · 强度 {Math.round(effect.intensity * 100)}%
                    </div>
                    <div className="mt-1 text-[10px] text-text-secondary">
                      粒子 {effect.particleCount} · 扩散 {effect.spread}° · 拖尾{' '}
                      {effect.trailLength.toFixed(2)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
            <div>
              <div className="text-sm font-semibold text-text-main">
                {isCreating ? '新建效果' : '效果详情'}
              </div>
              <div className="text-xs text-text-secondary">
                管理烟花效果参数与燃放表现
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {!draft ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                请选择左侧效果或新建效果
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-panel-border bg-app-bg p-3 flex items-center gap-3">
                  <span
                    className="h-9 w-9 rounded-lg border border-white/30"
                    style={{ backgroundColor: draft.color || '#ffffff' }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-text-main">
                      {draft.name || '未命名效果'}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {TYPE_LABELS[draft.type]} · 高度 {draft.height}m · 时长 {draft.duration}s
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="text-xs text-danger border border-danger/40 bg-danger/10 px-2 py-1 rounded">
                    {formError}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-xs text-text-secondary">
                    名称
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft({ name: event.target.value })}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="例如：红牡丹 3寸"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    类型
                    <select
                      value={draft.type}
                      onChange={(event) => {
                        const nextType = event.target.value as FireworkType;
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                type: nextType,
                                splitDelay:
                                  nextType === 'crossette'
                                    ? prev.splitDelay ?? 0.5
                                    : undefined,
                              }
                            : prev
                        );
                        setIsDirty(true);
                      }}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    >
                      {TYPE_ORDER.map((type) => (
                        <option key={type} value={type}>
                          {TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-text-secondary">
                    颜色
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={draft.color || '#ffffff'}
                        onChange={(event) => updateDraft({ color: event.target.value })}
                        className="h-9 w-12 rounded border border-panel-border bg-app-bg p-1"
                      />
                      <input
                        value={draft.color}
                        onChange={(event) => updateDraft({ color: event.target.value })}
                        className="flex-1 rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        placeholder="#DC2626"
                      />
                    </div>
                  </label>
                  <label className="text-xs text-text-secondary">
                    高度 (m)
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={draft.height}
                      onChange={(event) => updateDraftNumber('height', event.target.value)}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    时长 (s)
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={draft.duration}
                      onChange={(event) => updateDraftNumber('duration', event.target.value)}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    强度
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={draft.intensity}
                        onChange={(event) => updateDraftNumber('intensity', event.target.value)}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-xs text-text-secondary w-10 text-right">
                        {draft.intensity.toFixed(2)}
                      </span>
                    </div>
                  </label>
                  <label className="text-xs text-text-secondary">
                    粒子数
                    <input
                      type="number"
                      min={1}
                      value={draft.particleCount}
                      onChange={(event) =>
                        updateDraftNumber('particleCount', event.target.value)
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    扩散 (°)
                    <input
                      type="number"
                      min={0}
                      max={360}
                      value={draft.spread}
                      onChange={(event) => updateDraftNumber('spread', event.target.value)}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    拖尾长度
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={draft.trailLength}
                        onChange={(event) => updateDraftNumber('trailLength', event.target.value)}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-xs text-text-secondary w-10 text-right">
                        {draft.trailLength.toFixed(2)}
                      </span>
                    </div>
                  </label>
                  {draft.type === 'crossette' && (
                    <label className="text-xs text-text-secondary">
                      分裂延迟 (s)
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={draft.splitDelay ?? 0}
                        onChange={(event) =>
                          updateDraftOptionalNumber('splitDelay', event.target.value)
                        }
                        className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      />
                    </label>
                  )}
                  <label className="text-xs text-text-secondary">
                    音效频率 (Hz)
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={draft.soundFrequency ?? ''}
                      onChange={(event) =>
                        updateDraftOptionalNumber('soundFrequency', event.target.value)
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="例如：140"
                    />
                  </label>
                </div>

                <div className="text-[10px] text-text-secondary">
                  编号：{draft.id || '--'}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-panel-border p-3 bg-app-bg flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 ${
                canSave
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
              }`}
            >
              <Save size={14} />
              {isCreating ? '保存效果' : '保存修改'}
            </button>
            <button
              onClick={handleReset}
              disabled={!draft}
              className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${
                draft
                  ? 'bg-panel-bg border border-panel-border text-text-secondary hover:bg-panel-border'
                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
              }`}
            >
              <RotateCcw size={14} />
              重置
            </button>
            <button
              onClick={handleDelete}
              disabled={!draft || isCreating}
              className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${
                draft && !isCreating
                  ? 'bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30'
                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
              }`}
            >
              <Trash2 size={14} />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
