import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, Grid, Rocket } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useProjectStore } from '../../store/projectStore';
import { buildCueExport, parseCueExport, planChoreography } from '../../planner';
import { DEMO_FRONT_VIEW_INPUT } from '../../planner/demoSpec';

export function FrontViewPlannerPanel() {
  const { project, setProject } = useProjectStore(
    useShallow((state) => ({
      project: state.project,
      setProject: state.setProject,
    }))
  );

  const [specText, setSpecText] = useState(() =>
    JSON.stringify(DEMO_FRONT_VIEW_INPUT, null, 2)
  );
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof planChoreography> | null>(null);

  const cuePreview = useMemo(() => (result?.cues ?? []).slice(0, 8), [result]);
  const tiltBoardPlan = result?.tiltBoardPlan;

  const handleGenerate = () => {
    if (!project) {
      setError('当前没有可用工程。');
      return;
    }
    try {
      setError(null);
      const payload = JSON.parse(specText);
      const next = planChoreography(
        payload,
        project.positions.map((pos) => ({ id: pos.id, coordinate: pos.coordinate }))
      );
      setResult(next);
      setWarnings(next.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 解析失败');
      setResult(null);
      setWarnings([]);
    }
  };

  const handleApply = () => {
    if (!project || !result) return;
    const cues = result.cues;
    const maxCueTime = cues.reduce(
      (max, cue) => Math.max(max, cue.launchTime + cue.burstTime + cue.hangTime),
      0
    );
    setProject({
      ...project,
      cueList: cues,
      duration: Math.max(project.duration, maxCueTime + 0.5),
      updatedAt: new Date(),
    });
  };

  const handleDownload = () => {
    if (!result) return;
    const exportRows = buildCueExport(result.cues);
    const blob = new Blob([JSON.stringify(exportRows, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cue-list.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPlan = () => {
    if (!tiltBoardPlan) return;
    const blob = new Blob([JSON.stringify(tiltBoardPlan, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tilt-board-plan.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const cues = parseCueExport(payload);
      if (cues.length === 0) {
        throw new Error('未解析到有效的 cue 数据');
      }
      setResult({
        cues,
        warnings: [],
        stats: { targets: cues.length, assigned: cues.length, failures: 0 },
      });
      setWarnings([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="bg-app-bg border border-panel-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-main">前视编排（数字模拟）</div>
          <div className="text-[10px] text-text-secondary">
            仅用于虚拟/3D 烟花效果编排与预演，发射点来自当前二维阵地。
          </div>
        </div>
        <button
          onClick={handleGenerate}
          className="px-3 py-1.5 rounded text-xs bg-primary text-white hover:bg-primary-hover flex items-center gap-2"
        >
          <Rocket size={12} />
          生成 cue
        </button>
      </div>

      <textarea
        value={specText}
        onChange={(event) => setSpecText(event.target.value)}
        className="w-full h-36 resize-none bg-panel-bg border border-panel-border rounded px-2 py-1.5 text-[11px] text-text-main"
        spellCheck={false}
      />

      {error && (
        <div className="text-[10px] text-danger border border-danger/40 bg-danger/10 px-2 py-1 rounded">
          解析错误：{error}
        </div>
      )}

      {result && (
        <div className="text-[11px] text-text-secondary space-y-1">
          <div>
            目标点 {result.stats.targets} · 成功 {result.stats.assigned} · 失败{' '}
            {result.stats.failures}
          </div>
          {warnings.length > 0 && (
            <div className="text-danger/90">
              {warnings.slice(0, 3).map((warning, index) => (
                <div key={`${warning}-${index}`}>- {warning}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {tiltBoardPlan && (
        <div className="text-[11px] text-text-secondary">
          倾角板计划 · {tiltBoardPlan.count} 发射器 · 倾角 {tiltBoardPlan.boardPitchDeg.toFixed(1)}°
        </div>
      )}

      {result && (
        <div className="text-[10px] text-text-main space-y-1">
          {cuePreview.map((cue) => (
            <div key={cue.id}>
              {cue.launchTime.toFixed(2)}s · {cue.launcherId} · {cue.pattern} ·{' '}
              {cue.color}
            </div>
          ))}
          {result.cues.length > cuePreview.length && (
            <div className="text-text-secondary">… 共 {result.cues.length} 条</div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleApply}
          disabled={!result}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium ${
            result
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-panel-border text-text-secondary cursor-not-allowed'
          }`}
        >
          应用到 3D 场景
        </button>
        <label
          className="px-3 py-2 rounded text-xs flex items-center gap-2 cursor-pointer bg-panel-bg border border-panel-border text-text-secondary hover:bg-panel-border"
        >
          导入 JSON
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
        <button
          onClick={handleDownloadPlan}
          disabled={!tiltBoardPlan}
          className={`px-3 py-2 rounded text-xs flex items-center gap-2 ${
            tiltBoardPlan
              ? 'bg-panel-bg border border-panel-border text-text-secondary hover:bg-panel-border'
              : 'bg-panel-border text-text-secondary cursor-not-allowed'
          }`}
        >
          <Grid size={12} />
          导出倾角板计划
        </button>
        <button
          onClick={handleDownload}
          disabled={!result}
          className={`px-3 py-2 rounded text-xs flex items-center gap-2 ${
            result
              ? 'bg-panel-bg border border-panel-border text-text-secondary hover:bg-panel-border'
              : 'bg-panel-border text-text-secondary cursor-not-allowed'
          }`}
        >
          <Download size={12} />
          导出 JSON
        </button>
      </div>
    </div>
  );
}
