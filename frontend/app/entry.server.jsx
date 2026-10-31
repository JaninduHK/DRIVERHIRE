import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable } from '@react-router/node';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { I18nProvider } from '../src/i18n/I18nProvider.jsx';
import { getLocaleFromPath } from '../src/i18n/locales.js';
import { loadMessages } from '../src/i18n/messages.js';

export const streamTimeout = 5_000;

// React Router's default server entry, plus the page language: read from the
// URL (/de/...) and provided to every component through I18nProvider.
export default async function handleRequest(request, responseStatusCode, responseHeaders, routerContext) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  const locale = getLocaleFromPath(new URL(request.url).pathname);
  const messages = await loadMessages(locale);

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get('user-agent');
    // Crawlers get the whole page in one go rather than streamed.
    const readyOption = (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady';

    let timeoutId = setTimeout(() => abort(), streamTimeout + 1000);

    const { pipe, abort } = renderToPipeableStream(
      <I18nProvider locale={locale} messages={messages}>
        <ServerRouter context={routerContext} url={request.url} />
      </I18nProvider>,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set('Content-Type', 'text/html');
          pipe(body);
          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }));
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      }
    );
  });
}
