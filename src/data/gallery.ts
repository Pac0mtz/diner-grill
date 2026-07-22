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

/** Photos used on the home-page marquee strip. */
export const HOME_GALLERY_PHOTOS: GalleryPhoto[] = [
  { src: "/photos/pancakes.webp", alt: "Stack of buttermilk pancakes with butter and syrup", category: "food" },
  { src: "/photos/burger-shake.webp", alt: "Cheeseburger with a milkshake at the Diner Grill counter", category: "food" },
  { src: "/photos/wings.webp", alt: "Buffalo wings fresh off the grill", category: "food" },
  { src: "/photos/skillet-eggs.webp", alt: "Skillet topped with sunny-side eggs", category: "food" },
  { src: "/photos/waffle.webp", alt: "Belgian waffle with whipped cream and chocolate drizzle", category: "food" },
  { src: "/photos/melt.webp", alt: "Griddled sandwich melt with pickles", category: "food" },
  { src: "/photos/pancakes-coffee.webp", alt: "Pancakes and black coffee", category: "food" },
  { src: "/photos/sandwich.webp", alt: "Ham and egg breakfast sandwich on French bread", category: "food" },
  { src: "/photos/slinger.webp", alt: "The legendary Slinger piled high on the plate", category: "food" },
  { src: "/photos/burrito.webp", alt: "Breakfast burrito fresh off the griddle", category: "food" },
];

/** Full gallery for /gallery. */
export const GALLERY_PHOTOS: GalleryPhoto[] = [
  ...HOME_GALLERY_PHOTOS,
  { src: "/photos/french-toast.webp", alt: "French toast on the plate", category: "food" },
  { src: "/photos/chilaquiles.webp", alt: "Chilaquiles with eggs and crema", category: "food" },
  { src: "/photos/cubano.webp", alt: "Cubano sandwich", category: "food" },
  { src: "/photos/churros.webp", alt: "Churros dusted with sugar", category: "food" },
  { src: "/photos/onion-rings.webp", alt: "Golden onion rings", category: "food" },
  { src: "/photos/alaskan-waffle.webp", alt: "Alaskan waffle with ice cream", category: "food" },
  { src: "/photos/coffee.webp", alt: "Cup of diner coffee", category: "food" },
  { src: "/photos/dg-01.webp", alt: "Powdered sugar pancakes with butter", category: "food" },
  { src: "/photos/dg-04.webp", alt: "Chilaquiles verdes with fried eggs", category: "food" },
  { src: "/photos/dg-05.webp", alt: "Belgian waffle with banana and chocolate", category: "food" },
  { src: "/photos/dg-06.webp", alt: "Buffalo wings with ranch", category: "food" },
  { src: "/photos/dg-07.webp", alt: "Biscuits and gravy with eggs and hash browns", category: "food" },
  { src: "/photos/dg-11.webp", alt: "Chilaquiles with green salsa and egg", category: "food" },
  { src: "/photos/dg-12.webp", alt: "Pressed Cubano sandwich", category: "food" },
  { src: "/photos/dg-15.webp", alt: "Chili over biscuit", category: "food" },
  { src: "/photos/dg-16.webp", alt: "Steak sandwich with onions and a milkshake", category: "food" },
  { src: "/photos/dg-18.webp", alt: "Pancake stack with syrup pitcher", category: "food" },
  { src: "/photos/dg-19.webp", alt: "Close-up of powdered sugar pancakes", category: "food" },
  { src: "/photos/dg-20.webp", alt: "Bacon and egg breakfast sandwich", category: "food" },
  { src: "/photos/dg-21.webp", alt: "Chilaquiles skillet with sunny-side eggs", category: "food" },
  { src: "/photos/dg-22.webp", alt: "Toasted sandwich with pickles and mustard", category: "food" },
  { src: "/photos/dg-23.webp", alt: "Three pancakes with butter and syrup", category: "food" },

  { src: "/photos/patio-3.webp", alt: "Garden patio tables under hanging wisteria", category: "patio" },
  { src: "/photos/patio-5.webp", alt: "Wisteria canopy and a tree through the patio", category: "patio" },
  { src: "/photos/patio-6.webp", alt: "Patio seating along the brick wall", category: "patio" },
  { src: "/photos/patio-4.webp", alt: "Covered patio with flower canopy and mesh chairs", category: "patio" },
  { src: "/photos/patio-8.webp", alt: "Patio tree with Open 24 Hours sign", category: "patio" },
  { src: "/photos/patio-9.webp", alt: "Garden patio under the flower canopy", category: "patio" },
  { src: "/photos/patio-10.webp", alt: "Entrance to the garden patio", category: "patio" },

  { src: "/photos/hero-diner.webp", alt: "Diner Grill exterior on Irving Park Road", category: "diner" },
  { src: "/photos/dg-08.webp", alt: "Diner Grill exterior and patio open sign", category: "diner" },
  { src: "/photos/interior/int-09.webp", alt: "Green vinyl stools lined up along the diner counter aisle", category: "diner" },
  { src: "/photos/interior/int-10.webp", alt: "Breakfast menu board above the bread shelf behind the counter", category: "diner" },
  { src: "/photos/interior/int-11.webp", alt: "Sandwich menu board, foam cups, and coffee carafes behind the counter", category: "diner" },
  { src: "/photos/interior/int-12.webp", alt: "I Ate The Slinger award certificate on the counter with a finished plate", category: "diner" },
  { src: "/photos/interior/int-15.webp", alt: "Night view through the front windows into the lit counter and cook line", category: "diner" },
  { src: "/photos/interior/int-02.webp", alt: "Diner Grill at dusk with warm light and counter seats visible through the window", category: "diner" },
  { src: "/photos/dg-03.webp", alt: "Blackhawks flag over the patio", category: "diner" },
  { src: "/photos/dg-13.webp", alt: "Patio tables with DINER sign on the tree", category: "diner" },
  { src: "/photos/dg-24.webp", alt: "Brick-wall patio seating with umbrellas", category: "diner" },
  { src: "/photos/dg-25.webp", alt: "Empty patio tables along the brick wall", category: "diner" },
  { src: "/photos/dg-02.webp", alt: "Caladium leaves by the patio", category: "diner" },
  { src: "/photos/dg-09.webp", alt: "Flower planter against the brick wall", category: "diner" },
  { src: "/photos/dg-10.webp", alt: "Chicago Blackhawks sign on the patio fence", category: "diner" },
  { src: "/photos/dg-17.webp", alt: "Palm fronds outside the diner", category: "diner" },
];
