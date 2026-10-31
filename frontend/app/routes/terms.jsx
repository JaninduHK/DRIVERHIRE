import { buildMeta, metaLocale } from '../lib/seo.js';

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.terms.title'),
    description: t('meta.terms.description'),
    path: '/terms',
    locale,
  });
}

export { default } from '../../src/pages/TermsConditions.jsx';
