export type MenuItem = {
  name: string;
  price: string;
  description?: string;
  tag?: "signature" | "popular" | "new";
  image?: string;
};

export type MenuCategory = {
  id: string;
  label: string;
  note?: string;
  items: MenuItem[];
};

// The owner's printed menu (authoritative). Keep in sync with server/seed-data.js.
export const MENU: MenuCategory[] = [
  {
    id: "breakfast",
    label: "Breakfast Favorites",
    note: "Served w/ hashbrowns and toast. Cooked to order.",
    items: [
      { name: "Baked Ham & Eggs", price: "11.35", image: "/photos/breakfast-ham-egg.webp" },
      { name: "Bacon & Eggs", price: "10.75", tag: "popular", image: "/photos/breakfast-bacon-eggs.webp" },
      { name: "Sausage & Eggs", price: "10.75", image: "/photos/breakfast-sausage-egg.webp" },
      { name: "Patties & Eggs", price: "11.20", image: "/photos/patties-eggs.webp" },
      { name: "Pork Chop & Eggs", price: "13.50", image: "/photos/pork-chop-eggs.webp" },
      { name: "2 Fried Eggs", price: "9.25", image: "/photos/breakfast-fried-eggs.webp" },
      { name: "Strip Steak & Eggs", price: "16.50", image: "/photos/steak-eggs.webp" },
      { name: "Corned Beef Hash & Eggs", price: "13.75", image: "/photos/skillet-corned-beef.webp" },
    ],
  },
  {
    id: "breakfast-sandwiches",
    label: "Breakfast Sandwiches",
    note: "On French bread add $1.65.",
    items: [
      { name: "Bacon & Egg", price: "7.10", image: "/photos/breakfast-bacon-egg.webp" },
      { name: "Sausage & Egg", price: "7.10", image: "/photos/breakfast-sausage-egg.webp" },
      { name: "Ham & Egg", price: "8.10", image: "/photos/breakfast-ham-egg.webp" },
      { name: "Ham & Cheese", price: "8.10", image: "/photos/breakfast-ham-cheese.webp" },
      { name: "Fried Eggs", price: "5.55", image: "/photos/breakfast-fried-eggs.webp" },
    ],
  },
  {
    id: "skillets",
    label: "Tasty Skillets",
    note: "Served w/ 2 eggs & toast.",
    items: [
      { name: "Meat Lover's", price: "14.20", description: "Sausage, bacon, ham & cheese", image: "/photos/skillet-meat-lovers.webp" },
      { name: "Hobo", price: "11.75", description: "Onion, green pepper & cheese", image: "/photos/skillet-hobo.webp" },
      { name: "Gypsy", price: "14.20", description: "Onion, pepper, mushroom, ham & cheese", image: "/photos/skillet-gypsy.webp" },
      { name: "Mexican", price: "13.95", description: "Chorizo, onion, green pepper & cheese", image: "/photos/skillet-mexican.webp" },
      { name: "Steak", price: "15.25", description: "Onion, green pepper, mushroom & cheese", image: "/photos/skillet-steak.webp" },
      { name: "Corned Beef", price: "14.25", description: "Onion, green pepper & cheese", image: "/photos/skillet-corned-beef.webp" },
      { name: "California Skillet", price: "14.35", description: "Chicken, broccoli, Swiss cheese & avocado", image: "/photos/skillet-california.webp" },
      { name: "Veggie Skillet", price: "12.90", description: "Onion, tomato, peppers, broccoli, mushroom, spinach & cheese", image: "/photos/skillet-veggie.webp" },
    ],
  },
  {
    id: "omelettes",
    label: "Signature Omelettes",
    note: "Served w/ hashbrowns and toast.",
    items: [
      { name: "Build Your Own Up To 4 Items", price: "14.50", description: "Additional items $2.50", tag: "new", image: "/photos/omelette-byo.webp" },
      { name: "Popeye", price: "12.40", description: "Spinach and feta cheese", image: "/photos/omelette-popeye.webp" },
      { name: "Cheese", price: "10.50", image: "/photos/omelette-cheese.webp" },
      { name: "Ham & Cheese", price: "12.70", image: "/photos/omelette-ham-cheese.webp" },
      { name: "Denver", price: "12.70", description: "Green pepper, onion, ham, cheese", image: "/photos/omelette-denver.webp" },
      { name: "Garbage", price: "12.90", description: "Green pepper, onion, tomato, ham, mushrooms and cheese", image: "/photos/omelette-garbage.webp" },
      { name: "Chorizo", price: "13.25", description: "Chorizo and cheese", image: "/photos/omelette-chorizo.webp" },
      { name: "Chili & Cheese", price: "13.25", image: "/photos/omelette-chili-cheese.webp" },
      { name: "Southern", price: "13.25", description: "Ham, onion, Swiss cheese, topped w/ sausage gravy", image: "/photos/omelette-southern.webp" },
      { name: "Meat Lover's", price: "14.25", description: "Ham, sausage, bacon and cheese", image: "/photos/omelette-meat-lovers.webp" },
      { name: "Veggie", price: "13.25", description: "Onion, tomato, peppers, broccoli, mushroom, spinach & cheese", image: "/photos/omelette-veggie.webp" },
      {
        name: "Slinger",
        price: "16.50",
        description:
          "Hash browns, 2 burger patties, cheese, grilled onion, 2 eggs over easy, topped with our diner's tasty chili!",
        tag: "signature",
        image: "/photos/slinger.webp",
      },
    ],
  },
  {
    id: "chefs-creations",
    label: "Chef's Creations",
    items: [
      { name: "Buffalo Wings (8)", price: "11.00", image: "/photos/wings.webp" },
      { name: "Mozzarella Sticks", price: "8.65", image: "/photos/mozzarella-sticks.webp" },
      { name: "Jalapeno Poppers", price: "8.65", image: "/photos/jalapeno-poppers.webp" },
      { name: "Cuban Sandwich", price: "9.40", tag: "new", image: "/photos/cubano.webp" },
      {
        name: "Biscuits & Gravy",
        price: "9.90",
        description: "With 2 eggs $11.40 · with 2 eggs & sausage or bacon $13.15",
        image: "/photos/biscuits-gravy.webp",
      },
      { name: "Haystack", price: "14.70", image: "/photos/skillet-eggs.webp" },
      {
        name: "Diner Bites",
        price: "15.25",
        description: "Jalapeno poppers, mozzarella sticks, wings & onion rings",
        tag: "popular",
        image: "/photos/diner-bites.webp",
      },
      {
        name: "Chilaquiles",
        price: "11.50",
        description: "With steak $14.50 · with chicken $13.65 · with chorizo $13.25",
        image: "/photos/chilaquiles.webp",
      },
    ],
  },
  {
    id: "pancakes-waffles",
    label: "Pancakes & Waffles",
    items: [
      {
        name: "Pancakes (3)",
        price: "9.25",
        description: "With bacon or sausage $11.25 · with ham $12.25",
        image: "/photos/pancakes-3.webp",
      },
      {
        name: "Short Stack",
        price: "8.25",
        description: "With bacon or sausage $9.50 · with ham $9.50",
        image: "/photos/pancakes-short-stack.webp",
      },
      { name: "Choco Chip Pancakes (3)", price: "10.10", image: "/photos/pancakes-choco-chip.webp" },
      { name: "Choco Chip Short Stack", price: "8.25", tag: "new", image: "/photos/pancakes-choco-short.webp" },
      { name: "Banana & Nutella Pancakes", price: "10.25", image: "/photos/pancakes-banana-nutella.webp" },
      { name: "Banana & Caramel Pancakes", price: "10.25", image: "/photos/pancakes-banana-caramel.webp" },
      { name: "Belgian Waffle", price: "10.75", image: "/photos/waffle-belgian.webp" },
      { name: "Banana & Nutella Waffle", price: "12.00", image: "/photos/waffle-banana-nutella.webp" },
      {
        name: "Alaskan Waffle",
        price: "12.65",
        description: "Comes with 2 scoops of ice cream, vanilla or strawberry",
        image: "/photos/waffle-alaskan.webp",
      },
    ],
  },
  {
    id: "french-toast",
    label: "French Toast",
    items: [
      {
        name: "French Toast",
        price: "10.25",
        description: "With bacon or sausage $11.75 · with ham $12.25",
        image: "/photos/french-toast.webp",
      },
    ],
  },
  {
    id: "sandwiches",
    label: "Sandwiches",
    items: [
      { name: "Beef Burger", price: "5.60", image: "/photos/beef-burger.webp" },
      { name: "Double Burger", price: "7.05", image: "/photos/double-burger.webp" },
      { name: "Cheese Burger", price: "6.40", image: "/photos/cheeseburger.webp" },
      { name: "Cubano", price: "9.40", tag: "new", image: "/photos/cubano.webp" },
      { name: "Double Cheese Burger", price: "7.85", tag: "popular", image: "/photos/double-cheeseburger.webp" },
      { name: "Bacon Cheese Burger", price: "7.75", image: "/photos/bacon-cheeseburger.webp" },
      { name: "Double Bacon Cheese Burger", price: "9.20", image: "/photos/double-bacon-cheeseburger.webp" },
      { name: "Grilled Cheese", price: "6.20", image: "/photos/grilled-cheese.webp" },
      { name: "Grilled Cheese & Bacon", price: "7.75", image: "/photos/grilled-cheese-bacon.webp" },
      { name: "Grilled Cheese & Ham", price: "8.20", tag: "new", image: "/photos/grilled-cheese-ham.webp" },
      { name: "Chicken Sand", price: "9.20", image: "/photos/chicken-sand.webp" },
      { name: "Buffalo Chicken", price: "9.95", tag: "new", image: "/photos/buffalo-chicken.webp" },
      { name: "Ribeye Sand", price: "11.65", image: "/photos/ribeye-sand.webp" },
      { name: "Strip Steak", price: "12.80", tag: "new", image: "/photos/strip-steak-sand.webp" },
      { name: "Pork Chop", price: "11.10", tag: "new", image: "/photos/pork-chop-sand.webp" },
      { name: "BLT Sand", price: "8.10", tag: "new", image: "/photos/blt.webp" },
      { name: "Pulled Pork", price: "8.20", tag: "new", image: "/photos/pulled-pork.webp" },
      { name: "Patty Melt", price: "8.45", tag: "new", image: "/photos/patty-melt.webp" },
      { name: "Catfish Sand", price: "9.45", tag: "new", image: "/photos/catfish-sand.webp" },
    ],
  },
  {
    id: "burritos",
    label: "Diner Burritos",
    items: [
      {
        name: "Breakfast Burrito",
        price: "9.50",
        description: "Sausage, bacon, eggs, hash browns, crema, cheese & avocado",
        tag: "new",
        image: "/photos/burrito-breakfast.webp",
      },
      {
        name: "California Burrito",
        price: "10.75",
        description: "Steak or chicken, pico de gallo, fries, crema & avocado",
        tag: "new",
        image: "/photos/burrito-california.webp",
      },
      {
        name: "Veggie Burrito",
        price: "10.25",
        description: "All veggies, eggs, hash browns, cheese, crema & avocado",
        tag: "new",
        image: "/photos/burrito-veggie.webp",
      },
    ],
  },
  {
    id: "sides",
    label: "Side Orders",
    items: [
      { name: "Soup", price: "4.00", description: "SM $4.00 · LG $4.50", image: "/photos/soup.webp" },
      { name: "Chili", price: "4.25", description: "SM $4.25 · LG $5.50", image: "/photos/chili.webp" },
      { name: "Fries", price: "4.25", image: "/photos/fries.webp" },
      { name: "Hashbrowns", price: "4.25", image: "/photos/hashbrowns.webp" },
      { name: "Onion Rings", price: "4.50", image: "/photos/onion-rings.webp" },
      { name: "Cheese Fries", price: "5.45", image: "/photos/cheese-fries.webp" },
      { name: "Loaded Fries", price: "8.75", image: "/photos/loaded-fries.webp" },
      { name: "BBQ Pulled Pork Fries", price: "5.95", image: "/photos/bbq-fries.webp" },
      { name: "Ham", price: "5.85", image: "/photos/side-ham.webp" },
      { name: "Sausage Links", price: "5.05", image: "/photos/side-sausage.webp" },
      { name: "Bacon", price: "5.05", image: "/photos/side-bacon.webp" },
      { name: "1 Egg", price: "2.25", image: "/photos/breakfast-fried-eggs.webp" },
      { name: "Toast", price: "3.05", image: "/photos/toast.webp" },
      { name: "Sausage Gravy", price: "5.45", image: "/photos/biscuits-gravy.webp" },
      { name: "Corned Beef Hash", price: "5.45", image: "/photos/skillet-corned-beef.webp" },
    ],
  },
  {
    id: "kids",
    label: "Kids Menu",
    items: [
      {
        name: "Mickey Mouse Pancake",
        price: "7.50",
        description: "With bacon or sausage +$2.00",
        tag: "new",
        image: "/photos/mickey-pancake.webp",
      },
      { name: "Cheese Burger w/ Fries", price: "8.25", tag: "new", image: "/photos/cheeseburger.webp" },
      { name: "Grilled Cheese w/ Fries", price: "8.25", tag: "new", image: "/photos/grilled-cheese.webp" },
    ],
  },
  {
    id: "desserts",
    label: "Desserts",
    items: [
      { name: "Dessert of the Day", price: "6.50", tag: "new", image: "/photos/dessert-of-the-day.webp" },
      { name: "Churros", price: "7.30", tag: "new", image: "/photos/churros.webp" },
      { name: "Milkshake", price: "6.25", image: "/photos/milkshake.webp" },
    ],
  },
  {
    id: "drinks",
    label: "Drinks",
    items: [
      { name: "Coffee", price: "2.95", image: "/photos/coffee.webp" },
      {
        name: "Coffee To Go",
        price: "2.95",
        description: "SM $2.95 · LG $3.20",
        image: "/photos/drink-coffee-to-go.webp",
      },
      {
        name: "Soft Drinks",
        price: "3.00",
        description: "SM $3.00 · LG $3.25",
        image: "/photos/soda-coke.webp",
      },
      { name: "Juice", price: "3.45", description: "SM $3.45 · LG $3.75", image: "/photos/drink-juice.webp" },
      { name: "Milk", price: "2.15", description: "SM $2.15 · LG $3.15", image: "/photos/drink-milk.webp" },
      { name: "Choco Milk", price: "3.50", image: "/photos/drink-choco-milk.webp" },
      { name: "Iced Coffee", price: "3.95", image: "/photos/drink-iced-coffee.webp" },
      { name: "Hot Tea", price: "2.75", image: "/photos/drink-hot-tea.webp" },
      { name: "Hot Cocoa", price: "2.15", image: "/photos/drink-hot-cocoa.webp" },
      { name: "Lemonade", price: "3.50", image: "/photos/drink-lemonade.webp" },
    ],
  },
];

export const PRESS = [
  {
    quote: "There are no seats here — just stools. There's barely a menu, either. First-timers should order the famous Slinger.",
    source: "Time Out Chicago",
  },
  {
    quote: "The legendary Slinger sends diners into food comas afterwards. Diner Grill is open 24 hours.",
    source: "Eater Chicago",
  },
  {
    quote: "A small spot in Irving Park where you can eat just two feet from the griddle making your 1 a.m. breakfast.",
    source: "The Infatuation",
  },
];
