// Static blog content — there's no CMS/backend for editorial posts yet, so this file is
// the single source of truth, mirroring how the original design mock hardcoded its own
// `POSTS` array. Only a post with a `body` gets a real page — `/blog/:slug` 404s for
// anything else. To publish a new article, add an entry with a `body` using the same
// shape as the one below; nothing else needs to change.

import shaggyPhoto from '../assets/shaggy.jpg';
import { BLOG_TRANSLATIONS } from './blogTranslations.js';

export const CATEGORIES = ['All', 'Costs', 'Routes', 'Itineraries', 'Driving', 'Planning'];

// There's one author on this blog.
export const AUTHOR = {
  name: 'Shaggy',
  title: 'Founder, CarWithDriver.lk',
  photo: shaggyPhoto,
  bio:
    "I'm Shaggy — that's how people know me across Sri Lanka's tourism industry. I've spent years researching Sri Lankan tourism and working directly with travellers from all over the world, and I built CarWithDriver.lk to solve one simple problem: finding the right driver, chauffeur guide or national guide shouldn't be hard. My goal is to match you with someone you can trust, cut the guesswork out of planning, and keep your Sri Lanka holiday headache-free from arrival to departure. Welcome to Sri Lanka.",
};

export const BLOG_POSTS = [
  {
    slug: 'tourist-driver-vs-chauffeur-guide-vs-national-guide',
    category: 'Planning',
    title: 'Tourist Driver vs Chauffeur Guide vs National Guide in Sri Lanka: Which Should You Hire?',
    excerpt:
      'Tourist drivers, chauffeur guides and national guide lecturers all get you around Sri Lanka, but their qualifications and prices are genuinely different. Here is how to tell them apart — and how to spot a verified one.',
    readTime: '4 min read',
    wordCount: 900,
    heroAlt: 'Private driver loading luggage into a car in Sri Lanka',
    heroImage: 'https://res.cloudinary.com/ded99onjc/image/upload/v1788934497/Tourist_Driver_vs_Chauffeur_Guide_vs_National_Guide_in_Sri_Lanka_1_nqkyix.png',
    author: AUTHOR,
    publishedAt: '2026-09-09',
    body: {
      intro:
        'Planning a private tour of Sri Lanka usually means choosing between a tourist driver, a chauffeur guide and a national guide lecturer. They can look similar at first — all three can get you around the island — but their qualifications, guiding ability and prices are genuinely different, and the right choice depends on the trip you are planning.',
      toc: [
        { href: '#tourist-driver', label: 'Tourist Driver' },
        { href: '#chauffeur-guide', label: 'Chauffeur Guide Lecturer' },
        { href: '#national-guide', label: 'National Guide Lecturer' },
        { href: '#compare', label: 'At a glance' },
        { href: '#cost', label: 'Why licensed costs more' },
        { href: '#labels', label: 'How to spot a verified profile' },
        { href: '#faq', label: 'Frequently asked' },
      ],
      sections: [
        {
          type: 'text',
          id: 'tourist-driver',
          heading: 'Tourist Driver',
          paragraphs: [
            "A tourist driver's main job is getting you around Sri Lanka safely and comfortably. Unlike a random taxi driver, a verified tourist driver has experience working with international travellers and knows the routes, hotels and rest stops tourists actually use.",
          ],
          points: [
            { title: 'Best for:', body: 'couples, families, beach holidays and itineraries where you already know what you want to see.' },
            { title: 'What you get:', body: 'reliable transport, airport and hotel transfers, and practical local knowledge — not formal guiding.' },
            { title: 'Price:', body: 'the most affordable of the three, since you are paying for transport rather than tourism qualifications.' },
          ],
        },
        {
          type: 'text',
          id: 'chauffeur-guide',
          heading: 'Chauffeur Guide Lecturer',
          paragraphs: [
            'A chauffeur guide combines two roles in one person: driver and tour guide. Instead of only taking you from Sigiriya to Kandy, a good chauffeur guide explains the history and culture along the way.',
          ],
          points: [
            { title: 'Best for:', body: 'couples, honeymooners, families and first-time visitors doing a cultural or round-island tour.' },
            { title: 'What you get:', body: 'one dedicated person for the whole trip — driving plus guiding — usually easier to organise and more personal than hiring two people.' },
            { title: 'Price:', body: 'more than a tourist driver, but often better value than booking a separate driver and guide.' },
          ],
        },
        {
          type: 'text',
          id: 'national-guide',
          heading: 'National Guide Lecturer',
          paragraphs: [
            'A national guide lecturer is one of the highest levels of professional tourist guiding in Sri Lanka. They usually focus on guiding rather than driving, so your tour typically has a separate driver plus the guide.',
          ],
          points: [
            { title: 'Best for:', body: 'larger groups, educational or special-interest tours, and travellers who want history, archaeology or culture explained properly.' },
            { title: 'What you get:', body: 'in-depth knowledge of sites like Anuradhapura, Polonnaruwa, Sigiriya and Kandy — well beyond what a driver alone can offer.' },
            { title: 'Price:', body: 'the highest of the three, since you are covering a vehicle, a driver and a specialist guide.' },
          ],
        },
        {
          type: 'table',
          id: 'compare',
          heading: 'At a glance',
          table: {
            caption: 'Tourist driver vs chauffeur guide vs national guide',
            columns: ['Service', 'Drives the vehicle', 'Guiding', 'Best for'],
            rows: [
              ['Tourist Driver', 'Yes', 'Basic', 'Simple transport, beach holidays'],
              ['Chauffeur Guide Lecturer', 'Yes', 'Full', 'Private cultural & round-island tours'],
              ['National Guide Lecturer', 'Usually a separate driver', 'Expert', 'Larger groups, in-depth cultural tours'],
            ],
          },
        },
        {
          type: 'text',
          id: 'cost',
          heading: 'Why licensed drivers and guides cost more',
          paragraphs: [
            "A very cheap quote and a professional one are not always for the same service. Licensed drivers and guides carry costs a casual taxi driver does not — tourism registration, licence renewals, vehicle insurance and maintenance, plus guiding qualifications for chauffeur and national guides. Some cheap quotes also leave out fuel, tolls, parking or driver accommodation and add them later, so the final price ends up close to — or above — a licensed provider's all-inclusive rate. Always check what is actually included before comparing two numbers.",
          ],
        },
        {
          type: 'labels',
          id: 'labels',
          heading: 'How to spot a verified profile on CarWithDriver.lk',
          intro: 'Every verified driver and guide on CarWithDriver.lk carries a badge next to their name, so you know exactly what you are booking before you request a quote.',
          items: [
            { licenseType: 'Tourist Driver', description: 'A verified tourist driver, checked and approved for private transport around Sri Lanka.' },
            { licenseType: 'Chauffeur Guide Lecturer', description: 'A verified driver-guide, licensed to both drive and provide professional tour guiding.' },
            { licenseType: 'National Guide Lecturer', description: 'A verified specialist guide, licensed for in-depth cultural and historical guiding.' },
          ],
        },
        {
          type: 'cta',
          heading: 'Compare verified drivers and guides in minutes',
          body: 'Submit your dates, destinations and passenger count once, and get quotes back from verified tourist drivers, chauffeur guides and national guides — instead of messaging providers one by one.',
          ctaLabel: 'Get free quotes',
          ctaHref: '/get-quotes',
        },
        {
          type: 'text',
          id: 'choose',
          heading: 'Which one should you choose?',
          list: [
            'Beach holiday or simple transfers → a Tourist Driver is usually enough.',
            'Cultural or round-island trip for a couple or family → a Chauffeur Guide Lecturer gives you driving and guiding in one person.',
            'Larger group, educational or specialist tour → add a National Guide Lecturer for expert-level guiding.',
          ],
        },
      ],
      faqs: [
        { q: 'What is the difference between a tourist driver and a chauffeur guide?', a: 'A tourist driver focuses on safe, comfortable transport. A chauffeur guide does the same driving but is also licensed to explain Sri Lankan history and culture along the way.' },
        { q: 'Do I need a national guide lecturer for a normal holiday?', a: 'Usually not. They are most useful for larger groups or in-depth cultural and educational tours — a chauffeur guide or tourist driver covers most private trips.' },
        { q: 'How do I know if a driver or guide is actually verified?', a: 'Look for the colored badge next to their name on CarWithDriver.lk — blue for a verified tourist driver, amber with a crown for a chauffeur guide lecturer, and green for a national guide lecturer.' },
        { q: 'Why do quotes for the same route vary so much?', a: 'Price depends on vehicle type, trip length, distance, driver or guide qualifications and what is included (fuel, tolls, accommodation). Comparing a few quotes side by side is the easiest way to see what is actually included.' },
      ],
      closingLink: {
        text: 'Ready to compare providers directly?',
        to: '/drivers',
        label: 'Browse verified drivers and guides →',
      },
    },
  },
  {
    slug: "is-it-safe-to-hire-a-private-driver-in-sri-lanka",
    category: "Planning",
    title: "Is It Safe to Hire a Private Driver in Sri Lanka? How to Choose the Right One",
    seoTitle: "Is It Safe to Hire a Private Driver in Sri Lanka? (2026)",
    metaDescription: "Yes, if you choose well. Learn how to check SLTDA licences, read reviews, spot red flags and the key questions to ask before hiring a driver in Sri Lanka.",
    excerpt: "Yes, for most travellers. Here's how to check SLTDA licences, read reviews, spot red flags and know what to ask before you book a driver in Sri Lanka.",
    readTime: "6 min read",
    wordCount: 1150,
    heroAlt: "Private driver in Sri Lanka with tourists",
    author: AUTHOR,
    publishedAt: "2026-11-07",
    related: [
      "tourist-driver-vs-chauffeur-guide-vs-national-guide"
    ],
    body: {
      intro: "Hiring a private driver in Sri Lanka is one of the easiest ways to explore the island. You get to set your own pace and skip crowded buses, and you'll have a local by your side. But is it safe? And how do you pick a good driver?",
      toc: [
        {
          href: "#is-it-safe",
          label: "Is it safe?"
        },
        {
          href: "#check-licence",
          label: "Check the licence"
        },
        {
          href: "#reviews",
          label: "Read reviews"
        },
        {
          href: "#questions",
          label: "Questions to ask"
        },
        {
          href: "#red-flags",
          label: "Red flags"
        },
        {
          href: "#safety-tips",
          label: "Safety tips"
        },
        {
          href: "#faq",
          label: "Frequently asked"
        }
      ],
      sections: [
        {
          type: "text",
          id: "overview",
          paragraphs: [
            "Here's a simple guide covering licences, reviews, red flags and the questions to ask before you book."
          ]
        },
        {
          type: "text",
          id: "is-it-safe",
          heading: "Is it safe to hire a private driver in Sri Lanka?",
          paragraphs: [
            "Yes. For most travellers, hiring a private driver in Sri Lanka is safe. It's the most common way tourists get around. Private hires are usually agreed with the driver directly, with no meter and a price fixed upfront. Many first-time visitors and solo female travellers also say a driver makes the trip feel more comfortable and secure.",
            "There are two things to keep in mind:"
          ],
          list: [
            "**Not every driver is licensed.** The private-driver market runs with little regulation, so you need to check who you're hiring.",
            "**Road safety matters most.** Road deaths in Sri Lanka are well above the rates in Western Europe or Australasia, so a careful, experienced driver is key."
          ]
        },
        {
          type: "text",
          id: "check-licence",
          heading: "Step 1: Check the driver's licence",
          paragraphs: [
            "Sri Lanka has an official **Chauffeur Tourist Guide** licence, issued by the [Sri Lanka Tourism Development Authority (SLTDA)](https://www.sltda.gov.lk/). Drivers earn it through a [training course at the Sri Lanka Institute of Tourism and Hotel Management (SLITHM)](https://www.slithm.edu.lk/travel_toursim/chaofa-guide/). This licence is the main legal requirement for working as a tourist guide in Sri Lanka.",
            "Licensed chauffeur guides have to:"
          ],
          list: [
            "**Have plenty of driving experience.** They need a valid licence for a seven-seat vehicle and at least five years of experience driving one.",
            "**Pass background and health checks.** This means a police certificate showing no convictions, plus a medical certificate from a government doctor.",
            "**Keep training.** They need at least 32 hours of guiding training every year."
          ],
          after: [
            "[Read more about these regulations in the Daily FT.](https://www.ft.lk/front-page/New-regulations-for-tourist-guiding-services/44-687099)",
            "**How to verify:** Ask for the driver's registration number. Then look it up on the official [Sri Lanka Tourism licensed guide directory](https://srilanka.travel/tourist-guides), where you can search by name, registration number, guide type and language.",
            "Not sure whether you need a simple driver or a qualified guide? Read our guide to [tourist drivers vs chauffeur guides vs national guides in Sri Lanka](/blog/tourist-driver-vs-chauffeur-guide-vs-national-guide) to find the right fit for your trip."
          ]
        },
        {
          type: "text",
          id: "reviews",
          heading: "Step 2: Read reviews carefully",
          paragraphs: [
            "Good reviews are the best sign of a reliable driver, but only if they're real. On CarWithDriver.lk, our team checks every review before it goes live. You can also check Tripadvisor for more traveller feedback.",
            "Look for:"
          ],
          list: [
            "Plenty of reviews spread over several years",
            "Comments about safe, careful driving",
            "Mentions that the driver stuck to the plan and didn't push shopping stops",
            "Recent reviews from this year"
          ]
        },
        {
          type: "text",
          id: "questions",
          heading: "Step 3: Questions to ask before you book",
          paragraphs: [
            "Ask these in writing before you book, for example in the chat on CarWithDriver.lk, so you have a record of the answers:"
          ],
          ordered: true,
          list: [
            "Are you SLTDA licensed? What's your registration number?",
            "What vehicle will we use? Do the back seats have seatbelts and A/C?",
            "What's included in the price: fuel, tolls, parking, your meals and room?",
            "Are there extra charges for airport pickups, night driving or extra stops?",
            "Is there a daily kilometre limit?",
            "How much deposit do you need?",
            "Can we change the plan during the trip?",
            "How many hours a day will you drive?"
          ],
          after: [
            "That last question matters. In peak season, tourism drivers often work 10 to 14 hours a day, and tired drivers are risky. Plan shorter driving days and avoid long night drives."
          ]
        },
        {
          type: "text",
          id: "red-flags",
          heading: "Step 4: Red flags to watch for",
          points: [
            {
              title: "🚩 No clear price.",
              body: "Get the price confirmed in writing before you set off."
            },
            {
              title: "🚩 No licence number,",
              body: "or a number that doesn't appear in the official directory."
            },
            {
              title: "🚩 Constant shopping stops.",
              body: "Some drivers take tourists to gem shops, batik factories or spice gardens that pay them a commission."
            },
            {
              title: "🚩 Spice garden pressure.",
              body: "These stops often sell overpriced products, and the driver earns a cut of what you spend. Be cautious if a driver gets annoyed when you say no."
            },
            {
              title: "🚩 \"That temple is closed today.\"",
              body: "This is a common trick to steer you to a shop instead."
            },
            {
              title: "🚩 Unsafe driving,",
              body: "such as speeding, risky overtaking or using a phone while driving."
            }
          ]
        },
        {
          type: "text",
          id: "safety-tips",
          heading: "Quick safety tips",
          list: [
            "Photograph the number plate and the driver's ID, and share them with family.",
            "Wear your seatbelt, even in the back.",
            "Pay in stages, not all upfront.",
            "Save these numbers: **1912** for the tourism hotline, which can help with travel problems including scams, **119** for police and **1990** for an ambulance."
          ]
        },
        {
          type: "text",
          id: "final-thoughts",
          heading: "Final thoughts",
          paragraphs: [
            "Hiring a private driver in Sri Lanka is safe and often the best way to see the island. Choose a licensed or well-reviewed driver, agree on everything in writing, and stay firm about your plans. You'll be set for a stress-free trip."
          ]
        }
      ],
      faqs: [
        {
          q: "Is it safe for solo female travellers to hire a driver in Sri Lanka?",
          a: "Generally yes, especially with a licensed, well-reviewed driver. Share your trip details with someone at home and choose a driver with plenty of positive reviews from other women."
        },
        {
          q: "How do I check if a Sri Lankan driver is licensed?",
          a: "Search the driver's name or registration number on the [official Sri Lanka Tourism guide directory](https://srilanka.travel/tourist-guides)."
        },
        {
          q: "Do I pay for the driver's food and room?",
          a: "It depends on the deal. Many drivers include this in their daily rate, so always confirm before booking."
        },
        {
          q: "Should I book before I arrive?",
          a: "Booking ahead gives you time to check reviews and licences. Arranging a driver after you land also works if you get trusted recommendations."
        }
      ],
      closingLink: {
        text: "Ready to plan your trip?",
        to: "/get-quotes",
        label: "Compare verified drivers and chauffeur guides →"
      }
    }
  },
];

