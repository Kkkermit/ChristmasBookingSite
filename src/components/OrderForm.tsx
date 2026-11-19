import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { COURSES, SKIP, choiceEmoji, choiceLabel, type Course, type CourseId } from '../../shared/menu';
import type { Order, OrderInput, PublicConfig } from '../../shared/types';
import { LIMITS, nameKey, validateOrderInput } from '../../shared/validation';
import { ApiError, api } from '../lib/api';
import { useToast } from './Toasts';

const EMPTY: OrderInput = { name: '', starter: '', main: '', dessert: '', notes: '' };

function DishOption({
  name,
  value,
  emoji,
  title,
  tagline,
  checked,
  onSelect,
  muted,
}: {
  name: string;
  value: string;
  emoji: string;
  title: string;
  tagline: string;
  checked: boolean;
  onSelect(value: string): void;
  muted?: boolean;
}) {
  return (
    <motion.label
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.96 }}
      className={`group relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition-colors has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-gold-400/60 ${
        checked
          ? 'border-gold-400 bg-gradient-to-b from-gold-400/25 to-holly-500/15 shadow-lg shadow-gold-500/20'
          : muted
            ? 'border-dashed border-white/15 bg-white/[0.02] hover:border-white/30'
            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <motion.span
        aria-hidden="true"
        className="text-3xl sm:text-4xl"
        animate={checked ? { rotate: [0, -14, 12, -6, 0], scale: [1, 1.35, 1.15] } : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.55 }}
      >
        {emoji}
      </motion.span>
      <span className={`text-sm font-bold leading-tight ${muted && !checked ? 'text-white/60' : ''}`}>{title}</span>
      <span className="text-[0.7rem] leading-tight text-white/55">{tagline}</span>
      <AnimatePresence>
        {checked && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 12 }}
            exit={{ scale: 0 }}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 text-sm font-black text-night-950 shadow-lg"
            aria-hidden="true"
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>
    </motion.label>
  );
}

function CoursePicker({
  course,
  index,
  value,
  error,
  onChange,
  idPrefix,
}: {
  course: Course;
  index: number;
  value: string;
  error?: string;
  onChange(value: string): void;
  idPrefix: string;
}) {
  const cols = course.dishes.length + (course.skippable ? 1 : 0);
  return (
    <fieldset aria-describedby={error ? `${idPrefix}-${course.id}-error` : undefined}>
      <legend className="mb-3 flex w-full items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-holly-500 to-holly-600 font-display text-lg text-white shadow-lg shadow-holly-600/30">
          {index}
        </span>
        <span className="font-display text-2xl">{course.title}</span>
        {course.skippable && <span className="ml-auto text-xs font-semibold text-white/50">or skip it</span>}
      </legend>
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${cols === 6 ? 'lg:grid-cols-6' : cols === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}
      >
        {course.dishes.map((dish) => (
          <DishOption
            key={dish.id}
            name={`${idPrefix}-${course.id}`}
            value={dish.id}
            emoji={dish.emoji}
            title={dish.name}
            tagline={dish.tagline}
            checked={value === dish.id}
            onSelect={onChange}
          />
        ))}
        {course.skippable && (
          <DishOption
            name={`${idPrefix}-${course.id}`}
            value={SKIP}
            emoji="🙅"
            title={`No ${course.singular}`}
            tagline="Saving room!"
            checked={value === SKIP}
            onSelect={onChange}
            muted
          />
        )}
      </div>
      {error && (
        <p id={`${idPrefix}-${course.id}-error`} role="alert" className="mt-2 text-sm font-medium text-holly-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function PlatePreview({ values }: { values: OrderInput }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" aria-hidden="true">
      {COURSES.map((course, i) => {
        const value = values[course.id];
        return (
          <div key={course.id} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && <span className="text-white/30">→</span>}
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/80 bg-gradient-to-br from-white to-slate-200 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.15)] sm:h-16 sm:w-16">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={value || 'empty'}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="text-2xl sm:text-3xl"
                >
                  {value ? choiceEmoji(course.id, value) : <span className="text-base text-slate-400">?</span>}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface OrderFormProps {
  config: PublicConfig;
  orders: Order[];
  editing: Order | null;
  onSaved(order: Order, wasNew: boolean): void;
  onCancelEdit(): void;
}

export function OrderForm({ config, orders, editing, onSaved, onCancelEdit }: OrderFormProps) {
  const [values, setValues] = useState<OrderInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const idPrefix = useId().replace(/:/g, '');

  useEffect(() => {
    setErrors({});
    setValues(
      editing
        ? { name: editing.name, starter: editing.starter, main: editing.main, dessert: editing.dessert, notes: editing.notes }
        : EMPTY,
    );
  }, [editing]);

  const set = (key: keyof OrderInput) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const full = !editing && orders.length >= config.maxGuests;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const result = validateOrderInput(values);
    const localErrors: Record<string, string> = result.ok ? {} : { ...result.errors };
    const key = nameKey(values.name);
    if (key && orders.some((o) => o.id !== editing?.id && nameKey(o.name) === key)) {
      localErrors.name = 'Someone with this name has already ordered - edit their order instead';
    }
    if (!result.ok || Object.keys(localErrors).length) {
      setErrors(localErrors);
      toast.show('Almost there - check the highlighted bits.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { order } = editing ? await api.updateOrder(editing.id, result.value) : await api.createOrder(result.value);
      onSaved(order, !editing);
      if (!editing) setValues(EMPTY);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setErrors(err.fieldErrors);
        toast.show(err.message, 'error');
      } else {
        toast.show('Something went wrong - please try again.', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!config.ordersOpen) {
    return (
      <div className="glass p-8 text-center">
        <div className="text-6xl">🔒</div>
        <h3 className="mt-3 font-display text-3xl">Orders are closed</h3>
        <p className="mt-2 text-white/70">
          The deadline has passed, so the list is locked. Grab the completed booking form from Santa&apos;s Workshop below.
        </p>
      </div>
    );
  }

  if (full) {
    return (
      <div className="glass p-8 text-center">
        <div className="text-6xl">🎁</div>
        <h3 className="mt-3 font-display text-3xl">The table is full!</h3>
        <p className="mt-2 text-white/70">
          The booking form only has room for {config.maxGuests} guests. Edit an existing order if something needs changing.
        </p>
      </div>
    );
  }

  return (
    <motion.form
      layout
      onSubmit={submit}
      noValidate
      className={`glass relative space-y-7 p-5 sm:p-8 ${editing ? 'ring-2 ring-gold-400/70' : ''}`}
      aria-label={editing ? `Edit ${editing.name}'s order` : 'Place your order'}
    >
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 px-4 py-3"
          >
            <p className="font-semibold text-gold-300">✏️ Editing {editing.name}&apos;s order</p>
            <button type="button" className="text-sm font-semibold text-white/80 underline-offset-4 hover:underline" onClick={onCancelEdit}>
              Cancel editing
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-2 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pine-500 to-pine-700 text-lg shadow-lg shadow-pine-700/30">
            🎅
          </span>
          <span className="font-display text-2xl">Who&apos;s hungry?</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          className={`field text-lg ${errors.name ? 'field-error' : ''}`}
          placeholder="Your name"
          autoComplete="name"
          maxLength={LIMITS.name}
          value={values.name}
          onChange={(e) => set('name')(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${idPrefix}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${idPrefix}-name-error`} role="alert" className="mt-2 text-sm font-medium text-holly-400">
            {errors.name}
          </p>
        )}
      </div>

      {COURSES.map((course, i) => (
        <CoursePicker
          key={course.id}
          course={course}
          index={i + 1}
          value={values[course.id as CourseId]}
          error={errors[course.id]}
          onChange={set(course.id)}
          idPrefix={idPrefix}
        />
      ))}

      <div>
        <label htmlFor={`${idPrefix}-notes`} className="mb-2 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-lg shadow-lg shadow-gold-500/30">
            ⚠️
          </span>
          <span className="font-display text-2xl">Allergies or requests</span>
          <span className="ml-auto text-xs font-semibold text-white/50">optional</span>
        </label>
        <input
          id={`${idPrefix}-notes`}
          className={`field ${errors.notes ? 'field-error' : ''}`}
          placeholder="e.g. nut allergy, gluten free, no gravy…"
          maxLength={LIMITS.notes}
          value={values.notes}
          onChange={(e) => set('notes')(e.target.value)}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={`${idPrefix}-notes-hint`}
        />
        <p id={`${idPrefix}-notes-hint`} className={`mt-2 text-xs ${errors.notes ? 'font-medium text-holly-400' : 'text-white/50'}`}>
          {errors.notes ?? `Goes in the allergies column of the booking form · ${values.notes.length}/${LIMITS.notes}`}
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-white/60">Your festive plate</p>
        <PlatePreview values={values} />
        <p className="mt-3 text-center text-sm text-white/70">
          {COURSES.map((c) => (values[c.id] ? choiceLabel(c.id, values[c.id]) : `pick a ${c.singular}`)).join(' · ')}
        </p>
      </div>

      <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={busy}>
        <span className="candy-stripes absolute inset-0 opacity-30" />
        <span className="relative">
          {busy ? 'Wrapping it up…' : editing ? 'Save changes ✨' : 'Send my order to Santa 🎅'}
        </span>
      </button>
    </motion.form>
  );
}
