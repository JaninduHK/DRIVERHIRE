import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Calculator,
  CalendarCheck,
  CalendarDays,
  Car,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  MapPin,
  Menu,
  MessageSquare,
  Settings,
  User2,
  Users,
  X,
} from 'lucide-react';
import logoWhite from '../assets/Logo White.png';
import { Avatar } from './dashboard/primitives.jsx';
import {
  getStoredToken,
  getStoredUser,
  subscribeToAuthChanges,
} from '../services/authToken.js';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/trip-cost-calculator', label: 'Trip Cost', icon: Calculator },
  { to: '/dashboard?tab=requests', label: 'Get Quotes', icon: FileText, highlight: true },
];

const driverPortalLinks = [
  { to: '/portal/driver#vehicles', label: 'My Vehicles', icon: Car },
  { to: '/portal/driver#bookings', label: 'My Bookings', icon: CalendarDays },
  { to: '/portal/driver/messages', label: 'Messages', icon: MessageSquare },
  { to: '/portal/driver#earnings', label: 'My Earnings', icon: DollarSign },
  { to: '/portal/driver#availability', label: 'My Availability', icon: CalendarCheck },
  { to: '/portal/driver#profile', label: 'My Profile', icon: ClipboardList },
];

// Traveller dashboard tabs (mirror of the driver menu), driven by the ?tab= param.
const travelerPortalLinks = [
  { to: '/dashboard?tab=overview', label: 'Overview', icon: User2 },
  { to: '/dashboard?tab=bookings', label: 'My Bookings', icon: CalendarDays },
  { to: '/dashboard?tab=messages', label: 'Messages', icon: MessageSquare },
  { to: '/dashboard?tab=requests', label: 'My Requests', icon: MapPin },
  { to: '/dashboard?tab=settings', label: 'Settings', icon: Settings },
];

// Drawer nav-item styles, shared by the slide-in mobile menu (matches the driver dashboard drawer).
const drawerItem =
  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition';
const drawerItemActive = 'bg-brand-tint font-bold text-brand-dark';
const drawerItemIdle = 'font-semibold text-ink-soft hover:bg-canvas';

const baseNavLink =
  'relative px-3 py-2 text-sm font-medium transition-colors duration-150';

const activeNavLink =
  'text-slate-900 after:absolute after:inset-x-3 after:-bottom-1 after:h-[2px] after:rounded-full after:bg-emerald-500';

const inactiveNavLink =
  'text-slate-500 hover:text-slate-900 focus-visible:text-slate-900';

const getDashboardPath = (user) => {
  if (user?.role === 'admin') {
    return '/admin';
  }
  if (user?.role === 'driver') {
    return user?.driverStatus === 'approved' ? '/portal/driver' : '/';
  }
  return '/dashboard';
};

const getMessagesPath = (user) => {
  if (user?.role === 'driver') {
    return '/portal/driver/messages';
  }
  if (user?.role === 'admin') {
    return '/admin';
  }
  return '/dashboard';
};

const buildAuthState = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  return {
    isAuthenticated: Boolean(token),
    user,
    dashboardPath: getDashboardPath(user),
    messagesPath: getMessagesPath(user),
  };
};

