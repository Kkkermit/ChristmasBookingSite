import { COURSES, findDish, isValidChoice, optionField } from './menu.js';
import type { BookingDetails, BookingDetailsKey, OrderInput } from './types.js';

export const LIMITS = {
  name: 30,
  notes: 60,
  detail: 60,
} as const;

/**
 * Characters the booking-form PDF can render with its standard Helvetica font
 * (WinAnsi encoding): printable ASCII, Latin-1 and common "smart" punctuation.
 * Anything else (e.g. emoji) is rejected so the generated PDF never breaks.
 */
const PDF_SAFE = /^[\x20-\x7E -ÿ–—‘’‚“”„•…€™ŒœŠšŸŽž]*$/;

export function isPdfSafe(text: string): boolean {
  return PDF_SAFE.test(text);
}

/** Normalises user text: NFC, no control chars/newlines, single spaces, trimmed. */
export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Case/spacing/accent-insensitive key used to stop the same person ordering twice. */
export function nameKey(name: string): string {
  return cleanText(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

function checkText(
  errors: Record<string, string>,
  field: string,
  value: string,
  label: string,
  max: number,
  required: boolean,
) {
  if (required && !value) {
    errors[field] = `${label} is required`;
  } else if (value.length > max) {
    errors[field] = `${label} must be ${max} characters or fewer`;
  } else if (!isPdfSafe(value)) {
    errors[field] = `${label} can only use plain letters, numbers and punctuation (no emoji)`;
  }
}

export function validateOrderInput(raw: unknown): ValidationResult<OrderInput> {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = cleanText(input.name);
  const notes = cleanText(input.notes);
  checkText(errors, 'name', name, 'Name', LIMITS.name, true);
  checkText(errors, 'notes', notes, 'Allergies / requirements', LIMITS.notes, false);

  const choices: Record<string, string> = {};
  for (const course of COURSES) {
    const value = typeof input[course.id] === 'string' ? (input[course.id] as string) : '';
    if (!value) {
      errors[course.id] = `Please pick a ${course.singular}`;
    } else if (!isValidChoice(course.id, value)) {
      errors[course.id] = `That ${course.singular} isn't on the menu`;
    }
    choices[course.id] = value;

    // Dish options (e.g. gluten-free soup, fudge cake with cream or ice cream)
    // are chosen from a fixed list; anything sent for a dish without options is ignored.
    const field = optionField(course.id);
    const rawOption = typeof input[field] === 'string' ? (input[field] as string) : '';
    const options = findDish(course.id, value)?.options;
    let option = '';
    if (options) {
      option = rawOption || options.defaultChoice || '';
      if (!option) errors[field] = `Please choose ${options.choices.map((c) => c.label.toLowerCase()).join(' or ')}`;
      else if (!options.choices.some((c) => c.id === option)) errors[field] = "That option isn't available";
    }
    choices[field] = option;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      starter: choices.starter,
      starterOption: choices.starterOption,
      main: choices.main,
      mainOption: choices.mainOption,
      dessert: choices.dessert,
      dessertOption: choices.dessertOption,
      notes,
    },
  };
}

export const DETAIL_FIELDS: ReadonlyArray<{
  key: BookingDetailsKey;
  label: string;
  placeholder: string;
  type?: 'text' | 'email' | 'tel';
}> = [
  { key: 'bookingName', label: 'Name (lead booker)', placeholder: 'Who is the booking under?' },
  { key: 'companyName', label: 'Company name', placeholder: 'Optional' },
  { key: 'contactNumber', label: 'Contact no.', placeholder: '07…', type: 'tel' },
  { key: 'secondaryNumber', label: 'Secondary no.', placeholder: 'Optional', type: 'tel' },
  { key: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email' },
  { key: 'address', label: 'Address', placeholder: 'Optional' },
  { key: 'bookingDate', label: 'Date of booking', placeholder: 'e.g. Fri 18 Dec 2026' },
  { key: 'bookingTime', label: 'Time', placeholder: 'e.g. 7:30pm' },
];

export function emptyDetails(): BookingDetails {
  return {
    bookingName: '',
    contactNumber: '',
    email: '',
    bookingDate: '',
    bookingTime: '',
    companyName: '',
    secondaryNumber: '',
    address: '',
  };
}

export function validateDetails(raw: unknown): ValidationResult<BookingDetails> {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const value = emptyDetails();

  for (const field of DETAIL_FIELDS) {
    const text = cleanText(input[field.key]);
    checkText(errors, field.key, text, field.label, LIMITS.detail, false);
    value[field.key] = text;
  }
  if (value.email && !errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    errors.email = 'That email address looks wrong';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
