import { PDFCheckBox, PDFDocument, PDFName, PDFTextField } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  DETAIL_PDF_FIELDS,
  dishField,
  fillBookingForm,
  guestNameField,
  guestNotesField,
  normaliseFieldName,
  sortOrdersForForm,
} from '../server/pdf.js';
import { COURSES, SKIP } from '../shared/menu.js';
import type { BookingDetails, Order } from '../shared/types.js';
import { emptyDetails } from '../shared/validation.js';
import { template } from './helpers.js';

const ROWS = 18;

function order(name: string, starter: string, main: string, dessert: string, notes = '', createdAt = '2026-11-20T10:00:00Z'): Order {
  return { id: name, name, starter, main, dessert, notes, createdAt, updatedAt: createdAt };
}

async function readForm(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const fields = new Map(doc.getForm().getFields().map((f) => [normaliseFieldName(f.getName()), f]));
  const text = (name: string) => (fields.get(normaliseFieldName(name)) as PDFTextField).getText() ?? '';
  const checked = (name: string) => {
    const box = fields.get(normaliseFieldName(name)) as PDFCheckBox;
    const v = box.acroField.dict.get(PDFName.of('V'));
    return v?.toString() === '/Yes';
  };
  const allChecked = () =>
    [...fields.entries()].filter(([, f]) => f instanceof PDFCheckBox && checked(f.getName())).map(([n]) => n);
  return { doc, fields, text, checked, allChecked };
}

describe('booking form template', () => {
  it('has a checkbox for every dish on every guest row, plus name and allergy fields', async () => {
    const { fields } = await readForm(template);
    for (let row = 1; row <= ROWS; row++) {
      expect(fields.get(guestNameField(row))).toBeInstanceOf(PDFTextField);
      expect(fields.get(guestNotesField(row))).toBeInstanceOf(PDFTextField);
      for (const course of COURSES) {
        for (const dish of course.dishes) {
          expect(fields.get(dishField(row, course.id, dish.id)), dishField(row, course.id, dish.id)).toBeInstanceOf(PDFCheckBox);
        }
      }
    }
    expect(fields.get(guestNameField(ROWS + 1))).toBeUndefined();
  });

  it('has every header field', async () => {
    const { fields } = await readForm(template);
    for (const name of [...Object.values(DETAIL_PDF_FIELDS), 'total_guests']) {
      expect(fields.get(name), name).toBeInstanceOf(PDFTextField);
    }
  });

  it('starts completely blank (the sample "Josh" row was cleaned out)', async () => {
    const { fields, text, allChecked } = await readForm(template);
    expect(allChecked()).toEqual([]);
    for (const [name, field] of fields) {
      if (field instanceof PDFTextField) expect(text(name), name).toBe('');
    }
  });
});

