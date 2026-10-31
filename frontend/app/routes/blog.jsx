import { buildMeta, metaLocale } from '../lib/seo.js';

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.blog.title'),
    description: t('meta.blog.description'),
    path: '/blog',
    locale,
  });
}

export { default } from '../../src/pages/BlogPage.jsx';
