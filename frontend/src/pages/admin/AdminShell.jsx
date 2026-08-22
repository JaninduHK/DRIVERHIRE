import { useEffect, useState } from 'react';
import { Download, LogOut, Moon, Search, Sun } from 'lucide-react';
import logoForDark from '../../assets/Logo.png';
import { Avatar } from '../../components/dashboard/primitives.jsx';

const THEME_STORAGE_KEY = 'admin-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
};

// Sun/moon pill switch — a plain checkbox would be invisible against the
// header's own background in either theme, so this draws its own track/knob.
const ThemeToggle = ({ isDark, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    aria-pressed={isDark}
    className="relative inline-flex h-[42px] w-[68px] flex-shrink-0 items-center rounded-full border-[1.5px] border-line bg-surface px-[3px] transition"
  >
    <span
      className={`grid h-[32px] w-[32px] place-items-center rounded-full bg-brand text-white shadow-sm transition-transform duration-200 ${
        isDark ? 'translate-x-[26px]' : 'translate-x-0'
      }`}
    >
      {isDark ? <Moon className="h-4 w-4" strokeWidth={2} /> : <Sun className="h-4 w-4" strokeWidth={2} />}
    </span>
  </button>
);

// Dark sidebar + sticky header shell shared by every admin panel, matching the
// "Admin Dashboard.dc.html" Claude Design mock. Visual layer only — every
// panel keeps its own data/handlers; this just supplies the chrome around it.

const navItemClass = (active) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition ${
    active ? 'bg-brand text-white' : 'text-white/65 hover:bg-white/5 hover:text-white/90'
  }`;

const NavBadge = ({ count, active }) => {
  if (!count) return null;
  return (
    <span
      className={`ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10.5px] font-extrabold ${
        active ? 'bg-white/25 text-white' : 'bg-rose-500 text-white'
      }`}
    >
      {count}
    </span>
  );
};

const NavGroup = ({ label, items, activeSection, onSectionChange }) => (
  <div className="flex flex-col gap-0.5">
    {label ? (
      <div className="px-2.5 pb-1.5 text-[10.5px] font-extrabold tracking-[.12em] text-white/35">{label}</div>
    ) : null}
    {items.map((item) => {
      const Icon = item.icon;
      const active = activeSection === item.id;
      return (
        <button key={item.id} type="button" onClick={() => onSectionChange(item.id)} className={navItemClass(active)}>
          <Icon className="h-[17px] w-[17px] flex-shrink-0" strokeWidth={1.9} />
          <span className="flex-1 text-left">{item.label}</span>
          <NavBadge count={item.badge} active={active} />
        </button>
      );
    })}
  </div>
);

const AdminShell = ({
  navGroups,
  activeSection,
  onSectionChange,
  currentUser,
  onOpenProfile,
  onLogout,
  crumb,
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onExport,
  children,
}) => {
  const accountName = currentUser?.name || 'Admin';
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      /* ignore storage errors */
    }
  }, [isDark]);

  return (
    <div className={`min-h-screen bg-canvas font-sans ${isDark ? 'admin-dark' : ''}`}>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <aside className="sticky top-0 flex h-screen w-[250px] flex-shrink-0 flex-col gap-6 overflow-y-auto bg-[#0f1f2d] px-3.5 py-5">
          <div className="flex flex-col gap-1 px-1.5">
            <img src={logoForDark} alt="carwithdriver.lk" className="h-[70px] w-auto max-w-[70%]" />
          </div>

          <nav className="flex flex-1 flex-col gap-5">
            {navGroups.map((group) => (
              <NavGroup
                key={group.label || 'main'}
                label={group.label}
                items={group.items}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
              />
            ))}
          </nav>

          <button
            type="button"
            onClick={onOpenProfile}
            className={`flex items-center gap-2.5 rounded-[14px] p-3.5 text-left transition ${
              activeSection === 'profile' ? 'bg-white/12' : 'bg-white/[.06] hover:bg-white/10'
            }`}
          >
            <Avatar name={accountName} className="h-[34px] w-[34px] flex-shrink-0 rounded-[10px] text-[13px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-white">{accountName}</div>
              <div className="truncate text-[11.5px] font-semibold text-white/45">Admin</div>
            </div>
          </button>
        </aside>

        {/* Main column */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center gap-5 border-b border-line bg-canvas/90 px-8 py-4 backdrop-blur">
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-extrabold tracking-[.1em] text-muted-soft">{crumb}</div>
              <h1 className="mt-0.5 truncate text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
            </div>
            <div className="flex items-center gap-2.5">
              {onSearchChange ? (
                <label className="flex h-[42px] w-[260px] items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3.5">
                  <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" strokeWidth={2} />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-[13.5px] font-semibold text-ink placeholder:font-medium placeholder:text-muted-soft focus:outline-none"
                  />
                </label>
              ) : null}
              {onExport ? (
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-brand px-4 text-[13.5px] font-extrabold text-white transition hover:bg-brand-dark"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  Export
                </button>
              ) : null}
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark((prev) => !prev)} />
              <button
                type="button"
                onClick={onLogout}
                aria-label="Log out"
                className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-xl border-[1.5px] border-line bg-surface text-ink transition hover:border-rose-200 dark:hover:border-rose-400/30 hover:text-rose-600 dark:hover:text-rose-300"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-5 px-8 py-6 pb-16">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
