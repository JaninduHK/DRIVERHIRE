import { index, route } from '@react-router/dev/routes';

/**
 * Route table — mirrors the old <Routes> in src/App.jsx.
 * Public marketplace/marketing routes are server-rendered (real HTML for crawlers).
 * Auth, dashboard, checkout and briefs routes render client-only (see routes/*.jsx),
 * keeping logged-in behaviour identical to before.
 */
export default [
  index('routes/home.jsx'),

  // Auth (client-only, noindex)
  route('login', 'routes/login.jsx'),
  route('register', 'routes/register.jsx'),
  route('register/driver', 'routes/register.driver.jsx'),
  route('forgot-password', 'routes/forgot-password.jsx'),
  route('reset-password', 'routes/reset-password.jsx'),
  route('verify-email', 'routes/verify-email.jsx'),

  // Dashboards / transactional (client-only, noindex)
  route('dashboard', 'routes/dashboard.jsx'),
  route('portal/driver', 'routes/portal.driver.jsx'),
  route('portal/driver/messages', 'routes/portal.driver.messages.jsx'),
  route('admin', 'routes/admin.jsx'),
  route('briefs', 'routes/briefs.jsx'),
  route('checkout/:vehicleId', 'routes/checkout.$vehicleId.jsx'),

  // Public marketplace (server-rendered)
  route('vehicles', 'routes/vehicles.jsx'),
  route('vehicles/:vehicleId', 'routes/vehicles.$vehicleId.jsx'),
  route('drivers', 'routes/drivers.jsx'),
  route('drivers/:id', 'routes/drivers.$id.jsx'),

  // Public marketing (server-rendered)
  route('about', 'routes/about.jsx'),
  route('contact', 'routes/contact.jsx'),
  route('trip-cost-calculator', 'routes/trip-cost-calculator.jsx'),
  route('privacy-policy', 'routes/privacy-policy.jsx'),
  route('terms', 'routes/terms.jsx'),

  // DB-driven sitemap (resource route, returns XML)
  route('sitemap.xml', 'routes/sitemap.jsx'),

  // Real 404 for anything else
  route('*', 'routes/$.jsx'),
];
