// "Christmas at the Smokehouse 2026" - transcribed from the restaurant's menu PDF.
// Dish ids double as the checkbox keys in the booking-form PDF
// (guest_XX_<course>_<dish id>), so don't rename them without updating server/pdf.ts.

export type CourseId = 'starter' | 'main' | 'dessert';

/** Value stored when a guest chooses to skip a (skippable) course. */
export const SKIP = 'none';

export type Dietary = 'vegan' | 'gf' | 'gf-option';

export type DishIcon =
  | 'soup'
  | 'pate'
  | 'shrimp'
  | 'wings'
  | 'turkey'
  | 'skewer'
  | 'fish'
  | 'burger'
  | 'wellington'
  | 'pudding'
  | 'fudge-cake'
  | 'cheesecake'
  | 'tart';

export interface DishChoice {
  id: string;
  label: string;
  /** Written into the "allergies / special requirements" column of the booking form. */
  formNote?: string;
}

/** A choice the restaurant offers for this dish (picked from a list, never typed). */
export interface DishOptions {
  question: string;
  choices: readonly DishChoice[];
  /** Pre-selected when the dish is picked; without one the guest must choose. */
  defaultChoice?: string;
}

export interface Dish {
  id: string;
  /** Full name exactly as on the menu. */
  name: string;
  /** Compact name for lists and tallies. */
  shortName: string;
  icon: DishIcon;
  description: string;
  dietary: readonly Dietary[];
  options?: DishOptions;
}

export interface Course {
  id: CourseId;
  title: string;
  singular: string;
  skippable: boolean;
  dishes: readonly Dish[];
}

export const RESTAURANT = {
  name: 'Smokehouse & Cellar',
  location: 'Knutsford',
  phone: '01565 631777',
} as const;
export const RESTAURANT_NAME = RESTAURANT.name;

export const PRICE_PER_HEAD = 39.95;
export const SERVICE_CHARGE_RATE = 0.1;

/** The menu PDF, served as a static file that only logged-in visitors can reach. */
export const MENU_PDF_PATH = '/files/smokehouse-christmas-menu-2026.pdf';
export const MENU_PDF_FILENAME = 'Smokehouse-and-Cellar-Christmas-Menu-2026.pdf';

export const DIETARY_LABEL: Record<Dietary, string> = {
  vegan: 'Vegan',
  gf: 'Gluten free',
  'gf-option': 'Gluten-free option',
};

