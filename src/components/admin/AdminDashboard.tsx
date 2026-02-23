import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Save,
  CloudUpload,
  CloudDownload,
  Trash2,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useProjectStore } from '../../store/projectStore';
import {
  createProject,
  deleteProject,
  fetchHealth,
  getProject,
  listProjects,
  updateProject,
  type ProjectRecord,
} from '../../services/apiService';

type Notice = { type: 'success' | 'error'; message: string };

export function AdminDashboard() {
  const { project, setProject, updateProjectMeta } = useProjectStore(
    useShallow((state) => ({
      project: state.project,
      setProject: state.setProject,
      updateProjectMeta: state.updateProject,
    }))
  );

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ state: 'checking' | 'ok' | 'error'; label: string }>({
    state: 'checking',
    label: '连接检测中',
  });
  const [dbPath, setDbPath] = useState<string>('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saveName, setSaveName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedId) ?? null,
    [projects, selectedId]
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      const [health, list] = await Promise.all([fetchHealth(), listProjects()]);
      setProjects(list);
      setDbPath(health.dbPath);
      setStatus({ state: 'ok', label: '连接正常' });
      if (selectedId && !list.some((item) => item.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (error) {
      setStatus({ state: 'error', label: '连接失败' });
      setNotice({ type: 'error', message: '后端连接失败，请检查服务状态。' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleSaveNew = async () => {
    if (!project) {
      setNotice({ type: 'error', message: '当前没有可保存的工程。' });
      return;
    }

    setIsBusy(true);
    try {
      const name = saveName.trim() || project.name || '未命名工程';
      await createProject({ name, data: project });
      setNotice({ type: 'success', message: '已保存为新工程。' });
      setSaveName('');
      await refreshAll();
    } catch {
      setNotice({ type: 'error', message: '保存失败，请稍后重试。' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleOverwrite = async (id: string) => {
    if (!project) {
      setNotice({ type: 'error', message: '当前没有可覆盖的工程数据。' });
      return;
    }

    if (!confirm('确认用当前工程覆盖所选记录吗？')) return;

    setIsBusy(true);
    try {
      const name = saveName.trim() || selectedProject?.name || project.name || '未命名工程';
      await updateProject(id, { name, data: project });
      setNotice({ type: 'success', message: '覆盖更新完成。' });
      setSaveName('');
      await refreshAll();
    } catch {
      setNotice({ type: 'error', message: '覆盖失败，请稍后重试。' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoad = async (id: string) => {
    setIsBusy(true);
    try {
      const detail = await getProject(id);
      setProject(detail.data);
      setNotice({ type: 'success', message: '工程已载入工作台。' });
    } catch {
      setNotice({ type: 'error', message: '载入失败，请稍后重试。' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该工程记录吗？此操作无法撤销。')) return;

    setIsBusy(true);
    try {
      await deleteProject(id);
      setNotice({ type: 'success', message: '删除完成。' });
      await refreshAll();
    } catch {
      setNotice({ type: 'error', message: '删除失败，请稍后重试。' });
    } finally {
      setIsBusy(false);
    }
  };

  const formatTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <div className="h-full w-full p-4 bg-app-bg overflow-hidden">
      {notice && (
        <div
          className={`mb-3 px-3 py-2 rounded border text-sm flex items-center gap-2 ${
            notice.type === 'success'
              ? 'border-success/40 bg-success/15 text-success'
              : 'border-danger/50 bg-danger/15 text-danger'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4 h-full">
        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
            <div>
              <div className="text-sm font-semibold text-text-main">数据库工程</div>
              <div className="text-xs text-text-secondary">共 {projects.length} 条记录</div>
            </div>
            <button
              onClick={refreshAll}
              className="p-2 rounded hover:bg-panel-border transition-colors"
              title="刷新"
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {projects.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                暂无工程记录，请先保存当前工程。
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-panel-bg">
                  <tr className="text-text-secondary">
                    <th className="text-left px-4 py-2 w-[32%]">工程名称</th>
                    <th className="text-left px-4 py-2 w-[30%]">更新时间</th>
                    <th className="text-left px-4 py-2 w-[20%]">项目ID</th>
                    <th className="text-right px-4 py-2 w-[18%]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t border-panel-border/70 ${
                        selectedId === item.id ? 'bg-panel-border/40' : 'hover:bg-panel-border/30'
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-4 py-2 text-text-main font-medium truncate">{item.name}</td>
                      <td className="px-4 py-2 text-text-secondary">{formatTime(item.updatedAt)}</td>
                      <td className="px-4 py-2 text-text-secondary truncate" title={item.projectId}>
                        {item.projectId}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoad(item.id);
                            }}
                            className="px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                            title="载入"
                            disabled={isBusy}
                          >
                            载入
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOverwrite(item.id);
                            }}
                            className="px-2 py-1 rounded bg-panel-border text-text-main hover:bg-panel-border/70"
                            title="覆盖"
                            disabled={isBusy}
                          >
                            覆盖
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="px-2 py-1 rounded bg-danger/20 text-danger hover:bg-danger/30"
                            title="删除"
                            disabled={isBusy}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-panel-border bg-app-bg">
            <div className="text-sm font-semibold text-text-main">运行状态</div>
            <div className="text-xs text-text-secondary mt-1">
              数据库路径：<span className="text-text-main">{dbPath || '-'}</span>
            </div>
            <div
              className={`mt-2 inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${
                status.state === 'ok'
                  ? 'bg-success/15 text-success border border-success/40'
                  : status.state === 'error'
                  ? 'bg-danger/15 text-danger border border-danger/40'
                  : 'bg-panel-border/40 text-text-secondary border border-panel-border'
              }`}
            >
              {status.state === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {status.label}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto space-y-4">
            <div className="bg-app-bg border border-panel-border rounded-lg p-4">
              <div className="text-sm font-semibold text-text-main flex items-center gap-2">
                <CloudDownload size={16} />
                当前工程
              </div>
              <div className="text-xs text-text-secondary mt-2">
                名称：<span className="text-text-main">{project?.name || '-'}</span>
              </div>
              <div className="text-xs text-text-secondary mt-1">
                工程ID：<span className="text-text-main">{project?.id || '-'}</span>
              </div>
              <div className="text-xs text-text-secondary mt-3">活动名称</div>
              <input
                value={project?.activityName ?? ''}
                onChange={(e) => project && updateProjectMeta({ activityName: e.target.value })}
                className="mt-2 w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-text-main text-sm"
                placeholder="例如：跨年烟花秀"
              />
              <div className="text-xs text-text-secondary mt-3">活动详情</div>
              <textarea
                value={project?.activityDetail ?? ''}
                onChange={(e) => project && updateProjectMeta({ activityDetail: e.target.value })}
                className="mt-2 w-full bg-panel-bg border border-panel-border rounded px-2 py-2 text-text-main text-sm h-20 resize-none"
                placeholder="记录活动目的、场地信息、控制参数等"
              />
            </div>

            <div className="bg-app-bg border border-panel-border rounded-lg p-4">
              <div className="text-sm font-semibold text-text-main flex items-center gap-2">
                <CloudUpload size={16} />
                保存/覆盖
              </div>
              <div className="text-xs text-text-secondary mt-2">工程名称（可选）</div>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="mt-2 w-full bg-panel-bg border border-panel-border rounded px-2 py-1 text-text-main text-sm"
                placeholder="留空则使用当前工程名称"
              />
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  onClick={handleSaveNew}
                  className="w-full px-3 py-2 rounded bg-primary hover:bg-primary-hover text-white text-sm font-medium flex items-center justify-center gap-2"
                  disabled={isBusy}
                >
                  <Save size={16} />
                  保存为新工程
                </button>
                <button
                  onClick={() => selectedId && handleOverwrite(selectedId)}
                  className="w-full px-3 py-2 rounded bg-panel-border hover:bg-panel-border/70 text-text-main text-sm font-medium flex items-center justify-center gap-2"
                  disabled={!selectedId || isBusy}
                >
                  <CloudUpload size={16} />
                  覆盖选中记录
                </button>
              </div>
            </div>

            <div className="bg-app-bg border border-panel-border rounded-lg p-4">
              <div className="text-sm font-semibold text-text-main flex items-center gap-2">
                <Trash2 size={16} />
                快速操作
              </div>
              <div className="text-xs text-text-secondary mt-2">
                选中工程：<span className="text-text-main">{selectedProject?.name || '-'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => selectedId && handleLoad(selectedId)}
                  className="px-3 py-2 rounded bg-primary/20 text-primary hover:bg-primary/30 text-sm"
                  disabled={!selectedId || isBusy}
                >
                  载入工作台
                </button>
                <button
                  onClick={() => selectedId && handleDelete(selectedId)}
                  className="px-3 py-2 rounded bg-danger/20 text-danger hover:bg-danger/30 text-sm"
                  disabled={!selectedId || isBusy}
                >
                  删除记录
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