// A translated post keeps the English structure (slug, images, dates, links) and
// replaces only its text. Arrays are replaced whole, objects merged key by key.
const mergeText = (base, override) => {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base) && Array.isArray(override)) {
    return base.map((item, index) => mergeText(item, override[index]));
  }
  if (base && typeof base === 'object' && typeof override === 'object') {
    const out = { ...base };
    for (const key of Object.keys(override)) out[key] = mergeText(base[key], override[key]);
    return out;
  }
  return override;
};

export const localizePost = (post, locale = 'en') => {
  const override = post && BLOG_TRANSLATIONS[locale]?.[post.slug];
  return override ? mergeText(post, override) : post;
};

export const getLocalizedPosts = (locale = 'en') => BLOG_POSTS.map((post) => localizePost(post, locale));

export const getPostBySlug = (slug, locale = 'en') =>
  localizePost(BLOG_POSTS.find((post) => post.slug === slug) || null, locale);

export const getRelatedPosts = (post, limit = 3, locale = 'en') => {
  if (post?.related?.length) {
    return post.related.map((slug) => getPostBySlug(slug, locale)).filter(Boolean).slice(0, limit);
  }
  return BLOG_POSTS.filter((p) => p.slug !== post?.slug)
    .slice(0, limit)
    .map((p) => localizePost(p, locale));
};
