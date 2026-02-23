import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { MusicTrack } from '../../types';
import { createManagerId, useManagerStore } from '../../store/managerStore';

const createDraftTrack = (): MusicTrack => ({
  id: '',
  title: '',
  artist: '',
  bpm: 120,
  duration: 180,
  url: '',
  offset: 0,
  tags: [],
  notes: '',
});

const normalizeTrack = (track: MusicTrack): MusicTrack => ({
  ...track,
  title: track.title.trim(),
  artist: track.artist?.trim() || undefined,
  bpm: Number.isFinite(Number(track.bpm)) ? Number(track.bpm) : undefined,
  duration: Number.isFinite(Number(track.duration)) ? Number(track.duration) : undefined,
  url: track.url?.trim() || undefined,
  offset: Number.isFinite(Number(track.offset)) ? Number(track.offset) : undefined,
  tags: track.tags?.map((tag) => tag.trim()).filter(Boolean),
  notes: track.notes?.trim() || undefined,
});

const formatDuration = (value?: number) => {
  if (!value || value <= 0) return '--:--';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function MusicManager() {
  const {
    musicTracks,
    selectedTrackId,
    selectTrack,
    addTrack,
    updateTrack,
    deleteTrack,
  } = useManagerStore(
    useShallow((state) => ({
      musicTracks: state.musicTracks,
      selectedTrackId: state.selectedTrackId,
      selectTrack: state.selectTrack,
      addTrack: state.addTrack,
      updateTrack: state.updateTrack,
      deleteTrack: state.deleteTrack,
    }))
  );

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<MusicTrack | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedTrack = useMemo(
    () => musicTracks.find((track) => track.id === selectedTrackId) ?? null,
    [musicTracks, selectedTrackId]
  );

  const filteredTracks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return musicTracks;
    return musicTracks.filter(
      (track) =>
        track.title.toLowerCase().includes(keyword) ||
        track.artist?.toLowerCase().includes(keyword) ||
        track.tags?.some((tag) => tag.toLowerCase().includes(keyword))
    );
  }, [musicTracks, query]);

  useEffect(() => {
    if (isCreating) return;
    setDraft(selectedTrack ? { ...selectedTrack } : null);
    setIsDirty(false);
    setFormError(null);
  }, [selectedTrack, isCreating]);

  const updateDraft = (updates: Partial<MusicTrack>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
    setIsDirty(true);
    setFormError(null);
  };

  const handleSelect = (track: MusicTrack) => {
    setIsCreating(false);
    selectTrack(track.id);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setDraft(createDraftTrack());
    setIsDirty(true);
    setFormError(null);
    selectTrack(null);
  };

  const handleSave = () => {
    if (!draft) return;
    const normalized = normalizeTrack(draft);
    if (!normalized.title) {
      setFormError('请填写曲目名称。');
      return;
    }

    if (isCreating) {
      const id = normalized.id.trim() || createManagerId('track');
      const next = { ...normalized, id };
      addTrack(next);
      setIsCreating(false);
      setDraft(next);
      setIsDirty(false);
      return;
    }

    updateTrack(normalized.id, normalized);
    setDraft(normalized);
    setIsDirty(false);
  };

  const handleDelete = () => {
    if (!draft) return;
    deleteTrack(draft.id);
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
              <div className="text-sm font-semibold text-text-main">音乐资产</div>
              <div className="text-xs text-text-secondary">
                当前 {musicTracks.length} 首曲目
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover"
            >
              新建曲目
            </button>
          </div>

          <div className="px-4 pt-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded bg-app-bg border border-panel-border px-3 py-2 text-xs text-text-main"
              placeholder="搜索标题 / 艺术家 / 标签"
            />
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filteredTracks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                暂无匹配的音乐条目
              </div>
            ) : (
              filteredTracks.map((track) => {
                const isSelected = track.id === selectedTrackId && !isCreating;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelect(track)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-panel-border bg-app-bg hover:bg-panel-bg'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-main">{track.title}</div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {track.artist || '未知艺术家'} · {formatDuration(track.duration)}
                      {track.bpm ? ` · ${track.bpm} BPM` : ''}
                    </div>
                    {track.tags && track.tags.length > 0 && (
                      <div className="mt-1 text-[10px] text-text-secondary">
                        {track.tags.slice(0, 4).join(' · ')}
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
                {isCreating ? '新建曲目' : '曲目详情'}
              </div>
              <div className="text-xs text-text-secondary">
                管理烟花演出的背景音乐与节奏信息
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {!draft ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                请选择左侧曲目或新建曲目
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
                    标题
                    <input
                      value={draft.title}
                      onChange={(event) => updateDraft({ title: event.target.value })}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="例如：星光序曲"
                    />
                  </label>
                  <label className="text-text-secondary">
                    艺术家
                    <input
                      value={draft.artist ?? ''}
                      onChange={(event) => updateDraft({ artist: event.target.value })}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="例如：天际乐团"
                    />
                  </label>
                  <label className="text-text-secondary">
                    BPM
                    <input
                      type="number"
                      min={40}
                      max={240}
                      value={draft.bpm ?? ''}
                      onChange={(event) =>
                        updateDraft({ bpm: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    时长 (秒)
                    <input
                      type="number"
                      min={10}
                      value={draft.duration ?? ''}
                      onChange={(event) =>
                        updateDraft({ duration: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                  <label className="text-text-secondary">
                    资源链接
                    <input
                      value={draft.url ?? ''}
                      onChange={(event) => updateDraft({ url: event.target.value })}
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                      placeholder="https://..."
                    />
                  </label>
                  <label className="text-text-secondary">
                    起始偏移 (秒)
                    <input
                      type="number"
                      value={draft.offset ?? ''}
                      onChange={(event) =>
                        updateDraft({ offset: Number(event.target.value) || undefined })
                      }
                      className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                </div>

                <label className="text-xs text-text-secondary block">
                  标签 (逗号分隔)
                  <input
                    value={draft.tags?.join(', ') ?? ''}
                    onChange={(event) =>
                      updateDraft({
                        tags: event.target.value
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    placeholder="开场, 管弦"
                  />
                </label>

                <label className="text-xs text-text-secondary block">
                  备注
                  <textarea
                    value={draft.notes ?? ''}
                    onChange={(event) => updateDraft({ notes: event.target.value })}
                    className="mt-1 w-full rounded bg-app-bg border border-panel-border px-2 py-2 text-sm text-text-main h-24 resize-none"
                    placeholder="记录拍点、情绪走向等"
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
              {isCreating ? '保存曲目' : '保存修改'}
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
