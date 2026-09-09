import { getPostBySlug, getRelatedPosts } from '../../src/data/blogPosts.js';
import { buildMeta } from '../lib/seo.js';

export async function loader({ params }) {
  const post = getPostBySlug(params.slug);
  // No page exists until an article actually has a body — a real 404, not a
  // fake "coming soon" page, matching how drivers.$id.jsx 404s for a driver
  // that doesn't (yet) qualify for a public profile.
  if (!post || !post.body) {
    throw new Response('Not Found', { status: 404 });
  }
  return { post, related: getRelatedPosts(post) };
}

export function meta({ data }) {
  const post = data?.post;
  if (!post) {
    return buildMeta({
      title: 'Article not found | Car with Driver LK',
      description: 'This article could not be found.',
      path: '/blog',
      noindex: true,
    });
  }
  return buildMeta({
    title: `${post.title} | Car with Driver LK`,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: 'article',
  });
}

export { default } from '../../src/pages/BlogArticlePage.jsx';
