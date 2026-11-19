import { Ban, Check, ChefHat, Lock, RotateCcw, Save, Send, TriangleAlert, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  COURSES,
  SKIP,
  choiceLabel,
  findDish,
  optionField,
  type Course,
  type CourseId,
  type Dish,
} from '../../shared/menu';
import type { Order, OrderInput, PublicConfig } from '../../shared/types';
import { LIMITS, nameKey, validateOrderInput } from '../../shared/validation';
import { ApiError, api } from '../lib/api';
import { DietaryBadges, DishIcon, Spinner } from './icons';
import { StatePanel } from './states';
import { useToast } from './Toasts';

const EMPTY: OrderInput = {
  name: '',
  starter: '',
  starterOption: '',
  main: '',
  mainOption: '',
  dessert: '',
  dessertOption: '',
  notes: '',
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Radio input that can also be unselected: a click on the option that's already
 * chosen clears it (onChange never fires for an already-checked radio).
 */
function ToggleRadio({
  name,
  value,
  checked,
  onSelect,
  onClear,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect(): void;
  onClear(): void;
}) {
  return (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onSelect}
      onClick={() => {
        if (checked) onClear();
      }}
      className="sr-only"
    />
  );
}

function DishCard({
  name,
  dish,
  checked,
  onSelect,
  onClear,
}: {
  name: string;
  dish: Dish;
  checked: boolean;
  onSelect(): void;
  onClear(): void;
}) {
  return (
    <label
      className={`group relative flex cursor-pointer select-none gap-3 rounded-2xl border p-3.5 transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.985] has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-gold-400/60 ${
        checked
          ? 'border-gold-400 bg-gold-400/15 shadow-lg shadow-gold-500/15'
          : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
      }`}
    >
      <ToggleRadio name={name} value={dish.id} checked={checked} onSelect={onSelect} onClear={onClear} />
      <motion.span
        aria-hidden="true"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-200 ${
          checked ? 'bg-gold-400 text-night-950' : 'bg-white/10 text-gold-300 group-hover:bg-white/15'
        }`}
        animate={checked ? { rotate: [0, -10, 8, 0], scale: [1, 1.12, 1] } : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <DishIcon icon={dish.icon} className="h-6 w-6" />
      </motion.span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-7">
          <span className="font-bold leading-tight">{dish.name}</span>
          <DietaryBadges dietary={dish.dietary} />
        </span>
        <span className="mt-1 block text-[0.8rem] leading-snug text-white/60">{dish.description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
          checked ? 'scale-100 bg-gold-400 text-night-950 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    </label>
  );
}

function OptionPicker({
  dish,
  name,
  value,
  error,
  onChange,
  errorId,
}: {
  dish: Dish;
  name: string;
  value: string;
  error?: string;
  onChange(value: string): void;
  errorId: string;
}) {
  const options = dish.options!;
  return (
    <motion.fieldset
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      className="overflow-hidden"
      aria-describedby={error ? errorId : undefined}
    >
      <div className={`mt-3 rounded-2xl border p-3 ${error ? 'border-holly-400/60 bg-holly-500/10' : 'border-gold-400/30 bg-gold-400/5'}`}>
        <legend className="sr-only">
          {dish.name}: {options.question}
        </legend>
        <p className="mb-2 text-sm font-semibold text-gold-300" aria-hidden="true">
          {dish.shortName} · {options.question}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.choices.map((choice) => {
            const checked = value === choice.id;
            return (
              <label
                key={choice.id}
                className={`inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-200 active:scale-[0.97] has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-gold-400/60 ${
                  checked ? 'border-gold-400 bg-gold-400 text-night-950' : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <ToggleRadio
                  name={name}
                  value={choice.id}
                  checked={checked}
                  onSelect={() => onChange(choice.id)}
                  // Unselecting falls back to the menu's default (e.g. standard soup), or to nothing.
                  onClear={() => onChange(options.defaultChoice ?? '')}
                />
                {checked && <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                {choice.label}
              </label>
            );
          })}
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-holly-400">
            {error}
          </p>
        )}
      </div>
    </motion.fieldset>
  );
}

