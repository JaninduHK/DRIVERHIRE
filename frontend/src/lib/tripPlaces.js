// Static reference data for the trip-cost-calculator itinerary builder: real Sri Lankan
// destinations (coordinates for a haversine fallback) and surveyed road distances for the
// legs travellers actually book. This is geographic reference data, not pricing — pricing
// itself always comes from the live vehicle fleet (see tripCostEstimator.js).

export const PLACES = {
  cmb: { name: 'CMB Airport', type: 'airport', lat: 7.181, lng: 79.884, hl: 'Bandaranaike International — most trips start here' },
  colombo: { name: 'Colombo', type: 'city', lat: 6.927, lng: 79.861, hl: 'Colombo Fort, Galle Face Green, Pettah markets' },
  negombo: { name: 'Negombo', type: 'beach', lat: 7.209, lng: 79.838, hl: 'Handy first or last night, 20 minutes from the airport' },
  kalpitiya: { name: 'Kalpitiya', type: 'beach', lat: 8.234, lng: 79.766, hl: 'Kitesurfing lagoon and dolphin boats, May–Oct' },
  kalutara: { name: 'Kalutara', type: 'beach', lat: 6.583, lng: 79.961, hl: 'Closest beach town to Colombo, big Bodhi temple' },
  bentota: { name: 'Bentota', type: 'beach', lat: 6.426, lng: 79.996, hl: 'River safaris and resort beaches, easy first stop' },
  hikkaduwa: { name: 'Hikkaduwa', type: 'beach', lat: 6.141, lng: 80.103, hl: 'Reef snorkelling and turtles right off the beach' },
  galle: { name: 'Galle', type: 'beach', lat: 6.033, lng: 80.217, hl: 'Dutch fort ramparts at sunset' },
  unawatuna: { name: 'Unawatuna', type: 'beach', lat: 6.010, lng: 80.249, hl: 'Calm swimming bay, 15 minutes from Galle' },
  weligama: { name: 'Weligama', type: 'beach', lat: 5.975, lng: 80.429, hl: 'Beginner surf bay and stilt fishermen' },
  mirissa: { name: 'Mirissa', type: 'beach', lat: 5.948, lng: 80.459, hl: 'Whale watching Nov–Apr, easy beach days' },
  matara: { name: 'Matara', type: 'city', lat: 5.949, lng: 80.535, hl: 'Southern rail terminus, expressway exit for the coast' },
  hiriketiya: { name: 'Hiriketiya', type: 'beach', lat: 5.963, lng: 80.717, hl: 'Horseshoe surf bay, quieter than Mirissa' },
  tangalle: { name: 'Tangalle', type: 'beach', lat: 6.024, lng: 80.794, hl: 'Long empty beaches and Rekawa turtle nesting' },
  hambantota: { name: 'Hambantota', type: 'city', lat: 6.124, lng: 81.121, hl: 'Salt pans and the handy southern expressway exit' },
  tissa: { name: 'Tissamaharama', type: 'park', lat: 6.277, lng: 81.288, hl: 'Base town for Yala safaris — early jeep pickups' },
  yala: { name: 'Yala', type: 'park', lat: 6.372, lng: 81.502, hl: 'Leopard safari — jeep is booked separately' },
  arugam: { name: 'Arugam Bay', type: 'beach', lat: 6.840, lng: 81.834, hl: 'Surf season May–Sep, long drive but worth it' },
  batti: { name: 'Batticaloa', type: 'city', lat: 7.717, lng: 81.700, hl: 'Lagoon town on the east coast, good seafood' },
  trinco: { name: 'Trincomalee', type: 'beach', lat: 8.587, lng: 81.215, hl: 'East coast season is May–Sep' },
  nilaveli: { name: 'Nilaveli', type: 'beach', lat: 8.703, lng: 81.192, hl: 'Wide white-sand beach and Pigeon Island snorkelling' },
  habarana: { name: 'Habarana', type: 'park', lat: 8.038, lng: 80.752, hl: 'Elephant safari hub between Minneriya and Kaudulla' },
  sigiriya: { name: 'Sigiriya', type: 'cultural', lat: 7.957, lng: 80.760, hl: 'Lion Rock at sunrise, Pidurangala for the view back' },
  dambulla: { name: 'Dambulla', type: 'cultural', lat: 7.856, lng: 80.651, hl: 'Cave temple complex, easy add-on to Sigiriya' },
  anuradha: { name: 'Anuradhapura', type: 'cultural', lat: 8.311, lng: 80.403, hl: 'Ancient capital — best explored with the driver circling stupas' },
  kandy: { name: 'Kandy', type: 'cultural', lat: 7.291, lng: 80.636, hl: 'Temple of the Tooth, lake walk, cultural dance show' },
  hatton: { name: 'Hatton', type: 'hill', lat: 6.891, lng: 80.596, hl: 'Tea-estate country and the road to Adam’s Peak' },
  adams: { name: 'Adam’s Peak', type: 'hill', lat: 6.809, lng: 80.499, hl: 'Night climb Dec–May; driver waits nearby' },
  nuwara: { name: 'Nuwara Eliya', type: 'hill', lat: 6.970, lng: 80.782, hl: 'Tea estates, cool nights — pack a jumper' },
  haputale: { name: 'Haputale', type: 'hill', lat: 6.767, lng: 80.951, hl: 'Lipton’s Seat sunrise run, best done by car' },
  ella: { name: 'Ella', type: 'hill', lat: 6.875, lng: 81.046, hl: 'Nine Arch Bridge, Little Adam’s Peak, Ravana Falls' },
  deniyaya: { name: 'Deniyaya', type: 'hill', lat: 6.343, lng: 80.556, hl: 'Gateway to Sinharaja rainforest, misty estate roads' },
};

