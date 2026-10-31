import { buildMeta, metaLocale } from '../lib/seo.js';

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.about.title'),
    description: t('meta.about.description'),
    path: '/about',
    locale,
  });
}

export { default } from '../../src/pages/AboutPage.jsx';
