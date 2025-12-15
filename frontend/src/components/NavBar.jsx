import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, MessageSquare, X } from 'lucide-react';
import logoWhite from '../assets/Logo White.png';
import {
  getStoredToken,
  getStoredUser,
  subscribeToAuthChanges,
} from '../services/authToken.js';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/trip-cost-calculator', label: 'Trip Cost' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

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
  const [authState, setAuthState] = useState(() => buildAuthState());

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
  const messageDestination = isAuthenticated ? messagesPath : '/login';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={logoWhite} alt="Driver Car Hire logo" className="h-14 w-auto" />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${baseNavLink} ${isActive ? activeNavLink : inactiveNavLink}`
              }
            >
              {label}
            </NavLink>
          ))}
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

      <div
        className={`lg:hidden ${mobileOpen ? 'block' : 'hidden'} border-t border-slate-200 bg-white/95 backdrop-blur`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          {user?.role === 'driver' ? (
            <NavLink
              to="/briefs"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              Briefs
            </NavLink>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            {isAuthenticated ? (
              <NavLink
                to={dashboardPath}
                onClick={closeMobileMenu}
                className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Dashboard
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={closeMobileMenu}
                  className="flex-1 rounded-full bg-emerald-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
