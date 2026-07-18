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
  { src: "/photos/pancakes.jpg", alt: "Stack of buttermilk pancakes with butter and syrup", category: "food" },
  { src: "/photos/burger-shake.jpg", alt: "Cheeseburger with a milkshake at the Diner Grill counter", category: "food" },
  { src: "/photos/wings.jpg", alt: "Buffalo wings fresh off the grill", category: "food" },
  { src: "/photos/skillet-eggs.jpg", alt: "Skillet topped with sunny-side eggs", category: "food" },
  { src: "/photos/waffle.jpg", alt: "Belgian waffle with whipped cream and chocolate drizzle", category: "food" },
  { src: "/photos/melt.jpg", alt: "Griddled sandwich melt with pickles", category: "food" },
  { src: "/photos/pancakes-coffee.jpg", alt: "Pancakes and black coffee", category: "food" },
  { src: "/photos/sandwich.jpg", alt: "Ham and egg breakfast sandwich on French bread", category: "food" },
  { src: "/photos/slinger.jpg", alt: "The legendary Slinger piled high on the plate", category: "food" },
  { src: "/photos/burrito.jpg", alt: "Breakfast burrito fresh off the griddle", category: "food" },
];

/** Full gallery for /gallery. */
export const GALLERY_PHOTOS: GalleryPhoto[] = [
  ...HOME_GALLERY_PHOTOS,
  { src: "/photos/french-toast.jpg", alt: "French toast on the plate", category: "food" },
  { src: "/photos/chilaquiles.jpg", alt: "Chilaquiles with eggs and crema", category: "food" },
  { src: "/photos/cubano.jpg", alt: "Cubano sandwich", category: "food" },
  { src: "/photos/churros.jpg", alt: "Churros dusted with sugar", category: "food" },
  { src: "/photos/onion-rings.jpg", alt: "Golden onion rings", category: "food" },
  { src: "/photos/alaskan-waffle.jpg", alt: "Alaskan waffle with ice cream", category: "food" },
  { src: "/photos/coffee.jpg", alt: "Cup of diner coffee", category: "food" },
  { src: "/photos/dg-01.jpg", alt: "Powdered sugar pancakes with butter", category: "food" },
  { src: "/photos/dg-04.jpg", alt: "Chilaquiles verdes with fried eggs", category: "food" },
  { src: "/photos/dg-05.jpg", alt: "Belgian waffle with banana and chocolate", category: "food" },
  { src: "/photos/dg-06.jpg", alt: "Buffalo wings with ranch", category: "food" },
  { src: "/photos/dg-07.jpg", alt: "Biscuits and gravy with eggs and hash browns", category: "food" },
  { src: "/photos/dg-11.jpg", alt: "Chilaquiles with green salsa and egg", category: "food" },
  { src: "/photos/dg-12.jpg", alt: "Pressed Cubano sandwich", category: "food" },
  { src: "/photos/dg-15.jpg", alt: "Chili over biscuit", category: "food" },
  { src: "/photos/dg-16.jpg", alt: "Steak sandwich with onions and a milkshake", category: "food" },
  { src: "/photos/dg-18.jpg", alt: "Pancake stack with syrup pitcher", category: "food" },
  { src: "/photos/dg-19.jpg", alt: "Close-up of powdered sugar pancakes", category: "food" },
  { src: "/photos/dg-20.jpg", alt: "Bacon and egg breakfast sandwich", category: "food" },
  { src: "/photos/dg-21.jpg", alt: "Chilaquiles skillet with sunny-side eggs", category: "food" },
  { src: "/photos/dg-22.jpg", alt: "Toasted sandwich with pickles and mustard", category: "food" },
  { src: "/photos/dg-23.jpg", alt: "Three pancakes with butter and syrup", category: "food" },

  { src: "/photos/patio-3.jpg", alt: "Garden patio tables under hanging wisteria", category: "patio" },
  { src: "/photos/patio-5.jpg", alt: "Wisteria canopy and a tree through the patio", category: "patio" },
  { src: "/photos/patio-6.jpg", alt: "Patio seating along the brick wall", category: "patio" },
  { src: "/photos/patio-4.jpg", alt: "Covered patio with flower canopy and mesh chairs", category: "patio" },
  { src: "/photos/patio-8.jpg", alt: "Patio tree with Open 24 Hours sign", category: "patio" },
  { src: "/photos/patio-9.jpg", alt: "Garden patio under the flower canopy", category: "patio" },
  { src: "/photos/patio-10.jpg", alt: "Entrance to the garden patio", category: "patio" },

  { src: "/photos/hero-diner.jpg", alt: "Diner Grill exterior on Irving Park Road", category: "diner" },
  { src: "/photos/dg-08.jpg", alt: "Diner Grill exterior and patio open sign", category: "diner" },
  { src: "/photos/interior/int-09.jpg", alt: "Green vinyl stools lined up along the diner counter aisle", category: "diner" },
  { src: "/photos/interior/int-10.jpg", alt: "Breakfast menu board above the bread shelf behind the counter", category: "diner" },
  { src: "/photos/interior/int-11.jpg", alt: "Sandwich menu board, foam cups, and coffee carafes behind the counter", category: "diner" },
  { src: "/photos/interior/int-12.jpg", alt: "I Ate The Slinger award certificate on the counter with a finished plate", category: "diner" },
  { src: "/photos/interior/int-15.jpg", alt: "Night view through the front windows into the lit counter and cook line", category: "diner" },
  { src: "/photos/interior/int-02.jpg", alt: "Diner Grill at dusk with warm light and counter seats visible through the window", category: "diner" },
  { src: "/photos/dg-03.jpg", alt: "Blackhawks flag over the patio", category: "diner" },
  { src: "/photos/dg-13.jpg", alt: "Patio tables with DINER sign on the tree", category: "diner" },
  { src: "/photos/dg-24.jpg", alt: "Brick-wall patio seating with umbrellas", category: "diner" },
  { src: "/photos/dg-25.jpg", alt: "Empty patio tables along the brick wall", category: "diner" },
  { src: "/photos/dg-02.jpg", alt: "Caladium leaves by the patio", category: "diner" },
  { src: "/photos/dg-09.jpg", alt: "Flower planter against the brick wall", category: "diner" },
  { src: "/photos/dg-10.jpg", alt: "Chicago Blackhawks sign on the patio fence", category: "diner" },
  { src: "/photos/dg-17.jpg", alt: "Palm fronds outside the diner", category: "diner" },
];
