import { useRef, useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useProjectStore, createPosition, createFanRack, createStraightRack, createMatrixRack } from '../../store/projectStore';
import { Rack } from '../../types/domain';

interface MapEditorProps {
  compact?: boolean;
}

type Tool = 'select' | 'position';

export function MapEditor({ compact = false }: MapEditorProps) {
  const {
    project,
    selectedPosition,
    selectedRack,
    selectPosition,
    selectRack,
    addPosition,
    deletePosition,
    updatePosition,
    addRackToPosition,
    deleteRack,
    history,
    undo,
    loadDemoProject,
    createNewProject,
  } = useProjectStore(
    useShallow((state) => ({
      project: state.project,
      selectedPosition: state.selectedPosition,
      selectedRack: state.selectedRack,
      selectPosition: state.selectPosition,
      selectRack: state.selectRack,
      addPosition: state.addPosition,
      deletePosition: state.deletePosition,
      updatePosition: state.updatePosition,
      addRackToPosition: state.addRackToPosition,
      deleteRack: state.deleteRack,
      history: state.history,
      undo: state.undo,
      loadDemoProject: state.loadDemoProject,
      createNewProject: state.createNewProject,
    }))
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showRackBuilder, setShowRackBuilder] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const SNAP_STEP = 5; // 单位：米
  const snap = (value: number) => (snapEnabled ? Math.round(value / SNAP_STEP) * SNAP_STEP : value);
  const canUndo = history.length > 0;

  // 计算所有阵地的边界范围
  const bounds = useMemo(() => {
    if (!project?.positions || project.positions.length === 0) {
      return { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    project.positions.forEach((pos) => {
      minX = Math.min(minX, pos.coordinate.x);
      maxX = Math.max(maxX, pos.coordinate.x);
      minZ = Math.min(minZ, pos.coordinate.z);
      maxZ = Math.max(maxZ, pos.coordinate.z);
    });

    // 添加边距（20%的额外空间）
    const paddingX = Math.max(20, (maxX - minX) * 0.2);
    const paddingZ = Math.max(20, (maxZ - minZ) * 0.2);

    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minZ: minZ - paddingZ,
      maxZ: maxZ + paddingZ,
    };
  }, [project?.positions]);

  // 计算视图范围
  const viewRange = useMemo(() => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxZ - bounds.minZ;
    return { width, height, centerX: (bounds.minX + bounds.maxX) / 2, centerZ: (bounds.minZ + bounds.maxZ) / 2 };
  }, [bounds]);

  const handleLoadDemo = () => {
    loadDemoProject();
    setTool('select');
    setShowRackBuilder(false);
    setDraggingId(null);
    selectRack(null);
  };

  const handleUndo = () => {
    if (!canUndo) return;
    undo();
    setShowRackBuilder(false);
    setDraggingId(null);
    selectRack(null);
  };

  const handleCreateNew = () => {
    createNewProject();
    setTool('select');
    setShowRackBuilder(false);
    setDraggingId(null);
    selectRack(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || tool !== 'position') return;

    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relZ = (e.clientY - rect.top) / rect.height;

    const x = snap(bounds.minX + relX * viewRange.width);
    const z = snap(bounds.minZ + relZ * viewRange.height);

    const newPosition = createPosition(`阵地 ${(project?.positions.length || 0) + 1}`, x, z, []);

    addPosition(newPosition);
    selectPosition(newPosition);
    selectRack(null);
    setTool('select');
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relZ = (e.clientY - rect.top) / rect.height;

    const x = snap(bounds.minX + relX * viewRange.width);
    const z = snap(bounds.minZ + relZ * viewRange.height);
    updatePosition(draggingId, { coordinate: { x, y: 0, z } });
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleAddRack = (type: 'fan' | 'straight' | 'matrix') => {
    if (!selectedPosition) return;

    let rack: Rack;
    const rackNumber = selectedPosition.racks.length + 1;

    switch (type) {
      case 'fan':
        rack = createFanRack(`扇形架 ${rackNumber}`, 5, -30, 30, 82);
        break;
      case 'straight':
        rack = createStraightRack(`直排架 ${rackNumber}`, 10, 90);
        break;
      case 'matrix':
        rack = createMatrixRack(`矩阵 ${rackNumber}`, 5, 5, 0.5, 90);
        break;
    }

    addRackToPosition(selectedPosition.id, rack);
    setShowRackBuilder(false);
  };

  const showUI = !compact;

  return (
    <div id="map-editor-panel" className="h-full bg-panel-bg flex flex-col">
      {showUI && (
        <div className="h-12 bg-app-bg border-b border-panel-border flex items-center justify-between px-4 gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <h2 className="text-sm font-semibold text-text-main whitespace-nowrap">阵地编辑</h2>
            <button
              onClick={handleLoadDemo}
              className="px-3 py-1 text-xs rounded border border-primary bg-primary/10 text-primary hover:bg-primary/20 whitespace-nowrap"
              title="加载3分钟中型烟花秀 (500炮筒对称齐射)"
            >
              案例
            </button>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-3 py-1 text-xs rounded border border-panel-border whitespace-nowrap ${
                canUndo
                  ? 'bg-panel-bg text-text-main hover:bg-panel-border'
                  : 'bg-panel-bg text-text-secondary opacity-40 cursor-not-allowed'
              }`}
              title="撤销上一步操作"
            >
              撤销
            </button>
            <button
              onClick={handleCreateNew}
              className="px-3 py-1 text-xs rounded border border-panel-border bg-panel-bg text-text-main hover:bg-panel-border whitespace-nowrap"
              title="新建阵地摆放方案"
            >
              新建
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('select')}
              className={`px-3 py-1 text-xs rounded ${
                tool === 'select'
                  ? 'bg-primary text-white shadow-glow'
                  : 'bg-panel-bg text-text-secondary hover:bg-panel-border'
              }`}
            >
              选择
            </button>
            <button
              onClick={() => setTool('position')}
              className={`px-3 py-1 text-xs rounded ${
                tool === 'position'
                  ? 'bg-primary text-white shadow-glow'
                  : 'bg-panel-bg text-text-secondary hover:bg-panel-border'
              }`}
            >
              添加阵地
            </button>
            <div className="w-px h-6 bg-panel-border mx-1" />
            <div className="text-xs text-text-secondary">网格吸附</div>
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`px-2 py-1 text-xs rounded ${
                snapEnabled ? 'bg-primary text-white' : 'bg-panel-bg text-text-secondary hover:bg-panel-border'
              }`}
            >
              {snapEnabled ? '开' : '关'}
            </button>
            <div className="text-xs text-text-secondary ml-2">
              视图范围：{viewRange.width.toFixed(0)}m × {viewRange.height.toFixed(0)}m
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 relative"
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {showUI && (
          <div className="absolute right-3 top-3 z-10 pointer-events-none flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded bg-app-bg/90 backdrop-blur border border-panel-border text-xs text-text-main shadow-glow hover:bg-app-bg"
              title="显示/隐藏操作指南"
            >
              <span className="font-semibold text-primary">操作指南</span>
              <span className="text-text-secondary">{showGuide ? '（点击收起）' : '（点击展开）'}</span>
            </button>
            {showGuide && (
              <div className="pointer-events-auto w-72 bg-black/70 backdrop-blur-md text-xs text-white border border-panel-border rounded-lg shadow-glow p-3 space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-primary">操作指南</span>
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    className="text-text-secondary hover:text-white transition-colors"
                    title="关闭指南"
                  >
                    ✕
                  </button>
                </div>
                <div>· 点击"添加阵地"后在画布上放置阵地。</div>
                <div>· 单击阵地选中，拖拽可移动位置；双击可删除。</div>
                <div>· 点击炮架小方块可查看名称并选择。</div>
                <div>· 网格吸附步长：{SNAP_STEP} 米，可在顶部工具切换。</div>
                <div>· 视图会自动调整以显示所有阵地。</div>
              </div>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`absolute inset-0 w-full h-full ${
            tool === 'position' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{
            backgroundColor: '#0A0404',
            backgroundImage:
              'linear-gradient(rgba(220, 38, 38, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 38, 38, 0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* 渲染阵地 */}
        {project?.positions.map((position) => {
          const x = ((position.coordinate.x - bounds.minX) / viewRange.width) * 100;
          const z = ((position.coordinate.z - bounds.minZ) / viewRange.height) * 100;
          const isSelected = selectedPosition?.id === position.id;

          return (
            <div
              key={position.id}
              onClick={(e) => {
                e.stopPropagation();
                if (tool === 'select') {
                  selectPosition(position);
                  selectRack(null);
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (tool === 'select') {
                  selectPosition(position);
                  setDraggingId(position.id);
                  selectRack(null);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (tool === 'select') {
                  selectRack(null);
                  deletePosition(position.id);
                }
              }}
              className={`absolute cursor-pointer transition-all ${isSelected ? 'z-20' : 'z-10'}`}
              style={{
                left: `${x}%`,
                top: `${z}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* 阵地标记 */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isSelected
                    ? 'ring-2 ring-primary scale-125 bg-primary shadow-glow'
                    : 'bg-primary/80 hover:scale-110'
                }`}
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>

              {/* 炮架指示 */}
              {position.racks.length > 0 && (
                <div className="absolute top-full mt-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    {position.racks.map((rack) => {
                      const isRackSelected = selectedRack?.id === rack.id;
                      return (
                        <button
                          key={rack.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (tool !== 'select') return;
                            selectPosition(position);
                            selectRack(rack);
                          }}
                          className={`w-3 h-3 rounded-sm border transition-all ${
                            isRackSelected
                              ? 'bg-primary border-primary shadow-glow'
                              : 'bg-warning/70 border-panel-border hover:bg-warning'
                          }`}
                          title={`${rack.name} (${rack.type})`}
                        />
                      );
                    })}
                  </div>
                  {selectedRack && position.racks.some((rack) => rack.id === selectedRack.id) && (
                    <div className="text-xs px-2 py-1 rounded bg-panel-bg text-text-main border border-panel-border">
                      {selectedRack.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 阵地检查器面板 */}
      {showUI && selectedPosition && (
        <div className="h-auto max-h-64 bg-app-bg border-t border-panel-border p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-main">阵地：{selectedPosition.name}</h3>
            <button
              onClick={() => selectPosition(null)}
              className="text-xs text-text-secondary hover:text-text-main"
            >
              关闭
            </button>
          </div>

          <div className="text-xs text-text-secondary mb-3">
            位置：({selectedPosition.coordinate.x.toFixed(1)}m, {selectedPosition.coordinate.z.toFixed(1)}m)
          </div>

          {/* 炮架列表 */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-text-main mb-2">
              炮架列表 ({selectedPosition.racks.length})
            </div>
            {selectedPosition.racks.length === 0 ? (
              <div className="text-xs text-text-secondary italic">暂无炮架</div>
            ) : (
              <div className="space-y-2">
                {selectedPosition.racks.map((rack) => (
                  <div
                    key={rack.id}
                    className="bg-panel-bg p-2 rounded border border-panel-border flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs text-text-main font-medium">{rack.name}</div>
                      <div className="text-xs text-text-secondary">
                        类型：{rack.type === 'fan' ? '扇形' : rack.type === 'straight' ? '直排' : '矩阵'} | 炮筒：{rack.tubeCount} | 已装填：
                        {rack.tubes.filter((t) => t.loaded).length}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteRack(selectedPosition.id, rack.id)}
                      className="text-xs text-danger hover:text-danger/80 px-2 py-1"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 添加炮架按钮 */}
          {!showRackBuilder ? (
            <button
              onClick={() => setShowRackBuilder(true)}
              className="w-full px-3 py-2 text-xs bg-primary hover:bg-primary-hover text-white rounded font-medium shadow-glow"
            >
              + 添加炮架
            </button>
          ) : (
            <div className="bg-panel-bg p-3 rounded border border-panel-border">
              <div className="text-xs font-semibold text-text-main mb-2">选择炮架类型</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddRack('fan')}
                  className="px-3 py-2 text-xs bg-app-bg hover:bg-panel-border text-text-main rounded border border-panel-border"
                >
                  扇形架
                  <div className="text-text-secondary text-xs mt-1">5筒 · 角度扩散</div>
                </button>
                <button
                  onClick={() => handleAddRack('straight')}
                  className="px-3 py-2 text-xs bg-app-bg hover:bg-panel-border text-text-main rounded border border-panel-border"
                >
                  直排架
                  <div className="text-text-secondary text-xs mt-1">10筒 · 垂直发射</div>
                </button>
                <button
                  onClick={() => handleAddRack('matrix')}
                  className="px-3 py-2 text-xs bg-app-bg hover:bg-panel-border text-text-main rounded border border-panel-border"
                >
                  矩阵
                  <div className="text-text-secondary text-xs mt-1">5x5 网格</div>
                </button>
              </div>
              <button
                onClick={() => setShowRackBuilder(false)}
                className="w-full mt-2 px-3 py-1 text-xs bg-app-bg hover:bg-panel-border text-text-secondary rounded"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
