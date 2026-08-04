// Reusable dashboard shell for the carwithdriver.lk redesign (direction 1a).
// - Desktop (lg+): persistent left sidebar (280px).
// - Mobile: top bar with hamburger -> slide-in drawer (290px) over a scrim.
// Shared by the Driver, Traveller, and Admin dashboards.
import { useEffect, useState } from 'react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { Avatar } from './primitives.jsx';

const Wordmark = ({ className = '' }) => (
  <span className={`text-base font-extrabold tracking-tight text-ink ${className}`}>
    car<span className="text-brand">withdriver</span>
  </span>
);

const NavList = ({ items, onSelect, onAfterSelect }) => (
  <nav className="flex flex-col gap-0.5">
    {items.map((item) => {
      const Icon = item.icon;
      const isActive = Boolean(item.active);
      return (
        <a
          key={item.id}
          href={item.href || `#${item.hash || item.id}`}
          onClick={(event) => {
            onSelect?.(item, event);
            onAfterSelect?.();
          }}
          className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
            isActive
              ? 'bg-brand-tint font-bold text-brand-dark'
              : 'font-semibold text-ink-soft hover:bg-canvas'
          }`}
        >
          <span className="flex items-center gap-3">
            <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand' : 'text-muted'}`} />
            {item.label}
          </span>
          {item.badge > 0 ? (
            <span className="min-w-[20px] rounded-full bg-[#f43f5e] px-1.5 py-0.5 text-center text-[11px] font-extrabold text-white">
              {item.badge}
            </span>
          ) : null}
        </a>
      );
    })}
  </nav>
);

const UserCard = ({ user }) => (
  <div className="mb-1 flex items-center gap-3 rounded-2xl bg-canvas p-3">
    <Avatar name={user?.name} className="h-11 w-11 text-[17px]" />
    <div className="min-w-0">
      <div className="truncate font-bold text-ink">{user?.name || 'Driver'}</div>
      {user?.roleLabel ? (
        <div className="text-xs font-bold text-brand">{user.roleLabel}</div>
      ) : null}
    </div>
  </div>
);

const LogoutButton = ({ onLogout }) => (
  <button
    type="button"
    onClick={onLogout}
    className="flex items-center gap-2.5 rounded-xl border border-[#e2e8ea] bg-white px-3 py-3 text-sm font-bold text-[#f43f5e] transition hover:border-[#ffd3d9]"
  >
    <LogOut className="h-[17px] w-[17px]" />
    Logout
  </button>
);

const DashboardShell = ({
  navItems = [],
  onNavSelect,
  user,
  onLogout,
  notificationCount = 0,
  onNotificationsClick,
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-canvas font-sans text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[280px] flex-shrink-0 flex-col border-r border-hairline bg-white p-5 lg:flex">
        <div className="mb-4 flex items-center px-1">
          <Wordmark />
        </div>
        <UserCard user={user} />
        <div className="mt-3 flex-1 overflow-y-auto">
          <NavList items={navItems} onSelect={onNavSelect} />
        </div>
        <LogoutButton onLogout={onLogout} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/45"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-[290px] flex-col rounded-r-[28px] bg-white p-5 shadow-drawer">
            <div className="mb-3 flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-canvas"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-ink" />
              </button>
            </div>
            <UserCard user={user} />
            <div className="mt-3 flex-1 overflow-y-auto">
              <NavList
                items={navItems}
                onSelect={onNavSelect}
                onAfterSelect={() => setDrawerOpen(false)}
              />
            </div>
            <LogoutButton onLogout={onLogout} />
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-canvas/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-soft"
            aria-label="Open menu"
          >
            <Menu className="h-[18px] w-[18px] text-ink" />
          </button>
          <Wordmark />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNotificationsClick}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-white shadow-soft"
              aria-label="Notifications"
            >
              <Bell className="h-[17px] w-[17px] text-ink" />
              {notificationCount > 0 ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#f43f5e]" />
              ) : null}
            </button>
            <Avatar name={user?.name} className="h-10 w-10 text-[15px]" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