function CoursePicker({
  course,
  index,
  values,
  errors,
  onPick,
  onOption,
  idPrefix,
}: {
  course: Course;
  index: number;
  values: OrderInput;
  errors: Record<string, string>;
  onPick(dishId: string): void;
  onOption(optionId: string): void;
  idPrefix: string;
}) {
  const value = values[course.id];
  const field = optionField(course.id);
  const selected = findDish(course.id, value);
  const error = errors[course.id];
  return (
    <fieldset aria-describedby={error ? `${idPrefix}-${course.id}-error` : undefined}>
      <legend className="mb-3 flex w-full items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-holly-500 to-holly-600 font-display text-lg text-white shadow-lg shadow-holly-600/30">
          {index}
        </span>
        <span className="min-w-0 flex-1 font-display text-xl leading-tight sm:text-2xl">{course.title}</span>
        {course.skippable && <span className="shrink-0 text-xs font-semibold text-white/50">optional</span>}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {course.dishes.map((dish) => (
          <DishCard
            key={dish.id}
            name={`${idPrefix}-${course.id}`}
            dish={dish}
            checked={value === dish.id}
            onSelect={() => onPick(dish.id)}
            onClear={() => onPick('')}
          />
        ))}
      </div>
      {course.skippable && (
        <label
          className={`mt-3 inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl border border-dashed px-4 py-2 text-sm font-semibold transition-colors duration-200 active:scale-[0.97] has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-gold-400/60 ${
            value === SKIP ? 'border-gold-400 bg-gold-400/15 text-gold-300' : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
          }`}
        >
          <ToggleRadio
            name={`${idPrefix}-${course.id}`}
            value={SKIP}
            checked={value === SKIP}
            onSelect={() => onPick(SKIP)}
            onClear={() => onPick('')}
          />
          <Ban className="h-4 w-4" aria-hidden="true" />
          No {course.singular} for me
        </label>
      )}
      <AnimatePresence initial={false}>
        {selected?.options && (
          <OptionPicker
            key={selected.id}
            dish={selected}
            name={`${idPrefix}-${field}`}
            value={values[field]}
            error={errors[field]}
            onChange={onOption}
            errorId={`${idPrefix}-${field}-error`}
          />
        )}
      </AnimatePresence>
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
        const dish = findDish(course.id, value);
        return (
          <div key={course.id} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && <span className="text-white/30">→</span>}
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/80 bg-gradient-to-br from-white to-slate-200 text-night-800 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.15)] sm:h-16 sm:w-16">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={value || 'empty'}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  {dish ? (
                    <DishIcon icon={dish.icon} className="h-7 w-7 text-holly-600" />
                  ) : value === SKIP ? (
                    <Ban className="h-6 w-6 text-slate-400" />
                  ) : (
                    <span className="text-base font-bold text-slate-400">?</span>
                  )}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function plateSummary(values: OrderInput): string {
  return COURSES.map((c) => {
    const value = values[c.id];
    if (!value) return `pick a ${c.singular}`;
    const choice = findDish(c.id, value)?.options?.choices.find((o) => o.id === values[optionField(c.id)]);
    return choice?.formNote ? `${choiceLabel(c.id, value)} (${choice.label.toLowerCase()})` : choiceLabel(c.id, value);
  }).join(' · ');
}

interface OrderFormProps {
  config: PublicConfig;
  orders: Order[];
  editing: Order | null;
  onSaved(order: Order, wasNew: boolean): void;
  onCancelEdit(): void;
  /** Called when the server says our copy is out of date (e.g. the order was deleted elsewhere). */
  onStale?(): void;
}

