import { buildMeta, metaLocale } from '../lib/seo.js';

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.privacy.title'),
    description: t('meta.privacy.description'),
    path: '/privacy-policy',
    locale,
  });
}

export { default } from '../../src/pages/PrivacyPolicy.jsx';
