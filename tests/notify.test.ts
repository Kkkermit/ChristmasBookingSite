import { describe, expect, it, vi } from 'vitest';
import {
  buildDiscordMessage,
  createDiscordNotifier,
  describeChoice,
  escapeMarkdown,
  isDiscordWebhookUrl,
  type OrderEvent,
} from '../server/notify.js';
import type { Order } from '../shared/types.js';
import { login, makeApp, req, sampleOrder } from './helpers.js';

const WEBHOOK = 'https://discord.com/api/webhooks/123456789012345678/abcDEF_ghi-JKL';

const order = (overrides: Partial<Order> = {}): Order => ({
  id: 'o1',
  name: 'Josh',
  starter: 'butternut_squash_soup',
  starterOption: 'gluten_free',
  main: 'wellington',
  mainOption: '',
  dessert: 'chocolate_fudge_cake',
  dessertOption: 'ice_cream',
  notes: 'Nut allergy',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  ...overrides,
});

describe('Discord message', () => {
  it('lists everything the guest filled in', () => {
    const msg = buildDiscordMessage({ type: 'created', order: order(), totalOrders: 3, partySize: 12 });
    expect(msg.allowed_mentions).toEqual({ parse: [] });
    const [embed] = msg.embeds;
    expect(embed.title).toBe('🎄 New order: Josh');
    expect(embed.fields).toEqual([
      { name: 'Starter', value: 'Butternut Squash Soup \\(gluten\\-free option\\)', inline: true },
      { name: 'Main', value: 'Beetroot & Butternut Squash Wellington', inline: true },
      { name: 'Dessert', value: 'Ultimate Chocolate Fudge Cake \\(ice cream\\)', inline: true },
      { name: 'Allergies / requests', value: 'Nut allergy' },
    ]);
    expect(embed.footer?.text).toBe('3 / 12 ordered');
    expect(msg.embeds).toHaveLength(1);
  });

  it('celebrates when the last person orders', () => {
    const msg = buildDiscordMessage({ type: 'created', order: order(), totalOrders: 12, partySize: 12 });
    expect(msg.embeds).toHaveLength(2);
    expect(msg.embeds[1].title).toContain("Everyone's in!");
  });

  it('shows exactly what changed on an edit', () => {
    const previous = order();
    const updated = order({ main: 'seabass', notes: '', dessert: 'none', dessertOption: '' });
    const msg = buildDiscordMessage({ type: 'updated', order: updated, previous, totalOrders: 5, partySize: 12 });
    const description = msg.embeds[0].description ?? '';
    expect(msg.embeds[0].title).toBe('✏️ Order updated: Josh');
    expect(description).toContain('Main: Beetroot & Butternut Squash Wellington → Seabass');
    expect(description).toContain('Dessert: Ultimate Chocolate Fudge Cake \\(ice cream\\) → No dessert');
    expect(description).toContain('Allergies: Nut allergy → none');
    expect(description).not.toContain('Starter');
  });

  it('announces removals', () => {
    const msg = buildDiscordMessage({ type: 'deleted', order: order(), totalOrders: 4, partySize: 12 });
    expect(msg.embeds[0].title).toBe('🗑️ Order removed: Josh');
    expect(msg.embeds[0].footer?.text).toBe('4 / 12 ordered');
  });

  it('neutralises markdown in names and notes', () => {
    expect(escapeMarkdown('**Bob** _the_ ~builder~ `x` ||spoiler|| > quote')).toBe(
      '\\*\\*Bob\\*\\* \\_the\\_ \\~builder\\~ \\`x\\` \\|\\|spoiler\\|\\| \\> quote',
    );
  });

  it('describes skipped courses and standard options plainly', () => {
    expect(describeChoice(order({ starter: 'none', starterOption: '' }), 'starter')).toBe('No starter');
    expect(describeChoice(order({ starterOption: 'standard' }), 'starter')).toBe('Butternut Squash Soup');
  });
});

describe('webhook URL', () => {
  it('only accepts Discord webhook URLs', () => {
    expect(isDiscordWebhookUrl(WEBHOOK)).toBe(true);
    expect(isDiscordWebhookUrl('https://canary.discord.com/api/webhooks/1/x')).toBe(true);
    expect(isDiscordWebhookUrl('https://discordapp.com/api/webhooks/1/abc')).toBe(true);
    expect(isDiscordWebhookUrl('http://discord.com/api/webhooks/1/abc')).toBe(false);
    expect(isDiscordWebhookUrl('https://evil.example/api/webhooks/1/abc')).toBe(false);
    expect(isDiscordWebhookUrl(undefined)).toBe(false);
    expect(createDiscordNotifier('https://example.com/hook')).toBeNull();
    expect(createDiscordNotifier(undefined)).toBeNull();
  });

  it('posts JSON to the webhook and swallows failures', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const notify = createDiscordNotifier(WEBHOOK, fetchImpl as unknown as typeof fetch)!;
    const event: OrderEvent = { type: 'created', order: order(), totalOrders: 1, partySize: 12 };
    await notify(event);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body)).embeds[0].title).toBe('🎄 New order: Josh');

    const failing = createDiscordNotifier(WEBHOOK, (async () => {
      throw new Error('discord down');
    }) as unknown as typeof fetch)!;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(failing(event)).resolves.toBeUndefined();
  });
});

describe('orders trigger notifications', () => {
  async function setup(notify = vi.fn(async (_e: OrderEvent) => {})) {
    const background: Promise<unknown>[] = [];
    const ctx = makeApp({ notify, background: (p) => background.push(p) });
    const cookie = await login(ctx.app);
    const call = (method: string, route: string, body?: unknown) => ctx.app(req(method, route, { body, cookie }));
    const settle = () => Promise.all(background);
    return { ...ctx, call, notify, settle };
  }

  it('on create, edit and delete - after the response, with the full details', async () => {
    const { call, notify, settle } = await setup();
    const { order: created } = (await (await call('POST', '/api/orders', sampleOrder({ notes: 'Coeliac' }))).json()) as { order: Order };
    await call('PUT', `/api/orders/${created.id}`, sampleOrder({ main: 'seabass', notes: 'Coeliac' }));
    await call('DELETE', `/api/orders/${created.id}`);
    await settle();

    const events = notify.mock.calls.map(([e]) => e);
    expect(events.map((e) => e.type)).toEqual(['created', 'updated', 'deleted']);
    expect(events[0]).toMatchObject({ order: { name: 'Josh', notes: 'Coeliac' }, totalOrders: 1, partySize: 12 });
    expect(events[1]).toMatchObject({ order: { main: 'seabass' }, previous: { main: 'ultimate_xmas_burger' } });
    expect(events[2]).toMatchObject({ order: { id: created.id }, totalOrders: 0 });
  });

  it('does not notify for rejected orders', async () => {
    const { call, notify, settle } = await setup();
    await call('POST', '/api/orders', sampleOrder({ main: 'nope' }));
    await settle();
    expect(notify).not.toHaveBeenCalled();
  });

  it('still saves the order if the notification blows up', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { call, settle, store } = await setup(vi.fn(async () => {
      throw new Error('boom');
    }));
    const res = await call('POST', '/api/orders', sampleOrder());
    await settle();
    expect(res.status).toBe(201);
    expect(await store!.listOrders()).toHaveLength(1);
  });
});
