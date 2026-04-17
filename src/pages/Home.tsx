import { useEffect, useState } from 'react';
import { Play, ThumbsUp, Coins, Star } from 'lucide-react';

type VideoItem = {
  id: string;
  source: 'bilibili' | 'youtube' | 'douyin' | 'web';
  title: string;
  channel_name?: string;
  thumbnail?: string | null;
  url: string;
  bvid?: string | null;
  play_count?: number | null;
  like_count?: number | null;
  coin_count?: number | null;
  favorite_count?: number | null;
  duration?: number | null;
  published_at?: number;
  tags?: string[];
  featured?: number | boolean;
};

const mockVideos: VideoItem[] = [
  {
    id: 'demo-1',
    source: 'bilibili',
    title: '2026 浏阳国际花炮节｜高清全景燃放',
    channel_name: '浏阳花炮官方',
    url: 'https://www.bilibili.com/',
    published_at: Date.parse('2026-01-02') / 1000,
    tags: ['秀演', '浏阳'],
    play_count: 128000,
    like_count: 4200,
    featured: 1,
  },
];

const sourceBadge: Record<string, { label: string; className: string }> = {
  bilibili: { label: 'B站', className: 'bg-sky-500/15 text-sky-200 ring-1 ring-inset ring-sky-400/30' },
  youtube: { label: 'YouTube', className: 'bg-red-500/15 text-red-200 ring-1 ring-inset ring-red-400/30' },
  douyin: { label: '抖音', className: 'bg-pink-500/15 text-pink-200 ring-1 ring-inset ring-pink-400/30' },
  web: { label: 'Web', className: 'bg-neutral-500/15 text-neutral-200 ring-1 ring-inset ring-neutral-400/30' },
};

function fmtCount(n?: number | null) {
  if (n == null) return null;
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (n < 100000000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
}

function fmtDate(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDuration(sec?: number | null) {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VideoCard({ v }: { v: VideoItem }) {
  const sb = sourceBadge[v.source] || sourceBadge.web;
  const dur = fmtDuration(v.duration);
  return (
    <a
      href={v.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#101113] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/30 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.1),0_24px_48px_-24px_rgba(245,158,11,0.2)]"
    >
      <div className="relative aspect-video overflow-hidden bg-[#17181c]">
        {v.thumbnail ? (
          <img
            src={v.thumbnail}
            alt={v.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-transparent">
            <span className="text-3xl opacity-30">🎆</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <span className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${sb.className}`}>
          {sb.label}
        </span>
        {!!v.featured && (
          <span className="absolute right-2 top-2 rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
            精选
          </span>
        )}
        {dur && (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white/95 backdrop-blur-sm">
            {dur}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
        <h3 className="line-clamp-2 text-[13.5px] font-medium leading-snug text-white/95 transition-colors group-hover:text-amber-200">
          {v.title}
        </h3>
        <div className="flex items-center justify-between gap-2 text-[11px] text-white/45">
          <span className="truncate">{v.channel_name || '—'}</span>
          <span className="shrink-0 font-mono tabular-nums">{fmtDate(v.published_at)}</span>
        </div>
        {(v.play_count != null || v.like_count != null) && (
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            {v.play_count != null && (
              <span className="flex items-center gap-1 tabular-nums">
                <Play size={11} className="text-white/35" strokeWidth={2.5} /> {fmtCount(v.play_count)}
              </span>
            )}
            {v.like_count != null && (
              <span className="flex items-center gap-1 tabular-nums">
                <ThumbsUp size={11} className="text-white/35" strokeWidth={2.5} /> {fmtCount(v.like_count)}
              </span>
            )}
            {v.coin_count != null && v.coin_count > 0 && (
              <span className="flex items-center gap-1 tabular-nums">
                <Coins size={11} className="text-white/35" strokeWidth={2.5} /> {fmtCount(v.coin_count)}
              </span>
            )}
            {v.favorite_count != null && v.favorite_count > 0 && (
              <span className="flex items-center gap-1 tabular-nums">
                <Star size={11} className="text-white/35" strokeWidth={2.5} /> {fmtCount(v.favorite_count)}
              </span>
            )}
          </div>
        )}
        {v.tags && v.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {v.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55 ring-1 ring-inset ring-white/[0.04]"
              >
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
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/videos?limit=40')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!alive) return;
        const items: VideoItem[] = (d.items || []).map((x: VideoItem) => ({
          ...x,
          tags: Array.isArray(x.tags) ? x.tags : [],
        }));
        setVideos(items.length ? items : mockVideos);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e));
        setVideos(mockVideos);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const list = videos || [];
  const featured = list.filter((v) => !!v.featured);
  const others = list.filter((v) => !v.featured);
  const usingMock = videos === mockVideos;

  return (
    <div className="space-y-10 md:space-y-14">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-[11px] font-medium text-amber-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              实时聚合
            </div>
            <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[34px] md:text-[40px]">
              浏阳烟花 · 视频精选
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/60 sm:text-[14.5px]">
              自建 RSSHub 日更聚合 B 站 UP 主频道 / YouTube 频道与关键词搜索，
              来源 + 标签双维度筛选，精选位手动置顶。
            </p>
          </div>
          <div className="shrink-0 text-[11px] text-white/45">
            {loading ? '加载中…' : usingMock ? '样例内容' : `${list.length} 条 · 日更`}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section>
          <SectionHeader tone="amber">🔥 头条</SectionHeader>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {featured.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader>最新视频</SectionHeader>
        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="aspect-video animate-pulse bg-white/[0.04]" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          ) : others.length === 0 ? (
            <EmptyState>暂无内容。抓取管线首次拉取中，请稍后再来。</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {others.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 sm:p-6">
        <div className="label-caps text-amber-300">数据来源</div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">
          视频通过自建 RSSHub 聚合 B 站 UP 主频道与关键词结果，每日凌晨 3 点自动拉取、去重、打标入库；
          播放数据通过 Bilibili 官方 API 补齐。YouTube 使用官方 RSS。
          如希望收录特定 UP 主或单视频，请通过页脚邮箱反馈。
          {error && <span className="mt-2 block text-rose-300">API 异常：{error}（已回退样例）</span>}
        </p>
      </section>
    </div>
  );
}

function SectionHeader({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'amber';
}) {
  const color = tone === 'amber' ? 'text-amber-300' : 'text-white/70';
  return (
    <div className="flex items-center gap-3">
      <h2 className={`label-caps ${color}`}>{children}</h2>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.1] p-10 text-center text-[13px] text-white/45">
      {children}
    </div>
  );
}
