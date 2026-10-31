import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { I18nProvider } from '../src/i18n/I18nProvider.jsx';
import { getLocaleFromPath } from '../src/i18n/locales.js';
import { loadMessages } from '../src/i18n/messages.js';

// The language comes from the URL (/de/...). Its text is loaded before hydrating
// so the first client render matches the server HTML. Switching language is a
// full page load, so the language never changes during a session.
const locale = getLocaleFromPath(window.location.pathname);

loadMessages(locale).then((messages) => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <I18nProvider locale={locale} messages={messages}>
          <HydratedRouter />
        </I18nProvider>
      </StrictMode>
    );
  });
});
