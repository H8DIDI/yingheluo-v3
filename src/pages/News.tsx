type NewsItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  tags?: string[];
};

const mock: NewsItem[] = [
  {
    id: 'n1',
    source: '浏阳发布',
    title: '浏阳花炮产业集群 2025 年产值预计突破 520 亿元',
    summary: '据浏阳市工信局披露，2025 年全市花炮全链条产值预计同比增长 4.2%，出口规模稳居全国第一。',
    url: '#',
    publishedAt: '2026-04-12',
    tags: ['产业数据', '浏阳'],
  },
  {
    id: 'n2',
    source: '第一财经',
    title: '烟花出海：东南亚订单为何集体转向湖南',
    summary: '多家业内公司反馈，今年以来东南亚节庆采购订单向浏阳、醴陵集中，头部企业排产已至 Q3。',
    url: '#',
    publishedAt: '2026-04-09',
    tags: ['出口', '产业分析'],
  },
  {
    id: 'n3',
    source: '人民网',
    title: '文化创意赋能传统产业：花炮如何走进元宇宙',
    summary: '长沙一企业联合高校发布"数字烟花"方案，在虚拟空间复现传统烟花燃放效果，面向低空演艺与文旅场景。',
    url: '#',
    publishedAt: '2026-04-05',
    tags: ['文创', '数字化'],
  },
  {
    id: 'n4',
    source: '应急管理部',
    title: '烟花爆竹生产安全检查通报',
    summary: '全国共查处违法违规行为 128 起，浏阳片区通过率 96.4%，居全国首位。',
    url: '#',
    publishedAt: '2026-03-28',
    tags: ['安全', '监管'],
  },
];

export default function News() {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h1 className="text-2xl font-bold tracking-tight">浏阳花炮 · 最新资讯</h1>
          <span className="text-xs text-neutral-500">日更 · 百度新闻 · 公众号 · 财经媒体（占位）</span>
        </div>
        <p className="max-w-2xl text-sm text-neutral-400">
          关键词追踪："浏阳花炮" / "烟花产业" / "花炮出口" / "燃放政策"。仅展示标题与摘要，点击跳转原站。
        </p>
      </section>

      <section className="space-y-3">
        {mock.map((n) => (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-all hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-300">{n.source}</span>
              <span>{n.publishedAt}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-neutral-100">{n.title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-neutral-400">{n.summary}</p>
            {n.tags && (
              <div className="mt-2 flex flex-wrap gap-1">
                {n.tags.map((t) => (
                  <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </section>
    </div>
  );
}