// Surveyed road distances (km) for the legs travellers actually book. Any pair not listed
// falls back to haversine × 1.34 (typical Sri Lankan road-vs-straight-line factor).
export const ROADS = {
  'cmb|negombo': 12, 'cmb|colombo': 35, 'cmb|kandy': 128, 'cmb|sigiriya': 165, 'cmb|dambulla': 145,
  'cmb|anuradha': 160, 'cmb|kalpitiya': 105, 'cmb|bentota': 100,
  'colombo|negombo': 38, 'colombo|kandy': 115, 'colombo|galle': 126, 'colombo|bentota': 65,
  'colombo|kalutara': 43, 'colombo|hikkaduwa': 98, 'colombo|matara': 160, 'colombo|sigiriya': 170,
  'colombo|anuradha': 205, 'colombo|nuwara': 180, 'colombo|ella': 220, 'colombo|trinco': 260,
  'colombo|arugam': 320, 'colombo|hambantota': 195, 'colombo|deniyaya': 165, 'colombo|adams': 135,
  'negombo|sigiriya': 148, 'negombo|dambulla': 130, 'negombo|anuradha': 145, 'negombo|kandy': 105,
  'negombo|kalpitiya': 95,
  'kandy|sigiriya': 90, 'kandy|dambulla': 72, 'kandy|habarana': 98, 'kandy|anuradha': 136,
  'kandy|nuwara': 77, 'kandy|ella': 140, 'kandy|haputale': 130, 'kandy|hatton': 70,
  'kandy|trinco': 182, 'kandy|adams': 95, 'kandy|galle': 230,
  'dambulla|sigiriya': 20, 'dambulla|habarana': 45, 'dambulla|anuradha': 66, 'dambulla|trinco': 145,
  'sigiriya|habarana': 25, 'sigiriya|anuradha': 76, 'sigiriya|trinco': 112, 'sigiriya|nilaveli': 128,
  'habarana|trinco': 90, 'habarana|anuradha': 58, 'habarana|batti': 145,
  'anuradha|trinco': 106, 'anuradha|kalpitiya': 110, 'anuradha|nilaveli': 120,
  'trinco|nilaveli': 17, 'trinco|batti': 135, 'batti|arugam': 118, 'arugam|ella': 130,
  'arugam|yala': 195, 'arugam|tissa': 205,
  'nuwara|ella': 56, 'nuwara|haputale': 55, 'nuwara|hatton': 52, 'nuwara|adams': 78,
  'hatton|adams': 32, 'haputale|ella': 27, 'ella|yala': 120, 'ella|tissa': 110,
  'ella|mirissa': 185, 'ella|galle': 210, 'ella|deniyaya': 135,
  'yala|tissa': 22, 'tissa|hambantota': 45, 'yala|mirissa': 150, 'tissa|mirissa': 128,
  'hambantota|tangalle': 37, 'tangalle|hiriketiya': 18, 'hiriketiya|matara': 30,
  'matara|mirissa': 15, 'mirissa|weligama': 7, 'weligama|unawatuna': 18, 'unawatuna|galle': 6,
  'galle|hikkaduwa': 20, 'hikkaduwa|bentota': 35, 'bentota|kalutara': 22, 'galle|mirissa': 40,
  'galle|deniyaya': 78, 'matara|deniyaya': 55, 'galle|tangalle': 80, 'galle|matara': 45,
  'kalutara|hikkaduwa': 58, 'bentota|galle': 55,
};

