import { useEffect } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteError,
  isRouteErrorResponse,
  Link,
} from 'react-router';
import { Toaster } from 'react-hot-toast';
import NavBar from '../src/components/NavBar.jsx';
import Footer from '../src/components/Footer.jsx';
import { initAnalytics, trackPageView } from '../src/lib/analytics.js';
import '../src/index.css';

// The <head> defaults that used to live in index.html. Per-route <title>/meta is layered
// on top of these by each route's `meta` export.
export const links = () => [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  },
];

export const meta = () => [
  { title: 'Car with Driver LK | 100% Independent Driver Booking Platform' },
];

// The HTML document shell. Wraps every route — including the ErrorBoundary below.
export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Full-bleed dashboard routes own the whole screen (their own top bar + drawer), so they
// render without the marketing NavBar/Footer and content-width wrapper.
const isFullBleedDashboard = (pathname) =>
  pathname === '/portal/driver' ||
  pathname === '/portal/driver/messages' ||
  pathname === '/briefs' ||
  pathname === '/dashboard' ||
  pathname === '/admin';

// Public marketplace pages that own their full-width layout but keep the marketing chrome.
const isWidePublic = (pathname) =>
  pathname === '/vehicles' ||
  pathname === '/drivers' ||
  pathname.startsWith('/vehicles/') ||
  pathname.startsWith('/drivers/') ||
  pathname.startsWith('/checkout/');

export default function App() {
  const location = useLocation();
  const { pathname, search, hash } = location;

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(`${pathname}${search}${hash}`);
  }, [pathname, search, hash]);

  const fullBleed = isFullBleedDashboard(pathname);
  const mainClasses =
    pathname === '/' || fullBleed || isWidePublic(pathname)
      ? 'w-full px-0 py-0'
      : 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!fullBleed && <NavBar />}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white text-slate-900',
          success: { iconTheme: { primary: '#059669', secondary: '#ffffff' } },
        }}
      />
      <main className={mainClasses}>
        <Outlet />
      </main>
      {!fullBleed && <Footer />}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const is404 = status === 404;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <NavBar />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-7xl font-extrabold text-brand">{status}</p>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {is404 ? 'This page could not be found' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-muted">
          {is404
            ? 'The page you are looking for does not exist or has moved.'
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <Link
          to="/"
          className="mt-8 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
        >
          Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