describe('fillBookingForm', () => {
  const details: BookingDetails = {
    ...emptyDetails(),
    bookingName: 'William Brocklehurst',
    contactNumber: '07700 900123',
    email: 'william@example.com',
    bookingDate: 'Friday 18 December 2026',
    bookingTime: '7:30pm',
    companyName: 'Cheese Lovers Ltd',
    address: '1 Brie Lane',
  };

  it('ticks exactly the chosen dishes for each guest, alphabetically', async () => {
    const orders = [
      order('Zoë', 'shrimp_cocktail', 'seabass', 'winter_berry_cheesecake', 'Pescatarian', '2026-11-19T09:00:00Z'),
      order('Josh', 'smoked_chicken_wings', 'ultimate_xmas_burger', 'trillionaires_tart'),
      order('amelia', SKIP, 'turkey_dinner', SKIP),
      order('William', 'duck_liver_pork_pate', 'wellington', 'christmas_pudding', 'Extra cheese'),
    ];
    const { bytes, guestCount } = await fillBookingForm(template, orders, details);
    expect(guestCount).toBe(4);
    const { text, checked, allChecked } = await readForm(bytes);

    expect([1, 2, 3, 4].map((r) => text(guestNameField(r)))).toEqual(['amelia', 'Josh', 'William', 'Zoë']);
    expect(text(guestNameField(5))).toBe('');

    // Row 1: amelia skipped starter & dessert
    expect(checked(dishField(1, 'main', 'turkey_dinner'))).toBe(true);
    // Row 3: William - the pâté field has an accented name in the PDF
    expect(checked(dishField(3, 'starter', 'duck_liver_pork_pate'))).toBe(true);
    expect(checked(dishField(3, 'main', 'wellington'))).toBe(true);
    expect(checked(dishField(3, 'dessert', 'christmas_pudding'))).toBe(true);
    expect(text(guestNotesField(3))).toBe('Extra cheese');
    expect(text(guestNotesField(4))).toBe('Pescatarian');

    // 3 + 3 + 1 + 3 ticks in total, nothing else.
    expect(allChecked()).toHaveLength(10);
  });

  it('fills the header section and the total guest count', async () => {
    const orders = [order('A', SKIP, 'seabass', SKIP), order('B', SKIP, 'seabass', SKIP)];
    const { text } = await readForm((await fillBookingForm(template, orders, details)).bytes);
    expect(text('booking_name')).toBe('William Brocklehurst');
    expect(text('contact_number')).toBe('07700 900123');
    expect(text('email')).toBe('william@example.com');
    expect(text('booking_date')).toBe('Friday 18 December 2026');
    expect(text('booking_time')).toBe('7:30pm');
    expect(text('company_name')).toBe('Cheese Lovers Ltd');
    expect(text('address')).toBe('1 Brie Lane');
    expect(text('secondary_number')).toBe('');
    expect(text('total_guests')).toBe('2');
  });

  it('produces a blank form when nobody has ordered', async () => {
    const { text, allChecked } = await readForm((await fillBookingForm(template, [], emptyDetails())).bytes);
    expect(allChecked()).toEqual([]);
    expect(text('total_guests')).toBe('');
  });

  it('fills all 18 rows when the table is full', async () => {
    const orders = Array.from({ length: ROWS }, (_, i) => order(`Guest ${String(i + 1).padStart(2, '0')}`, SKIP, 'seabass', SKIP));
    const { text, allChecked } = await readForm((await fillBookingForm(template, orders, details)).bytes);
    expect(text(guestNameField(ROWS))).toBe('Guest 18');
    expect(allChecked()).toHaveLength(ROWS);
  });

  it('refuses more guests than the form has rows', async () => {
    const orders = Array.from({ length: ROWS + 1 }, (_, i) => order(`Guest ${i}`, SKIP, 'seabass', SKIP));
    await expect(fillBookingForm(template, orders, details)).rejects.toThrow(/room for 18/);
  });

  it('shrinks long text to fit the box and never crashes on unsupported characters', async () => {
    const long = 'Severe nut allergy - no nuts at all please, also coeliac';
    const orders = [order('Name With Emoji 🎄', SKIP, 'seabass', SKIP, long)];
    const { bytes } = await fillBookingForm(template, orders, details);
    const { text, fields } = await readForm(bytes);
    expect(text(guestNameField(1))).toBe('Name With Emoji ?');
    expect(text(guestNotesField(1))).toBe(long);
    const notes = fields.get(guestNotesField(1)) as PDFTextField;
    const size = Number(/([\d.]+)\s+Tf/.exec(notes.acroField.getDefaultAppearance() ?? '')![1]);
    expect(size).toBeLessThan(7);
    expect(size).toBeGreaterThanOrEqual(3.5);
  });

  it('keeps the form editable so last-minute tweaks are possible', async () => {
    const { doc } = await readForm((await fillBookingForm(template, [order('A', SKIP, 'seabass', SKIP)], details)).bytes);
    expect(doc.getForm().getFields().length).toBe(279);
  });
});

describe('sortOrdersForForm', () => {
  it('sorts case-insensitively by name, then by when they ordered', () => {
    const sorted = sortOrdersForForm([
      order('ben', SKIP, 'seabass', SKIP),
      order('Amelia', SKIP, 'seabass', SKIP),
      order('Émile', SKIP, 'seabass', SKIP),
      order('Zed', SKIP, 'seabass', SKIP),
    ]);
    expect(sorted.map((o) => o.name)).toEqual(['Amelia', 'ben', 'Émile', 'Zed']);
  });
});

describe('embedded template', () => {
  it('is byte-for-byte the same as server/assets/booking-form-template.pdf', async () => {
    const { BOOKING_FORM_TEMPLATE_BASE64 } = await import('../server/assets/booking-form-template.js');
    expect(Buffer.from(BOOKING_FORM_TEMPLATE_BASE64, 'base64').equals(Buffer.from(template))).toBe(true);
  });

  it('is what the runtime serves', async () => {
    const { loadTemplate } = await import('../server/runtime.js');
    expect(Buffer.from(await loadTemplate()).equals(Buffer.from(template))).toBe(true);
  });
});