const NavBar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Start logged-out so the SSR HTML and the first client render match (no hydration
  // mismatch); the effect below reads real auth from storage once mounted on the client.
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    dashboardPath: '/dashboard',
    messagesPath: '/dashboard',
  });

  useEffect(() => {
    setAuthState(buildAuthState());
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(() => setAuthState(buildAuthState()));
    return unsubscribe;
  }, []);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileOpen(false);

  const { isAuthenticated, dashboardPath, messagesPath, user } = authState;
  const isDriver = user?.role === 'driver';
  const isTraveler = isAuthenticated && user?.role === 'guest';
  const messageDestination = isAuthenticated ? messagesPath : '/login';
  const roleLabel =
    user?.role === 'driver' ? 'Driver' : user?.role === 'admin' ? 'Admin' : 'Traveller';

  // Lock body scroll and support Escape while the slide-in drawer is open.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Logo: centered on mobile, left-aligned from lg up. */}
          <Link
            to="/"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 lg:static lg:translate-x-0 lg:translate-y-0"
          >
            <img src={logoWhite} alt="Driver Car Hire logo" className="h-[3.75rem] w-auto lg:h-14" />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map(({ to, label, highlight }) =>
            highlight ? (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative ml-1 inline-flex items-center px-3 py-2 text-sm font-bold transition ${
                    isActive ? 'text-emerald-700' : 'text-emerald-600 hover:text-emerald-700'
                  }`
                }
              >
                <span className="relative">
                  {label}
                  <span className="absolute -right-2.5 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                </span>
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${baseNavLink} ${isActive ? activeNavLink : inactiveNavLink}`
                }
              >
                {label}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to={messageDestination}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            aria-label="Messages"
          >
            <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
            <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </Link>
          {isAuthenticated ? (
            <NavLink
              to={dashboardPath}
              className="hidden items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:inline-flex"
            >
              Dashboard
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/login"
                className="hidden items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:inline-flex"
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="hidden items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:inline-flex"
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/45" onClick={closeMobileMenu} aria-hidden="true" />
          <div className="absolute left-0 top-0 flex h-[100dvh] w-[290px] flex-col rounded-r-[28px] bg-white p-5 shadow-drawer">
            <div className="mb-3 flex items-center justify-between">
              <Link to="/" onClick={closeMobileMenu} className="flex items-center">
                <img src={logoWhite} alt="carwithdriver.lk" className="h-11 w-auto" />
              </Link>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="grid h-9 w-9 place-items-center rounded-xl bg-canvas"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-ink" />
              </button>
            </div>

            {isAuthenticated ? (
              <div className="mb-1 flex items-center gap-3 rounded-2xl bg-canvas p-3">
                <Avatar name={user?.name} className="h-11 w-11 text-[17px]" />
                <div className="min-w-0">
                  <div className="truncate font-bold text-ink">{user?.name || 'Traveller'}</div>
                  <div className="text-xs font-bold text-brand">{roleLabel}</div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex-1 overflow-y-auto">
              <nav className="flex flex-col gap-0.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        link.highlight
                          ? `${drawerItem} font-extrabold text-brand-dark`
                          : `${drawerItem} ${isActive ? drawerItemActive : drawerItemIdle}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`h-[18px] w-[18px] ${
                              link.highlight || isActive ? 'text-brand' : 'text-muted'
                            }`}
                            strokeWidth={1.8}
                          />
                          {link.label}
                          {link.highlight ? (
                            <span className="relative ml-auto flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  );
                })}

                {isDriver ? (
                  <>
                    <NavLink
                      to="/briefs"
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `${drawerItem} ${isActive ? drawerItemActive : drawerItemIdle}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <MapPin
                            className={`h-[18px] w-[18px] ${isActive ? 'text-brand' : 'text-muted'}`}
                            strokeWidth={1.8}
                          />
                          Tour Briefs
                        </>
                      )}
                    </NavLink>
                    <div className="mt-2 px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-soft">
                      Driver menu
                    </div>
                    {driverPortalLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={closeMobileMenu}
                          className={`${drawerItem} ${drawerItemIdle}`}
                        >
                          <Icon className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} />
                          {link.label}
                        </Link>
                      );
                    })}
                  </>
                ) : null}

                {isTraveler ? (
                  <>
                    <div className="mt-2 px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-soft">
                      Traveller menu
                    </div>
                    {travelerPortalLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={closeMobileMenu}
                          className={`${drawerItem} ${drawerItemIdle}`}
                        >
                          <Icon className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} />
                          {link.label}
                        </Link>
                      );
                    })}
                  </>
                ) : null}
              </nav>
            </div>

            <div className="mt-3">
              {isAuthenticated ? (
                <NavLink
                  to={dashboardPath}
                  onClick={closeMobileMenu}
                  className="block rounded-full bg-brand px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-dark"
                >
                  Go to dashboard
                </NavLink>
              ) : (
                <div className="flex gap-2">
                  <NavLink
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex-1 rounded-full border border-[#e2e8ea] px-4 py-2.5 text-center text-sm font-bold text-ink transition hover:border-muted-soft"
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex-1 rounded-full bg-brand px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-dark"
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default NavBar;
