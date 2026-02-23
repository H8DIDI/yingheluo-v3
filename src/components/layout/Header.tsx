import { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  Repeat,
  FileDown,
  Loader2,
  Settings,
  Database,
  Bot,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useProjectStore } from '../../store/projectStore';
import { exportToPDF } from '../../services/exportService';

interface HeaderProps {
  onOpenManager?: () => void;
  onOpenAdmin?: () => void;
  onOpenAssistant?: () => void;
}

export function Header({ onOpenManager, onOpenAdmin, onOpenAssistant }: HeaderProps) {
  const { project, isPlaying, setIsPlaying, currentTime, setCurrentTime, requestReplay, refillTubes } =
    useProjectStore(
      useShallow((state) => ({
        project: state.project,
        isPlaying: state.isPlaying,
        setIsPlaying: state.setIsPlaying,
        currentTime: state.currentTime,
        setCurrentTime: state.setCurrentTime,
        requestReplay: state.requestReplay,
        refillTubes: state.refillTubes,
      }))
    );
  const [isExporting, setIsExporting] = useState(false);

  const timeLabel = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    refillTubes();
  };

  const handleReplay = () => {
    if (!project) return;
    setIsPlaying(false);
    setCurrentTime(0);
    refillTubes();
    requestReplay();
    setTimeout(() => {
      setIsPlaying(true);
    }, 0);
  };

  const handleExportPDF = async () => {
    if (!project || isExporting) return;

    try {
      setIsExporting(true);

      const wasPlaying = isPlaying;
      setIsPlaying(false);

      await exportToPDF(project);
      alert('PDF 导出成功！');

      if (wasPlaying) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}. 请重试。`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="h-14 bg-app-bg border-b border-panel-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-text-main tracking-tight">萤合落 V1.0</h1>
        <span className="text-sm text-text-secondary px-3 py-1 bg-panel-bg rounded border border-panel-border">
          {project?.name || '未命名项目'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          className="p-2 hover:bg-panel-border rounded transition-all"
          title="重置"
        >
          <SkipBack size={18} className="text-text-secondary hover:text-text-main transition-colors" />
        </button>
        <button
          onClick={handleReplay}
          className="p-2 hover:bg-panel-border rounded transition-all"
          title="重播"
        >
          <Repeat size={18} className="text-text-secondary hover:text-text-main transition-colors" />
        </button>
        <button
          onClick={handlePlayPause}
          className={`p-2 rounded transition-all ${
            isPlaying
              ? 'bg-primary/20 hover:bg-primary/30 shadow-glow'
              : 'hover:bg-panel-border'
          }`}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <Pause size={18} className="text-primary" />
          ) : (
            <Play size={18} className="text-text-secondary hover:text-text-main transition-colors" />
          )}
        </button>
        <div className="ml-4 text-sm font-mono text-text-main px-3 py-1.5 bg-panel-bg rounded border border-panel-border">
          {timeLabel}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenManager && (
          <button
            className="p-2 hover:bg-panel-border rounded transition-all"
            title="烟花管理"
            onClick={onOpenManager}
          >
            <Settings size={18} className="text-text-secondary hover:text-text-main transition-colors" />
          </button>
        )}
        {onOpenAssistant && (
          <button
            className="p-2 hover:bg-panel-border rounded transition-all"
            title="AI 助理"
            onClick={onOpenAssistant}
          >
            <Bot size={18} className="text-text-secondary hover:text-text-main transition-colors" />
          </button>
        )}
        {onOpenAdmin && (
          <button
            className="p-2 hover:bg-panel-border rounded transition-all"
            title="后台管理"
            onClick={onOpenAdmin}
          >
            <Database size={18} className="text-text-secondary hover:text-text-main transition-colors" />
          </button>
        )}
        <button
          id="export-btn"
          onClick={handleExportPDF}
          disabled={isExporting}
          className={`p-2 rounded transition-all ${
            isExporting
              ? 'bg-primary/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover shadow-glow'
          }`}
          title="导出施工单"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin text-white" /> : <FileDown size={18} className="text-white" />}
        </button>
      </div>
    </header>
  );
}
