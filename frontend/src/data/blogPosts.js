// Static blog content — there's no CMS/backend for editorial posts yet, so this file is
// the single source of truth, mirroring how the original design mock hardcoded its own
// `POSTS` array. Only a post with a `body` gets a real page — `/blog/:slug` 404s for
// anything else. To publish a new article, add an entry with a `body` using the same
// shape as the one below; nothing else needs to change.

import shaggyPhoto from '../assets/shaggy.jpg';

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
];

export const getPostBySlug = (slug) => BLOG_POSTS.find((post) => post.slug === slug) || null;

export const getRelatedPosts = (post, limit = 3) => {
  if (post?.related?.length) {
    return post.related.map((slug) => getPostBySlug(slug)).filter(Boolean).slice(0, limit);
  }
  return BLOG_POSTS.filter((p) => p.slug !== post?.slug).slice(0, limit);
};