export function OrderForm({ config, orders, editing, onSaved, onCancelEdit, onStale }: OrderFormProps) {
  const [values, setValues] = useState<OrderInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const idPrefix = useId().replace(/:/g, '');

  useEffect(() => {
    setErrors({});
    setValues(
      editing
        ? {
            name: editing.name,
            starter: editing.starter,
            starterOption: editing.starterOption,
            main: editing.main,
            mainOption: editing.mainOption,
            dessert: editing.dessert,
            dessertOption: editing.dessertOption,
            notes: editing.notes,
          }
        : EMPTY,
    );
  }, [editing]);

  const clearErrors = (...keys: string[]) =>
    setErrors((current) => {
      if (!keys.some((k) => k in current)) return current;
      const next = { ...current };
      for (const k of keys) delete next[k];
      return next;
    });

  const setText = (key: 'name' | 'notes') => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    clearErrors(key);
  };

  const pickDish = (courseId: CourseId) => (dishId: string) => {
    const field = optionField(courseId);
    setValues((v) => {
      if (v[courseId] === dishId) return v;
      const options = findDish(courseId, dishId)?.options;
      return { ...v, [courseId]: dishId, [field]: options?.defaultChoice ?? '' };
    });
    clearErrors(courseId, field);
  };

  const pickOption = (courseId: CourseId) => (optionId: string) => {
    const field = optionField(courseId);
    setValues((v) => ({ ...v, [field]: optionId }));
    clearErrors(field);
  };

  const full = !editing && orders.length >= config.maxGuests;
  const hasChoices = COURSES.some((c) => values[c.id] !== '');

  const clearChoices = () => {
    setValues((v) => ({ ...v, starter: '', starterOption: '', main: '', mainOption: '', dessert: '', dessertOption: '' }));
    clearErrors('starter', 'starterOption', 'main', 'mainOption', 'dessert', 'dessertOption');
  };

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
        if (err.code === 'NOT_FOUND' && editing) {
          // Someone deleted this order while it was being edited.
          onCancelEdit();
          onStale?.();
        }
        if (err.code === 'CLOSED') onStale?.();
      } else {
        toast.show('Something went wrong - please try again.', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!config.ordersOpen) {
    return (
      <StatePanel icon={Lock} title="Orders are closed" tone="warning">
        The deadline has passed, so the list is locked. Grab the completed booking form from Santa&apos;s Workshop below.
      </StatePanel>
    );
  }

  if (full) {
    return (
      <StatePanel icon={ChefHat} title="The table is full!" tone="warning">
        The booking form only has room for {config.maxGuests} guests. Edit an existing order if something needs changing.
      </StatePanel>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={busy}
      className={`glass card-pad relative space-y-8 ${editing ? 'ring-2 ring-gold-400/70' : ''}`}
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
            <p className="font-semibold text-gold-300">Editing {editing.name}&apos;s order</p>
            <button
              type="button"
              className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
              onClick={onCancelEdit}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel editing
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-2 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pine-500 to-pine-700 shadow-lg shadow-pine-700/30">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 font-display text-xl leading-tight sm:text-2xl">Who&apos;s hungry?</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          className={`field text-lg ${errors.name ? 'field-error' : ''}`}
          placeholder="Your name"
          autoComplete="name"
          maxLength={LIMITS.name}
          value={values.name}
          onChange={(e) => setText('name')(e.target.value)}
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
          values={values}
          errors={errors}
          onPick={pickDish(course.id)}
          onOption={pickOption(course.id)}
          idPrefix={idPrefix}
        />
      ))}

      <div>
        <label htmlFor={`${idPrefix}-notes`} className="mb-2 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-night-950 shadow-lg shadow-gold-500/30">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 font-display text-xl leading-tight sm:text-2xl">Allergies or requests</span>
          <span className="shrink-0 text-xs font-semibold text-white/50">optional</span>
        </label>
        <input
          id={`${idPrefix}-notes`}
          className={`field ${errors.notes ? 'field-error' : ''}`}
          placeholder="e.g. nut allergy, no gravy…"
          maxLength={LIMITS.notes}
          value={values.notes}
          onChange={(e) => setText('notes')(e.target.value)}
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
        <p className="mt-3 text-center text-sm text-white/70">{plateSummary(values)}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-white/45">
          <span>Changed your mind? Tap a chosen dish again to unselect it.</span>
          {hasChoices && (
            <button
              type="button"
              onClick={clearChoices}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear choices
            </button>
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-4 text-lg" disabled={busy}>
        <span className="candy-sheen opacity-30" aria-hidden="true" />
        <span className="relative inline-flex items-center gap-2">
          {busy ? <Spinner /> : editing ? <Save className="h-5 w-5" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
          {busy ? 'Wrapping it up…' : editing ? 'Save changes' : 'Send my order to Santa'}
        </span>
      </button>
    </form>
  );
}
