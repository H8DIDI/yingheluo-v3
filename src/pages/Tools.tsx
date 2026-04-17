import { Link } from 'react-router-dom';
import { Rocket, Timer, Wallet, ShieldAlert, Palette, Sparkles, ArrowUpRight } from 'lucide-react';

type Tool = {
  id: string;
  title: string;
  desc: string;
  to?: string;
  href?: string;
  badge?: string;
  status: 'ready' | 'planning';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'amber' | 'sky' | 'emerald' | 'rose' | 'fuchsia' | 'violet';
};

const tools: Tool[] = [
  {
    id: 'simulator',
    title: '3D 烟花编排模拟器',
    desc: 'Three.js GPU 粒子引擎，支持 800 管阵地布局、多种效果与时间轴编排。',
    to: '/tools/simulator',
    badge: '原核心',
    status: 'ready',
    icon: Rocket,
    tone: 'amber',
  },
  {
    id: 'calc-duration',
    title: '燃放时长估算',
    desc: '根据产品清单、发射间隔、波次数量，估算整场烟花秀的有效燃放时长与弹药量。',
    status: 'planning',
    icon: Timer,
    tone: 'sky',
  },
  {
    id: 'calc-budget',
    title: '预算测算',
    desc: '按品类和等级估算单场烟花秀预算，支持导出 PDF 报价单。',
    status: 'planning',
    icon: Wallet,
    tone: 'emerald',
  },
  {
    id: 'safety-dist',
    title: '安全距离计算器',
    desc: '根据产品等级（A/B/C 级）和发射高度自动查表，给出警戒区半径建议。',
    status: 'planning',
    icon: ShieldAlert,
    tone: 'rose',
  },
  {
    id: 'color-reference',
    title: '金属盐发色对照',
    desc: '常用金属盐—颜色—温度对照速查，含光谱示例。',
    status: 'planning',
    icon: Palette,
    tone: 'fuchsia',
  },
  {
    id: 'palette-design',
    title: '秀演色彩板设计',
    desc: '导入主题色，生成推荐烟花颜色序列与对应化合物。',
    status: 'planning',
    icon: Sparkles,
    tone: 'violet',
  },
];

const toneMap: Record<string, { text: string; ring: string; bg: string }> = {
  amber: { text: 'text-amber-300', ring: 'ring-amber-400/25', bg: 'bg-amber-400/10' },
  sky: { text: 'text-sky-300', ring: 'ring-sky-400/25', bg: 'bg-sky-400/10' },
  emerald: { text: 'text-emerald-300', ring: 'ring-emerald-400/25', bg: 'bg-emerald-400/10' },
  rose: { text: 'text-rose-300', ring: 'ring-rose-400/25', bg: 'bg-rose-400/10' },
  fuchsia: { text: 'text-fuchsia-300', ring: 'ring-fuchsia-400/25', bg: 'bg-fuchsia-400/10' },
  violet: { text: 'text-violet-300', ring: 'ring-violet-400/25', bg: 'bg-violet-400/10' },
};

function ToolCard({ t }: { t: Tool }) {
  const Icon = t.icon;
  const tone = toneMap[t.tone];
  const ready = t.status === 'ready';
  const Inner = (
    <div
      className={`group flex h-full flex-col rounded-xl border border-white/[0.08] bg-[#101113] p-5 transition-all duration-200 ${
        ready
          ? 'hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_24px_48px_-24px_rgba(245,158,11,0.2)]'
          : 'opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-grid h-9 w-9 place-items-center rounded-lg ${tone.bg} ring-1 ring-inset ${tone.ring} ${tone.text}`}>
          <Icon size={17} />
        </span>
        {t.badge && (
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/20">
            {t.badge}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-[15px] font-semibold text-white transition-colors group-hover:text-amber-200">
        {t.title}
      </h3>
      <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-white/55">{t.desc}</p>
      <div className="mt-4 text-[12px]">
        {ready ? (
          <span className="inline-flex items-center gap-1 text-amber-300 transition-colors group-hover:text-amber-200">
            打开工具 <ArrowUpRight size={12} />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            开发中
          </span>
        )}
      </div>
    </div>
  );
  if (t.to) return <Link to={t.to} className="contents">{Inner}</Link>;
  if (t.href) return <a href={t.href} className="contents">{Inner}</a>;
  return Inner;
}

export default function Tools() {
  return (
    <div className="space-y-10 md:space-y-14">
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/5 px-3 py-1 text-[11px] font-medium text-fuchsia-300">
          <Sparkles size={11} /> 实用工具集
        </div>
        <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[34px] md:text-[40px]">
          趁手工具 · 不做平台
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/60 sm:text-[14.5px]">
          面向花炮从业者与爱好者的轻量计算与编排工具。每个工具专注一个实际痛点，
          不堆砌功能、不强制登录。
        </p>
      </section>

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.id} t={t} />
        ))}
      </section>
    </div>
  );
}
