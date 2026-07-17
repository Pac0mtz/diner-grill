export type MenuItem = {
  name: string;
  price: string;
  description?: string;
  tag?: "signature" | "popular" | "new";
};

export type MenuCategory = {
  id: string;
  label: string;
  note?: string;
  items: MenuItem[];
};

export const MENU: MenuCategory[] = [
  {
    id: "breakfast",
    label: "Breakfast Classics",
    note: "Served all day, every day. Eggs any style — pick your toast: white, wheat, rye, sourdough, raisin or English muffin.",
    items: [
      { name: "2 Fried Eggs", price: "9.25", description: "Two eggs your way with toast" },
      { name: "Bacon & Eggs", price: "10.75", tag: "popular" },
      { name: "Sausage & Eggs", price: "10.75" },
      { name: "Baked Ham & Eggs", price: "11.35" },
      { name: "Patties & Eggs", price: "11.20", description: "Two griddled burger patties" },
      { name: "Pork Chop & Eggs", price: "13.50" },
      { name: "Corned Beef & Eggs", price: "13.75" },
      { name: "Strip Steak & Eggs", price: "16.50", description: "Cooked to order — rare to well" },
    ],
  },
  {
    id: "house",
    label: "House Specialties",
    note: "The plates people cross town for at 2 a.m.",
    items: [
      {
        name: "The Slinger",
        price: "16.50",
        description: "Hash browns, 2 hamburger patties, cheese, grilled onions, over-easy eggs, smothered in homemade chili",
        tag: "signature",
      },
      { name: "Haystack", price: "14.70", description: "Hash browns, 2 sausage patties, biscuits, gravy & 2 eggs your way" },
      { name: "Biscuits & Gravy", price: "9.90", description: "Add 2 eggs +1.50 · eggs & meat +3.25" },
      { name: "Chilaquiles", price: "11.50", description: "With 2 eggs your way — add chorizo 13.25 · chicken 13.65 · steak 14.50" },
    ],
  },
  {
    id: "omelettes",
    label: "Omelettes",
    note: "All omelettes come with hash browns and your choice of toast.",
    items: [
      { name: "Cheese Omelette", price: "10.50" },
      { name: "Denver Omelette", price: "12.70", description: "Ham, onion & green pepper" },
      { name: "Ham & Cheese", price: "12.70" },
      { name: "Popeye Omelette", price: "12.40", description: "Spinach & feta" },
      { name: "Garbage Omelette", price: "12.90", tag: "popular" },
      { name: "Chorizo Omelette", price: "13.25" },
      { name: "Chili & Cheese", price: "13.25" },
      { name: "Southern Omelette", price: "13.25" },
      { name: "Veggie Omelette", price: "13.25" },
      { name: "Meat-Lovers", price: "14.25", description: "Bacon, sausage & ham" },
    ],
  },
  {
    id: "skillets",
    label: "Skillets",
    note: "Served over hash browns, topped with two eggs your way, toast on the side.",
    items: [
      { name: "Hobo Skillet", price: "11.75", description: "Onion, green pepper & cheese" },
      { name: "Veggie Skillet", price: "12.90" },
      { name: "Mexican Skillet", price: "13.95", description: "Chorizo, onion, green pepper & cheese" },
      { name: "Gypsy Skillet", price: "14.20", description: "Ham, onion, green pepper, mushroom & cheese" },
      { name: "Meat Lover's Skillet", price: "14.20", tag: "popular", description: "Sausage, bacon, ham & cheese" },
      { name: "Corned Beef Skillet", price: "14.25" },
      { name: "California Skillet", price: "14.35", description: "Chicken, broccoli, swiss & avocado" },
      { name: "Steak Skillet", price: "15.25", description: "Onion, green pepper, mushroom & cheese" },
    ],
  },
  {
    id: "griddle",
    label: "Off the Griddle",
    note: "Add bacon or sausage +1.50 · ham +2.00 to any stack.",
    items: [
      { name: "Pancakes (3)", price: "9.25" },
      { name: "Short Stack", price: "8.25" },
      { name: "Choco Chip Pancakes", price: "10.10" },
      { name: "Banana Caramel Pancakes", price: "10.25" },
      { name: "Banana Nutella Pancakes", price: "10.25" },
      { name: "French Toast", price: "10.25" },
      { name: "Belgian Waffle", price: "10.75" },
      { name: "Banana Caramel Waffle", price: "12.00" },
      { name: "Banana Nutella Waffle", price: "12.00" },
    ],
  },
  {
    id: "burgers",
    label: "Burgers & Sandwiches",
    note: "Burgers come dressed with mustard, ketchup, pickles, grilled onion, lettuce & tomato.",
    items: [
      { name: "Beef Burger", price: "5.60" },
      { name: "Cheeseburger", price: "6.40" },
      { name: "Double Cheeseburger", price: "7.85", tag: "popular" },
      { name: "Bacon Cheeseburger", price: "7.75" },
      { name: "Double Bacon Cheeseburger", price: "9.20" },
      { name: "Grilled Cheese", price: "6.20", description: "Add bacon 7.75 · cup of soup +1.50" },
      { name: "Chicken Sandwich", price: "9.20", description: "Lettuce, tomato, grilled onion & mayo on a French roll" },
      { name: "Ribeye Sandwich", price: "11.65", description: "Chopped ribeye, onion, green pepper & provolone on a French roll" },
    ],
  },
  {
    id: "bites",
    label: "Late-Night Bites",
    note: "Counter fuel for the after-hours crowd.",
    items: [
      { name: "Mozzarella Sticks (7)", price: "8.65", description: "With homemade marinara" },
      { name: "Jalapeño Poppers", price: "8.65" },
      { name: "Buffalo Wings (8)", price: "11.00", description: "Ranch or blue cheese" },
      { name: "Diner Bites Platter", price: "15.25", description: "Poppers, mozz sticks, wings & onion rings", tag: "popular" },
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
