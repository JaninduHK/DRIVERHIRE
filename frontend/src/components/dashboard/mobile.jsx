// 1b "Bold header" mobile chrome for the driver dashboard redesign.
// - MobileHeader: green gradient header with menu/back + right slot + eyebrow/title/subtitle
// - Sheet: rounded content sheet that overlaps the header bottom
// - DriverDrawer: slide-in navigation drawer
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronLeft, LogOut, Menu, X } from 'lucide-react';
import { Avatar } from './primitives.jsx';
import logoOnLight from '../../assets/Logo White.png';
import logoOnDark from '../../assets/Logo.png';

const HEADER_GRADIENT = 'linear-gradient(160deg,#0f7a45,#10a35a 55%,#18b866)';

export const HeaderIconButton = ({ onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/[0.18] text-white transition hover:bg-white/25"
  >
    {children}
  </button>
);

export const NotificationBell = ({ onClick, hasUnread }) => (
  <HeaderIconButton onClick={onClick} label="Notifications">
    <Bell className="h-[17px] w-[17px]" strokeWidth={1.8} />
    {hasUnread ? (
      <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#12924f] bg-[#ffd23f]" />
    ) : null}
  </HeaderIconButton>
);

// Green gradient screen header. Provide either eyebrow/title/subtitle or children.
export const MobileHeader = ({
  onMenu,
  onBack,
  cancelLabel,
  right,
  eyebrow,
  title,
  subtitle,
  children,
  pb = 'pb-14',
}) => (
  <div
    className="text-white lg:mx-8 lg:mt-8 lg:overflow-hidden lg:rounded-[20px]"
    style={{ background: HEADER_GRADIENT }}
  >
    <div className={`px-5 pt-4 ${pb} lg:px-8 lg:pb-8 lg:pt-7`}>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={`flex h-10 items-center gap-1.5 rounded-xl bg-white/[0.18] text-white transition hover:bg-white/25 ${
              cancelLabel ? 'px-3.5 text-[13.5px] font-bold' : 'w-10 justify-center'
            }`}
          >
            <ChevronLeft className="h-[17px] w-[17px]" strokeWidth={2} />
            {cancelLabel ? cancelLabel : null}
          </button>
        ) : (
          <HeaderIconButton onClick={onMenu} label="Open menu">
            <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
          </HeaderIconButton>
        )}
        {right}
      </div>
      {children || (
        <div className="pt-3.5">
          {eyebrow ? (
            <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">{eyebrow}</p>
          ) : null}
          {title ? (
            <h1 className="mt-1 text-[25px] font-extrabold leading-tight tracking-tight">{title}</h1>
          ) : null}
          {subtitle ? <p className="mt-1.5 text-[13.5px] text-white/85">{subtitle}</p> : null}
        </div>
      )}
    </div>
  </div>
);

// Content sheet that overlaps the header bottom on mobile (design uses -40px).
// On desktop it becomes a plain wide content area beside the persistent sidebar.
export const Sheet = ({ children, className = '', pull = '-mt-10' }) => (
  <div
    className={`relative ${pull} min-h-[40vh] rounded-t-[28px] bg-canvas px-[18px] pb-28 pt-[18px] lg:mx-8 lg:mt-6 lg:rounded-none lg:px-0 lg:pb-16 lg:pt-0 ${className}`}
  >
    <div className="lg:mx-auto lg:max-w-[1080px]">{children}</div>
  </div>
);

// Persistent desktop sidebar (navy) — hidden on mobile where the drawer is used.
export const DashboardSidebar = ({ navItems = [], onSelect, user, onLogout }) => (
  <aside className="sticky top-0 hidden h-screen w-[240px] flex-shrink-0 flex-col bg-ink p-4 lg:flex">
    <div className="px-2 pb-5 pt-2">
      <img src={logoOnDark} alt="carwithdriver.lk" className="h-9 w-auto" />
    </div>
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={(event) => onSelect?.(item, event)}
            className={`flex items-center gap-3 rounded-[11px] px-3.5 py-2.5 text-left text-[14px] font-bold transition ${
              item.active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
            {item.badge > 0 ? (
              <span className="min-w-[18px] rounded-full bg-[#f43f5e] px-1.5 py-0.5 text-center text-[11px] font-extrabold text-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
    <div className="flex-1" />
    <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] p-2.5">
      <Avatar name={user?.name} image={user?.image} className="h-8 w-8 rounded-[9px] text-[13px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-white">{user?.name || 'User'}</div>
        {user?.roleLabel ? <div className="text-[11px] text-white/50">{user.roleLabel}</div> : null}
      </div>
      <button type="button" onClick={onLogout} aria-label="Logout" className="text-white/55 transition hover:text-white">
        <LogOut className="h-[15px] w-[15px]" />
      </button>
    </div>
  </aside>
);

const DrawerNav = ({ items, onSelect, onClose }) => (
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
            onClose?.();
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

export const DriverDrawer = ({ open, onClose, navItems = [], onSelect, user, onLogout }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden="true" />
      <div className="absolute left-0 top-0 flex h-full w-[290px] flex-col rounded-r-[28px] bg-white p-5 shadow-drawer">
        <div className="mb-3 flex items-center justify-between">
          <Link to="/" onClick={onClose} className="flex items-center" aria-label="Go to home">
            <img src={logoOnLight} alt="carwithdriver.lk" className="h-12 w-auto" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-canvas"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-ink" />
          </button>
        </div>
        <div className="mb-1 flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <Avatar name={user?.name} image={user?.image} className="h-11 w-11 text-[17px]" />
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">{user?.name || 'Driver'}</div>
            {user?.roleLabel ? (
              <div className="text-xs font-bold text-brand">{user.roleLabel}</div>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto">
          <DrawerNav items={navItems} onSelect={onSelect} onClose={onClose} />
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2.5 rounded-xl border border-[#e2e8ea] bg-white px-3 py-3 text-sm font-bold text-[#f43f5e] transition hover:border-[#ffd3d9]"
        >
          <LogOut className="h-[17px] w-[17px]" />
          Logout
        </button>
      </div>
    </div>
  );
};
