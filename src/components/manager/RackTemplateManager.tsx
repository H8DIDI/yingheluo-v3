import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  FanRackConfig,
  MatrixRackConfig,
  RackConfig,
  RackTemplate,
  RackType,
  StraightRackConfig,
} from '../../types';
import { createManagerId, useManagerStore } from '../../store/managerStore';

const TYPE_LABELS: Record<RackType, string> = {
  straight: '直排',
  fan: '扇形',
  matrix: '矩阵',
};

const buildConfigForType = (type: RackType, prev?: RackConfig): RackConfig => {
  if (type === 'fan') {
    const fallback: FanRackConfig = { type: 'fan', startAngle: -30, endAngle: 30, tilt: 82 };
    return prev?.type === 'fan' ? prev : fallback;
  }
  if (type === 'matrix') {
    const fallback: MatrixRackConfig = {
      type: 'matrix',
      rows: 5,
      columns: 5,
      spacing: 0.5,
      tilt: 90,
    };
    return prev?.type === 'matrix' ? prev : fallback;
  }
  const fallback: StraightRackConfig = { type: 'straight', tilt: 90 };
  return prev?.type === 'straight' ? prev : fallback;
};

const createDraftTemplate = (): RackTemplate => ({
  id: '',
  name: '',
  type: 'straight',
  tubeCount: 8,
  rotation: 0,
  config: buildConfigForType('straight'),
  description: '',
});

const normalizeTemplate = (template: RackTemplate): RackTemplate => {
  const config = buildConfigForType(template.type, template.config);
  const tubeCount =
    template.type === 'matrix' && config.type === 'matrix'
      ? config.rows * config.columns
      : Math.max(1, Math.round(template.tubeCount || 1));
  return {
    ...template,
    name: template.name.trim(),
    tubeCount,
    rotation: Number.isFinite(Number(template.rotation)) ? Number(template.rotation) : 0,
    description: template.description?.trim() || undefined,
    config,
  };
};

