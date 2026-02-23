import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { GripVertical } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useLibraryStore } from '../../store/libraryStore';
import { ShowEvent, FiringPattern, FireworkType } from '../../types/domain';

export function Timeline() {
  const {
    project,
    currentTime,
    setCurrentTime,
    selectedEvent,
    updateEvent,
  selectEvent,
  addEvent,
  deleteEvent,
  loadTube,
  unloadTube,
  refillTubes,
  } = useProjectStore(
    useShallow((state) => ({
      project: state.project,
      currentTime: state.currentTime,
      setCurrentTime: state.setCurrentTime,
      selectedEvent: state.selectedEvent,
      updateEvent: state.updateEvent,
      selectEvent: state.selectEvent,
      addEvent: state.addEvent,
      deleteEvent: state.deleteEvent,
      loadTube: state.loadTube,
      unloadTube: state.unloadTube,
      refillTubes: state.refillTubes,
    }))
  );
  const effects = useLibraryStore(useShallow((state) => state.effects));

  const timelineRef = useRef<HTMLDivElement>(null);
  const events = useMemo(() => project?.events ?? [], [project?.events]);
  const duration = project?.duration ?? 300;

  const [scale, setScale] = useState(1);
  const [selectedEffectId, setSelectedEffectId] = useState('');
  const PIXELS_PER_SECOND = 50 * scale;
  const TRACK_HEIGHT = 40;
  const SNAP_STEP = 0.1;
  const [dragging, setDragging] = useState<{ id: string; offset: number } | null>(null);
  const [handleDragging, setHandleDragging] = useState<{ id: string; offset: number } | null>(null);
  const formatTime = (value: number) =>
    `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

  useEffect(() => {
    if (effects.length === 0) return;
    if (!selectedEffectId || !effects.some((effect) => effect.id === selectedEffectId)) {
      setSelectedEffectId(effects[0].id);
    }
  }, [effects, selectedEffectId]);

  // 根据阵地+炮架生成轨道
  const tracks = useMemo(() => {
    if (!project) return [];
    return project.positions.flatMap((pos) =>
      pos.racks.map((rack) => ({
        id: `${pos.id}-${rack.id}`,
        label: `${pos.name} / ${rack.name}`,
        positionId: pos.id,
        rackId: rack.id,
      }))
    );
  }, [project]);

  const selectedRackInfo = useMemo(() => {
    if (!project || !selectedEvent) {
      return { position: null, rack: null };
    }
    const position = project.positions.find((pos) => pos.id === selectedEvent.positionId) ?? null;
    const rack = position?.racks.find((item) => item.id === selectedEvent.rackId) ?? null;
    return { position, rack };
  }, [project, selectedEvent]);

  const selectedEffect = useMemo(
    () => effects.find((effect) => effect.id === selectedEffectId) ?? effects[0] ?? null,
    [effects, selectedEffectId]
  );

  const timeRulerHeight = 32;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left - 200 + scrollLeft;
    const rawTime = Math.max(0, x / PIXELS_PER_SECOND);
    const time = Math.min(rawTime, duration);
    setCurrentTime(time);
  };

  const getTrackFromPointer = (clientY: number) => {
    if (!timelineRef.current || tracks.length === 0) return tracks[0];
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollTop = timelineRef.current.scrollTop;
    const y = clientY - rect.top - timeRulerHeight + scrollTop;
    const idx = Math.max(0, Math.min(tracks.length - 1, Math.floor(y / TRACK_HEIGHT)));
    return tracks[idx];
  };

  const handleEventDrag = (eventId: string, startTime: number, track: typeof tracks[0]) => {
    const snapped = Math.round(startTime / SNAP_STEP) * SNAP_STEP;
    updateEvent(eventId, {
      startTime: Math.max(0, Math.min(snapped, duration)),
      positionId: track.positionId,
      rackId: track.rackId,
      track: track.id,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    // 处理手柄拖动（可以跨行）
    if (handleDragging) {
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left - 200 + scrollLeft;
      const newTime = Math.max(0, (x - handleDragging.offset) / PIXELS_PER_SECOND);
      const targetTrack = getTrackFromPointer(e.clientY);
      handleEventDrag(handleDragging.id, newTime, targetTrack);
      return;
    }

    // 处理普通拖动（保持在同一行）
    if (dragging) {
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left - 200 + scrollLeft;
      const newTime = Math.max(0, (x - dragging.offset) / PIXELS_PER_SECOND);
      const event = events.find(e => e.id === dragging.id);
      if (event) {
        const track = tracks.find(t => t.positionId === event.positionId && t.rackId === event.rackId);
        if (track) {
          handleEventDrag(dragging.id, newTime, track);
        }
      }
    }
  };

  const stopDragging = () => {
    setDragging(null);
    setHandleDragging(null);
  };

  const handleAddEvent = () => {
    if (tracks.length === 0) {
      alert('请先在地图编辑器中添加阵地和炮架');
      return;
    }

    const track = tracks[0];
    const position = project?.positions.find((p) => p.id === track.positionId);
    const rack = position?.racks.find((r) => r.id === track.rackId);

    if (!position || !rack) return;

    const newEvent: ShowEvent = {
      id: `event-${Date.now()}`,
      name: `指令 ${events.length + 1}`,
      startTime: currentTime,
      positionId: position.id,
      rackId: rack.id,
      tubeIndices: [],
      pattern: 'all',
      track: track.id,
    };

    addEvent(newEvent);
    selectEvent(newEvent);
  };

  const getPatternLabel = (pattern: FiringPattern) => {
    switch (pattern) {
      case 'all':
        return '齐射';
      case 'sequential':
        return '顺序';
      case 'reverse':
        return '反向';
      case 'random':
        return '随机';
      case 'wave':
        return '波浪';
      case 'spiral':
        return '螺旋';
      default:
        return pattern;
    }
  };

  const getPatternColor = (pattern: FiringPattern) => {
    switch (pattern) {
      case 'all':
        return '#DC2626';        // Primary red
      case 'sequential':
        return '#EF4444';        // Lighter red
      case 'reverse':
        return '#B91C1C';        // Darker red
      case 'random':
        return '#FBBF24';        // Yellow accent
      case 'wave':
        return '#F59E0B';        // Orange accent
      case 'spiral':
        return '#F97316';        // Orange-red
      default:
        return '#6B7280';        // Gray
    }
  };

  const getEffectTypeColor = (type: FireworkType): string => {
    switch (type) {
      case 'peony':         return '#DC2626'; // 红
      case 'willow':        return '#D4A017'; // 金
      case 'chrysanthemum': return '#9333EA'; // 紫
      case 'crossette':     return '#94A3B8'; // 白/银
      case 'burst':         return '#F97316'; // 橙
      case 'comet':         return '#3B82F6'; // 蓝
      case 'mine':          return '#22C55E'; // 绿
      case 'fountain':      return '#06B6D4'; // 青
      default:              return '#DC2626'; // 默认红
    }
  };

  const handleLoadAllTubes = () => {
    const position = selectedRackInfo.position;
    const rack = selectedRackInfo.rack;
    if (!selectedEffect || !position || !rack) return;
    rack.tubes.forEach((tube) => {
      loadTube(position.id, rack.id, tube.index, selectedEffect);
    });
  };

  const handleUnloadAllTubes = () => {
    const position = selectedRackInfo.position;
    const rack = selectedRackInfo.rack;
    if (!position || !rack) return;
    rack.tubes.forEach((tube) => {
      unloadTube(position.id, rack.id, tube.index);
    });
  };

  const handleLoadTube = (tubeIndex: number) => {
    const position = selectedRackInfo.position;
    const rack = selectedRackInfo.rack;
    if (!selectedEffect || !position || !rack) return;
    loadTube(position.id, rack.id, tubeIndex, selectedEffect);
  };

  const handleUnloadTube = (tubeIndex: number) => {
    const position = selectedRackInfo.position;
    const rack = selectedRackInfo.rack;
    if (!position || !rack) return;
    unloadTube(position.id, rack.id, tubeIndex);
  };

  const handleUseLoadedTubes = () => {
    if (!selectedEvent || !selectedRackInfo.rack) return;
    const loadedIndices = selectedRackInfo.rack.tubes
      .filter((tube) => tube.loaded)
      .map((tube) => tube.index);
    updateEvent(selectedEvent.id, { tubeIndices: loadedIndices });
  };

  const handleToggleTubeIndex = (tubeIndex: number) => {
    if (!selectedEvent) return;
    const current = selectedEvent.tubeIndices ?? [];
    let next: number[];
    if (current.length === 0) {
      next = [tubeIndex];
    } else if (current.includes(tubeIndex)) {
      next = current.filter((idx) => idx !== tubeIndex);
    } else {
      next = [...current, tubeIndex];
    }
    updateEvent(selectedEvent.id, { tubeIndices: next });
  };

  const selectedTubeIndices = selectedEvent?.tubeIndices ?? [];
  const selectedTubeSet = new Set(selectedTubeIndices);
  const rackTubes = selectedRackInfo.rack?.tubes ?? [];
  const isAllTubesSelected = selectedTubeIndices.length === 0;

  return (
    <div className="h-full bg-panel-bg flex flex-col">
      <div className="h-12 bg-app-bg border-b border-panel-border flex items-center justify-between px-4 gap-6">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-text-main">燃放编排时间轴</h2>
          <div className="text-xs text-text-secondary px-2 py-1 bg-panel-bg rounded border border-panel-border">
            时长：{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-white flex-1 justify-end">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">缩放</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="accent-primary"
            />
            <span className="text-text-secondary font-mono">{Math.round(scale * 100)}%</span>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <div className="flex items-center gap-1">
              <span>时间</span>
              <span className="text-text-main font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <button
              className="px-3 py-1.5 rounded bg-primary hover:bg-primary-hover text-white font-medium transition-all shadow-glow"
              title="在当前时间添加点火指令"
              onClick={handleAddEvent}
            >
              + 添加指令
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto relative"
        ref={timelineRef}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div className="relative" style={{ minWidth: `${duration * PIXELS_PER_SECOND + 200}px` }}>
          {/* 时间尺 */}
          <div className="sticky top-0 z-20 h-8 bg-black border-b border-panel-border flex">
            <div className="sticky left-0 z-30 w-48 flex-shrink-0 border-r border-panel-border bg-black" />
            <div className="flex-1 relative bg-black">
              {Array.from({ length: Math.ceil(duration / 5) }).map((_, i) => {
                const time = i * 5;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-panel-border"
                    style={{ left: `${time * PIXELS_PER_SECOND}px` }}
                  >
                    <span className="text-xs text-text-secondary ml-1 font-mono">
                      {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}

              {/* 播放头 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-danger z-20 pointer-events-none shadow-glow-danger"
                style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }}
              >
                <div className="w-3 h-3 bg-danger rounded-full -ml-1.5 -mt-1 shadow-lg" />
              </div>
            </div>
          </div>

          {/* 轨道 */}
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
              暂无阵地或炮架，请在地图编辑器中添加。
            </div>
          ) : (
            <div className="flex flex-col">
              {tracks.map((track) => (
                <div key={track.id} className="flex border-b border-panel-border" style={{ height: `${TRACK_HEIGHT}px` }}>
                  <div className="sticky left-0 z-10 w-48 flex-shrink-0 border-r border-panel-border flex items-center px-2 bg-black">
                    <span className="text-xs text-text-main truncate" title={track.label}>
                      {track.label}
                    </span>
                  </div>
                  <div
                    className="flex-1 relative cursor-pointer hover:bg-panel-border/30 transition-colors"
                    onClick={handleTimelineClick}
                  >
                    {events
                      .filter((event) => event.positionId === track.positionId && event.rackId === track.rackId)
                      .map((event) => {
                        const position = project?.positions.find((p) => p.id === event.positionId);
                        const rack = position?.racks.find((r) => r.id === event.rackId);
                        const loadedCount = rack?.tubes.filter((t) => t.loaded).length ?? 0;
                        const totalCount = rack?.tubeCount ?? 0;

                        // Determine dominant effect from targeted tubes
                        const firedTubes = event.tubeIndices.length > 0
                          ? rack?.tubes.filter((t) => event.tubeIndices.includes(t.index))
                          : rack?.tubes;
                        const dominantEffect = firedTubes?.find((t) => t.loaded && t.effect)?.effect ?? null;
                        const blockColor = dominantEffect ? getEffectTypeColor(dominantEffect.type) : getPatternColor(event.pattern);
                        const displayName = dominantEffect?.name ?? event.name;

                        return (
                          <div
                            key={event.id}
                            onMouseDown={(e) => {
                              // 如果点击的是拖动手柄，不触发普通拖动
                              if ((e.target as HTMLElement).closest('.drag-handle')) {
                                return;
                              }
                              const rect = timelineRef.current?.getBoundingClientRect();
                              if (!rect) return;
                              const scrollLeft = timelineRef.current?.scrollLeft ?? 0;
                              const x = e.clientX - rect.left - 200 + scrollLeft;
                              selectEvent(event);
                              setDragging({ id: event.id, offset: x - event.startTime * PIXELS_PER_SECOND });
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定删除指令"${event.name}"吗？`)) {
                                deleteEvent(event.id);
                              }
                            }}
                            className={`absolute top-1 h-8 rounded px-2 flex items-center gap-2 text-xs cursor-move transition-all border ${
                              selectedEvent?.id === event.id
                                ? 'ring-2 ring-primary border-primary shadow-glow'
                                : 'border-transparent'
                            }`}
                            style={{
                              left: `${event.startTime * PIXELS_PER_SECOND}px`,
                              minWidth: '120px',
                              backgroundColor: blockColor,
                            }}
                            title={[
                              event.name,
                              dominantEffect ? `效果: ${dominantEffect.name}` : null,
                              dominantEffect ? `类型: ${dominantEffect.type}` : null,
                              dominantEffect ? `颜色: ${dominantEffect.color}` : null,
                              dominantEffect ? `高度: ${dominantEffect.height}m` : null,
                              dominantEffect ? `粒子数: ${dominantEffect.particleCount}` : null,
                              `模式: ${getPatternLabel(event.pattern)}`,
                              `装填: ${loadedCount}/${totalCount}`,
                            ].filter(Boolean).join('\n')}
                          >
                            <span
                              className="truncate text-white font-medium flex-1"
                              style={{
                                unicodeBidi: 'plaintext',
                                direction: 'ltr',
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {displayName}
                            </span>
                            <span className="text-white/90 text-xs bg-black/20 px-1.5 py-0.5 rounded">
                              {getPatternLabel(event.pattern)}
                            </span>
                            <span className="text-white/80 text-xs">
                              {loadedCount}/{totalCount}
                            </span>
                            <div
                              className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-center w-5 h-5 hover:bg-white/20 rounded transition-colors"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const rect = timelineRef.current?.getBoundingClientRect();
                                if (!rect) return;
                                const scrollLeft = timelineRef.current?.scrollLeft ?? 0;
                                const x = e.clientX - rect.left - 200 + scrollLeft;
                                setHandleDragging({ id: event.id, offset: x - event.startTime * PIXELS_PER_SECOND });
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              title="拖动到其他行"
                            >
                              <GripVertical size={14} className="text-white" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 指令检查器 */}
      {selectedEvent && (
        <div className="h-auto bg-app-bg border-t border-panel-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-main">点火指令：{selectedEvent.name}</h3>
            <button
              onClick={() => selectEvent(null)}
              className="text-xs text-text-secondary hover:text-text-main"
            >
              关闭
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-text-secondary block mb-1">指令名称</label>
              <input
                type="text"
                value={selectedEvent.name}
                onChange={(e) => updateEvent(selectedEvent.id, { name: e.target.value })}
                className="w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-text-main"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">点火时间（秒）</label>
              <input
                type="number"
                value={selectedEvent.startTime.toFixed(2)}
                onChange={(e) =>
                  updateEvent(selectedEvent.id, { startTime: parseFloat(e.target.value) || 0 })
                }
                step={0.1}
                className="w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-text-main"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">燃放模式</label>
              <select
                value={selectedEvent.pattern}
                onChange={(e) => updateEvent(selectedEvent.id, { pattern: e.target.value as FiringPattern })}
                className="w-full bg-white text-black border border-panel-border rounded px-2 py-1"
              >
                <option value="all" className="text-black">齐射（同时点火）</option>
                <option value="sequential" className="text-black">顺序（从左到右）</option>
                <option value="reverse" className="text-black">反向（从右到左）</option>
                <option value="random" className="text-black">随机</option>
                <option value="wave" className="text-black">波浪（矩阵）</option>
                <option value="spiral" className="text-black">螺旋（矩阵）</option>
              </select>
            </div>

            {(selectedEvent.pattern === 'sequential' || selectedEvent.pattern === 'wave') && (
              <div>
                <label className="text-text-secondary block mb-1">间隔时间（毫秒）</label>
                <input
                  type="number"
                  value={selectedEvent.interval ?? 200}
                  onChange={(e) =>
                    updateEvent(selectedEvent.id, { interval: parseInt(e.target.value, 10) || 200 })
                  }
                  step={50}
                  className="w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-text-main"
                />
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-panel-border/60 pt-3 space-y-4 text-xs">
            <div>
              <div className="text-xs font-semibold text-text-main mb-2">炮筒装填</div>
              {!selectedRackInfo.rack ? (
                <div className="text-text-secondary">当前指令未绑定炮架。</div>
              ) : (
                <>
                  {effects.length === 0 ? (
                    <div className="text-text-secondary">暂无可用礼花弹效果。</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-text-secondary block mb-1">选择效果</label>
                        <select
                          value={selectedEffectId}
                          onChange={(e) => setSelectedEffectId(e.target.value)}
                          className="w-full bg-white text-black border border-panel-border rounded px-2 py-1"
                        >
                          {effects.map((effect) => (
                            <option key={effect.id} value={effect.id} className="text-black">
                              {effect.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={handleLoadAllTubes}
                          disabled={!selectedEffect}
                          className={`px-3 py-1.5 rounded text-xs font-medium ${
                            selectedEffect
                              ? 'bg-primary/20 text-primary hover:bg-primary/30'
                              : 'bg-panel-border text-text-secondary cursor-not-allowed'
                          }`}
                        >
                          装填全部
                        </button>
                        <button
                          onClick={handleUnloadAllTubes}
                          className="px-3 py-1.5 rounded text-xs bg-panel-border text-text-main hover:bg-panel-border/70"
                        >
                          清空全部
                        </button>
                        <button
                          onClick={refillTubes}
                          className="px-3 py-1.5 rounded text-xs bg-panel-border/80 text-primary hover:bg-panel-border/60"
                          title="将所有炮筒恢复到已装填但未发射的状态"
                        >
                          重装全部
                        </button>
                      </div>
                    </div>
                  )}

                  {rackTubes.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {rackTubes.map((tube) => (
                        <div
                          key={tube.id}
                          className="bg-panel-bg border border-panel-border rounded px-2 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-text-main">筒 {tube.index + 1}</span>
                            <span className={tube.loaded ? 'text-success' : 'text-text-secondary'}>
                              {tube.loaded ? '已装填' : '未装填'}
                            </span>
                          </div>
                          <div className="text-text-secondary mt-1 truncate">
                            {tube.effect?.name ?? '未设置效果'}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => handleLoadTube(tube.index)}
                              disabled={!selectedEffect}
                              className={`px-2 py-1 rounded text-xs ${
                                selectedEffect
                                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
                              }`}
                            >
                              装填
                            </button>
                            <button
                              onClick={() => handleUnloadTube(tube.index)}
                              disabled={!tube.loaded}
                              className={`px-2 py-1 rounded text-xs ${
                                tube.loaded
                                  ? 'bg-panel-border text-text-main hover:bg-panel-border/70'
                                  : 'bg-panel-border text-text-secondary cursor-not-allowed'
                              }`}
                            >
                              清空
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-text-main mb-2">点火炮筒</div>
              {!selectedRackInfo.rack ? (
                <div className="text-text-secondary">当前指令未绑定炮架。</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => updateEvent(selectedEvent.id, { tubeIndices: [] })}
                      className={`px-2 py-1 rounded text-xs ${
                        isAllTubesSelected
                          ? 'bg-primary text-white'
                          : 'bg-panel-border text-text-secondary hover:bg-panel-border/70'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={handleUseLoadedTubes}
                      className="px-2 py-1 rounded text-xs bg-panel-border text-text-main hover:bg-panel-border/70"
                    >
                      使用已装填
                    </button>
                    <span className="text-[10px] text-text-secondary">
                      空列表=全部
                    </span>
                  </div>
                  <div className="grid grid-cols-8 md:grid-cols-12 gap-1">
                    {rackTubes.map((tube) => {
                      const isActive = isAllTubesSelected || selectedTubeSet.has(tube.index);
                      return (
                        <button
                          key={tube.id}
                          onClick={() => handleToggleTubeIndex(tube.index)}
                          className={`h-7 rounded text-[10px] font-medium ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'bg-panel-bg text-text-secondary border border-panel-border hover:bg-panel-border/60'
                          }`}
                        >
                          {tube.index + 1}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm(`确定删除指令“${selectedEvent.name}”吗？`)) {
                deleteEvent(selectedEvent.id);
                selectEvent(null);
              }
            }}
            className="mt-3 w-full px-3 py-1.5 rounded bg-danger hover:bg-danger/80 text-white text-xs font-medium"
          >
            删除指令
          </button>
        </div>
      )}
    </div>
  );
}
