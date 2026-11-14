// City landing pages at /drivers/<slug> (e.g. /drivers/galle), so the site can rank for
// searches like "driver in Galle". Each page needs its own real text, not just a
// swapped city name: near-identical city pages look like doorway pages to Google.
//
// English only for now; translated paths (/de/drivers/galle) are served noindex.
// `slug` is the page address. `towns` are the constants/locations.js towns whose drivers
// count as based here (defaults to [slug]); `nearby` towns show next, as "around".
// `aliasSlugs` redirect to this page (e.g. /drivers/airport -> /drivers/negombo).
// Distances and drive times are approximate.

export const CITY_PAGES = {
  galle: {
    slug: 'galle',
    name: 'Galle',
    seoTitle: 'Private Drivers in Galle | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Galle. Compare fixed quotes from local drivers based in and around Galle, read real reviews and book directly. No booking fee.',
    heading: 'Private drivers in Galle',
    intro:
      'Galle is the gateway to Sri Lanka’s south coast: the old Dutch fort, the beaches of Unawatuna and Hikkaduwa, and whale watching in Mirissa are all within an hour. A local driver picks you up at the airport or your hotel and plans the day around you, with no meters and no haggling.',
    nearby: ['unawatuna', 'hikkaduwa', 'ambalangoda', 'weligama', 'mirissa', 'matara', 'bentota'],
    about: {
      heading: 'Why hire a driver in Galle?',
      paragraphs: [
        'Galle Fort itself is best explored on foot: it is a compact UNESCO World Heritage Site with cobbled lanes, ramparts and the lighthouse. Where a driver helps is everything around it. The south coast spreads over 100 km of beaches, small towns and national parks, and buses and tuk-tuks get slow and tiring on longer trips.',
        'Most travellers use a Galle driver in one of three ways: an airport transfer to or from Colombo, day trips along the coast, or as the start or end of a multi-day tour of the island. Every driver on Car with Driver quotes a fixed price for your plan, so you know the full cost before you go.',
      ],
      highlights: [
        '**Galle Fort and the lighthouse**: an easy evening walk on the ramparts at sunset.',
        '**Unawatuna and Jungle Beach**: calm swimming bays about 15 minutes away.',
        '**Koggala**: stilt fishermen, a lake boat ride and the Martin Wickramasinghe museum.',
        '**Mirissa and Weligama**: whale watching (best November to April) and surf beaches.',
        '**Hikkaduwa**: coral reef, sea turtles and a lively beach strip to the north.',
        '**Yala National Park**: leopard safaris, a long day trip or an overnight stop from Galle.',
      ],
      bestTime:
        'The south coast is at its best from December to April, when the sea is calm and the weather mostly dry. From May to September the south-west monsoon brings rougher seas and more rain on this coast, and many travellers head east instead.',
    },
    routes: [
      { to: 'Colombo Airport (BIA)', km: 155, time: '2–2.5 h', note: 'via the Southern Expressway' },
      { to: 'Colombo city', km: 120, time: '1.5–2 h', note: 'via the Southern Expressway' },
      { to: 'Hikkaduwa', km: 20, time: '30–40 min', note: 'coast road' },
      { to: 'Mirissa', km: 35, time: '45 min–1 h', note: 'coast road' },
      { to: 'Bentota', km: 60, time: '1–1.5 h', note: 'coast road or expressway' },
      { to: 'Yala (Tissamaharama)', km: 170, time: '3–3.5 h', note: 'expressway, then main road' },
      { to: 'Ella', km: 200, time: '4.5–5 h', note: 'through the hill country' },
      { to: 'Kandy', km: 230, time: '4–5 h', note: 'via Colombo expressways' },
    ],
    faqs: [
      {
        q: 'How far is Galle from Colombo airport?',
        a: 'About 155 km. With the Southern Expressway the drive usually takes 2 to 2.5 hours, depending on traffic around Colombo.',
      },
      {
        q: 'Do I need a driver inside Galle Fort?',
        a: 'Not really. The fort is small and best seen on foot. A driver is most useful for airport transfers, beach and day trips along the coast, and safaris to Yala or Udawalawe.',
      },
      {
        q: 'Can a driver from Galle take me around the whole island?',
        a: 'Yes. Most drivers do multi-day tours across Sri Lanka. You can start in Galle and finish anywhere, for example Kandy, Sigiriya or the airport. Ask for a quote with your full route.',
      },
      {
        q: 'How do I book a driver in Galle?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  colombo: {
    slug: 'colombo',
    name: 'Colombo',
    nearby: ['wattala', 'piliyandala', 'moratuwa', 'ja-ela'],
    seoTitle: 'Private Drivers in Colombo | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Colombo for city tours, airport transfers and island tours. Compare fixed quotes from local drivers and book directly. No booking fee.',
    heading: 'Private drivers in Colombo',
    intro:
      'Colombo is where most Sri Lanka trips start or end. A local driver can show you the city in half a day, take you to the airport, or set off from your hotel on a tour of the whole island, at a fixed price agreed before you go.',
    about: {
      heading: 'Why hire a driver in Colombo?',
      paragraphs: [
        'Colombo traffic is heavy, the city is spread out, and the sights are far apart, so a half-day or full-day city tour with a driver saves a lot of time and tuk-tuk haggling. Your driver waits while you visit, keeps your bags safe and knows where to park.',
        'Colombo is also the natural starting point for a round-island tour: the south coast, the hill country and the Cultural Triangle are all a few hours away. Many travellers book one driver here for the whole trip and finish at the airport, 35 km north of the city.',
      ],
      highlights: [
        '**Gangaramaya Temple and Seema Malaka**: a busy temple full of curiosities, and the calm pavilion on Beira Lake.',
        '**Galle Face Green**: the seafront promenade, best at sunset with street food.',
        '**Pettah market**: crowded bazaar streets and the red-and-white Jami Ul-Alfar mosque.',
        '**Independence Square and Viharamahadevi Park**: colonial architecture and the city’s main park.',
        '**Lotus Tower**: the tallest structure in South Asia, with a viewing deck over the city.',
        '**Mount Lavinia**: a beach and colonial hotel just south of the city.',
      ],
      bestTime:
        'Colombo is warm all year. The driest months are December to April. From May to September the south-west monsoon brings showers, usually short ones, and city tours still work well in the mornings.',
    },
    routes: [
      { to: 'Colombo Airport (BIA)', km: 35, time: '45 min–1 h', note: 'via the Katunayake Expressway' },
      { to: 'Negombo', km: 40, time: '1 h', note: 'via the Katunayake Expressway' },
      { to: 'Bentota', km: 65, time: '1–1.5 h', note: 'via the Southern Expressway' },
      { to: 'Galle', km: 120, time: '1.5–2 h', note: 'via the Southern Expressway' },
      { to: 'Kandy', km: 115, time: '3–3.5 h', note: 'main road through Kegalle' },
      { to: 'Sigiriya', km: 170, time: '4–4.5 h', note: 'via Kurunegala and Dambulla' },
      { to: 'Nuwara Eliya', km: 165, time: '4.5–5 h', note: 'through the hill country' },
      { to: 'Ella', km: 210, time: '5.5–6.5 h', note: 'via the Southern Expressway and Wellawaya' },
    ],
    faqs: [
      {
        q: 'How long does it take from Colombo airport to the city?',
        a: 'The airport is about 35 km north of Colombo. With the Katunayake Expressway it usually takes 45 minutes to an hour, more in rush hour.',
      },
      {
        q: 'Is a driver worth it for a Colombo city tour?',
        a: 'Yes, if you want to see several places in one day. The sights are spread across the city and traffic is slow, so a driver who waits for you is quicker and easier than taking tuk-tuks between each stop.',
      },
      {
        q: 'Can I start a round-island tour from Colombo?',
        a: 'Yes. Most drivers do multi-day tours and can pick you up at your Colombo hotel or the airport. Send your dates and route once, and drivers reply with a fixed price for the whole trip.',
      },
      {
        q: 'How do I book a driver in Colombo?',
        a: 'Send one request with your dates and plans. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  negombo: {
    slug: 'negombo',
    name: 'Negombo',
    areaName: 'Negombo and the airport',
    towns: ['negombo', 'katunayake'],
    aliasSlugs: ['airport', 'katunayake', 'colombo-airport'],
    nearby: ['ja-ela', 'gampaha', 'wattala', 'chilaw'],
    seoTitle: 'Drivers in Negombo & Colombo Airport | Car with Driver LK',
    metaDescription:
      'Private drivers in Negombo and at Colombo Airport (BIA): airport pickups day and night, transfers and island tours. Compare fixed quotes. No booking fee.',
    heading: 'Private drivers in Negombo and at Colombo Airport',
    intro:
      'Negombo is only 10 km from Bandaranaike International Airport, so it is where many trips begin and end. A local driver can meet you at arrivals with your name on a board, at any hour, and take you to your hotel or straight on to the rest of the island.',
    about: {
      heading: 'Why hire a driver in Negombo?',
      paragraphs: [
        'Flights to Sri Lanka often land late at night or early in the morning. Booking your driver in advance means someone is waiting when you come out of arrivals, with an agreed price and space for your luggage, instead of negotiating with taxis after a long flight.',
        'Negombo is also a relaxed first or last night of the trip: a beach town with a lagoon, fish markets and old Dutch canals. From here a driver can take you north to Wilpattu, inland to the Cultural Triangle and Kandy, or south along the coast.',
      ],
      highlights: [
        '**Airport meet and greet**: pickup at arrivals with a name board, day or night.',
        '**Negombo lagoon and fish market**: early-morning auctions and fishing boats at Lellama.',
        '**Hamilton (Dutch) Canal**: a boat ride through the old colonial waterway.',
        '**St Mary’s Church**: one of the largest churches in the country, with a painted ceiling.',
        '**Muthurajawela wetland**: birds, monitor lizards and mangroves by boat.',
        '**Negombo beach**: a long sandy beach for a lazy last day before your flight.',
      ],
      bestTime:
        'The west coast is driest from December to April. From May to September the south-west monsoon brings rain and rougher seas, but airport transfers and onward tours run all year.',
    },
    routes: [
      { to: 'Colombo Airport (BIA)', km: 10, time: '15–20 min', note: 'local roads' },
      { to: 'Colombo city', km: 40, time: '1 h', note: 'via the Katunayake Expressway' },
      { to: 'Kandy', km: 100, time: '2.5–3 h', note: 'via Kurunegala or Kegalle' },
      { to: 'Sigiriya', km: 150, time: '3.5–4 h', note: 'via Kurunegala and Dambulla' },
      { to: 'Wilpattu National Park', km: 140, time: '3–3.5 h', note: 'coast road via Puttalam' },
      { to: 'Bentota', km: 100, time: '1.5–2 h', note: 'via the Southern Expressway' },
      { to: 'Galle', km: 155, time: '2–2.5 h', note: 'via the Southern Expressway' },
      { to: 'Ella', km: 230, time: '5.5–6.5 h', note: 'via the Southern Expressway and Wellawaya' },
    ],
    faqs: [
      {
        q: 'Can a driver pick me up at Colombo airport at night?',
        a: 'Yes. Drivers meet flights at any hour, including late-night and early-morning arrivals. Add your flight number and arrival time to your request so the driver can track it.',
      },
      {
        q: 'How far is Negombo from the airport?',
        a: 'About 10 km, usually 15 to 20 minutes by car. That makes Negombo a popular place to stay on the first or last night.',
      },
      {
        q: 'Where will the driver meet me at the airport?',
        a: 'Most drivers wait outside the arrivals hall with your name on a board. Agree the meeting point in the chat before your flight, and you can message them once you land.',
      },
      {
        q: 'Can I go straight from the airport to Sigiriya or Kandy?',
        a: 'Yes. Many travellers skip Colombo and drive straight inland: Kandy is about 2.5 to 3 hours and Sigiriya about 3.5 to 4 hours from the airport.',
      },
    ],
  },
  kandy: {
    slug: 'kandy',
    name: 'Kandy',
    nearby: ['matale', 'kegalle'],
    seoTitle: 'Private Drivers in Kandy | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Kandy for the Temple of the Tooth, tea country and tours across Sri Lanka. Compare fixed quotes from local drivers. No booking fee.',
    heading: 'Private drivers in Kandy',
    intro:
      'Kandy, the last royal capital, sits in the hills at the centre of Sri Lanka. It is a natural stop between the Cultural Triangle and the tea country, and a local driver makes it easy to see the city, the botanical gardens and the countryside around it in a day.',
    about: {
      heading: 'Why hire a driver in Kandy?',
      paragraphs: [
        'Kandy’s main sights are spread out on hills around the lake, and the roads into the city get congested. A driver handles the traffic and parking while you visit the Temple of the Tooth, the gardens at Peradeniya, a tea factory or a viewpoint.',
        'Kandy is also a crossroads. Sigiriya and Dambulla are to the north, Nuwara Eliya and Ella to the south, and the airport a few hours west. Most round-island tours pass through, so a driver who knows the region helps you plan the route in the right order.',
      ],
      highlights: [
        '**Temple of the Sacred Tooth Relic**: the most important Buddhist shrine in the country, in a UNESCO-listed city.',
        '**Kandy Lake**: an easy walk around the water in the centre of town.',
        '**Royal Botanic Gardens, Peradeniya**: giant trees, orchids and a famous avenue of palms.',
        '**Tea factory visits**: see how tea is made and taste it, on the way into the hills.',
        '**Pinnawala**: elephants bathing in the river, about an hour from Kandy.',
        '**Kandyan dance show**: drummers and dancers in the evening near the lake.',
      ],
      bestTime:
        'January to April is usually the driest time. In July or August the Esala Perahera festival fills the city with processions for ten nights: spectacular, but book early. Kandy is cooler than the coast all year.',
    },
    routes: [
      { to: 'Colombo Airport (BIA)', km: 100, time: '2.5–3 h', note: 'via Kegalle or Kurunegala' },
      { to: 'Colombo city', km: 115, time: '3–3.5 h', note: 'main road through Kegalle' },
      { to: 'Pinnawala', km: 40, time: '1–1.5 h', note: 'towards Colombo' },
      { to: 'Dambulla', km: 72, time: '2 h', note: 'via Matale' },
      { to: 'Sigiriya', km: 90, time: '2.5–3 h', note: 'via Matale and Dambulla' },
      { to: 'Nuwara Eliya', km: 75, time: '2.5–3 h', note: 'hill road past Ramboda Falls' },
      { to: 'Ella', km: 140, time: '4.5–5 h', note: 'through Nuwara Eliya' },
      { to: 'Galle', km: 230, time: '4–5 h', note: 'via Colombo expressways' },
    ],
    faqs: [
      {
        q: 'Should I take the train or a driver from Kandy to Ella?',
        a: 'The train is one of the most scenic rides in the world but takes 6 to 7 hours and seats sell out. Many travellers take the train and have their driver carry the luggage and meet them at Ella station, so they get both.',
      },
      {
        q: 'How long is the drive from Colombo airport to Kandy?',
        a: 'About 100 km, usually 2.5 to 3 hours depending on traffic.',
      },
      {
        q: 'Can a Kandy driver take me to Sigiriya and back in a day?',
        a: 'Yes, it is about 2.5 to 3 hours each way, so it is a long but common day trip. Many travellers stay a night near Sigiriya instead and continue the tour from there.',
      },
      {
        q: 'How do I book a driver in Kandy?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  ella: {
    slug: 'ella',
    name: 'Ella',
    nearby: ['bandarawela', 'badulla', 'monaragala'],
    seoTitle: 'Private Drivers in Ella | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Ella for the Nine Arch Bridge, Yala safaris, transfers to the coast and hill-country tours. Compare fixed quotes. No booking fee.',
    heading: 'Private drivers in Ella',
    intro:
      'Ella is a small hill town surrounded by tea estates, waterfalls and some of the best short hikes in Sri Lanka. Most travellers arrive by the famous train and leave by road, and a driver is the easiest way on to Yala, the south coast or the east.',
    about: {
      heading: 'Why hire a driver in Ella?',
      paragraphs: [
        'Inside Ella you can walk to most places, but the onward journeys are long and the roads through the hills are steep and winding. A careful local driver gets you safely to a safari in Yala or Udawalawe, the beaches of the south coast or Arugam Bay.',
        'Many travellers combine train and car: they ride the train into Ella for the views while the driver brings the luggage, then continue the tour by road. A driver can also take you to viewpoints and waterfalls around Ella that are hard to reach on foot.',
      ],
      highlights: [
        '**Nine Arch Bridge**: the colonial railway viaduct in the jungle, best when a train crosses.',
        '**Little Adam’s Peak**: an easy hike with wide views over the valley.',
        '**Ella Rock**: a longer, steeper climb for big views at sunrise.',
        '**Ravana Falls**: a tall waterfall right beside the road below Ella.',
        '**Lipton’s Seat, Haputale**: the tea baron’s lookout over the hills, best early morning.',
        '**Tea estates**: walks and factory visits among the plantations around town.',
      ],
      bestTime:
        'January to April is usually the driest time in Ella. It can rain in any month in the hills, and mornings tend to be clearer than afternoons, so start hikes and viewpoints early.',
    },
    routes: [
      { to: 'Nuwara Eliya', km: 55, time: '2–2.5 h', note: 'hill road via Bandarawela' },
      { to: 'Yala (Tissamaharama)', km: 100, time: '2.5–3 h', note: 'down through Wellawaya' },
      { to: 'Udawalawe', km: 110, time: '2.5–3 h', note: 'via Wellawaya' },
      { to: 'Arugam Bay', km: 130, time: '3–3.5 h', note: 'via Wellawaya and Monaragala' },
      { to: 'Kandy', km: 140, time: '4.5–5 h', note: 'through Nuwara Eliya' },
      { to: 'Mirissa', km: 170, time: '3.5–4 h', note: 'via Wellawaya and the Southern Expressway' },
      { to: 'Galle', km: 200, time: '4–4.5 h', note: 'via Wellawaya and the Southern Expressway' },
      { to: 'Colombo Airport (BIA)', km: 230, time: '5.5–6.5 h', note: 'via the Southern Expressway' },
    ],
    faqs: [
      {
        q: 'Can my driver take my luggage while I take the train to Ella?',
        a: 'Yes, this is very common. You ride the train for the views, the driver drives your luggage round and meets you at Ella station or your hotel. Agree it with your driver when you book.',
      },
      {
        q: 'How far is Ella from Yala?',
        a: 'About 100 km, usually 2.5 to 3 hours down to Tissamaharama. Many travellers leave Ella in the morning and do an afternoon safari in Yala the same day.',
      },
      {
        q: 'Are the roads around Ella safe?',
        a: 'They are steep and winding, with sharp bends and buses, so experience matters. Choose a driver with good reviews and avoid driving after dark where possible.',
      },
      {
        q: 'How do I book a driver from Ella?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  sigiriya: {
    slug: 'sigiriya',
    name: 'Sigiriya',
    nearby: ['dambulla', 'habarana', 'polonnaruwa', 'anuradhapura'],
    seoTitle: 'Private Drivers in Sigiriya | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Sigiriya for the rock fortress, Dambulla, Polonnaruwa and elephant safaris. Compare fixed quotes from local drivers. No booking fee.',
    heading: 'Private drivers in Sigiriya',
    intro:
      'Sigiriya is the heart of Sri Lanka’s Cultural Triangle. The famous rock fortress, the Dambulla cave temples, the ancient city of Polonnaruwa and the elephant parks are all within about an hour, and a local driver can fit several of them into each day.',
    about: {
      heading: 'Why hire a driver in Sigiriya?',
      paragraphs: [
        'The Cultural Triangle is spread out and public transport between the sites is slow, so a driver saves hours. They know when to arrive to avoid the heat and the crowds, and where the safari jeeps leave from.',
        'Most travellers stay two or three nights around Sigiriya, Dambulla or Habarana and visit a different site each day, then continue to Kandy, Trincomalee or back towards the airport with the same driver.',
      ],
      highlights: [
        '**Sigiriya Rock Fortress**: a UNESCO site with frescoes and a palace on top of the rock; climb early.',
        '**Pidurangala Rock**: the neighbouring rock, with the best view of Sigiriya itself at sunrise.',
        '**Dambulla Cave Temple**: five painted caves full of Buddha statues, about 20 km away.',
        '**Polonnaruwa**: the medieval capital, best explored by bicycle or with your driver.',
        '**Minneriya and Kaudulla**: jeep safaris to see large herds of elephants.',
        '**Village tours**: an ox-cart ride, a lake canoe and a home-cooked lunch.',
      ],
      bestTime:
        'This dry zone is mostly hot and dry from May to September, when the elephant gatherings at Minneriya are usually biggest. The north-east monsoon brings rain from about October to January. Climb the rocks early in the morning in any season.',
    },
    routes: [
      { to: 'Dambulla', km: 20, time: '30 min', note: 'main road' },
      { to: 'Habarana', km: 15, time: '20–30 min', note: 'main road' },
      { to: 'Polonnaruwa', km: 60, time: '1.5 h', note: 'via Habarana' },
      { to: 'Anuradhapura', km: 75, time: '1.5–2 h', note: 'via Dambulla' },
      { to: 'Kandy', km: 90, time: '2.5–3 h', note: 'via Dambulla and Matale' },
      { to: 'Trincomalee', km: 105, time: '2.5–3 h', note: 'via Habarana' },
      { to: 'Colombo Airport (BIA)', km: 150, time: '3.5–4 h', note: 'via Kurunegala' },
      { to: 'Colombo city', km: 170, time: '4–4.5 h', note: 'via Kurunegala' },
    ],
    faqs: [
      {
        q: 'How long does it take to climb Sigiriya?',
        a: 'Allow 2 to 3 hours for the climb, the frescoes and the summit. Start early, around 7am, to avoid the heat and the queues on the stairs.',
      },
      {
        q: 'Sigiriya or Pidurangala?',
        a: 'Many travellers do both: Sigiriya for the history and frescoes, and Pidurangala at sunrise or sunset for the view of Sigiriya rock. Your driver can drop you at both on the same day.',
      },
      {
        q: 'Can my driver arrange an elephant safari?',
        a: 'Drivers take you to the park entrance at Minneriya, Kaudulla or Eco Park, where you switch to a safari jeep. Ask which park is best for the month you travel.',
      },
      {
        q: 'How do I book a driver in Sigiriya?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  'nuwara-eliya': {
    slug: 'nuwara-eliya',
    name: 'Nuwara Eliya',
    nearby: ['hatton', 'bandarawela'],
    seoTitle: 'Private Drivers in Nuwara Eliya | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Nuwara Eliya for Horton Plains, tea estates and transfers to Kandy or Ella. Compare fixed quotes from local drivers. No booking fee.',
    heading: 'Private drivers in Nuwara Eliya',
    intro:
      'Nuwara Eliya sits high in the hills, surrounded by tea estates, waterfalls and cool green valleys. It is the base for Horton Plains and World’s End, and a stop on the scenic road between Kandy and Ella.',
    about: {
      heading: 'Why hire a driver in Nuwara Eliya?',
      paragraphs: [
        'The roads up to Nuwara Eliya are some of the most beautiful in the country, but they are narrow, steep and full of bends. An experienced hill-country driver makes the journey safe and relaxed, and stops at tea factories, waterfalls and viewpoints on the way.',
        'Horton Plains is best visited very early, because the view from World’s End often disappears in the clouds by mid-morning. Having your own driver means you can leave before dawn instead of relying on a taxi at 5am.',
      ],
      highlights: [
        '**Horton Plains and World’s End**: a 9 km loop walk to a cliff edge and Baker’s Falls; go early.',
        '**Tea estates and factories**: tours and tastings at the plantations around town.',
        '**Gregory Lake**: boat rides and walks on the edge of town.',
        '**Hakgala Botanical Garden**: flowers and ferns on the road towards Ella.',
        '**Ramboda Falls**: a tall waterfall on the road up from Kandy.',
        '**Colonial town centre**: old hotels, the post office and the racecourse.',
      ],
      bestTime:
        'January to April is usually the driest and clearest time. April is local holiday season, when the town gets busy. Nuwara Eliya is around 1,900 m high: days are mild and nights cold, so bring a warm layer.',
    },
    routes: [
      { to: 'Horton Plains', km: 32, time: '1 h', note: 'via Pattipola' },
      { to: 'Ella', km: 55, time: '2–2.5 h', note: 'via Bandarawela' },
      { to: 'Hatton (Adam’s Peak)', km: 70, time: '2–2.5 h', note: 'through tea country' },
      { to: 'Kandy', km: 75, time: '2.5–3 h', note: 'past Ramboda Falls' },
      { to: 'Yala (Tissamaharama)', km: 165, time: '4–4.5 h', note: 'via Ella and Wellawaya' },
      { to: 'Colombo city', km: 165, time: '4.5–5 h', note: 'via Hatton or Kandy' },
      { to: 'Colombo Airport (BIA)', km: 170, time: '4.5–5 h', note: 'via Kandy' },
    ],
    faqs: [
      {
        q: 'What time should I leave for Horton Plains?',
        a: 'Most travellers leave Nuwara Eliya around 5 to 5.30am to start the walk soon after the gates open. The view from World’s End usually clouds over by mid-morning.',
      },
      {
        q: 'Is it cold in Nuwara Eliya?',
        a: 'It is much cooler than the rest of Sri Lanka. Daytime is usually pleasant, but evenings and early mornings can be cold, especially from December to February. Bring a jacket.',
      },
      {
        q: 'Can I take the train and have my driver meet me?',
        a: 'Yes. The nearest station is Nanu Oya, about 15 minutes from town. Many travellers ride a section of the hill-country line while their driver brings the luggage.',
      },
      {
        q: 'How do I book a driver in Nuwara Eliya?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  mirissa: {
    slug: 'mirissa',
    name: 'Mirissa',
    nearby: ['weligama', 'matara', 'galle', 'unawatuna', 'tangalle'],
    seoTitle: 'Private Drivers in Mirissa | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Mirissa for whale watching, south coast beaches, Yala safaris and airport transfers. Compare fixed quotes. No booking fee.',
    heading: 'Private drivers in Mirissa',
    intro:
      'Mirissa is a palm-fringed bay on the south coast, best known for whale watching and sunset beaches. It is a relaxed base for day trips along the coast and safaris inland, and about two and a half hours from the airport by expressway.',
    about: {
      heading: 'Why hire a driver in Mirissa?',
      paragraphs: [
        'Mirissa itself is small and walkable, but the beaches, surf spots and towns along the south coast are spread out. A driver makes day trips easy: Galle Fort, the surf at Weligama, quiet beaches near Tangalle, or an early start for a safari.',
        'Many travellers end their tour on the coast after the hill country, so a driver from Ella or Yala often drops them in Mirissa, and another collects them for the airport a few days later.',
      ],
      highlights: [
        '**Whale watching**: morning boat trips to see blue and sperm whales, in season.',
        '**Coconut Tree Hill**: the famous palm-covered headland, best at sunset.',
        '**Parrot Rock and Secret Beach**: small viewpoints and coves close to the bay.',
        '**Weligama**: a wide bay with gentle waves for learning to surf.',
        '**Galle Fort**: about an hour west for an afternoon in the old Dutch town.',
        '**Udawalawe or Yala**: elephant or leopard safaris as a long day trip.',
      ],
      bestTime:
        'November to April is the season on the south coast: calm seas, sunny days and the best whale watching. From May to October the south-west monsoon makes the sea rough, and whale trips move to the east coast.',
    },
    routes: [
      { to: 'Weligama', km: 7, time: '15 min', note: 'coast road' },
      { to: 'Galle', km: 35, time: '45 min–1 h', note: 'coast road' },
      { to: 'Tangalle', km: 40, time: '1 h', note: 'coast road' },
      { to: 'Udawalawe', km: 110, time: '2–2.5 h', note: 'via the Southern Expressway' },
      { to: 'Yala (Tissamaharama)', km: 115, time: '2–2.5 h', note: 'via the Southern Expressway' },
      { to: 'Colombo city', km: 150, time: '2–2.5 h', note: 'via the Southern Expressway' },
      { to: 'Ella', km: 170, time: '3.5–4 h', note: 'via the Southern Expressway and Wellawaya' },
      { to: 'Colombo Airport (BIA)', km: 185, time: '2.5–3 h', note: 'via the Southern Expressway' },
    ],
    faqs: [
      {
        q: 'When is the whale watching season in Mirissa?',
        a: 'Roughly November to April, when the sea is calm. Boats usually leave around 6 to 7am and return around midday.',
      },
      {
        q: 'How long is the drive from Colombo airport to Mirissa?',
        a: 'About 185 km. With the Southern Expressway it usually takes 2.5 to 3 hours.',
      },
      {
        q: 'Do I need a driver if I stay in Mirissa?',
        a: 'Not for the beach itself, which is easy to walk. A driver is worth it for airport transfers and day trips along the coast or to the national parks.',
      },
      {
        q: 'How do I book a driver in Mirissa?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  bentota: {
    slug: 'bentota',
    name: 'Bentota',
    areaName: 'Bentota and Hikkaduwa',
    towns: ['bentota', 'hikkaduwa'],
    aliasSlugs: ['hikkaduwa'],
    nearby: ['beruwala', 'ambalangoda', 'kalutara', 'galle'],
    seoTitle: 'Drivers in Bentota & Hikkaduwa | Car with Driver LK',
    metaDescription:
      'Hire a private driver in Bentota or Hikkaduwa for airport transfers, river safaris, beach day trips and island tours. Compare fixed quotes. No booking fee.',
    heading: 'Private drivers in Bentota and Hikkaduwa',
    intro:
      'Bentota and Hikkaduwa are the closest big beach towns to Colombo airport on the south-west coast, about 40 km apart. Bentota is calm, with river trips and gardens; Hikkaduwa is livelier, with a coral reef, turtles and surf. A local driver connects both with the airport and the rest of the island.',
    about: {
      heading: 'Why hire a driver in Bentota or Hikkaduwa?',
      paragraphs: [
        'Both towns are popular for the first or last few days of a trip, and an airport transfer with a pre-booked driver is the easiest way in and out. From either town a driver can show you the coast in a day: river safaris, turtle hatcheries, Galle Fort and quiet beaches.',
        'They are also good starting points for a tour south and east along the coast to Mirissa and Yala, or inland to the hill country, with the same driver throughout.',
      ],
      highlights: [
        '**Madu River boat safari**: mangroves, island temples and a cinnamon farm near Balapitiya.',
        '**Bentota river**: water sports and boat trips where the river meets the sea.',
        '**Brief Garden and Lunuganga**: the gardens of the Bawa brothers, Sri Lanka’s famous architect and his artist brother.',
        '**Kosgoda turtle hatchery**: a conservation project for sea turtles on the coast.',
        '**Hikkaduwa reef and turtles**: snorkelling and sea turtles close to the beach.',
        '**Galle Fort**: under an hour from Hikkaduwa, about an hour and a half from Bentota.',
      ],
      bestTime:
        'The south-west coast is at its best from about November or December to April: calm sea and mostly dry weather. From May to September the monsoon brings rain and big waves, and swimming can be dangerous.',
    },
    routes: [
      { to: 'Bentota to Hikkaduwa', km: 40, time: '45 min–1 h', note: 'coast road' },
      { to: 'Colombo city', km: 65, time: '1–1.5 h', note: 'from Bentota, via the Southern Expressway' },
      { to: 'Colombo Airport (BIA)', km: 100, time: '1.5–2 h', note: 'from Bentota, via the expressways' },
      { to: 'Galle', km: 60, time: '1–1.5 h', note: 'from Bentota (about 20 km from Hikkaduwa)' },
      { to: 'Mirissa', km: 95, time: '1.5–2 h', note: 'from Bentota, via the Southern Expressway' },
      { to: 'Kandy', km: 180, time: '4 h', note: 'via Colombo' },
      { to: 'Yala (Tissamaharama)', km: 230, time: '4–4.5 h', note: 'via the Southern Expressway' },
      { to: 'Ella', km: 260, time: '5–6 h', note: 'via the Southern Expressway and Wellawaya' },
    ],
    faqs: [
      {
        q: 'Bentota or Hikkaduwa: which is better to stay in?',
        a: 'Bentota suits a quiet, resort-style stay with river trips and gardens. Hikkaduwa is livelier, with cafés, surf and the reef. With a driver you can easily visit one from the other.',
      },
      {
        q: 'How far is Bentota from Colombo airport?',
        a: 'About 100 km, usually 1.5 to 2 hours using the expressways. Hikkaduwa is about 40 minutes further south.',
      },
      {
        q: 'Can a driver take me on a Madu River safari?',
        a: 'Yes. The boat jetties are at Balapitiya, between Bentota and Hikkaduwa. Your driver drops you at the jetty and waits while you go on the boat.',
      },
      {
        q: 'How do I book a driver in Bentota or Hikkaduwa?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
  'arugam-bay': {
    slug: 'arugam-bay',
    name: 'Arugam Bay',
    aliasSlugs: ['arugambay'],
    nearby: ['ampara', 'monaragala', 'batticaloa'],
    seoTitle: 'Private Drivers in Arugam Bay | Car with Driver LK',
    metaDescription:
      'Hire a private driver to or from Arugam Bay: airport transfers, Ella and Yala, surf trips and Kumana safaris. Compare fixed quotes. No booking fee.',
    heading: 'Private drivers in Arugam Bay',
    intro:
      'Arugam Bay is Sri Lanka’s best-known surf town, on the quieter east coast. Its season runs opposite to the south and west, and it is a long way from the airport, so most travellers arrive with a driver from Ella, Yala or the Cultural Triangle.',
    about: {
      heading: 'Why hire a driver for Arugam Bay?',
      paragraphs: [
        'Getting to Arugam Bay by public transport means long bus rides with changes. A driver gets you there directly, often breaking the trip with a night in Ella, and can take you between the surf points that are spread along the coast.',
        'From Arugam Bay a driver can also take you on safaris in Kumana or Lahugala, then continue north to Batticaloa and Trincomalee or back west through the hills.',
      ],
      highlights: [
        '**Main Point**: the famous right-hand surf break in front of town.',
        '**Whiskey Point, Peanut Farm and Okanda**: other surf spots up and down the coast.',
        '**Elephant Rock**: a short hike with sunset views over the bay.',
        '**Kumana National Park**: birds, elephants and sometimes leopards, south of town.',
        '**Lahugala**: wild elephants often seen near the road to Monaragala.',
        '**Muhudu Maha Viharaya**: an ancient temple on the beach at Pottuvil.',
      ],
      bestTime:
        'The east coast season is roughly April or May to October, when the surf is best and the weather dry. From November to March the north-east monsoon brings rain and many places close, while the south and west coasts are in season.',
    },
    routes: [
      { to: 'Ella', km: 130, time: '3–3.5 h', note: 'via Monaragala and Wellawaya' },
      { to: 'Batticaloa', km: 110, time: '2.5 h', note: 'coast road north' },
      { to: 'Nuwara Eliya', km: 175, time: '4.5–5 h', note: 'via Ella' },
      { to: 'Yala (Tissamaharama)', km: 190, time: '4 h', note: 'via Monaragala and Wellawaya' },
      { to: 'Kandy', km: 210, time: '5–6 h', note: 'via Mahiyangana' },
      { to: 'Trincomalee', km: 220, time: '5 h', note: 'via Batticaloa' },
      { to: 'Sigiriya', km: 230, time: '5–5.5 h', note: 'via Ampara and Polonnaruwa' },
      { to: 'Colombo Airport (BIA)', km: 320, time: '7–8 h', note: 'via Ella and the Southern Expressway' },
    ],
    faqs: [
      {
        q: 'How far is Arugam Bay from Colombo airport?',
        a: 'About 320 km, usually 7 to 8 hours. Most travellers split the journey with a night in Ella or the Cultural Triangle rather than doing it in one go.',
      },
      {
        q: 'When is the surf season in Arugam Bay?',
        a: 'Roughly April or May to October. The peak months are usually June to September, when the town is busiest.',
      },
      {
        q: 'Can a driver stay with me while I surf for a few days?',
        a: 'Yes, on a multi-day tour the driver stays nearby and takes you between surf points and on safaris. Their meals and room are usually part of the price, so confirm it when you compare quotes.',
      },
      {
        q: 'How do I book a driver for Arugam Bay?',
        a: 'Send one request with your dates and route. Drivers who are free reply with fixed prices, you compare them and chat before you book. There is no booking fee, and you pay the driver directly.',
      },
    ],
  },
};

const ALIASES = new Map(
  Object.values(CITY_PAGES).flatMap((page) => (page.aliasSlugs || []).map((alias) => [alias, page.slug]))
);

/** The page for a slug: { page, redirectTo } (redirectTo set when the slug is an alias), or null. */
export const getCityPage = (slug) => {
  const key = String(slug || '').toLowerCase();
  if (CITY_PAGES[key]) return { page: CITY_PAGES[key], redirectTo: null };
  const target = ALIASES.get(key);
  return target ? { page: CITY_PAGES[target], redirectTo: target } : null;
};

/** All city pages, for the sitemap and "drivers in other areas" links. */
export const CITY_PAGE_LIST = Object.values(CITY_PAGES);
