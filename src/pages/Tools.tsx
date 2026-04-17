import { Link } from 'react-router-dom';

type Tool = {
  id: string;
  title: string;
  desc: string;
  to?: string;
  href?: string;
  badge?: string;
  status: 'ready' | 'planning';
};

const tools: Tool[] = [
  {
    id: 'simulator',
    title: '3D 烟花编排模拟器',
    desc: '基于 Three.js 的 GPU 粒子烟花引擎，支持 800 管阵地布局、多种效果与时间轴编排。',
    to: '/tools/simulator',
    badge: '原天河落核心',
    status: 'ready',
  },
  {
    id: 'calc-duration',
    title: '燃放时长估算',
    desc: '根据产品清单、发射间隔、波次数量，估算整场烟花秀的有效燃放时长与弹药量。',
    status: 'planning',
  },
  {
    id: 'calc-budget',
    title: '预算测算',
    desc: '按品类和等级估算单场烟花秀预算，支持导出 PDF 报价单。',
    status: 'planning',
  },
  {
    id: 'safety-dist',
    title: '安全距离计算器',
    desc: '根据产品等级（A/B/C 级）和发射高度自动查表，给出警戒区半径建议。',
    status: 'planning',
  },
  {
    id: 'color-reference',
    title: '金属盐发色对照',
    desc: '常用金属盐—颜色—温度对照速查，含光谱示例。',
    status: 'planning',
  },
  {
    id: 'palette-design',
    title: '秀演色彩板设计',
    desc: '导入主题色，生成推荐烟花颜色序列与对应化合物。',
    status: 'planning',
  },
];

function ToolCard({ t }: { t: Tool }) {
  const Inner = (
    <div
      className={`group flex h-full flex-col rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-all ${
        t.status === 'ready'
          ? 'hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.06]'
          : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-neutral-100">{t.title}</h3>
        {t.badge && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">{t.badge}</span>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">{t.desc}</p>
      <div className="mt-3 text-xs">
        {t.status === 'ready' ? (
          <span className="text-amber-300 group-hover:text-amber-200">打开工具 →</span>
        ) : (
          <span className="text-neutral-500">开发中</span>
        )}
      </div>
    </div>
  );
  if (t.to) return <Link to={t.to}>{Inner}</Link>;
  if (t.href) return <a href={t.href}>{Inner}</a>;
  return Inner;
}

export default function Tools() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">工具集</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          面向花炮从业者与爱好者的轻量计算与编排工具。不做平台，做趁手的单点。
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.id} t={t} />
        ))}
      </section>
    </div>
  );
}
