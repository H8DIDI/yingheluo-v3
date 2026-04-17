import { useEffect, useState } from 'react';
import { TrendingUp, Database, Activity, Rss } from 'lucide-react';

type Stats = {
  videos: number;
  news: number;
  sources: number;
  last_fetch_at: number | null;
  industry: {
    annual_output: string;
    annual_output_unit: string;
    above_scale_companies: number;
    patents: number;
    export_countries: string;
  };
};

export default function Data() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const industry = stats?.industry;
  const kpis = [
    { label: '产业年产值', value: industry?.annual_output ?? '508.9', unit: industry?.annual_output_unit ?? '亿元', note: '2024 年', icon: TrendingUp, tone: 'amber' as const },
    { label: '规上企业', value: String(industry?.above_scale_companies ?? 431), unit: '家', note: '浏阳片区', icon: Database, tone: 'sky' as const },
    { label: '相关专利', value: String(industry?.patents ?? 3721), unit: '项', note: '近十年累计', icon: Activity, tone: 'emerald' as const },
    { label: '出口国家', value: industry?.export_countries ?? '100+', unit: '国', note: '常年稳定', icon: Rss, tone: 'fuchsia' as const },
  ];

  const toneMap = {
    amber: { text: 'text-amber-300', ring: 'ring-amber-400/20', bg: 'bg-amber-400/10' },
    sky: { text: 'text-sky-300', ring: 'ring-sky-400/20', bg: 'bg-sky-400/10' },
    emerald: { text: 'text-emerald-300', ring: 'ring-emerald-400/20', bg: 'bg-emerald-400/10' },
    fuchsia: { text: 'text-fuchsia-300', ring: 'ring-fuchsia-400/20', bg: 'bg-fuchsia-400/10' },
  };

  const pipeline = [
    { label: '已抓视频', value: stats?.videos ?? '—' },
    { label: '已抓资讯', value: stats?.news ?? '—' },
    { label: '启用信源', value: stats?.sources ?? '—' },
    {
      label: '最近拉取',
      value: stats?.last_fetch_at
        ? new Date(stats.last_fetch_at * 1000).toLocaleString('zh-CN', { hour12: false })
        : '—',
    },
  ];

  return (
    <div className="space-y-10 md:space-y-14">
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[11px] font-medium text-emerald-300">
          <TrendingUp size={11} /> 产业指标
        </div>
        <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[34px] md:text-[40px]">
          产业数据 · 企业名录
        </h1>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-white/60 sm:text-[14.5px]">
          宏观数据来源：浏阳市统计公报、湖南省工信厅及公开年报。
          企业名录后续将从公开政府数据源和商业 API 抓取更新，支持按主营、资质、出口能力筛选。
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="label-caps text-white/70">核心指标</h2>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <div className="mt-4 grid gap-3 grid-cols-2 md:gap-4 lg:grid-cols-4">
          {kpis.map((s) => {
            const tone = toneMap[s.tone];
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.08] bg-[#101113] p-4 transition-all hover:-translate-y-0.5 hover:border-white/15 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50">{s.label}</span>
                  <span className={`rounded-md ${tone.bg} p-1 ${tone.text} ring-1 ring-inset ${tone.ring}`}>
                    <Icon size={13} />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`text-[26px] font-bold tabular-nums tracking-tight sm:text-[30px] ${tone.text}`}>
                    {s.value}
                  </span>
                  <span className="text-[13px] text-white/50">{s.unit}</span>
                </div>
                <div className="mt-1 text-[11px] text-white/35">{s.note}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="label-caps text-white/70">数据管线状态</h2>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <div className="mt-4 grid gap-3 grid-cols-2 md:gap-4 lg:grid-cols-4">
          {pipeline.map((p) => (
            <div key={p.label} className="rounded-xl border border-white/[0.08] bg-[#101113] p-4">
              <div className="text-[11px] text-white/50">{p.label}</div>
              <div className="mt-1.5 text-[15px] font-semibold tabular-nums text-white">{p.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-2">
          <h2 className="label-caps text-white/70">企业名录</h2>
          <span className="text-[11px] text-white/45">API 对接中</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr className="label-caps text-white/45">
                  <th className="px-4 py-3">名称</th>
                  <th className="px-4 py-3">类型</th>
                  <th className="px-4 py-3">地区</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/[0.05] text-white/55">
                  <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-white/40">
                    API 对接后将展示规上企业、资质、出口能力等信息
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
