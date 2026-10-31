import { buildMeta, metaLocale } from '../lib/seo.js';

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.contact.title'),
    description: t('meta.contact.description'),
    path: '/contact',
    locale,
  });
}

export { default } from '../../src/pages/ContactPage.jsx';