export const COURSES: readonly Course[] = [
  {
    id: 'starter',
    title: 'Starters',
    singular: 'starter',
    skippable: true,
    dishes: [
      {
        id: 'butternut_squash_soup',
        name: 'Butternut Squash Soup',
        shortName: 'Butternut Squash Soup',
        icon: 'soup',
        description: 'Roasted butternut squash blended with warming cinnamon & maple syrup. Served with toasted ciabatta.',
        dietary: ['vegan', 'gf-option'],
        options: {
          question: 'Gluten free?',
          choices: [
            { id: 'standard', label: 'Standard' },
            { id: 'gluten_free', label: 'Gluten-free option', formNote: 'GF soup' },
          ],
          defaultChoice: 'standard',
        },
      },
      {
        id: 'duck_liver_pork_pate',
        name: 'Duck Liver & Pork Pâté',
        shortName: 'Duck Liver & Pork Pâté',
        icon: 'pate',
        description:
          'Smooth duck liver & pork pâté laced with orange cognac liqueur. Served with homemade onion marmalade & toasted ciabatta.',
        dietary: [],
      },
      {
        id: 'shrimp_cocktail',
        name: 'Smokehouse Shrimp Cocktail',
        shortName: 'Shrimp Cocktail',
        icon: 'shrimp',
        description: 'Shrimp bound in a traditional Marie Rose sauce served in a large tomato & toasted ciabatta.',
        dietary: [],
      },
      {
        id: 'smoked_chicken_wings',
        name: 'Smoked Chicken Wings',
        shortName: 'Smoked Chicken Wings',
        icon: 'wings',
        description: 'XL festive spiced honey roasted wings.',
        dietary: ['gf'],
      },
    ],
  },
  {
    id: 'main',
    title: 'Main Courses',
    singular: 'main',
    skippable: false,
    dishes: [
      {
        id: 'turkey_dinner',
        name: 'Smokehouse Turkey Dinner',
        shortName: 'Turkey Dinner',
        icon: 'turkey',
        description:
          'Roasted turkey breast, roast potatoes, maple roasted carrots & parsnips, sprouts & a bacon wrapped chipolata served with smoked turkey gravy.',
        dietary: [],
      },
      {
        id: 'turkey_skewer',
        name: 'Turkey Skewer',
        shortName: 'Turkey Skewer',
        icon: 'skewer',
        description:
          'Turkey breast, pigs in blankets & stuffing balls served with a bowl of roast potatoes & a jug of smoked turkey gravy.',
        dietary: [],
      },
      {
        id: 'seabass',
        name: 'Seabass',
        shortName: 'Seabass',
        icon: 'fish',
        description:
          'Two grilled seabass fillets served on a bed of crushed potatoes with a white wine, cream & citrus sauce. Garnished with grilled king prawns.',
        dietary: [],
      },
      {
        id: 'ultimate_xmas_burger',
        name: 'Smokehouse Ultimate Xmas Burger',
        shortName: 'Ultimate Xmas Burger',
        icon: 'burger',
        description:
          '6oz beef patty topped with a slice of turkey, crispy maple bacon, melted Brie & cranberry sauce. Topped with a stuffing ball & a pig in blanket.',
        dietary: [],
      },
      {
        id: 'wellington',
        name: 'Beetroot & Butternut Squash Wellington',
        shortName: 'Beetroot Wellington',
        icon: 'wellington',
        description:
          'Chunky beetroot & butternut squash in a sweet & sharp balsamic chutney wrapped in golden baked puff pastry. Served with maple roasted carrots & parsnips & roast potatoes.',
        dietary: ['vegan'],
      },
    ],
  },
  {
    id: 'dessert',
    title: 'Desserts',
    singular: 'dessert',
    skippable: true,
    dishes: [
      {
        id: 'christmas_pudding',
        name: 'Xmas Pudding',
        shortName: 'Xmas Pudding',
        icon: 'pudding',
        description: 'An individual plum pudding served with warm brandy sauce.',
        dietary: [],
      },
      {
        id: 'chocolate_fudge_cake',
        name: 'Ultimate Chocolate Fudge Cake',
        shortName: 'Chocolate Fudge Cake',
        icon: 'fudge-cake',
        description:
          'A four layer chocolate fudge cake studded with chocolate brownies & chocolate chunks. Served warm with a choice of cream or ice cream.',
        dietary: [],
        options: {
          question: 'Served with…',
          choices: [
            { id: 'cream', label: 'Cream', formNote: 'Fudge cake w/ cream' },
            { id: 'ice_cream', label: 'Ice cream', formNote: 'Fudge cake w/ ice cream' },
          ],
        },
      },
      {
        id: 'winter_berry_cheesecake',
        name: 'Winter Berry Cheesecake',
        shortName: 'Winter Berry Cheesecake',
        icon: 'cheesecake',
        description: 'Artisan baked vanilla cheesecake served with winter berries.',
        dietary: [],
      },
      {
        id: 'trillionaires_tart',
        name: 'Trillionaires Tart',
        shortName: 'Trillionaires Tart',
        icon: 'tart',
        description:
          'A vegan chocolate pastry tart layered with rich toffee sauce & chocolate style ganache. Served with vegan vanilla ice cream.',
        dietary: ['vegan', 'gf'],
      },
    ],
  },
];

export const COURSE_IDS: readonly CourseId[] = COURSES.map((c) => c.id);

export type OptionField = `${CourseId}Option`;
export const optionField = (courseId: CourseId): OptionField => `${courseId}Option`;

export function getCourse(courseId: CourseId): Course {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) throw new Error(`Unknown course: ${courseId}`);
  return course;
}

export function findDish(courseId: CourseId, dishId: string): Dish | undefined {
  return getCourse(courseId).dishes.find((d) => d.id === dishId);
}

export function isValidChoice(courseId: CourseId, value: string): boolean {
  const course = getCourse(courseId);
  if (value === SKIP) return course.skippable;
  return course.dishes.some((d) => d.id === value);
}

/** Compact label for a stored choice, e.g. "Seabass" or "No starter". */
export function choiceLabel(courseId: CourseId, value: string): string {
  if (value === SKIP) return `No ${getCourse(courseId).singular}`;
  return findDish(courseId, value)?.shortName ?? 'Unknown dish';
}

/** Label of the chosen dish option, e.g. "Ice cream" - empty when there isn't one. */
export function optionLabel(courseId: CourseId, dishId: string, optionId: string): string {
  return findDish(courseId, dishId)?.options?.choices.find((c) => c.id === optionId)?.label ?? '';
}

interface OrderChoices {
  starter: string;
  starterOption?: string;
  main: string;
  mainOption?: string;
  dessert: string;
  dessertOption?: string;
  notes: string;
}

/** Text for the booking form's "allergies / special requirements" column. */
export function requirementsText(order: OrderChoices): string {
  const notes: string[] = [];
  for (const course of COURSES) {
    const dish = findDish(course.id, order[course.id]);
    const optionId = order[optionField(course.id)] ?? '';
    const note = dish?.options?.choices.find((c) => c.id === optionId)?.formNote;
    if (note) notes.push(note);
  }
  if (order.notes) notes.push(order.notes);
  return notes.join('; ');
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

/** Estimated food bill for n guests: set price plus the 10% service charge (drinks extra). */
export function estimatedBill(guests: number) {
  const food = Math.round(guests * PRICE_PER_HEAD * 100) / 100;
  const service = Math.round(food * SERVICE_CHARGE_RATE * 100) / 100;
  return { food, service, total: Math.round((food + service) * 100) / 100 };
}
