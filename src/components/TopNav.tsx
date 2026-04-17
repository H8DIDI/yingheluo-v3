import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: '视频' },
  { to: '/chain', label: '产业链' },
  { to: '/news', label: '资讯' },
  { to: '/data', label: '数据 · 企业' },
  { to: '/tools', label: '工具' },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b14]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0b0b14]/70">
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4 sm:gap-2">
        <NavLink to="/" className="mr-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="text-amber-400">🎆</span>
          <span>天河落</span>
        </NavLink>
        <div className="flex items-center overflow-x-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto text-xs text-neutral-500">浏阳花炮产业观察</div>
      </nav>
    </header>
  );
}
