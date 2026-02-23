import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { ShowControlSettings } from '../../types';
import { DEFAULT_MANAGER_SETTINGS, useManagerStore } from '../../store/managerStore';

type FieldConfig = {
  key: keyof ShowControlSettings;
  label: string;
  step?: number;
  min?: number;
  max?: number;
};

const SECTIONS: Array<{ title: string; fields: FieldConfig[] }> = [
  {
    title: '物理参数',
    fields: [
      { key: 'gravity', label: '重力 (m/s²)', step: 0.1 },
      { key: 'airResistance', label: '空气阻尼', step: 0.001 },
      { key: 'dragVariation', label: '阻尼扰动', step: 0.001 },
      { key: 'velocityScale', label: '速度缩放', step: 0.01 },
    ],
  },
  {
    title: '爆点高度',
    fields: [
      { key: 'burstHeightScale', label: '高度缩放', step: 0.01 },
      { key: 'airBurstMin', label: '空中最小爆高', step: 0.5 },
      { key: 'airBurstMax', label: '空中最大爆高', step: 0.5 },
      { key: 'groundBurstMin', label: '地面最小爆高', step: 0.5 },
      { key: 'groundBurstMax', label: '地面最大爆高', step: 0.5 },
    ],
  },
  {
    title: '升空弹体',
    fields: [
      { key: 'shellDrag', label: '弹体阻尼', step: 0.001 },
      { key: 'shellSize', label: '弹体尺寸', step: 0.05 },
      { key: 'shellTrail', label: '弹体拖尾', step: 0.01 },
      { key: 'shellMinFlightTime', label: '最短飞行时间', step: 0.05 },
      { key: 'shellFallDistance', label: '触发下落距离', step: 0.1 },
      { key: 'shellFallTime', label: '触发下落时间', step: 0.05 },
    ],
  },
  {
    title: '爆炸衰减',
    fields: [{ key: 'burstFallFadeTime', label: '消散时间', step: 0.1 }],
  },
];

export function ShowSettingsManager() {
  const { showSettings, updateShowSettings, resetShowSettings } = useManagerStore(
    useShallow((state) => ({
      showSettings: state.showSettings,
      updateShowSettings: state.updateShowSettings,
      resetShowSettings: state.resetShowSettings,
    }))
  );

  const isDefault = useMemo(
    () =>
      Object.entries(DEFAULT_MANAGER_SETTINGS).every(
        ([key, value]) => showSettings[key as keyof ShowControlSettings] === value
      ),
    [showSettings]
  );

  const handleUpdate = (key: keyof ShowControlSettings, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateShowSettings({ [key]: parsed });
  };

  return (
    <div className="h-full w-full p-4 bg-app-bg overflow-hidden">
      <div className="bg-panel-bg border border-panel-border rounded-lg flex flex-col overflow-hidden h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-app-bg">
          <div>
            <div className="text-sm font-semibold text-text-main">燃放参数</div>
            <div className="text-xs text-text-secondary">
              控制 3D 场景中的发射与爆炸物理表现
            </div>
          </div>
          <button
            onClick={resetShowSettings}
            disabled={isDefault}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              isDefault
                ? 'bg-panel-border text-text-secondary cursor-not-allowed'
                : 'bg-panel-bg border border-panel-border text-text-main hover:bg-panel-border'
            }`}
          >
            重置默认
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-app-bg border border-panel-border rounded-lg p-4">
              <div className="text-sm font-semibold text-text-main mb-3">{section.title}</div>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                {section.fields.map((field) => (
                  <label key={field.key} className="text-text-secondary">
                    {field.label}
                    <input
                      type="number"
                      step={field.step ?? 0.1}
                      min={field.min}
                      max={field.max}
                      value={showSettings[field.key]}
                      onChange={(event) => handleUpdate(field.key, event.target.value)}
                      className="mt-1 w-full rounded bg-panel-bg border border-panel-border px-2 py-1.5 text-sm text-text-main"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

