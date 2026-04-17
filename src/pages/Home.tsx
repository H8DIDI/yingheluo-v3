import { ExternalLink } from 'lucide-react';

type VideoItem = {
  id: string;
  source: 'bilibili' | 'youtube' | 'douyin';
  title: string;
  author: string;
  thumbnail?: string;
  url: string;
  playCount?: number;
  publishedAt?: string;
  tags?: string[];
  featured?: boolean;
};

const mockVideos: VideoItem[] = [
  {
    id: 'demo-1',
    source: 'bilibili',
    title: '2026 浏阳国际花炮节｜高清全景燃放',
    author: '浏阳花炮官方',
    url: 'https://www.bilibili.com/',
    publishedAt: '2026-01-02',
    tags: ['秀演', '浏阳'],
    featured: true,
  },
  {
    id: 'demo-2',
    source: 'bilibili',
    title: '揭秘专业烟花秀的编排流程 —— 从脚本到燃放',
    author: '烟花研究所',
    url: 'https://www.bilibili.com/',
    publishedAt: '2026-03-11',
    tags: ['编排', '科普'],
  },
  {
    id: 'demo-3',
    source: 'bilibili',
    title: '浏阳花炮出口东南亚：流水线与检测全记录',
    author: '财经视角',
    url: 'https://www.bilibili.com/',
    publishedAt: '2026-02-28',
    tags: ['出口', '产业'],
  },
  {
    id: 'demo-4',
    source: 'youtube',
    title: 'How Liuyang Makes the World\'s Fireworks',
    author: 'GlobalView',
    url: 'https://www.youtube.com/',
    publishedAt: '2025-12-20',
    tags: ['英文', '纪录'],
  },
  {
    id: 'demo-5',
    source: 'bilibili',
    title: '架子烟花｜凤凰涅槃 现场实录',
    author: '花炮匠人',
    url: 'https://www.bilibili.com/',
    publishedAt: '2026-02-17',
    tags: ['架子烟花', '现场'],
  },
  {
    id: 'demo-6',
    source: 'douyin',
    title: '国庆 70 周年焰火经典回顾',
    author: '焰火档案',
    url: 'https://www.douyin.com/',
    publishedAt: '2025-10-01',
    tags: ['档案', '国庆'],
  },
];

const sourceBadge: Record<VideoItem['source'], { label: string; color: string }> = {
  bilibili: { label: 'B站', color: 'bg-sky-500/20 text-sky-300' },
  youtube: { label: 'YouTube', color: 'bg-red-500/20 text-red-300' },
  douyin: { label: '抖音', color: 'bg-pink-500/20 text-pink-300' },
};

function VideoCard({ v }: { v: VideoItem }) {
  const sb = sourceBadge[v.source];
  return (
    <a
      href={v.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition-all hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-video bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-fuchsia-500/15">
        <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">🎆</div>
        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${sb.color}`}>
          {sb.label}
        </span>
        {v.featured && (
          <span className="absolute right-2 top-2 rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-black">
            精选
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-100 group-hover:text-amber-300">
          {v.title}
        </h3>
        <div className="mt-auto flex items-center justify-between text-[11px] text-neutral-500">
          <span className="truncate">{v.author}</span>
          <span>{v.publishedAt}</span>
        </div>
        {v.tags && (
          <div className="flex flex-wrap gap-1">
            {v.tags.map((t) => (
              <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export default function Home() {
  const featured = mockVideos.filter((v) => v.featured);
  const others = mockVideos.filter((v) => !v.featured);
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h1 className="text-2xl font-bold tracking-tight">浏阳烟花视频精选</h1>
          <span className="text-xs text-neutral-500">日更 · 数据接入中（展示为样例内容）</span>
        </div>
        <p className="max-w-2xl text-sm text-neutral-400">
          聚合 B 站 / YouTube / 抖音的浏阳花炮与专业烟花秀内容。默认按来源+时间排序，精选位手动置顶。
        </p>
      </section>

      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-amber-300">🔥 头条</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">最新视频</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {others.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-neutral-400">
        <div className="flex items-center gap-2 text-neutral-300">
          <ExternalLink size={14} /> 数据来源与自动更新
        </div>
        <p className="mt-2 leading-relaxed">
          视频内容通过 RSSHub 聚合 B 站 UP 主频道 / 关键词搜索 / 热门单视频，每日凌晨 3 点自动拉取并去重入库。
          YouTube 使用官方 RSS。抖音做兜底（受平台风控，可能延迟或缺失）。
          如有希望收录的 UP 主或单视频，请通过页脚邮箱反馈。
        </p>
      </section>
    </div>
  );
}
