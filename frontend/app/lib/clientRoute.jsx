import ClientOnly from '../components/ClientOnly.jsx';

function Fallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}

/**
 * Wrap a page component so it renders client-only (see ClientOnly). Used for auth,
 * dashboard, checkout and briefs routes, whose behaviour must stay exactly as before
 * and which rely on browser-only APIs. These routes are also marked noindex.
 */
export function clientOnly(Component) {
  return function ClientOnlyRoute(props) {
    return (
      <ClientOnly fallback={<Fallback />}>
        <Component {...props} />
      </ClientOnly>
    );
  };
}
