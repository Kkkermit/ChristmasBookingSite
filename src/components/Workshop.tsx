import { motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { MENU_PDF_FILENAME, MENU_PDF_PATH, PRICE_PER_HEAD, formatPrice } from '../../shared/menu';
import type { BookingDetails, Order, PublicConfig } from '../../shared/types';
import { DETAIL_FIELDS, LIMITS, validateDetails } from '../../shared/validation';
import { ApiError, BOOKING_FORM_PREVIEW_URL, BOOKING_FORM_URL, api, downloadFile } from '../lib/api';
import { bigCelebration } from '../lib/celebrate';
import { AsciiArt, art } from './ascii/AsciiArt';
import { Glyph } from './ascii/Glyph';
import { Spinner } from './icons';
import { SectionHeading } from './SectionHeading';
import { useToast } from './Toasts';

const MENU_ART = {
  lines: art`
 .--------.
 | MENU   |\
 | ~~~~~~ ||
 | ~~~~   ||
 | ~~~~~  ||
 '--------'|
  '--------'
`,
  mask: art`
 wwwwwwwwww
 w rrrr   ww
 w kkkkkk ww
 w kkkk   ww
 w kkkkk  ww
 wwwwwwwwwww
  wwwwwwwwww
`,
};

/** The restaurant's form as ASCII paper that fills in as people order. */
function PaperForm({ orders, rows }: { orders: Order[]; rows: number }) {
  const sorted = [...orders].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  const edge = '+' + '-'.repeat(24) + '+';
  return (
    <motion.div
      aria-hidden="true"
      initial={{ rotate: -3, y: 10 }}
      whileHover={{ rotate: 0, y: -6, scale: 1.03 }}
      className="mx-auto w-fit rounded-[2px] bg-[#f4f1ea] px-2 py-1.5 font-mono text-[9px] leading-[1.25] text-black shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)]"
    >
      <pre className="ascii m-0">{edge}</pre>
      <pre className="ascii m-0">{'|  SMOKEHOUSE & CELLAR   |'}</pre>
      <pre className="ascii m-0 text-holly-700">{'|  xmas booking form     |'}</pre>
      <pre className="ascii m-0">{edge}</pre>
      {Array.from({ length: rows }, (_, i) => {
        const order = sorted[i];
        const name = (order?.name ?? '_'.repeat(9)).slice(0, 12).padEnd(13, ' ');
        return (
          <pre key={i} className="ascii m-0">
            {'| '}
            <span className={order ? 'font-bold' : 'text-black/35'}>{name}</span>
            {[0, 1, 2].map((j) => (
              <span key={j}>
                [
                {order ? (
                  <motion.span className="inline-block text-holly-700" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 * j }}>
                    x
                  </motion.span>
                ) : (
                  ' '
                )}
                ]
              </span>
            ))}
            {' |'}
          </pre>
        );
      })}
      <pre className="ascii m-0">{edge}</pre>
    </motion.div>
  );
}

