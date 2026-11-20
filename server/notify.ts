import { COURSES, SKIP, findDish, getCourse, optionField, type CourseId } from '../shared/menu.js';
import type { Order } from '../shared/types.js';

/**
 * Discord notifications: every time someone places, changes or removes an
 * order, a message with everything they filled in is posted to a Discord
 * channel through a webhook (set DISCORD_WEBHOOK_URL in Vercel).
 */

export type OrderEvent =
  | { type: 'created'; order: Order; totalOrders: number; partySize: number }
  | { type: 'updated'; order: Order; previous: Order; totalOrders: number; partySize: number }
  | { type: 'deleted'; order: Order; totalOrders: number; partySize: number };

export type Notifier = (event: OrderEvent) => Promise<void>;

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface Embed {
  title: string;
  description?: string;
  color: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordPayload {
  username: string;
  allowed_mentions: { parse: [] };
  embeds: Embed[];
}

const COLOURS = { created: 0xe11d48, updated: 0xf5f5f5, deleted: 0x71717a, complete: 0x22c55e } as const;
const COURSE_LABEL: Record<CourseId, string> = { starter: 'Starter', main: 'Main', dessert: 'Dessert' };

const WEBHOOK_URL = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function isDiscordWebhookUrl(url: string | undefined): url is string {
  return typeof url === 'string' && WEBHOOK_URL.test(url.trim());
}

/** Stops names/notes from being read as Discord markdown (bold, spoilers, quotes, links...). */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_~`|>[\]()#-])/g, '\\$1');
}

/** "Ultimate Chocolate Fudge Cake (ice cream)", "No starter", ... */
export function describeChoice(order: Order, courseId: CourseId): string {
  const value = order[courseId];
  if (!value) return '-';
  if (value === SKIP) return `No ${getCourse(courseId).singular}`;
  const dish = findDish(courseId, value);
  if (!dish) return value;
  const option = dish.options?.choices.find((c) => c.id === order[optionField(courseId)]);
  return option && option.formNote ? `${dish.name} (${option.label.toLowerCase()})` : dish.name;
}

function orderFields(order: Order): EmbedField[] {
  return [
    ...COURSES.map((course) => ({ name: COURSE_LABEL[course.id], value: escapeMarkdown(describeChoice(order, course.id)), inline: true })),
    { name: 'Allergies / requests', value: order.notes ? escapeMarkdown(order.notes) : 'None' },
  ];
}

function changes(previous: Order, order: Order): string[] {
  const out: string[] = [];
  if (previous.name !== order.name) out.push(`Name: ${escapeMarkdown(previous.name)} → ${escapeMarkdown(order.name)}`);
  for (const course of COURSES) {
    const before = describeChoice(previous, course.id);
    const after = describeChoice(order, course.id);
    if (before !== after) out.push(`${COURSE_LABEL[course.id]}: ${escapeMarkdown(before)} → ${escapeMarkdown(after)}`);
  }
  if (previous.notes !== order.notes) {
    out.push(`Allergies: ${escapeMarkdown(previous.notes || 'none')} → ${escapeMarkdown(order.notes || 'none')}`);
  }
  return out;
}

export function buildDiscordMessage(event: OrderEvent): DiscordPayload {
  const { order, totalOrders, partySize } = event;
  const name = escapeMarkdown(order.name);
  const progress = `${totalOrders} / ${partySize} ordered`;
  const embeds: Embed[] = [];

  if (event.type === 'created') {
    embeds.push({
      title: `🎄 New order: ${name}`,
      color: COLOURS.created,
      fields: orderFields(order),
      footer: { text: progress },
      timestamp: order.createdAt,
    });
  } else if (event.type === 'updated') {
    const changed = changes(event.previous, order);
    embeds.push({
      title: `✏️ Order updated: ${name}`,
      description: changed.length ? `**Changed**\n${changed.join('\n')}` : 'Saved with no changes.',
      color: COLOURS.updated,
      fields: orderFields(order),
      footer: { text: progress },
      timestamp: order.updatedAt,
    });
  } else {
    embeds.push({
      title: `🗑️ Order removed: ${name}`,
      color: COLOURS.deleted,
      fields: orderFields(order),
      footer: { text: progress },
      timestamp: new Date().toISOString(),
    });
  }

  if (event.type === 'created' && totalOrders === partySize) {
    embeds.push({
      title: `🎉 Everyone's in! ${totalOrders} / ${partySize} orders`,
      description: 'Time to download the completed booking form from Santa’s Workshop.',
      color: COLOURS.complete,
    });
  }

  // allowed_mentions: nobody can ping @everyone (or anyone) by typing it into a name.
  return { username: 'Xmas Feast ’26', allowed_mentions: { parse: [] }, embeds };
}

/**
 * Returns a notifier for the configured webhook, or null when none is set.
 * Failures are logged and swallowed - Discord being down never breaks an order.
 */
export function createDiscordNotifier(url: string | undefined, fetchImpl: typeof fetch = fetch): Notifier | null {
  if (!url) return null;
  if (!isDiscordWebhookUrl(url)) {
    console.warn('[discord] DISCORD_WEBHOOK_URL is not a Discord webhook URL - notifications are off');
    return null;
  }
  const endpoint = url.trim();
  return async (event) => {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDiscordMessage(event)),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) console.error(`[discord] webhook responded ${res.status}`);
    } catch (err) {
      console.error('[discord] webhook failed', err instanceof Error ? err.message : String(err));
    }
  };
}
