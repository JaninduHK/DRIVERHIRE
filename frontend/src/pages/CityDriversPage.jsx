import { useLoaderData } from 'react-router';
import { MapPin, Star } from 'lucide-react';
import { Link } from '../i18n/router.jsx';
import { SITE_URL } from '../../app/lib/seo.js';
import { DriverCard } from './DriversDirectory.jsx';

// "Driver in <city>" landing page, e.g. /drivers/galle. Text comes from
// src/data/cityPages.js; the driver lists are built in the route loader.

// [label](url) links aren't used here, only **bold** lead-ins in the highlights list.
const Bold = ({ text }) => {
  const parts = String(text).split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => (index % 2 === 1 ? <strong key={index} className="font-bold text-ink">{part}</strong> : part));
};

const SectionHeading = ({ children, id }) => (
  <h2 id={id} className="scroll-mt-24 text-[clamp(20px,2.3vw,26px)] font-extrabold tracking-tight text-ink">{children}</h2>
);

const CityDriversPage = () => {
  const { city, based, available = [], others, stats, otherCities = [] } = useLoaderData();
  // Combined pages (Negombo and the airport) use the longer name in headings.
  const area = city.areaName || city.name;
  const quoteHref = `/get-quotes?from=${encodeURIComponent(city.name)}`;
  const pageUrl = `${SITE_URL}/drivers/${city.slug}`;

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Drivers', item: `${SITE_URL}/drivers` },
        { '@type': 'ListItem', position: 3, name: city.name, item: pageUrl },
      ],
    },
    based.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Private drivers in ${area}`,
          itemListElement: based.map((driver, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/drivers/${driver.id}`,
            name: driver.name,
          })),
        }
      : null,
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: city.faqs.map((faq) => ({ '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: faq.a } })),
    },
  ].filter(Boolean);

  return (
    <div className="bg-canvas">
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* Hero */}
      <section className="border-b border-[#eaeeec] bg-gradient-to-b from-[#f2f7f4] to-canvas">
        <div className="mx-auto max-w-[1180px] px-[clamp(14px,3vw,28px)] pb-[clamp(28px,4vw,48px)] pt-[clamp(22px,3vw,36px)]">
          <nav aria-label="Breadcrumb" className="text-[12.5px] font-semibold text-muted-soft">
            <Link to="/" className="hover:text-brand-dark">Home</Link>
            <span className="mx-1.5">/</span>
            <Link to="/drivers" className="hover:text-brand-dark">Drivers</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink">{city.name}</span>
          </nav>
          <h1 className="mt-3 text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-.02em] text-ink">{city.heading}</h1>
          <p className="mt-3 max-w-[68ch] text-[clamp(15.5px,1.4vw,17.5px)] leading-relaxed text-muted">{city.intro}</p>

          <div className="mt-5 flex flex-wrap gap-2.5 text-[13px] font-bold text-ink">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 shadow-card">
              <MapPin className="h-4 w-4 text-brand" />{' '}
              {stats.basedCount
                ? `${stats.basedCount} ${stats.basedCount === 1 ? 'driver' : 'drivers'} based in and around ${area}`
                : `Drivers from across Sri Lanka travel to ${area}`}
            </span>
            {stats.minRate ? (
              <span className="rounded-full bg-white px-3.5 py-2 shadow-card">Daily rates from ${stats.minRate}</span>
            ) : null}
            {stats.reviewCount ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 shadow-card">
                <Star className="h-4 w-4 fill-[#f5b400] text-[#f5b400]" /> {stats.reviewCount} reviews from travellers
              </span>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={quoteHref} className="inline-flex min-h-[48px] items-center rounded-xl bg-brand px-5 text-[15px] font-extrabold text-white transition hover:bg-brand-dark">
              Get quotes from {city.name} drivers
            </Link>
            <a href="#drivers" className="inline-flex min-h-[48px] items-center rounded-xl border border-[#dfe6e2] bg-white px-5 text-[15px] font-bold text-ink hover:border-brand">
              See the drivers
            </a>
          </div>
          <p className="mt-2.5 text-[12.5px] font-semibold text-muted-soft">Free to request · No booking fee · Pay your driver directly</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] space-y-[clamp(34px,5vw,56px)] px-[clamp(14px,3vw,28px)] py-[clamp(28px,4vw,48px)]">
        {/* Drivers based here */}
        <section>
          <SectionHeading id="drivers">Drivers based in and around {area}</SectionHeading>
          {based.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {based.map((driver, index) => (
                <DriverCard key={driver.id} driver={driver} tone={index % 2 ? 'purple' : 'brand'} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-muted">No drivers are based here yet, but the drivers below pick up travellers in {area}.</p>
          )}
        </section>

        {/* Drivers from elsewhere who chose this area under "Also available in" */}
        {available.length ? (
          <section>
            <SectionHeading>Also available in {area}</SectionHeading>
            <p className="mt-2 text-[14.5px] text-muted">These drivers are based elsewhere but regularly pick up travellers in {area}.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((driver, index) => (
                <DriverCard key={driver.id} driver={driver} tone={index % 2 ? 'purple' : 'brand'} />
              ))}
            </div>
          </section>
        ) : null}

        {/* About */}
        <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionHeading>{city.about.heading}</SectionHeading>
            {city.about.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-[15.5px] leading-relaxed text-[#33414c]">{paragraph}</p>
            ))}
            <h3 className="mt-6 text-[17px] font-extrabold text-ink">Best time to visit</h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-[#33414c]">{city.about.bestTime}</p>
          </div>
          <div className="rounded-[20px] border border-[#e6ece9] bg-white p-5">
            <h3 className="text-[17px] font-extrabold text-ink">Places a driver can take you</h3>
            <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px] leading-relaxed text-[#33414c]">
              {city.about.highlights.map((item) => (
                <li key={item} className="flex gap-2"><span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" /><span><Bold text={item} /></span></li>
              ))}
            </ul>
          </div>
        </section>

        {/* Routes */}
        <section>
          <SectionHeading>Popular routes from {city.name}</SectionHeading>
          <p className="mt-2 text-[14px] text-muted-soft">Approximate distances and driving times. Traffic and stops change them.</p>
          <div className="no-scrollbar mt-4 overflow-x-auto rounded-2xl border border-[#e6ece9] bg-white">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f7faf8] text-[12.5px] font-extrabold text-[#3d4b58]">
                  <th scope="col" className="p-3 px-4">From {city.name} to</th>
                  <th scope="col" className="p-3 px-4">Distance</th>
                  <th scope="col" className="p-3 px-4">Drive time</th>
                  <th scope="col" className="p-3 px-4">Route</th>
                </tr>
              </thead>
              <tbody>
                {city.routes.map((route) => (
                  <tr key={route.to} className="border-t border-[#eef2f0] text-[14px]">
                    <th scope="row" className="p-3 px-4 font-bold text-ink">{route.to}</th>
                    <td className="p-3 px-4 font-semibold text-muted">~{route.km} km</td>
                    <td className="p-3 px-4 font-semibold text-muted">{route.time}</td>
                    <td className="p-3 px-4 text-muted-soft">{route.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[14px] text-muted">
            Want a price for your route? <Link to={quoteHref} className="font-bold text-brand-dark hover:text-brand">Get fixed quotes from drivers</Link> or try the{' '}
            <Link to="/trip-cost-calculator" className="font-bold text-brand-dark hover:text-brand">trip cost calculator</Link>.
          </p>
        </section>

        {/* Other drivers */}
        {others.length ? (
          <section>
            <SectionHeading>More drivers who travel to {area}</SectionHeading>
            <p className="mt-2 text-[14.5px] text-muted">Most drivers tour the whole island and can pick you up in {area}.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((driver, index) => (
                <DriverCard key={driver.id} driver={driver} tone={index % 2 ? 'brand' : 'purple'} />
              ))}
            </div>
            <Link to="/drivers" className="mt-4 inline-flex text-[14px] font-bold text-brand-dark hover:text-brand">See all drivers →</Link>
          </section>
        ) : null}

        {/* FAQ */}
        <section>
          <SectionHeading id="faq">Hiring a driver in {area}: FAQs</SectionHeading>
          <div className="mt-4 flex flex-col gap-2.5">
            {city.faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-[#e6ece9] bg-white p-4">
                <h3 className="text-[15.5px] font-extrabold tracking-tight text-ink">{faq.q}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-soft">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Other city pages */}
        {otherCities.length ? (
          <section>
            <SectionHeading>Drivers in other areas</SectionHeading>
            <div className="mt-4 flex flex-wrap gap-2">
              {otherCities.map((other) => (
                <Link key={other.slug} to={`/drivers/${other.slug}`} className="rounded-full border border-[#e2e8ea] bg-white px-4 py-2 text-[13.5px] font-bold text-ink-soft hover:border-brand hover:text-brand-dark">
                  {other.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="rounded-[22px] bg-gradient-to-br from-[#0c7a44] to-brand p-[clamp(22px,3vw,32px)] text-white">
          <h2 className="text-[clamp(20px,2.3vw,26px)] font-extrabold tracking-tight">Planning a trip from {area}?</h2>
          <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-white/85">
            Tell us your dates and route once. Drivers who are free send you fixed prices, usually within minutes, and you choose who to book.
          </p>
          <Link to={quoteHref} className="mt-4 inline-flex min-h-[48px] items-center rounded-xl bg-white px-5 text-[15px] font-extrabold text-brand-dark hover:bg-white/90">
            Get free quotes
          </Link>
        </section>
      </div>
    </div>
  );
};

export default CityDriversPage;
