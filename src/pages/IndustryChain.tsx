type Node = { id: string; label: string; desc?: string };

const upstream: Node[] = [
  { id: 'u1', label: '原料', desc: '硝酸钾 / 氯酸钾 / 金属盐（锶、钡、铜、钠）/ 引线 / 纸筒' },
  { id: 'u2', label: '模具与设备', desc: '压模机 / 装药机 / 自动引线机' },
];
const midstream: Node[] = [
  { id: 'm1', label: '引信与药剂', desc: '起爆药 / 发射药 / 效果药' },
  { id: 'm2', label: '组装与制造', desc: '单发类 / 组合类 / 架子烟花 / 显示类' },
  { id: 'm3', label: '检测与认证', desc: 'CE / UN / 国标 GB 10631 / 出口许可' },
];
const downstream: Node[] = [
  { id: 'd1', label: '国内销售', desc: '零售 / 节庆批发 / 政府采购' },
  { id: 'd2', label: '国际出口', desc: '东南亚 / 欧盟 / 北美 / 中东 / 拉美' },
  { id: 'd3', label: '秀演与文创', desc: '烟花秀策划 / 主题公园 / 影视特效' },
  { id: 'd4', label: '数字化与服务', desc: '3D 编排 / 安全培训 / 物流仓储' },
];

function Column({ title, items, color }: { title: string; items: Node[]; color: string }) {
  return (
    <div className="flex-1">
      <div className={`mb-3 text-sm font-semibold ${color}`}>{title}</div>
      <div className="space-y-3">
        {items.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-amber-400/40"
          >
            <div className="text-sm font-medium text-neutral-100">{n.label}</div>
            {n.desc && <div className="mt-1 text-xs leading-relaxed text-neutral-400">{n.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IndustryChain() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">浏阳花炮产业链</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-400">
          上游原料与装备 → 中游药剂与组装 → 下游流通与应用。2025 年浏阳花炮产业年产值突破 500 亿元，
          规上企业 431 家，专利 3721 项，出口覆盖 100+ 国家。
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <Column title="🧪 上游" items={upstream} color="text-sky-300" />
          <div className="hidden items-center md:flex text-neutral-600">→</div>
          <Column title="🏭 中游" items={midstream} color="text-amber-300" />
          <div className="hidden items-center md:flex text-neutral-600">→</div>
          <Column title="🚀 下游" items={downstream} color="text-fuchsia-300" />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-neutral-500">
        规划：后续接入 React Flow 做成可交互节点图，每个节点可点击查看代表企业与近期动态。
      </section>
    </div>
  );
}
