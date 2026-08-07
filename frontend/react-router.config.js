/** @type {import('@react-router/dev/config').Config} */
export default {
  // Keep the existing `src/` component tree; framework files live in `app/`.
  appDirectory: 'app',
  // Server-render by default. Auth/dashboard routes opt out per-route via <ClientOnly>.
  ssr: true,
};
