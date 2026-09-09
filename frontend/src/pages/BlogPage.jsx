import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { BLOG_POSTS, CATEGORIES, getPostBySlug } from '../data/blogPosts.js';
import ImagePlaceholder from '../components/ImagePlaceholder.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const FEATURED_SLUG = 'tourist-driver-vs-chauffeur-guide-vs-national-guide';

const BlogPage = () => {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim().toLowerCase();
  const featuredPost = getPostBySlug(FEATURED_SLUG);
  // Skip the separate featured banner while it's the only post — otherwise the grid
  // below it (which excludes the featured slug) would just show an empty state.
  const showFeatured = category === 'All' && !trimmedQuery && BLOG_POSTS.length > 1;

  const posts = useMemo(() => {
    const list = showFeatured ? BLOG_POSTS.filter((post) => post.slug !== FEATURED_SLUG) : BLOG_POSTS;
    return list
      .filter((post) => {
        const matchesCategory = category === 'All' || post.category === category;
        const matchesQuery =
          !trimmedQuery || `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(trimmedQuery);
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [category, trimmedQuery, showFeatured]);

  const listHeading = trimmedQuery
    ? `Results for "${query.trim()}"`
    : category === 'All'
      ? 'Latest guides'
      : category;

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    toast("Newsletter signup isn't available yet.");
  };

  return (
    <div className="bg-white font-sans text-ink">
      <section className="border-b border-hairline bg-gradient-to-b from-[#f4f8f6] to-white">
        <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,40px)] py-[clamp(26px,5vw,58px)] pb-[clamp(22px,4vw,40px)]">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-muted-soft">
            <Link to="/" className="hover:text-ink">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="font-bold text-ink">Blog</span>
          </nav>
          <h1 className="mt-3.5 max-w-[15ch] text-[clamp(28px,4.6vw,48px)] font-extrabold leading-[1.06] tracking-tight text-ink">
            Sri Lanka, explained by the people driving it
          </h1>
          <p className="mt-3.5 max-w-[60ch] text-[clamp(15px,1.4vw,17.5px)] leading-relaxed text-muted-soft">
            Route costs, honest itineraries and road conditions — written with the chauffeur guides who drive these roads every week, and updated as prices and roads change.
          </p>

          <form onSubmit={(event) => event.preventDefault()} role="search" className="mt-[22px] flex max-w-[560px] flex-wrap gap-2.5">
            <label htmlFor="blog-search" className="sr-only">Search the blog</label>
            <div className="flex min-h-[50px] flex-1 items-center gap-2.5 rounded-[13px] border-[1.5px] border-[#dfe7e2] bg-white px-3.5">
              <Search className="h-[17px] w-[17px] flex-shrink-0 text-muted-soft" strokeWidth={2.2} />
              <input
                id="blog-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search guides, e.g. Ella by train"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-muted-soft"
              />
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,40px)] pb-[clamp(44px,6vw,80px)] pt-[clamp(18px,3vw,32px)]">
        <nav aria-label="Categories" className="no-scrollbar mb-[clamp(18px,3vw,28px)] flex gap-2 overflow-x-auto pb-1.5">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-[44px] flex-shrink-0 whitespace-nowrap rounded-xl border-[1.5px] px-4 text-[13.5px] font-bold transition ${
                  active ? 'border-brand bg-brand text-white' : 'border-[#e0e7e3] bg-white text-ink-soft hover:border-brand'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </nav>

        {showFeatured && featuredPost ? (
          <Link
            to={`/blog/${featuredPost.slug}`}
            className="mb-[clamp(26px,4vw,44px)] flex flex-wrap items-center gap-[clamp(16px,2.6vw,32px)] rounded-3xl border border-[#e6ece9] bg-[#fbfdfc] p-[clamp(14px,2vw,20px)] transition hover:border-brand"
          >
            <span className="relative block aspect-[16/10] min-w-[min(100%,280px)] flex-1 basis-[320px] overflow-hidden rounded-2xl">
              {featuredPost.heroImage ? (
                <img src={featuredPost.heroImage} alt={featuredPost.heroAlt} className="h-full w-full object-cover" />
              ) : (
                <ImagePlaceholder alt={`Hero: ${featuredPost.heroAlt}`} />
              )}
            </span>
            <div className="min-w-[min(100%,280px)] flex-1 basis-[320px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#cdeadb] bg-[#e8f7ef] px-2.5 py-1 text-[11.5px] font-extrabold tracking-wide text-brand-dark">FEATURED · COSTS</span>
                <span className="text-[12.5px] font-semibold text-muted-soft">{featuredPost.readTime}</span>
              </div>
              <h2 className="mt-3 text-[clamp(21px,2.8vw,31px)] font-extrabold leading-[1.15] tracking-tight text-ink">{featuredPost.title}</h2>
              <p className="mt-2.5 max-w-[56ch] text-[15px] leading-relaxed text-muted-soft">{featuredPost.excerpt}</p>
              <div className="mt-4 flex items-center gap-2.5">
                <Avatar name={featuredPost.author.name} image={featuredPost.author.photo} tone="brand" className="h-10 w-10 flex-shrink-0 text-[13.5px]" />
                <div>
                  <div className="text-[13.5px] font-extrabold text-ink">{featuredPost.author.name}</div>
                  <div className="text-[12px] font-semibold text-muted-soft">Updated {formatDate(featuredPost.updatedAt)}</div>
                </div>
              </div>
            </div>
          </Link>
        ) : null}

        <h2 className="mb-[clamp(14px,2vw,20px)] text-[clamp(18px,2vw,22px)] font-extrabold tracking-tight text-ink">{listHeading}</h2>

        {posts.length === 0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#dfe7e2] p-9 text-center">
            <div className="text-[15.5px] font-extrabold text-ink">Nothing here yet</div>
            <p className="mt-1.5 text-[14px] font-semibold text-muted-soft">Try another category or clear your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-[clamp(14px,2.2vw,24px)]">
            {posts.map((post) => {
              const CardTag = post.body ? Link : 'div';
              const cardProps = post.body ? { to: `/blog/${post.slug}` } : {};
              return (
                <CardTag
                  key={post.slug}
                  {...cardProps}
                  className={`flex flex-col overflow-hidden rounded-[20px] border border-[#e6ece9] bg-white ${post.body ? 'transition hover:border-brand' : 'opacity-80'}`}
                >
                  <span className="relative block aspect-[16/10]">
                    {post.heroImage ? (
                      <img src={post.heroImage} alt={post.heroAlt} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlaceholder alt={post.heroAlt} />
                    )}
                    {!post.body ? (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-white">COMING SOON</span>
                    ) : null}
                  </span>
                  <div className="flex flex-1 flex-col p-4 pb-[17px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-[#d6ece0] bg-[#f2faf6] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-brand-dark">{post.category.toUpperCase()}</span>
                      <span className="text-[12px] font-semibold text-muted-soft">{post.readTime}</span>
                    </div>
                    <h3 className="mt-2.5 text-[17px] font-extrabold leading-[1.28] tracking-tight text-ink">{post.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.55] text-muted-soft">{post.excerpt}</p>
                    <div className="mt-3.5 flex items-center gap-2.5 border-t border-[#eef2f0] pt-3.5">
                      <Avatar name={post.author.name} image={post.author.photo} tone="brand" className="h-[30px] w-[30px] flex-shrink-0 text-[11.5px]" />
                      <span className="text-[12.5px] font-bold text-ink-soft">{post.author.name}</span>
                      <time dateTime={post.publishedAt} className="ml-auto text-[12px] font-semibold text-muted-soft">{formatDate(post.publishedAt)}</time>
                    </div>
                  </div>
                </CardTag>
              );
            })}
          </div>
        )}

        <section className="mt-[clamp(34px,5vw,60px)] rounded-3xl bg-gradient-to-br from-[#0c7a44] to-brand p-[clamp(20px,3vw,34px)] text-white">
          <h2 className="text-[clamp(20px,2.4vw,27px)] font-extrabold tracking-tight">One email a month, from the road</h2>
          <p className="mt-2.5 max-w-[52ch] text-[15px] leading-relaxed text-white/80">
            New route guides, updated prices and the odd road closure worth knowing about. No offers, no spam.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="mt-[18px] flex max-w-[520px] flex-wrap gap-2.5">
            <label htmlFor="nl-email" className="sr-only">Email address</label>
            <input
              id="nl-email"
              type="email"
              required
              placeholder="you@email.com"
              className="min-h-[50px] min-w-[220px] flex-1 rounded-[13px] border-0 px-[15px] text-[15px] font-semibold text-ink outline-none"
            />
            <button type="submit" className="min-h-[50px] flex-shrink-0 rounded-[13px] bg-ink px-[22px] text-[14.5px] font-extrabold text-white transition hover:bg-ink/90">
              Subscribe
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default BlogPage;
