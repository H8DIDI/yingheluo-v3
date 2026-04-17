import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const tabs = [
  { to: '/', label: '视频', end: true },
  { to: '/chain', label: '产业链' },
  { to: '/news', label: '资讯' },
  { to: '/data', label: '数据' },
  { to: '/tools', label: '工具' },
];

export function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#08090a]/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-[1280px] items-center px-4 sm:px-6">
        <NavLink
          to="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 text-[14.5px] font-semibold tracking-tight text-white"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-[13px] shadow-[0_0_16px_rgba(245,158,11,0.35)]">
            🎆
          </span>
          <span>天河落</span>
          <span className="hidden font-mono text-[11px] font-normal text-white/40 sm:inline">
            / Tianheluo
          </span>
        </NavLink>

        {/* Desktop tabs */}
        <div className="ml-8 hidden items-center gap-0.5 md:flex">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive ? 'text-amber-300' : 'text-white/60 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {t.label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[14px] h-[2px] rounded-full bg-amber-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[11px] text-white/50 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            日更 · 浏阳花炮
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="菜单"
            className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-white/70 hover:bg-white/5 md:hidden"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-white/[0.06] md:hidden">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-1 px-4 py-3">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-[14px] font-medium ${
                    isActive
                      ? 'bg-amber-400/10 text-amber-300'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
