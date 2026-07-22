export type GalleryCategory = "food" | "patio" | "diner";

export type GalleryPhoto = {
  src: string;
  alt: string;
  category: GalleryCategory;
};

export const GALLERY_CATEGORIES: { id: GalleryCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "patio", label: "Patio" },
  { id: "diner", label: "The diner" },
];

/**
 * Real Diner Grill photos only (no generated menu images).
 * Food category uses on-location food shots from the dg-* set.
 */
export const HOME_GALLERY_PHOTOS: GalleryPhoto[] = [
  { src: "/photos/gallery/dg-01.webp", alt: "Powdered sugar pancakes with butter", category: "food" },
  { src: "/photos/gallery/dg-04.webp", alt: "Chilaquiles verdes with fried eggs", category: "food" },
  { src: "/photos/gallery/dg-05.webp", alt: "Belgian waffle with banana and chocolate", category: "food" },
  { src: "/photos/gallery/dg-06.webp", alt: "Buffalo wings with ranch", category: "food" },
  { src: "/photos/gallery/dg-07.webp", alt: "Biscuits and gravy with eggs and hash browns", category: "food" },
  { src: "/photos/gallery/dg-12.webp", alt: "Pressed Cubano sandwich", category: "food" },
  { src: "/photos/gallery/dg-16.webp", alt: "Steak sandwich with onions and a milkshake", category: "food" },
  { src: "/photos/gallery/dg-18.webp", alt: "Pancake stack with syrup pitcher", category: "food" },
  { src: "/photos/gallery/dg-20.webp", alt: "Bacon and egg breakfast sandwich", category: "food" },
  { src: "/photos/gallery/dg-23.webp", alt: "Three pancakes with butter and syrup", category: "food" },
];

/** Full gallery for /gallery — real photos only. */
export const GALLERY_PHOTOS: GalleryPhoto[] = [
  ...HOME_GALLERY_PHOTOS,
  { src: "/photos/gallery/dg-11.webp", alt: "Chilaquiles with green salsa and egg", category: "food" },
  { src: "/photos/gallery/dg-15.webp", alt: "Chili over biscuit", category: "food" },
  { src: "/photos/gallery/dg-19.webp", alt: "Close-up of powdered sugar pancakes", category: "food" },
  { src: "/photos/gallery/dg-21.webp", alt: "Chilaquiles skillet with sunny-side eggs", category: "food" },
  { src: "/photos/gallery/dg-22.webp", alt: "Toasted sandwich with pickles and mustard", category: "food" },

  { src: "/photos/patio/patio-3.webp", alt: "Garden patio tables under hanging wisteria", category: "patio" },
  { src: "/photos/patio/patio-5.webp", alt: "Wisteria canopy and a tree through the patio", category: "patio" },
  { src: "/photos/patio/patio-6.webp", alt: "Patio seating along the brick wall", category: "patio" },
  { src: "/photos/patio/patio-4.webp", alt: "Covered patio with flower canopy and mesh chairs", category: "patio" },
  { src: "/photos/patio/patio-8.webp", alt: "Patio tree with Open 24 Hours sign", category: "patio" },
  { src: "/photos/patio/patio-9.webp", alt: "Garden patio under the flower canopy", category: "patio" },
  { src: "/photos/patio/patio-10.webp", alt: "Entrance to the garden patio", category: "patio" },

  { src: "/photos/brand/hero-diner.webp", alt: "Diner Grill exterior on Irving Park Road", category: "diner" },
  { src: "/photos/gallery/dg-08.webp", alt: "Diner Grill exterior and patio open sign", category: "diner" },
  { src: "/photos/interior/int-09.webp", alt: "Green vinyl stools lined up along the diner counter aisle", category: "diner" },
  { src: "/photos/interior/int-10.webp", alt: "Breakfast menu board above the bread shelf behind the counter", category: "diner" },
  { src: "/photos/interior/int-11.webp", alt: "Sandwich menu board, foam cups, and coffee carafes behind the counter", category: "diner" },
  { src: "/photos/interior/int-12.webp", alt: "I Ate The Slinger award certificate on the counter with a finished plate", category: "diner" },
  { src: "/photos/interior/int-15.webp", alt: "Night view through the front windows into the lit counter and cook line", category: "diner" },
  { src: "/photos/interior/int-02.webp", alt: "Diner Grill at dusk with warm light and counter seats visible through the window", category: "diner" },
  { src: "/photos/gallery/dg-03.webp", alt: "Blackhawks flag over the patio", category: "diner" },
  { src: "/photos/gallery/dg-13.webp", alt: "Patio tables with DINER sign on the tree", category: "diner" },
  { src: "/photos/gallery/dg-24.webp", alt: "Brick-wall patio seating with umbrellas", category: "diner" },
  { src: "/photos/gallery/dg-25.webp", alt: "Empty patio tables along the brick wall", category: "diner" },
  { src: "/photos/gallery/dg-02.webp", alt: "Caladium leaves by the patio", category: "diner" },
  { src: "/photos/gallery/dg-09.webp", alt: "Flower planter against the brick wall", category: "diner" },
  { src: "/photos/gallery/dg-10.webp", alt: "Chicago Blackhawks sign on the patio fence", category: "diner" },
  { src: "/photos/gallery/dg-17.webp", alt: "Palm fronds outside the diner", category: "diner" },
];