function DetailsForm({ details, onSaved }: { details: BookingDetails; onSaved(details: BookingDetails): void }) {
  const [values, setValues] = useState(details);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const idPrefix = useId().replace(/:/g, '');

  useEffect(() => setValues(details), [details]);

  const dirty = DETAIL_FIELDS.some((f) => values[f.key] !== details[f.key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = validateDetails(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.saveDetails(result.value);
      setErrors({});
      onSaved(saved.details);
      toast.show('Booking details saved - they’ll go at the top of the form.', 'success');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      toast.show(err instanceof ApiError ? err.message : 'Could not save - please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
      {DETAIL_FIELDS.map((field) => (
        <div key={field.key}>
          <label htmlFor={`${idPrefix}-${field.key}`} className="mb-1 block font-mono text-[0.7rem] font-bold uppercase tracking-wider text-white/60">
            {field.label}
          </label>
          <input
            id={`${idPrefix}-${field.key}`}
            type={field.type ?? 'text'}
            className={`field py-2.5 text-base ${errors[field.key] ? 'field-error' : ''}`}
            placeholder={field.placeholder}
            maxLength={LIMITS.detail}
            value={values[field.key]}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            aria-invalid={Boolean(errors[field.key])}
          />
          {errors[field.key] && (
            <p role="alert" className="mt-1 text-xs font-medium text-holly-400">
              {errors[field.key]}
            </p>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn-frost" disabled={busy || !dirty}>
          {busy ? <Spinner /> : <Glyph name={dirty ? 'save' : 'saved'} className="text-holly-600" />}
          <span className="relative">{busy ? 'Saving…' : dirty ? 'Save details' : 'Saved'}</span>
        </button>
        <p className="text-[0.7rem] text-white/50">Total guests is filled in automatically.</p>
      </div>
    </form>
  );
}

interface WorkshopProps {
  config: PublicConfig;
  orders: Order[];
  details: BookingDetails;
  onDetailsSaved(details: BookingDetails): void;
}

export function Workshop({ config, orders, details, onDetailsSaved }: WorkshopProps) {
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const complete = orders.length >= config.partySize;
  const missing = Math.max(0, config.partySize - orders.length);

  async function downloadForm() {
    setDownloading(true);
    try {
      await downloadFile(BOOKING_FORM_URL, 'Christmas-Booking-Form-2026.pdf');
      if (complete) bigCelebration();
      toast.show(
        orders.length
          ? `Booking form ready with ${orders.length} guest${orders.length === 1 ? '' : 's'}`
          : 'Downloaded a blank booking form - nobody has ordered yet',
        'success',
      );
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Could not build the form - please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section id="workshop" aria-labelledby="workshop-title">
      <SectionHeading
        id="workshop-title"
        glyph="workshop"
        title="Santa’s Workshop"
        subtitle="Everyone can grab the menu and generate the finished booking form."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-8">
        <div className="grid grid-cols-1 content-start gap-6">
          <motion.div whileHover={{ y: -4 }} className="glass card-pad">
            <div className="flex items-center gap-4">
              <AsciiArt lines={MENU_ART.lines} mask={MENU_ART.mask} className="shrink-0 animate-float text-[9px] sm:text-[10px]" />
              <div className="min-w-0">
                <h3 className="font-display text-3xl leading-none">The menu</h3>
                <p className="mt-1 text-xs text-white/65">
                  Christmas at the Smokehouse · {formatPrice(PRICE_PER_HEAD)} per person + 10% service.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <a href={MENU_PDF_PATH} download={MENU_PDF_FILENAME} className="btn-ghost" aria-label="Download menu">
                <Glyph name="download" className="text-holly-500" />
                Download
              </a>
              <a href={MENU_PDF_PATH} target="_blank" rel="noopener" className="btn-ghost" aria-label="View menu">
                <Glyph name="view" className="text-holly-500" />
                View
              </a>
            </div>
          </motion.div>

          <motion.div
            className={`glass card-pad relative overflow-hidden ${complete ? 'ring-2 ring-white' : ''}`}
            animate={complete ? { boxShadow: ['0 0 0 #ffffff00', '0 0 60px #ffffff44', '0 0 0 #ffffff00'] } : {}}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-1">
              <PaperForm orders={orders} rows={Math.max(config.partySize, Math.min(orders.length, config.maxGuests))} />
              <div>
                <h3 className="flex items-center gap-2 font-display text-3xl leading-none">
                  <Glyph name="form" className="text-base text-holly-500" />
                  Completed booking form
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/70">
                  {complete
                    ? 'Everyone has ordered! The restaurant’s form is filled in and ready to send.'
                    : orders.length === 0
                      ? 'Nobody has ordered yet - the form will be blank until the first order comes in.'
                      : `Builds the restaurant’s PDF with everyone’s choices ticked. ${missing} still to order - you can generate it any time, it just won’t be complete yet.`}
                </p>
                <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={downloadForm}
                    disabled={downloading}
                    aria-busy={downloading}
                    className={complete ? 'btn-frost' : 'btn-primary'}
                  >
                    {!complete && <span className="candy-sheen opacity-30" aria-hidden="true" />}
                    <span className="relative inline-flex items-center gap-2">
                      {downloading ? <Spinner /> : <Glyph name="download" />}
                      {downloading ? 'Elves writing…' : 'Download booking form'}
                    </span>
                  </button>
                  <a href={BOOKING_FORM_PREVIEW_URL} target="_blank" rel="noopener" className="btn-ghost" aria-label="Preview booking form">
                    <Glyph name="view" className="text-holly-500" />
                    Preview
                  </a>
                </div>
                <p className="mt-3 flex items-start gap-2 text-[0.7rem] text-white/50">
                  <Glyph name="info" className="mt-px text-white/60" />
                  The menu asks for choices at least 2 weeks before the booking date.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="glass card-pad">
          <h3 className="flex items-center gap-2 font-display text-3xl leading-none">
            <Glyph name="notes" className="text-base text-holly-500" />
            Booking details
          </h3>
          <p className="mb-4 mt-2 text-xs text-white/65">The top section of the restaurant’s form. Fill in once - anyone can update it.</p>
          <DetailsForm details={details} onSaved={onDetailsSaved} />
        </div>
      </div>
    </section>
  );
}
