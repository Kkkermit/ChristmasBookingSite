// The Christmas set menu. Dish ids double as the checkbox keys in the
// restaurant's booking-form PDF (guest_XX_<course>_<dish id>), so they must not
// be renamed without also updating the PDF mapping in server/pdf.ts.

export type CourseId = 'starter' | 'main' | 'dessert';

/** Value stored when a guest chooses to skip a (skippable) course. */
export const SKIP = 'none';

export interface Dish {
  id: string;
  name: string;
  emoji: string;
  /** A playful one-liner. Deliberately says nothing about ingredients - see the full menu for those. */
  tagline: string;
}

export interface Course {
  id: CourseId;
  title: string;
  singular: string;
  emoji: string;
  skippable: boolean;
  dishes: readonly Dish[];
}

export const RESTAURANT_NAME = 'Smokehouse & Cellar';

export const DEFAULT_MENU_URL =
  'https://www.smokehouseandcellar.com/_files/ugd/b65507_43a763491d6c4e9c860effd5900f5b58.pdf';

export const COURSES: readonly Course[] = [
  {
    id: 'starter',
    title: 'Starters',
    singular: 'starter',
    emoji: '🥣',
    skippable: true,
    dishes: [
      { id: 'butternut_squash_soup', name: 'Butternut Squash Soup', emoji: '🥣', tagline: 'A warm hug in a bowl' },
      { id: 'duck_liver_pork_pate', name: 'Duck Liver & Pork Pâté', emoji: '🥖', tagline: 'Très festive, très fancy' },
      { id: 'shrimp_cocktail', name: 'Shrimp Cocktail', emoji: '🍤', tagline: 'A retro Christmas classic' },
      { id: 'smoked_chicken_wings', name: 'Smoked Chicken Wings', emoji: '🍗', tagline: 'Straight out of the smokehouse' },
    ],
  },
  {
    id: 'main',
    title: 'Mains',
    singular: 'main',
    emoji: '🦃',
    skippable: false,
    dishes: [
      { id: 'turkey_dinner', name: 'Turkey Dinner', emoji: '🦃', tagline: 'The big Christmas classic' },
      { id: 'turkey_skewer', name: 'Turkey Skewer', emoji: '🍢', tagline: 'Turkey with a twist' },
      { id: 'seabass', name: 'Seabass', emoji: '🐟', tagline: 'Fresh from under the sea' },
      { id: 'ultimate_xmas_burger', name: 'Ultimate Xmas Burger', emoji: '🍔', tagline: 'Go big or go home' },
      { id: 'wellington', name: 'Wellington', emoji: '🥧', tagline: 'Wrapped up like a present' },
    ],
  },
  {
    id: 'dessert',
    title: 'Desserts',
    singular: 'dessert',
    emoji: '🍮',
    skippable: true,
    dishes: [
      { id: 'christmas_pudding', name: 'Christmas Pudding', emoji: '🍮', tagline: 'A proper festive tradition' },
      { id: 'chocolate_fudge_cake', name: 'Chocolate Fudge Cake', emoji: '🍫', tagline: "Chocoholics, this one's yours" },
      { id: 'winter_berry_cheesecake', name: 'Winter Berry Cheesecake', emoji: '🫐', tagline: 'Berry merry indeed' },
      { id: 'trillionaires_tart', name: "Trillionaire's Tart", emoji: '💰', tagline: "Richer than a millionaire's" },
    ],
  },
];

export const COURSE_IDS: readonly CourseId[] = COURSES.map((c) => c.id);

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

/** Human readable label for a stored choice, e.g. "Seabass" or "No starter". */
export function choiceLabel(courseId: CourseId, value: string): string {
  if (value === SKIP) return `No ${getCourse(courseId).singular}`;
  return findDish(courseId, value)?.name ?? 'Unknown dish';
}

export function choiceEmoji(courseId: CourseId, value: string): string {
  if (value === SKIP) return '🚫';
  return findDish(courseId, value)?.emoji ?? '❓';
}
