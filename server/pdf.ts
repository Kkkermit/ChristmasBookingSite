import {
  PDFCheckBox,
  PDFDocument,
  PDFName,
  PDFTextField,
  StandardFonts,
  type PDFField,
  type PDFFont,
} from 'pdf-lib';
import { COURSES, SKIP } from '../shared/menu.js';
import type { BookingDetails, BookingDetailsKey, Order } from '../shared/types.js';

/** Booking-detail key -> text field name in the restaurant's PDF. */
export const DETAIL_PDF_FIELDS: Record<BookingDetailsKey, string> = {
  bookingName: 'booking_name',
  contactNumber: 'contact_number',
  email: 'email',
  bookingDate: 'booking_date',
  bookingTime: 'booking_time',
  companyName: 'company_name',
  secondaryNumber: 'secondary_number',
  address: 'address',
};

const pad = (n: number) => String(n).padStart(2, '0');

export const guestNameField = (row: number) => `guest_${pad(row)}_name`;
export const guestNotesField = (row: number) => `guest_${pad(row)}_allergies`;
export const dishField = (row: number, course: string, dishId: string) => `guest_${pad(row)}_${course}_${dishId}`;

/** Field names are matched ignoring accents/case ("pâte" in the PDF == "pate" in code). */
export function normaliseFieldName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Alphabetical by name, so the paper form is easy for the restaurant to scan. */
export function sortOrdersForForm(orders: readonly Order[]): Order[] {
  return [...orders].sort(
    (a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }) || a.createdAt.localeCompare(b.createdAt),
  );
}

class FieldIndex {
  private readonly byName = new Map<string, PDFField>();

  constructor(fields: PDFField[]) {
    for (const field of fields) this.byName.set(normaliseFieldName(field.getName()), field);
  }

  text(name: string): PDFTextField {
    const field = this.byName.get(normaliseFieldName(name));
    if (!(field instanceof PDFTextField)) throw new Error(`Booking form is missing text field "${name}"`);
    return field;
  }

  checkBox(name: string): PDFCheckBox {
    const field = this.byName.get(normaliseFieldName(name));
    if (!(field instanceof PDFCheckBox)) throw new Error(`Booking form is missing checkbox "${name}"`);
    return field;
  }
}

/** Replaces any character Helvetica (WinAnsi) can't draw, so filling never throws. */
function sanitise(text: string, font: PDFFont): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text)
    .map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : '?'))
    .join('');
}

function defaultFontSize(field: PDFTextField): number {
  const da = field.acroField.getDefaultAppearance() ?? '';
  const match = /([\d.]+)\s+Tf/.exec(da);
  const size = match ? Number(match[1]) : 0;
  return size > 0 ? size : 8;
}

/** Writes text into a field, shrinking (and if needed wrapping onto two lines) so it fits the box. */
function writeText(field: PDFTextField, rawText: string, font: PDFFont) {
  const text = sanitise(rawText, font);
  field.setText(text);
  if (text) {
    const { width, height } = field.acroField.getWidgets()[0].getRectangle();
    const usable = width - 4;
    const maxSize = defaultFontSize(field);
    const widthAt1 = font.widthOfTextAtSize(text, 1);
    const singleLine = Math.min(maxSize, usable / widthAt1);
    if (singleLine >= 5 || height < 14) {
      field.disableMultiline();
      field.setFontSize(Math.max(3.5, Math.floor(singleLine * 10) / 10));
    } else {
      field.enableMultiline();
      const twoLines = Math.min(maxSize, (height - 2) / 2.3, (usable * 2 * 0.9) / widthAt1);
      field.setFontSize(Math.max(3.5, Math.floor(twoLines * 10) / 10));
    }
  }
  field.updateAppearances(font);
}

function setChecked(box: PDFCheckBox, checked: boolean) {
  const value = checked ? PDFName.of('Yes') : PDFName.of('Off');
  box.acroField.dict.set(PDFName.of('V'), value);
  for (const widget of box.acroField.getWidgets()) widget.dict.set(PDFName.of('AS'), value);
}

export interface FillResult {
  bytes: Uint8Array;
  guestCount: number;
}

/**
 * Fills the restaurant's booking form with everyone's choices.
 * The form stays editable, so last-minute tweaks can still be made in any PDF reader.
 */
export async function fillBookingForm(
  template: Uint8Array,
  orders: readonly Order[],
  details: BookingDetails,
): Promise<FillResult> {
  const doc = await PDFDocument.load(template, { updateMetadata: false });
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fields = new FieldIndex(form.getFields());

  const rows = form.getFields().filter((f) => /^guest_\d+_name$/.test(f.getName())).length;
  const sorted = sortOrdersForForm(orders);
  if (sorted.length > rows) {
    throw new Error(`The booking form only has room for ${rows} guests (got ${sorted.length}).`);
  }

  // Start from a guaranteed-blank form.
  for (const field of form.getFields()) {
    if (field instanceof PDFCheckBox) setChecked(field, false);
  }

  for (const [key, fieldName] of Object.entries(DETAIL_PDF_FIELDS) as [BookingDetailsKey, string][]) {
    writeText(fields.text(fieldName), details[key] ?? '', font);
  }
  writeText(fields.text('total_guests'), sorted.length > 0 ? String(sorted.length) : '', font);

  for (let row = 1; row <= rows; row++) {
    const order = sorted[row - 1];
    writeText(fields.text(guestNameField(row)), order?.name ?? '', font);
    writeText(fields.text(guestNotesField(row)), order?.notes ?? '', font);
    if (!order) continue;
    for (const course of COURSES) {
      const choice = order[course.id];
      if (!choice || choice === SKIP) continue;
      setChecked(fields.checkBox(dishField(row, course.id, choice)), true);
    }
  }

  doc.setTitle('Smokehouse & Cellar Christmas Booking Form 2026');
  doc.setProducer('Christmas Booking Site');
  const bytes = await doc.save({ updateFieldAppearances: false });
  return { bytes, guestCount: sorted.length };
}
