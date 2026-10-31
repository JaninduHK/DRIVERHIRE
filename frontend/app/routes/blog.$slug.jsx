import { getPostBySlug, getRelatedPosts } from '../../src/data/blogPosts.js';
import { buildMeta, metaLocale } from '../lib/seo.js';
import { getLocaleFromPath } from '../../src/i18n/locales.js';

export async function loader({ params, request }) {
  const locale = getLocaleFromPath(new URL(request.url).pathname);
  const post = getPostBySlug(params.slug, locale);
  // No page exists until an article actually has a body — a real 404, not a
  // fake "coming soon" page, matching how drivers.$id.jsx 404s for a driver
  // that doesn't (yet) qualify for a public profile.
  if (!post || !post.body) {
    throw new Response('Not Found', { status: 404 });
  }
  return { post, related: getRelatedPosts(post, 3, locale) };
}

export function meta({ data, location }) {
  const { locale, t } = metaLocale(location);
  const post = data?.post;
  if (!post) {
    return buildMeta({
      title: t('meta.article.notFoundTitle'),
      description: t('meta.article.notFoundDescription'),
      path: '/blog',
      noindex: true,
      locale,
    });
  }
  return buildMeta({
    title: t('meta.article.title', { title: post.title }),
    description: post.excerpt,
    locale,
    path: `/blog/${post.slug}`,
    type: 'article',
  });
}

export { default } from '../../src/pages/BlogArticlePage.jsx';
