export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.06] sm:mt-20">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-12">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <span className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-amber-400 to-orange-500 text-[11px]">
              🎆
            </span>
            天河落
            <span className="font-mono text-[11px] font-normal text-white/35">Tianheluo</span>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">
            浏阳花炮产业数字化聚合展示：视频 · 资讯 · 产业链 · 数据 · 工具。
            日更抓取管线 + 可 AI 调用的 MCP 服务。
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="label-caps text-white/40">合作 / 反馈</div>
          <img
            src="/email.svg"
            alt="联系邮箱"
            width={280}
            height={36}
            className="h-9 w-[260px] sm:w-[280px]"
          />
          <div className="mt-2 flex gap-3 text-[12px] text-white/50">
            <a href="https://github.com/H8DIDI/tianheluo" className="hover:text-white">
              GitHub
            </a>
            <span>·</span>
            <a href="/tools/simulator" className="hover:text-white">3D 模拟器</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.04] py-3 text-center font-mono text-[11px] text-white/30">
        © 2026 H8DIDI · built on Cloudflare Pages + D1 · powered by RSSHub + MCP
      </div>
    </footer>
  );
}
