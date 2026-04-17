export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0b0b14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-200">天河落 Tianheluo</div>
          <p className="mt-1 text-xs text-neutral-500">浏阳花炮产业聚合展示 · 数据日更</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-xs text-neutral-500">合作 / 反馈</div>
          <img src="/email.svg" alt="联系邮箱" width={280} height={36} className="opacity-90" />
        </div>
      </div>
      <div className="border-t border-white/5 py-3 text-center text-[11px] text-neutral-600">
        © 2026 H8DIDI · <a href="https://github.com/H8DIDI/tianheluo" className="hover:text-neutral-400">GitHub</a>
      </div>
    </footer>
  );
}
