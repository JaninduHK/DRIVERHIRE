import { Link } from 'react-router-dom';
import { useLoaderData } from 'react-router';
import toast from 'react-hot-toast';
import { SITE_URL } from '../../app/lib/seo.js';
import ImagePlaceholder from '../components/ImagePlaceholder.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';
import { LicenseTypeChip } from '../components/LicenseBadge.jsx';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BlogArticlePage = () => {
  const { post, related } = useLoaderData();
  const body = post.body;
  const articleUrl = `${SITE_URL}/blog/${post.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    inLanguage: 'en',
    ...(post.wordCount ? { wordCount: post.wordCount } : {}),
    author: { '@type': 'Person', name: post.author.name, ...(post.author.title ? { jobTitle: post.author.title } : {}) },
    publisher: { '@type': 'Organization', name: 'carwithdriver.lk', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied.');
    } catch {
      toast.error('Unable to copy link.');
    }
  };

  const shareLinks = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${post.title} ${articleUrl}`)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}` },
  ];

  return (
    <div className="bg-white font-sans text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,40px)] pt-[clamp(14px,2.4vw,26px)]">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-muted-soft">
          <Link to="/" className="hover:text-ink">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/blog" className="hover:text-ink">Blog</Link>
          <span aria-hidden="true">/</span>
          <span className="font-bold text-ink">{post.category}</span>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-[clamp(24px,4vw,48px)] px-[clamp(16px,4vw,40px)] pb-[clamp(40px,6vw,76px)] pt-[clamp(16px,2.6vw,28px)]">
        <article className="min-w-[min(100%,300px)] flex-1 basis-[520px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#cdeadb] bg-[#e8f7ef] px-3 py-1.5 text-[11.5px] font-extrabold tracking-wide text-brand-dark">
            {post.category.toUpperCase()}
          </span>
          <h1 className="mt-3.5 text-[clamp(27px,4.2vw,44px)] font-extrabold leading-[1.08] tracking-tight text-ink">{post.title}</h1>
          <p className="mt-3.5 text-[clamp(16px,1.5vw,18.5px)] leading-relaxed text-muted-soft">{post.excerpt}</p>

          <div className="mt-[18px] flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-[#eef2f0] pb-[18px]">
            <div className="flex items-center gap-2.5">
              <Avatar name={post.author.name} image={post.author.photo} tone="brand" className="h-[38px] w-[38px] flex-shrink-0 text-[13px]" />
              <div>
                <div className="text-[13.5px] font-extrabold">By {post.author.name}</div>
                <div className="text-[12px] font-semibold text-muted-soft">
                  Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  {post.updatedAt ? <> · Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></> : null}
                </div>
              </div>
            </div>
            <span className="ml-auto text-[12.5px] font-bold text-muted-soft">
              {post.readTime}{post.wordCount ? ` · ${post.wordCount.toLocaleString()} words` : ''}
            </span>
          </div>

          <figure className="mt-[clamp(18px,2.6vw,26px)]">
            <div className="relative aspect-video overflow-hidden rounded-[20px]">
              {post.heroImage ? (
                <img src={post.heroImage} alt={post.heroAlt} className="h-full w-full object-cover" />
              ) : (
                <ImagePlaceholder alt={`Hero: ${post.heroAlt}`} />
              )}
            </div>
            {post.heroCaption ? <figcaption className="mt-2.5 text-[12.5px] font-semibold text-muted-soft">{post.heroCaption}</figcaption> : null}
          </figure>

          {body?.toc?.length ? (
            <nav aria-label="On this page" className="mt-[clamp(20px,3vw,28px)] rounded-[18px] border border-[#e9efec] bg-[#f7faf8] p-4">
              <div className="text-[11px] font-extrabold tracking-[0.08em] text-muted-soft">ON THIS PAGE</div>
              <ol className="mt-2.5 flex flex-col gap-1.5 pl-[19px]">
                {body.toc.map((item) => (
                  <li key={item.href} className="text-[14.5px] font-bold leading-snug">
                    <a href={item.href} className="text-ink hover:text-brand-dark">{item.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          {body ? (
            <div className="mt-[clamp(22px,3vw,32px)] font-serif text-[clamp(17px,1.6vw,18.5px)] leading-[1.75] text-[#26333d]">
              {body.intro ? <p>{body.intro}</p> : null}

              {body.sections?.map((section, index) => (
                <SectionBlock key={section.id || index} section={section} />
              ))}

              {body.rateTable ? (
                <>
                  <h2 id="rates" className="mt-[clamp(28px,3.4vw,40px)] scroll-mt-20 font-sans text-[clamp(21px,2.4vw,27px)] font-extrabold leading-tight tracking-tight text-ink">Daily rates by vehicle</h2>
                  {body.ratesIntro ? <p className="mt-3">{body.ratesIntro}</p> : null}
                  <div className="no-scrollbar mt-[18px] overflow-x-auto rounded-2xl border border-[#e6ece9]">
                    <table className="w-full min-w-[420px] border-collapse font-sans">
                      {body.rateTable.caption ? (
                        <caption className="border-b border-[#eef2f0] p-3.5 text-left text-[12.5px] font-bold text-muted-soft">{body.rateTable.caption}</caption>
                      ) : null}
                      <thead>
                        <tr className="bg-[#f7faf8]">
                          {body.rateTable.columns.map((col, index) => (
                            <th key={col} scope="col" className={`p-2.5 px-4 text-[12.5px] font-extrabold text-[#3d4b58] ${index === body.rateTable.columns.length - 1 ? 'text-right' : 'text-left'}`}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {body.rateTable.rows.map((row) => (
                          <tr key={row.vehicle} className="border-t border-[#eef2f0]">
                            <th scope="row" className="p-3 px-4 text-left text-[14px] font-bold text-ink">{row.vehicle}</th>
                            <td className="p-3 px-4 text-[14px] font-semibold text-muted-soft">{row.seats}</td>
                            <td className="whitespace-nowrap p-3 px-4 text-right text-[14px] font-extrabold text-ink">{row.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}

              {body.included?.length ? (
                <>
                  <h2 id="included" className="mt-[clamp(28px,3.4vw,40px)] scroll-mt-20 font-sans text-[clamp(21px,2.4vw,27px)] font-extrabold leading-tight tracking-tight text-ink">What &quot;all inclusive&quot; covers</h2>
                  {body.includedIntro ? <p className="mt-3">{body.includedIntro}</p> : null}
                  <ul className="mt-3.5 flex flex-col gap-2 pl-5">
                    {body.included.map((line) => (<li key={line}>{line}</li>))}
                  </ul>
                </>
              ) : null}

              {body.quote ? (
                <blockquote className="mt-[clamp(22px,3vw,30px)] rounded-[18px] border border-[#d6ece0] bg-[#f2faf6] p-5">
                  <p className="text-[16.5px] leading-relaxed text-ink">&ldquo;{body.quote.text}&rdquo;</p>
                  {body.quote.cite ? <footer className="mt-2.5 font-sans text-[12.5px] font-bold text-muted-soft">{body.quote.cite}</footer> : null}
                </blockquote>
              ) : null}

              {body.costCards?.length ? (
                <>
                  <h2 id="example" className="mt-[clamp(28px,3.4vw,40px)] scroll-mt-20 font-sans text-[clamp(21px,2.4vw,27px)] font-extrabold leading-tight tracking-tight text-ink">A real 10-day trip, costed</h2>
                  {body.exampleIntro ? <p className="mt-3">{body.exampleIntro}</p> : null}
                  <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5 font-sans">
                    {body.costCards.map((card) => (
                      <div
                        key={card.label}
                        className={`rounded-2xl border p-4 ${card.tone === 'brand' ? 'border-[#cdeadb] bg-[#eaf7f0]' : 'border-[#e9efec] bg-[#f7faf8]'}`}
                      >
                        <div className={`text-[11px] font-extrabold tracking-wide ${card.tone === 'brand' ? 'text-brand-dark' : 'text-muted-soft'}`}>{card.label}</div>
                        <div className={`mt-1.5 text-[clamp(20px,2.4vw,25px)] font-extrabold tracking-tight ${card.tone === 'brand' ? 'text-[#0c7a44]' : 'text-ink'}`}>{card.value}</div>
                        <div className={`mt-1 text-[12.5px] font-semibold ${card.tone === 'brand' ? 'text-[#3f7a5d]' : 'text-muted-soft'}`}>{card.note}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {body.tips?.length ? (
                <>
                  <h2 id="save" className="mt-[clamp(28px,3.4vw,40px)] scroll-mt-20 font-sans text-[clamp(21px,2.4vw,27px)] font-extrabold leading-tight tracking-tight text-ink">Four ways to pay less</h2>
                  <ol className="mt-3.5 flex flex-col gap-2.5 pl-5">
                    {body.tips.map((tip) => (
                      <li key={tip.title}><strong className="font-semibold text-ink">{tip.title}</strong> {tip.body}</li>
                    ))}
                  </ol>
                </>
              ) : null}

              {body.faqs?.length ? (
                <>
                  <h2 id="faq" className="mt-[clamp(28px,3.4vw,40px)] scroll-mt-20 font-sans text-[clamp(21px,2.4vw,27px)] font-extrabold leading-tight tracking-tight text-ink">Frequently asked</h2>
                  <div className="mt-3.5 flex flex-col gap-2.5 font-sans">
                    {body.faqs.map((faq) => (
                      <div key={faq.q} className="rounded-2xl border border-[#e6ece9] bg-white p-4">
                        <h3 className="text-[15.5px] font-extrabold tracking-tight text-ink">{faq.q}</h3>
                        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-soft">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {body.closingLink ? (
                <p className="mt-6">
                  {body.closingLink.text}{' '}
                  <Link to={body.closingLink.to} className="font-sans font-bold text-brand-dark hover:text-brand">{body.closingLink.label}</Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <section id="author" className="mt-[clamp(30px,4vw,46px)] scroll-mt-20 rounded-[22px] border border-[#e6ece9] bg-[#fbfdfc] p-[clamp(18px,2.6vw,26px)]">
            <div className="flex flex-wrap items-start gap-4">
              <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[20px]">
                {post.author.photo ? (
                  <img src={post.author.photo} alt={post.author.name} className="h-full w-full object-cover" />
                ) : (
                  <ImagePlaceholder alt="Author headshot" shape="rounded" />
                )}
              </div>
              <div className="min-w-[min(100%,240px)] flex-1 basis-[260px]">
                <div className="text-[11px] font-extrabold tracking-[0.08em] text-muted-soft">WRITTEN BY</div>
                <h2 className="mt-1.5 text-[clamp(18px,2vw,22px)] font-extrabold tracking-tight">{post.author.name}</h2>
                {post.author.title ? <div className="mt-1 text-[13.5px] font-bold text-brand-dark">{post.author.title}</div> : null}
                {post.author.bio ? <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted-soft">{post.author.bio}</p> : null}
                {post.author.tags?.length ? (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {post.author.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[#e0e9e4] bg-white px-2.5 py-1 text-[12px] font-bold text-[#3d4b58]">{tag}</span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-[15px] flex flex-wrap gap-2">
                  <Link to="/contact" className="inline-flex min-h-[44px] items-center rounded-xl border-[1.5px] border-[#dfe7e2] px-4 text-[13.5px] font-extrabold text-[#3d4b58] hover:border-brand">
                    Contact
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {related.length ? (
            <section className="mt-[clamp(28px,4vw,44px)]">
              <h2 className="mb-3.5 text-[clamp(18px,2vw,22px)] font-extrabold tracking-tight">Keep reading</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3.5">
                {related.map((relatedPost) => {
                  const Tag = relatedPost.body ? Link : 'div';
                  const props = relatedPost.body ? { to: `/blog/${relatedPost.slug}` } : {};
                  return (
                    <Tag key={relatedPost.slug} {...props} className={`flex flex-col gap-2.5 rounded-[18px] border border-[#e6ece9] bg-white p-3.5 ${relatedPost.body ? 'hover:border-brand' : 'opacity-80'}`}>
                      <span className="text-[11px] font-extrabold tracking-wide text-brand-dark">{relatedPost.category.toUpperCase()}</span>
                      <span className="text-[15.5px] font-extrabold leading-[1.3] tracking-tight text-ink">{relatedPost.title}</span>
                      <span className="text-[12.5px] font-semibold text-muted-soft">{relatedPost.readTime}</span>
                    </Tag>
                  );
                })}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="sticky top-[76px] flex min-w-[min(100%,260px)] flex-1 basis-[280px] flex-col gap-3.5">
          <div className="rounded-[20px] border border-[#e6ece9] bg-white p-[18px]">
            <div className="text-[15.5px] font-extrabold tracking-tight">Price your own trip</div>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-soft">Build an itinerary and get a live estimate, then collect free quotes from drivers.</p>
            <Link to="/trip-cost-calculator" className="mt-3.5 flex min-h-[46px] items-center justify-center rounded-xl bg-brand text-[14.5px] font-extrabold text-white transition hover:bg-brand-dark">
              Open trip calculator
            </Link>
          </div>
          <div className="rounded-[20px] border border-[#e6ece9] bg-[#f7faf8] p-[18px]">
            <div className="text-[11px] font-extrabold tracking-[0.08em] text-muted-soft">SHARE</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {shareLinks.map((share) => (
                <a
                  key={share.label}
                  href={share.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-[#e0e9e4] bg-white px-3.5 text-[13px] font-bold text-[#3d4b58] hover:border-brand"
                >
                  {share.label}
                </a>
              ))}
              <button type="button" onClick={copyLink} className="inline-flex min-h-[44px] items-center rounded-xl border border-[#e0e9e4] bg-white px-3.5 text-[13px] font-bold text-[#3d4b58] hover:border-brand">
                Copy link
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// Generic content block, used by posts whose body doesn't fit the cost-guide's
// named-field shape (rateTable/included/costCards/tips). Add block types here as
// new articles need them — kept small on purpose, only what's actually used.
const SECTION_HEADING_CLS = 'mt-[clamp(28px,3.4vw,40px)] scroll-mt-20 font-sans text-[clamp(21px,2.4vw,27px)] font-extrabold leading-tight tracking-tight text-ink';

const SectionBlock = ({ section }) => {
  if (section.type === 'table' && section.table) {
    return (
      <>
        {section.heading ? <h2 id={section.id} className={SECTION_HEADING_CLS}>{section.heading}</h2> : null}
        {section.intro ? <p className="mt-3">{section.intro}</p> : null}
        <div className="no-scrollbar mt-[18px] overflow-x-auto rounded-2xl border border-[#e6ece9] font-sans">
          <table className="w-full min-w-[420px] border-collapse">
            {section.table.caption ? (
              <caption className="border-b border-[#eef2f0] p-3.5 text-left text-[12.5px] font-bold text-muted-soft">{section.table.caption}</caption>
            ) : null}
            <thead>
              <tr className="bg-[#f7faf8]">
                {section.table.columns.map((col) => (
                  <th key={col} scope="col" className="p-2.5 px-4 text-left text-[12.5px] font-extrabold text-[#3d4b58]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row[0]} className="border-t border-[#eef2f0]">
                  {row.map((cell, cellIndex) => (
                    cellIndex === 0 ? (
                      <th key={cell} scope="row" className="p-3 px-4 text-left text-[14px] font-bold text-ink">{cell}</th>
                    ) : (
                      <td key={cell} className="p-3 px-4 text-[14px] font-semibold text-muted-soft">{cell}</td>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (section.type === 'labels' && section.items) {
    return (
      <>
        {section.heading ? <h2 id={section.id} className={SECTION_HEADING_CLS}>{section.heading}</h2> : null}
        {section.intro ? <p className="mt-3">{section.intro}</p> : null}
        <div className="mt-[18px] flex flex-col gap-3 font-sans">
          {section.items.map((item) => (
            <div key={item.licenseType} className="flex items-start gap-3 rounded-2xl border border-[#e6ece9] bg-white p-4">
              <LicenseTypeChip licenseType={item.licenseType} className="!mt-0 flex-shrink-0" />
              <p className="text-[14px] leading-relaxed text-muted-soft">{item.description}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (section.type === 'cta') {
    return (
      <div className="mt-[clamp(22px,3vw,30px)] rounded-[20px] bg-gradient-to-br from-[#0c7a44] to-brand p-6 font-sans text-white">
        {section.heading ? <h2 className="text-[20px] font-extrabold tracking-tight">{section.heading}</h2> : null}
        {section.body ? <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">{section.body}</p> : null}
        {section.ctaHref ? (
          <Link to={section.ctaHref} className="mt-4 inline-flex min-h-[46px] items-center rounded-xl bg-white px-5 text-[14.5px] font-extrabold text-brand-dark transition hover:bg-white/90">
            {section.ctaLabel || 'Learn more'}
          </Link>
        ) : null}
      </div>
    );
  }

  // Default: plain text section — heading, paragraphs, and an optional bullet list
  // (either plain strings or {title, body} lead-in pairs).
  return (
    <>
      {section.heading ? <h2 id={section.id} className={SECTION_HEADING_CLS}>{section.heading}</h2> : null}
      {(section.paragraphs || []).map((paragraph) => (<p key={paragraph} className="mt-3">{paragraph}</p>))}
      {section.points?.length ? (
        <ul className="mt-3.5 flex flex-col gap-2 pl-5">
          {section.points.map((point) => (
            <li key={point.title}><strong className="font-semibold text-ink">{point.title}</strong> {point.body}</li>
          ))}
        </ul>
      ) : null}
      {section.list?.length ? (
        <ul className="mt-3.5 flex flex-col gap-2 pl-5">
          {section.list.map((line) => (<li key={line}>{line}</li>))}
        </ul>
      ) : null}
    </>
  );
};

export default BlogArticlePage;