export const PLACE_TYPES = [
  { value: 'city', label: 'City' },
  { value: 'airport', label: 'Airport' },
  { value: 'cultural', label: 'Cultural site' },
  { value: 'hill', label: 'Hill country' },
  { value: 'beach', label: 'Beach' },
  { value: 'park', label: 'National park' },
];

export const placeTypeLabel = (type) => PLACE_TYPES.find((t) => t.value === type)?.label || '';

export const roadDistanceKm = (aId, bId) => {
  const hit = ROADS[`${aId}|${bId}`] ?? ROADS[`${bId}|${aId}`];
  if (hit) return hit;
  const a = PLACES[aId];
  const b = PLACES[bId];
  if (!a || !b) return 0;
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.34);
};

export const DEFAULT_ITINERARY = [
  { place: 'cmb', nights: 0 },
  { place: 'sigiriya', nights: 2 },
  { place: 'kandy', nights: 1 },
  { place: 'ella', nights: 2 },
  { place: 'mirissa', nights: 2 },
];

export const ITINERARY_PRESETS = [
  {
    label: 'Classic 7-day',
    stops: [
      { place: 'cmb', nights: 0 },
      { place: 'sigiriya', nights: 2 },
      { place: 'kandy', nights: 1 },
      { place: 'ella', nights: 2 },
      { place: 'mirissa', nights: 2 },
    ],
  },
  {
    label: 'South beaches',
    stops: [
      { place: 'cmb', nights: 0 },
      { place: 'galle', nights: 2 },
      { place: 'unawatuna', nights: 2 },
      { place: 'yala', nights: 1 },
    ],
  },
  {
    label: 'Colombo → Kandy → Ella',
    stops: [
      { place: 'colombo', nights: 1 },
      { place: 'kandy', nights: 2 },
      { place: 'ella', nights: 2 },
    ],
  },
  {
    label: 'Airport → Sigiriya → Trincomalee',
    stops: [
      { place: 'cmb', nights: 0 },
      { place: 'sigiriya', nights: 2 },
      { place: 'trinco', nights: 3 },
    ],
  },
  {
    label: 'Cultural triangle',
    stops: [
      { place: 'cmb', nights: 0 },
      { place: 'anuradha', nights: 2 },
      { place: 'dambulla', nights: 1 },
      { place: 'sigiriya', nights: 2 },
    ],
  },
  {
    label: 'Safari & south coast',
    stops: [
      { place: 'colombo', nights: 1 },
      { place: 'tissa', nights: 1 },
      { place: 'yala', nights: 2 },
      { place: 'mirissa', nights: 2 },
    ],
  },
  {
    label: 'Tea country loop',
    stops: [
      { place: 'colombo', nights: 1 },
      { place: 'nuwara', nights: 2 },
      { place: 'haputale', nights: 1 },
      { place: 'ella', nights: 2 },
    ],
  },
  {
    label: 'Two-week island',
    stops: [
      { place: 'cmb', nights: 0 },
      { place: 'anuradha', nights: 2 },
      { place: 'sigiriya', nights: 2 },
      { place: 'kandy', nights: 2 },
      { place: 'nuwara', nights: 2 },
      { place: 'ella', nights: 2 },
      { place: 'yala', nights: 1 },
      { place: 'mirissa', nights: 3 },
    ],
  },
];
