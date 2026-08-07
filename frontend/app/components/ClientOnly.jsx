import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Renders `children` only after client-side hydration. On the server (and during the
 * first client render) it renders `fallback`, so pages that depend on browser-only APIs
 * — auth dashboards, checkout, the tour-briefs board — never execute during SSR and
 * never cause a hydration mismatch. Their client behaviour is identical to before.
 */
export default function ClientOnly({ children, fallback = null }) {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true, // client
    () => false, // server
  );
  return isHydrated ? children : fallback;
}
