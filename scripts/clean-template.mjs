#!/usr/bin/env node
// One-off helper that turns the restaurant's booking form into a clean, blank,
// lightweight template for the server to fill in.
//
//   node scripts/clean-template.mjs <input.pdf> [output.pdf]
//
// The supplied PDF had been edited on iOS: the first row was pre-filled
// ("Josh" + three ticks), those ticks had broken appearance streams, and it
// carried ~5MB of Illustrator/iOS baggage (PieceInfo, thumbnail, a C2PA
// manifest and per-field embedded fonts). This script removes all of that
// while keeping every one of the 279 form fields intact.
import fs from 'node:fs';
import {
  PDFArray,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRef,
  PDFStream,
  PDFTextField,
  StandardFonts,
} from 'pdf-lib';

const [input, output = 'server/assets/booking-form-template.pdf'] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node scripts/clean-template.mjs <input.pdf> [output.pdf]');
  process.exit(1);
}

const doc = await PDFDocument.load(fs.readFileSync(input), { updateMetadata: false });
const form = doc.getForm();
const page = doc.getPage(0);

// 1. Strip editor baggage.
for (const key of ['PieceInfo', 'Thumb', 'LastModified']) page.node.delete(PDFName.of(key));
for (const key of ['AF', 'Names', 'Metadata']) doc.catalog.delete(PDFName.of(key));

// 2. Repair checkbox appearances and untick everything.
const checkBoxes = form.getFields().filter((f) => f instanceof PDFCheckBox);
const goodAppearance = new Map(); // column suffix -> a healthy /AP dict
for (const cb of checkBoxes) {
  const widget = cb.acroField.getWidgets()[0];
  const ap = widget.dict.lookup(PDFName.of('AP'), PDFDict);
  const normal = ap.lookup(PDFName.of('N'));
  const column = cb.getName().replace(/^guest_\d+_/, '');
  if (normal instanceof PDFDict && normal.has(PDFName.of('Yes')) && !goodAppearance.has(column)) {
    goodAppearance.set(column, ap);
  }
}
let repaired = 0;
for (const cb of checkBoxes) {
  const widget = cb.acroField.getWidgets()[0];
  const ap = widget.dict.lookup(PDFName.of('AP'), PDFDict);
  if (!(ap.lookup(PDFName.of('N')) instanceof PDFDict)) {
    const column = cb.getName().replace(/^guest_\d+_/, '');
    widget.dict.set(PDFName.of('AP'), goodAppearance.get(column).clone(doc.context));
    repaired++;
  }
  cb.acroField.dict.set(PDFName.of('V'), PDFName.of('Off'));
  widget.dict.set(PDFName.of('AS'), PDFName.of('Off'));
}

// 2b. The original "ticked" look was a ZapfDingbats glyph, which some viewers
// (no Dingbats font) render as the character "3". Replace it with a vector
// tick drawn on the same grey-bordered box, so it looks identical everywhere.
const tickCache = new Map();
const vectorTick = (w, h) => {
  const key = `${w.toFixed(3)}x${h.toFixed(3)}`;
  if (!tickCache.has(key)) {
    const f = (n) => n.toFixed(3);
    const content = [
      'q 1 1 1 rg', `0 0 ${f(w)} ${f(h)} re f`,
      '.4 w .62 .62 .62 RG', `.2 .2 ${f(w - 0.4)} ${f(h - 0.4)} re S Q`,
      'q 0 0 0 RG 1.25 w 1 J 1 j',
      `${f(w * 0.2)} ${f(h * 0.52)} m ${f(w * 0.42)} ${f(h * 0.26)} l ${f(w * 0.82)} ${f(h * 0.78)} l S Q`,
    ].join('\n');
    const stream = doc.context.flateStream(content, {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, w, h],
      Matrix: [1, 0, 0, 1, 0, 0],
    });
    tickCache.set(key, doc.context.register(stream));
  }
  return tickCache.get(key);
};
for (const cb of checkBoxes) {
  const widget = cb.acroField.getWidgets()[0];
  const { width, height } = widget.getRectangle();
  const normal = widget.dict.lookup(PDFName.of('AP'), PDFDict).lookup(PDFName.of('N'), PDFDict);
  const appearance = doc.context.obj({});
  appearance.set(PDFName.of('Yes'), vectorTick(width, height));
  appearance.set(PDFName.of('Off'), normal.get(PDFName.of('Off')));
  widget.dict.set(PDFName.of('AP'), doc.context.obj({ N: appearance }));
}

// 3. Clear every text field and give it a fresh, font-free empty appearance.
const helvetica = await doc.embedFont(StandardFonts.Helvetica);
for (const field of form.getFields()) {
  if (!(field instanceof PDFTextField)) continue;
  field.acroField.dict.delete(PDFName.of('V'));
  field.setText('');
  field.updateAppearances(helvetica);
}
form.acroForm.dict.delete(PDFName.of('NeedAppearances'));

// 4. Garbage-collect everything no longer reachable from the trailer.
const reachable = new Set();
const visit = (obj) => {
  if (obj instanceof PDFRef) {
    const key = obj.toString();
    if (reachable.has(key)) return;
    reachable.add(key);
    visit(doc.context.lookup(obj));
  } else if (obj instanceof PDFDict) {
    for (const [, value] of obj.entries()) visit(value);
  } else if (obj instanceof PDFArray) {
    for (let i = 0; i < obj.size(); i++) visit(obj.get(i));
  } else if (obj instanceof PDFStream) {
    visit(obj.dict);
  }
};
visit(doc.context.trailerInfo.Root);
visit(doc.context.trailerInfo.Info);
let removed = 0;
for (const [ref] of doc.context.enumerateIndirectObjects()) {
  if (!reachable.has(ref.toString())) {
    doc.context.delete(ref);
    removed++;
  }
}

const bytes = await doc.save({ useObjectStreams: true, updateFieldAppearances: false });
fs.writeFileSync(output, bytes);

// Also embed it in the server code, so the Vercel Function never depends on
// bundling a separate file. tests/pdf.test.ts checks the two stay identical.
const embedded = output.replace(/\.pdf$/, '.ts');
fs.writeFileSync(
  embedded,
  '// Generated by scripts/clean-template.mjs from booking-form-template.pdf - do not edit by hand.\n' +
    `export const BOOKING_FORM_TEMPLATE_BASE64 =\n  '${Buffer.from(bytes).toString('base64')}';\n`,
);
console.log(
  `Wrote ${output}: ${form.getFields().length} fields, repaired ${repaired} checkboxes, ` +
    `dropped ${removed} unused objects, ${(bytes.length / 1024).toFixed(0)} KB`,
);
