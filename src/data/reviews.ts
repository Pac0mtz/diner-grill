export type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  source: "google";
  /** Only set when synced from Google Places (visitor/place photos). */
  image?: string | null;
  imageCredit?: string | null;
};

export type ReviewsSummary = {
  rating: number;
  count: number;
  source: "google";
  mapsUrl: string;
  writeReviewUrl: string;
  syncedAt: string | null;
  live: boolean;
};

export type ReviewsPayload = {
  summary: ReviewsSummary;
  reviews: Review[];
};

/** Public Google listing — used for CTAs and Places API place lookup. */
export const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Diner+Grill+1635+W+Irving+Park+Rd+Chicago+IL";

/**
 * Curated Google reviews (publicly published). No restaurant gallery photos —
 * images only appear when live-synced from Google Places.
 */
export const STATIC_REVIEWS: Review[] = [
  {
    id: "ethan-shenfeld",
    author: "Ethan Shenfeld",
    rating: 5,
    date: "2023-12-16",
    text: "Classic American Diner experience. Food is excellent value. Doesn't get better than this. Service is rapid with little chatter, but efficient. They know how to feed people here. I pay about $15 including tip for my typical meal.",
    source: "google",
  },
  {
    id: "david-cripe",
    author: "David Cripe",
    rating: 5,
    date: "2023-11-24",
    text: "This is a great No-Frills diner! I completed the Slinger challenge and boy was I full! I would absolutely recommend this for anyone looking for affordable, tasty, diner food!",
    source: "google",
  },
  {
    id: "michael-pineda",
    author: "Michael J. Pineda",
    rating: 5,
    date: "2023-11-23",
    text: "One of the BEST establishments in the city. Diner Grill is one of those places that stands out in my brain as the go to morning, afternoon, evening, and late night spot. The food. The staff. The price. Unbeatable. May Diner Grill live as it does in our hearts.",
    source: "google",
  },
  {
    id: "edgar-flores",
    author: "Edgar Alexander Flores",
    rating: 5,
    date: "2023-11-01",
    text: "Best spot for munchies. I love the veggie skillet and burgers. I have been here a couple of times and it never fails, friendly people, cozy and clean place and super tasty food. A gem.",
    source: "google",
  },
  {
    id: "jorge-rodriguez",
    author: "Jorge Rodriguez",
    rating: 5,
    date: "2023-10-10",
    text: "I had a late-night dinner at Grill, and I must say the food was absolutely delicious. It reminded me of Waffle House in Atlanta, especially with the fresh and high-quality Coca-Cola they served. What impressed me the most was that, despite the affordable prices, the food's quality surpassed that of Waffle House.",
    source: "google",
  },
  {
    id: "rachel-reinholm",
    author: "Rachel Reinholm",
    rating: 5,
    date: "2023-09-11",
    text: "Amazing food done right! Love the atmosphere. Definitely will return!",
    source: "google",
  },
  {
    id: "d-rose",
    author: "D Rose",
    rating: 5,
    date: "2023-09-04",
    text: "This venue has a vibe out of a movie. So quaint and small. The veggie burrito is amazing. All the food inside was warm/hot. The outside wrap crisp too. Also heated. Highly recommend!!",
    source: "google",
  },
  {
    id: "caroline-thompson",
    author: "Caroline E. Thompson",
    rating: 5,
    date: "2023-05-18",
    text: "Being from the south, I miss diners. This place hit all the right notes! Cooks and servers were friendly and the prices were great, especially for the large portions. Coffee was super hot but that great drip from a pot. There's only 1 counter and maybe 14 stools and no child seats, obviously, but if your kid can handle it it's fun! They have a small kids' menu, too. I will DEFINITELY be back!",
    source: "google",
  },
  {
    id: "naomi-easley",
    author: "Naomi Easley",
    rating: 5,
    date: "2022-11-07",
    text: "Looking for a place to eat at 2, 3 or 4 AM? Diner Grill should be top of mind! The kitchen is spotless and the cook is masterfully efficient. They offer breakfast and lunch options. I ordered the California burrito and it was delicious and the fries were crispy!",
    source: "google",
  },
  {
    id: "reviewer-b",
    author: "B",
    rating: 5,
    date: "2022-03-08",
    text: "This a new favorite of mine. They have such a wholesome vibe the minute you walk in. They have stools and you watch your food get made in front of you fresh. They serve breakfast anytime and they're open 24/7 which is clutch. I highly recommend the French toast, biscuits and gravy, just everything. I really enjoy coming here and just enjoying the vibe and get lost in my cup of coffee.",
    source: "google",
  },
];

export const STATIC_REVIEWS_SUMMARY: ReviewsSummary = {
  rating: 4.6,
  count: 813,
  source: "google",
  mapsUrl: GOOGLE_MAPS_URL,
  writeReviewUrl: GOOGLE_MAPS_URL,
  syncedAt: null,
  live: false,
};

export const STATIC_REVIEWS_PAYLOAD: ReviewsPayload = {
  summary: STATIC_REVIEWS_SUMMARY,
  reviews: STATIC_REVIEWS,
};
