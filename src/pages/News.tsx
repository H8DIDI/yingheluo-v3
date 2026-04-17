import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';

type NewsItem = {
  id: string;
  source: string;
  source_name?: string;
  title: string;
  summary?: string;
  url: string;
  published_at?: number;
  tags?: string[];
};

const mock: NewsItem[] = [
  {
    id: 'n1',
    source: 'liuyang',
    source_name: '浏阳发布',
    title: '浏阳花炮产业集群 2025 年产值预计突破 520 亿元',
    summary: '据浏阳市工信局披露，2025 年全市花炮全链条产值预计同比增长 4.2%，出口规模稳居全国第一。',
    url: '#',
    published_at: Date.parse('2026-04-12') / 1000,
    tags: ['产业数据', '浏阳'],
  },
];

function fmtDate(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function News() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news?limit=50')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setItems((d.items || []).length ? d.items : mock))
      .catch(() => setItems(mock))
      .finally(() => setLoading(false));
  }, []);

  const list = items || [];
  const usingMock = items === mock;

  return (
    <div className="space-y-10 md:space-y-12">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-1 text-[11px] font-medium text-sky-300">
              <Newspaper size={11} /> 关键词订阅
            </div>
            <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[34px] md:text-[40px]">
              浏阳花炮 · 最新资讯
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/60 sm:text-[14.5px]">
              追踪关键词：
              <code className="ml-1 rounded bg-white/[0.06] px-1 font-mono text-[12px] text-white/75">浏阳花炮</code>{' '}
              <code className="rounded bg-white/[0.06] px-1 font-mono text-[12px] text-white/75">烟花产业</code>{' '}
              <code className="rounded bg-white/[0.06] px-1 font-mono text-[12px] text-white/75">花炮出口</code>{' '}
              <code className="rounded bg-white/[0.06] px-1 font-mono text-[12px] text-white/75">燃放政策</code>。
              仅展示标题与摘要，点击跳转原站。
            </p>
          </div>
          <div className="shrink-0 text-[11px] text-white/45">
            {loading ? '加载中…' : usingMock ? '样例内容' : `${list.length} 条`}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.1] p-10 text-center text-[13px] text-white/45">
            暂无匹配资讯，抓取管线正在对接更多信源。
          </div>
        ) : (
          list.map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group block rounded-xl border border-white/[0.08] bg-[#101113] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.08)] sm:p-5"
            >
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-300 ring-1 ring-inset ring-amber-400/20">
                  {n.source_name || n.source}
                </span>
                <span className="font-mono tabular-nums text-white/40">{fmtDate(n.published_at)}</span>
              </div>
              <h3 className="mt-2.5 text-[16px] font-semibold leading-snug text-white transition-colors group-hover:text-amber-200 sm:text-[17px]">
                {n.title}
              </h3>
              {n.summary && (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/55">{n.summary}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                {n.tags && n.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {n.tags.slice(0, 5).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55 ring-1 ring-inset ring-white/[0.04]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span />
                )}
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/45 transition-colors group-hover:text-amber-300">
                  阅读原文 <ExternalLink size={11} />
                </span>
              </div>
            </a>
          ))
        )}
      </section>
    </div>
  );
}
