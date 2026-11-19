import { motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import type { BookingDetails, Order, PublicConfig } from '../../shared/types';
import { DETAIL_FIELDS, LIMITS, validateDetails } from '../../shared/validation';
import { ApiError, BOOKING_FORM_PREVIEW_URL, BOOKING_FORM_URL, MENU_URL, api, downloadFile } from '../lib/api';
import { bigCelebration } from '../lib/celebrate';
import { useToast } from './Toasts';

/** A tiny paper booking form that fills in as people order. */
function PaperForm({ orders, rows }: { orders: Order[]; rows: number }) {
  const sorted = [...orders].sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  return (
    <motion.div
      aria-hidden="true"
      initial={{ rotate: -4, y: 10 }}
      whileHover={{ rotate: 0, y: -6, scale: 1.03 }}
      className="mx-auto w-44 rounded-lg bg-[#fdfaf3] p-3 text-night-950 shadow-2xl shadow-black/50"
    >
      <p className="text-center text-[0.5rem] font-black uppercase tracking-wider">Smokehouse &amp; Cellar</p>
      <p className="mb-2 text-center text-[0.45rem] font-bold uppercase text-slate-500">Christmas booking form</p>
      <div className="space-y-[3px]">
        {Array.from({ length: rows }, (_, i) => {
          const order = sorted[i];
          return (
            <div key={i} className="flex h-2.5 items-center gap-1 border-b border-slate-200">
              <span className="w-14 truncate text-[0.4rem] font-semibold">{order?.name ?? ''}</span>
              {Array.from({ length: 3 }, (_, j) => (
                <span key={j} className="flex h-1.5 w-1.5 items-center justify-center border border-slate-300 text-[0.35rem] leading-none">
                  {order ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 * j }} className="text-pine-700">
                      ✓
                    </motion.span>
                  ) : null}
                </span>
              ))}
            </div>
          );
        })}
      </div>
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
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
      {DETAIL_FIELDS.map((field) => (
        <div key={field.key}>
          <label htmlFor={`${idPrefix}-${field.key}`} className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/60">
            {field.label}
          </label>
          <input
            id={`${idPrefix}-${field.key}`}
            type={field.type ?? 'text'}
            className={`field py-2.5 text-sm ${errors[field.key] ? 'field-error' : ''}`}
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
        <button type="submit" className="btn-gold" disabled={busy || !dirty}>
          {busy ? 'Saving…' : dirty ? 'Save details' : 'Saved ✓'}
        </button>
        <p className="text-xs text-white/50">Total guests is filled in automatically.</p>
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
      toast.show(`Booking form ready with ${orders.length} guest${orders.length === 1 ? '' : 's'} 🎄`, 'success');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Could not build the form - please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section id="workshop" aria-labelledby="workshop-title" className="scroll-mt-24">
      <div className="mb-5 text-center">
        <h2 id="workshop-title" className="section-title">
          Santa&apos;s Workshop <span className="inline-block animate-float">🛠️</span>
        </h2>
        <p className="mt-1 text-white/65">Everyone can grab the menu and generate the finished booking form.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="grid gap-5">
          <motion.div whileHover={{ y: -4 }} className="glass p-6">
            <div className="flex items-center gap-4">
              <span className="inline-block animate-sway text-5xl" aria-hidden="true">
                📖
              </span>
              <div>
                <h3 className="font-display text-2xl">The menu</h3>
                <p className="text-sm text-white/65">The full Smokehouse &amp; Cellar Christmas menu, with every dish described.</p>
              </div>
            </div>
            <a href={MENU_URL} target="_blank" rel="noopener" className="btn-ghost mt-4 w-full sm:w-auto">
              ⬇️ Download menu
            </a>
          </motion.div>

          <motion.div
            className={`glass relative overflow-hidden p-6 ${complete ? 'ring-2 ring-gold-400' : ''}`}
            animate={complete ? { boxShadow: ['0 0 0 #fcd34d00', '0 0 60px #fcd34d55', '0 0 0 #fcd34d00'] } : {}}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] lg:grid-cols-1 xl:grid-cols-[auto_1fr]">
              <PaperForm orders={orders} rows={Math.max(config.partySize, Math.min(orders.length, config.maxGuests))} />
              <div>
                <h3 className="font-display text-2xl">Completed booking form</h3>
                <p className="mt-1 text-sm text-white/70">
                  {complete
                    ? 'Everyone has ordered! The restaurant’s form is filled in and ready to send. 🎉'
                    : `Builds the restaurant’s PDF with everyone’s choices ticked. ${missing} still to order - you can generate it any time, it just won’t be complete yet.`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={downloadForm} disabled={downloading} className={complete ? 'btn-gold' : 'btn-primary'}>
                    {!complete && <span className="candy-stripes absolute inset-0 opacity-30" />}
                    <span className="relative whitespace-nowrap">{downloading ? 'Elves writing…' : '🧾 Download booking form'}</span>
                  </button>
                  <a href={BOOKING_FORM_PREVIEW_URL} target="_blank" rel="noopener" className="btn-ghost">
                    👀 Preview
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="glass p-6">
          <h3 className="font-display text-2xl">Booking details ✍️</h3>
          <p className="mb-4 mt-1 text-sm text-white/65">
            The top section of the restaurant’s form. Fill in once - anyone can update it.
          </p>
          <DetailsForm details={details} onSaved={onDetailsSaved} />
        </div>
      </div>
    </section>
  );
}
