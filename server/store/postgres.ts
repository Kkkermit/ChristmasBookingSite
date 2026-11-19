import postgres from 'postgres';
import type { BookingDetails, Order } from '../../shared/types.js';
import { nameKey } from '../../shared/validation.js';
import { DuplicateNameError, type Store } from './types.js';

type Sql = ReturnType<typeof postgres>;

interface OrderRow {
  id: string;
  name: string;
  starter: string;
  starter_option: string;
  main: string;
  main_option: string;
  dessert: string;
  dessert_option: string;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(value)).toISOString();

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    name: row.name,
    starter: row.starter,
    starterOption: row.starter_option,
    main: row.main,
    mainOption: row.main_option,
    dessert: row.dessert,
    dessertOption: row.dessert_option,
    notes: row.notes,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

const ORDER_COLUMNS = 'id, name, starter, starter_option, main, main_option, dessert, dessert_option, notes, created_at, updated_at';

/**
 * Postgres-backed store (Supabase in production). Tables live in the private
 * "xmas" schema - see db/migrations.
 */
export class PostgresStore implements Store {
  readonly kind = 'postgres';

  constructor(private readonly sql: Sql) {}

  async listOrders() {
    const rows = await this.sql.unsafe<OrderRow[]>(`select ${ORDER_COLUMNS} from xmas.orders order by created_at, name`);
    return rows.map(toOrder);
  }

  async getOrder(id: string) {
    const rows = await this.sql.unsafe<OrderRow[]>(`select ${ORDER_COLUMNS} from xmas.orders where id = $1::uuid`, [id]);
    return rows[0] ? toOrder(rows[0]) : null;
  }

  async saveOrder(order: Order) {
    try {
      await this.sql`
        insert into xmas.orders
          (id, name, name_key, starter, starter_option, main, main_option, dessert, dessert_option, notes, created_at, updated_at)
        values
          (${order.id}::uuid, ${order.name}, ${nameKey(order.name)}, ${order.starter}, ${order.starterOption},
           ${order.main}, ${order.mainOption}, ${order.dessert}, ${order.dessertOption}, ${order.notes},
           ${order.createdAt}::timestamptz, ${order.updatedAt}::timestamptz)
        on conflict (id) do update set
          name = excluded.name,
          name_key = excluded.name_key,
          starter = excluded.starter,
          starter_option = excluded.starter_option,
          main = excluded.main,
          main_option = excluded.main_option,
          dessert = excluded.dessert,
          dessert_option = excluded.dessert_option,
          notes = excluded.notes,
          updated_at = excluded.updated_at`;
    } catch (err) {
      // unique_violation on name_key: someone with the same name got there first.
      if ((err as { code?: string }).code === '23505') throw new DuplicateNameError();
      throw err;
    }
  }

  async deleteOrder(id: string) {
    const rows = await this.sql`delete from xmas.orders where id = ${id}::uuid returning id`;
    return rows.length > 0;
  }

  async getDetails() {
    const rows = await this.sql<{ details: BookingDetails }[]>`select details from xmas.booking_details where id = 1`;
    return rows[0]?.details ?? null;
  }

  async saveDetails(details: BookingDetails) {
    await this.sql`
      insert into xmas.booking_details (id, details, updated_at)
      values (1, ${this.sql.json(details as unknown as postgres.JSONValue)}, now())
      on conflict (id) do update set details = excluded.details, updated_at = now()`;
  }

  async hit(key: string, windowSeconds: number) {
    const rows = await this.sql<{ count: number }[]>`
      insert into xmas.rate_limits (key, count, expires_at)
      values (${key}, 1, now() + make_interval(secs => ${windowSeconds}::int))
      on conflict (key) do update set
        count = case when xmas.rate_limits.expires_at <= now() then 1 else xmas.rate_limits.count + 1 end,
        expires_at = case when xmas.rate_limits.expires_at <= now() then excluded.expires_at else xmas.rate_limits.expires_at end
      returning count`;
    return Number(rows[0].count);
  }

  async peek(key: string) {
    const rows = await this.sql<{ count: number }[]>`
      select count from xmas.rate_limits where key = ${key} and expires_at > now()`;
    return rows[0] ? Number(rows[0].count) : 0;
  }

  async close() {
    await this.sql.end({ timeout: 5 });
  }
}

/**
 * Settings for serverless + Supabase's Supavisor transaction pooler (port 6543):
 * no prepared statements, no pipelining, small pool, short timeouts.
 */
export function createPostgresClient(url: string, overrides: postgres.Options<Record<string, never>> = {}): Sql {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  return postgres(url, {
    prepare: false,
    max_pipeline: 1,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    query_timeout: 15_000,
    ssl: local ? false : 'require',
    onnotice: () => {},
    ...overrides,
  } as postgres.Options<Record<string, never>>);
}

/**
 * Supabase serves each region from more than one shared-pooler cluster
 * (aws-0-<region>, aws-1-<region>, ...) and a project lives on exactly one.
 * Connecting to the wrong one fails with "tenant/user <user>.<ref> not found",
 * so we try the configured host first and then its siblings.
 */
export function poolerCandidates(url: string): string[] {
  const match = /@aws-(?:(\d)-)?([a-z]+-[a-z]+-\d)\.pooler\.supabase\.com/.exec(url);
  if (!match) return [url];
  const host = match[0];
  const region = match[2];
  const variants = ['0', '1', '2'].map((n) => `@aws-${n}-${region}.pooler.supabase.com`);
  variants.push(`@aws-${region}.pooler.supabase.com`);
  return [url, ...variants.filter((v) => v !== host).map((v) => url.replace(host, v))];
}

/** True when the error means "this pooler doesn't host the project" (try the next one). */
export function isWrongPooler(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const message = e?.message ?? '';
  return (
    e?.code === 'ENOTFOUND' ||
    e?.code === 'EAI_AGAIN' ||
    /tenant\s*(\/|or)\s*user\b.*not found/i.test(message) ||
    /tenant or user not found/i.test(message)
  );
}

const redact = (text: string) => text.replace(/postgres(ql)?:\/\/\S+/g, '<db-url>');
const hostOf = (url: string) => /@([^:/]+)/.exec(url)?.[1] ?? 'database';

/**
 * Connects, checking the database answers. Never throws: if every attempt
 * fails the store is still returned, and requests report the outage (503)
 * instead of the whole API refusing to start.
 */
export async function connectPostgres(url: string): Promise<PostgresStore> {
  const candidates = poolerCandidates(url);
  for (const [i, candidate] of candidates.entries()) {
    const sql = createPostgresClient(candidate);
    try {
      await sql`select 1`;
      console.log(`[db] connected via ${hostOf(candidate)}${i > 0 ? ' (update DATABASE_URL to this host for faster cold starts)' : ''}`);
      return new PostgresStore(sql);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      console.error(`[db] ${hostOf(candidate)} failed: [${e?.code ?? 'error'}] ${redact(e?.message ?? String(err))}`);
      await sql.end({ timeout: 1 }).catch(() => {});
      // Only a "wrong pooler" error is worth trying elsewhere; anything else
      // (bad password, database down) would fail on every host.
      if (!isWrongPooler(err)) break;
    }
  }
  // Nothing answered: keep a client for the configured URL - queries retry the
  // connection on demand and the API reports DB_UNAVAILABLE meanwhile.
  return new PostgresStore(createPostgresClient(url));
}