export function RackTemplateManager() {
  const {
    rackTemplates,
    selectedRackTemplateId,
    selectRackTemplate,
    addRackTemplate,
    updateRackTemplate,
    deleteRackTemplate,
  } = useManagerStore(
    useShallow((state) => ({
      rackTemplates: state.rackTemplates,
      selectedRackTemplateId: state.selectedRackTemplateId,
      selectRackTemplate: state.selectRackTemplate,
      addRackTemplate: state.addRackTemplate,
      updateRackTemplate: state.updateRackTemplate,
      deleteRackTemplate: state.deleteRackTemplate,
    }))
  );

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RackTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => rackTemplates.find((template) => template.id === selectedRackTemplateId) ?? null,
    [rackTemplates, selectedRackTemplateId]
  );

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rackTemplates;
    return rackTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(keyword) ||
        template.type.toLowerCase().includes(keyword)
    );
  }, [rackTemplates, query]);

  useEffect(() => {
    if (isCreating) return;
    setDraft(selectedTemplate ? { ...selectedTemplate } : null);
    setIsDirty(false);
    setFormError(null);
  }, [selectedTemplate, isCreating]);

  const updateDraft = (updates: Partial<RackTemplate>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
    setIsDirty(true);
    setFormError(null);
  };

  const updateConfig = (updates: Partial<RackConfig>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextConfig = { ...prev.config, ...updates } as RackConfig;
      return { ...prev, config: nextConfig };
    });
    setIsDirty(true);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setDraft(createDraftTemplate());
    setIsDirty(true);
    setFormError(null);
    selectRackTemplate(null);
  };

  const handleSelect = (template: RackTemplate) => {
    setIsCreating(false);
    selectRackTemplate(template.id);
  };

  const handleSave = () => {
    if (!draft) return;
    const normalized = normalizeTemplate(draft);
    if (!normalized.name) {
      setFormError('请填写炮架名称。');
      return;
    }
    if (isCreating) {
      const id = normalized.id.trim() || createManagerId('rack');
      const next = { ...normalized, id };
      addRackTemplate(next);
      setIsCreating(false);
      setDraft(next);
      setIsDirty(false);
      return;
    }
    updateRackTemplate(normalized.id, normalized);
    setDraft(normalized);
    setIsDirty(false);
  };

  const handleDelete = () => {
    if (!draft) return;
    deleteRackTemplate(draft.id);
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
              <div className="text-sm font-semibold text-text-main">炮架模板</div>
              <div className="text-xs text-text-secondary">
                当前 {rackTemplates.length} 种炮架配置
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover"
            >
              新建炮架
            </button>
          </div>

          <div className="px-4 pt-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded bg-app-bg border border-panel-border px-3 py-2 text-xs text-text-main"
              placeholder="搜索炮架名称 / 类型"
            />
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                暂无炮架模板
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const isSelected = template.id === selectedRackTemplateId && !isCreating;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-panel-border bg-app-bg hover:bg-panel-bg'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-main">{template.name}</div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {TYPE_LABELS[template.type]} · {template.tubeCount} 管 · 旋转{' '}
                      {template.rotation}°
                    </div>
                    {template.description && (
                      <div className="mt-1 text-[10px] text-text-secondary truncate">
                        {template.description}
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
                {isCreating ? '新建炮架' : '炮架详情'}
              </div>
              <div className="text-xs text-text-secondary">
                管理阵地中可复用的炮架布局
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {!draft ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                请选择左侧炮架或新建模板
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
                    名称
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft({ name: event.target.value })}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="例如：前场扇形炮架"
                    />
                  </label>
                  <label className="text-text-secondary">
                    类型
                    <select
                      value={draft.type}
                      onChange={(event) => {
                        const nextType = event.target.value as RackType;
                        updateDraft({
                          type: nextType,
                          config: buildConfigForType(nextType),
                        });
                      }}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    >
                      <option value="straight">直排</option>
                      <option value="fan">扇形</option>
                      <option value="matrix">矩阵</option>
                    </select>
                  </label>
                  <label className="text-text-secondary">
                    旋转角度 (°)
                    <input
                      type="number"
                      value={draft.rotation}
                      onChange={(event) =>
                        updateDraft({ rotation: Number(event.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    管数量
                    <input
                      type="number"
                      value={
                        draft.type === 'matrix' && draft.config.type === 'matrix'
                          ? draft.config.rows * draft.config.columns
                          : draft.tubeCount
                      }
                      disabled={draft.type === 'matrix'}
                      onChange={(event) =>
                        updateDraft({ tubeCount: Number(event.target.value) || 1 })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  {draft.type === 'fan' && draft.config.type === 'fan' && (
                    <>
                      <label className="text-text-secondary">
                        起始角度 (°)
                        <input
                          type="number"
                          value={draft.config.startAngle}
                          onChange={(event) =>
                            updateConfig({
                              startAngle: Number(event.target.value) || -30,
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                      <label className="text-text-secondary">
                        结束角度 (°)
                        <input
                          type="number"
                          value={draft.config.endAngle}
                          onChange={(event) =>
                            updateConfig({
                              endAngle: Number(event.target.value) || 30,
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                      <label className="text-text-secondary">
                        仰角 (°)
                        <input
                          type="number"
                          value={draft.config.tilt}
                          onChange={(event) =>
                            updateConfig({
                              tilt: Number(event.target.value) || 82,
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                    </>
                  )}

                  {draft.type === 'straight' && draft.config.type === 'straight' && (
                    <label className="text-text-secondary">
                      仰角 (°)
                      <input
                        type="number"
                        value={draft.config.tilt}
                        onChange={(event) =>
                          updateConfig({
                            tilt: Number(event.target.value) || 90,
                          })
                        }
                        className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      />
                    </label>
                  )}

                  {draft.type === 'matrix' && draft.config.type === 'matrix' && (
                    <>
                      <label className="text-text-secondary">
                        行数
                        <input
                          type="number"
                          value={draft.config.rows}
                          onChange={(event) =>
                            updateConfig({
                              rows: Math.max(1, Number(event.target.value) || 1),
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                      <label className="text-text-secondary">
                        列数
                        <input
                          type="number"
                          value={draft.config.columns}
                          onChange={(event) =>
                            updateConfig({
                              columns: Math.max(1, Number(event.target.value) || 1),
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                      <label className="text-text-secondary">
                        间距 (m)
                        <input
                          type="number"
                          step={0.1}
                          value={draft.config.spacing}
                          onChange={(event) =>
                            updateConfig({
                              spacing: Number(event.target.value) || 0.5,
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                      <label className="text-text-secondary">
                        仰角 (°)
                        <input
                          type="number"
                          value={draft.config.tilt}
                          onChange={(event) =>
                            updateConfig({
                              tilt: Number(event.target.value) || 90,
                            })
                          }
                          className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                        />
                      </label>
                    </>
                  )}
                </div>

                <label className="text-xs text-text-secondary block">
                  描述
                  <textarea
                    value={draft.description ?? ''}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-2 text-sm text-text-main h-20 resize-none"
                    placeholder="记录用途、区域或特殊装配说明"
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
              {isCreating ? '保存炮架' : '保存修改'}
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
