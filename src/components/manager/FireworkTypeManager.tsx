import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { FireworkType, FireworkTypeProfile } from '../../types';
import { createManagerId, useManagerStore } from '../../store/managerStore';

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

const createDraftProfile = (): FireworkTypeProfile => ({
  id: '',
  name: '',
  type: 'peony',
  description: '',
  defaultHeight: 90,
  defaultDuration: 2.6,
  defaultIntensity: 0.9,
  defaultSpread: 360,
  defaultTrailLength: 0.4,
});

const normalizeProfile = (profile: FireworkTypeProfile): FireworkTypeProfile => ({
  ...profile,
  name: profile.name.trim(),
  description: profile.description?.trim() || undefined,
  defaultHeight: Number(profile.defaultHeight) || undefined,
  defaultDuration: Number(profile.defaultDuration) || undefined,
  defaultIntensity: Number(profile.defaultIntensity) || undefined,
  defaultSpread: Number(profile.defaultSpread) || undefined,
  defaultTrailLength: Number(profile.defaultTrailLength) || undefined,
});

export function FireworkTypeManager() {
  const {
    typeProfiles,
    selectedTypeProfileId,
    selectTypeProfile,
    addTypeProfile,
    updateTypeProfile,
    deleteTypeProfile,
  } = useManagerStore(
    useShallow((state) => ({
      typeProfiles: state.typeProfiles,
      selectedTypeProfileId: state.selectedTypeProfileId,
      selectTypeProfile: state.selectTypeProfile,
      addTypeProfile: state.addTypeProfile,
      updateTypeProfile: state.updateTypeProfile,
      deleteTypeProfile: state.deleteTypeProfile,
    }))
  );

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<FireworkTypeProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedProfile = useMemo(
    () => typeProfiles.find((profile) => profile.id === selectedTypeProfileId) ?? null,
    [typeProfiles, selectedTypeProfileId]
  );

  const filteredProfiles = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return typeProfiles;
    return typeProfiles.filter(
      (profile) =>
        profile.name.toLowerCase().includes(keyword) ||
        profile.type.toLowerCase().includes(keyword)
    );
  }, [typeProfiles, query]);

  useEffect(() => {
    if (isCreating) return;
    setDraft(selectedProfile ? { ...selectedProfile } : null);
    setIsDirty(false);
    setFormError(null);
  }, [selectedProfile, isCreating]);

  const updateDraft = (updates: Partial<FireworkTypeProfile>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
    setIsDirty(true);
    setFormError(null);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setDraft(createDraftProfile());
    setIsDirty(true);
    setFormError(null);
    selectTypeProfile(null);
  };

  const handleSelect = (profile: FireworkTypeProfile) => {
    setIsCreating(false);
    selectTypeProfile(profile.id);
  };

  const handleSave = () => {
    if (!draft) return;
    const normalized = normalizeProfile(draft);
    if (!normalized.name) {
      setFormError('请填写类型名称。');
      return;
    }
    if (isCreating) {
      const id = normalized.id.trim() || createManagerId('type');
      const next = { ...normalized, id };
      addTypeProfile(next);
      setIsCreating(false);
      setDraft(next);
      setIsDirty(false);
      return;
    }
    updateTypeProfile(normalized.id, normalized);
    setDraft(normalized);
    setIsDirty(false);
  };

  const handleDelete = () => {
    if (!draft) return;
    deleteTypeProfile(draft.id);
    setDraft(null);
    setIsCreating(false);
    setIsDirty(false);
  };

  const canSave = !!draft && (isCreating || isDirty);

  return (
    <div className="h-full w-full p-4 bg-app-bg overflow-hidden">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 h-full">
        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
            <div>
              <div className="text-sm font-semibold text-text-main">烟花种类</div>
              <div className="text-xs text-text-secondary">
                当前 {typeProfiles.length} 个类型配置
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover"
            >
              新建类型
            </button>
          </div>

          <div className="px-4 pt-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded bg-app-bg border border-panel-border px-3 py-2 text-xs text-text-main"
              placeholder="搜索类型名称 / 基础类别"
            />
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                暂无类型配置
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const isSelected = profile.id === selectedTypeProfileId && !isCreating;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelect(profile)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-panel-border bg-app-bg hover:bg-panel-bg'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-main">{profile.name}</div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {TYPE_LABELS[profile.type]} · 高度 {profile.defaultHeight ?? '--'}m ·{' '}
                      时长 {profile.defaultDuration ?? '--'}s
                    </div>
                    {profile.description && (
                      <div className="mt-1 text-[10px] text-text-secondary truncate">
                        {profile.description}
                      </div>
                    )}
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
                {isCreating ? '新建类型' : '类型详情'}
              </div>
              <div className="text-xs text-text-secondary">
                管理烟花种类的默认效果参数
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {!draft ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                请选择左侧类型或新建
              </div>
            ) : (
              <>
                {formError && (
                  <div className="text-xs text-danger border border-danger/40 bg-danger/10 px-2 py-1 rounded">
                    {formError}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  <label className="text-text-secondary">
                    类型名称
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft({ name: event.target.value })}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="例如：主牡丹"
                    />
                  </label>
                  <label className="text-text-secondary">
                    基础类别
                    <select
                      value={draft.type}
                      onChange={(event) =>
                        updateDraft({ type: event.target.value as FireworkType })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    >
                      {Object.entries(TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-text-secondary">
                    默认高度 (m)
                    <input
                      type="number"
                      value={draft.defaultHeight ?? ''}
                      onChange={(event) =>
                        updateDraft({ defaultHeight: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    默认时长 (s)
                    <input
                      type="number"
                      step={0.1}
                      value={draft.defaultDuration ?? ''}
                      onChange={(event) =>
                        updateDraft({ defaultDuration: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    默认强度
                    <input
                      type="number"
                      step={0.05}
                      value={draft.defaultIntensity ?? ''}
                      onChange={(event) =>
                        updateDraft({ defaultIntensity: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    默认扩散 (°)
                    <input
                      type="number"
                      value={draft.defaultSpread ?? ''}
                      onChange={(event) =>
                        updateDraft({ defaultSpread: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    默认拖尾
                    <input
                      type="number"
                      step={0.05}
                      value={draft.defaultTrailLength ?? ''}
                      onChange={(event) =>
                        updateDraft({ defaultTrailLength: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                </div>

                <label className="text-xs text-text-secondary block">
                  描述
                  <textarea
                    value={draft.description ?? ''}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-2 text-sm text-text-main h-24 resize-none"
                    placeholder="描述适用场景或视觉特征"
                  />
                </label>
              </>
            )}
          </div>

          <div className="border-t border-panel-border p-3 bg-app-bg flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                canSave
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
              }`}
            >
              {isCreating ? '保存类型' : '保存修改'}
            </button>
            <button
              onClick={handleDelete}
              disabled={!draft || isCreating}
              className={`px-3 py-2 rounded text-sm ${
                draft && !isCreating
                  ? 'bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30'
                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
              }`}
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
