// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { coreFixture, literal, sql } from '../integration/schema/local-database';
import { pickupSlots } from '@/server/orders/pickup';
import { markOrderQuery, orderPage, orderQueryInvalidHeader } from '@/server/orders/query';

test('raw query validation replaces caller flags and retains duplicate/reserved-key denials', () => {
  for (const query of ['page=1&page=2', '__proto__=x', 'constructor=x', 'page=01', 'page=9007199254740992']) {
    const request = new Request(`http://localhost/api/customer/orders?${query}`, { headers: { [orderQueryInvalidHeader]: '0' } });
    markOrderQuery(request); expect(request.headers.get(orderQueryInvalidHeader)).toBe('1');
  }
  const request = new Request('http://localhost/api/customer/orders?page=2', { headers: { [orderQueryInvalidHeader]: '1' } });
  markOrderQuery(request); expect(request.headers.get(orderQueryInvalidHeader)).toBe('0');
  expect(orderPage(new URLSearchParams('page=9007199254740991'), true)).toBe(Number.MAX_SAFE_INTEGER);
});

test('direct purchase RPC independently rejects forged actors and malformed item quantities', () => {
  const { fixture, cafe, menu, customer } = coreFixture();
  const valid = { cafeId: cafe.values.id, pickupAt: '2099-01-01T01:00:00Z', items: [{ itemId: menu.values.id, quantity: 1 }], expectedTotalCents: 100, submissionKey: randomUUID() };
  const requests = [{ ...valid, customerId: randomUUID() }, { ...valid, workspaceId: randomUUID() },
    { ...valid, items: [{ itemId: menu.values.id, quantity: '1' }] }, { ...valid, items: [{ itemId: menu.values.id, quantity: 0 }] },
    { ...valid, items: [valid.items[0], valid.items[0]] }, { ...valid, pickupAt: '2099-01-01T01:00:00.0000000001Z' }];
  for (const body of requests) {
    const result = fixture.run(`set local role authenticated; set local request.jwt.claim.sub=${literal(customer.values.id)};
      select public.create_customer_order(${literal(JSON.stringify(body))}::jsonb);`);
    expect(JSON.parse(result)).toEqual({ error: 'INVALID_REQUEST' });
  }
});

test('direct purchase RPC rejects a verified owner before any domain mutation', () => {
  const { fixture, owner } = coreFixture(); fixture.run();
  const result = sql(`begin; ${fixture.statements.join('\n')} set local role authenticated; set local request.jwt.claim.sub=${literal(owner.values.id)};
    select public.create_customer_order('{}'::jsonb); rollback;`);
  expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/42501/);
});

test('transactional SQL and offered pickup choices agree across overnight, adjacency, cutoff and horizon boundaries', () => {
  const { fixture, cafe } = coreFixture();
  const hours = [{ weekday: 7, opensAt: '23:00', closesAt: '01:00', closesNextDay: true },
    { weekday: 1, opensAt: '09:00', closesAt: '10:00', closesNextDay: false },
    { weekday: 1, opensAt: '10:00', closesAt: '12:00', closesNextDay: false }];
  for (const h of hours) fixture.statements.push(`insert into public.opening_hours(cafe_id,weekday,opens_at,closes_at,closes_next_day) values (${literal(cafe.values.id)},${h.weekday},${literal(h.opensAt)},${literal(h.closesAt)},${h.closesNextDay});`);
  // Remove the generic core fixture's default hours before installing this schedule.
  fixture.statements = fixture.statements.filter(s => !s.startsWith('insert into "public"."opening_hours"'));
  for (const cutoff of [0, 15, 30, 180]) for (const now of ['2026-10-18T16:00:00Z', '2026-10-19T00:45:01Z']) {
    const result = fixture.run(`update public.cafes set pickup_cutoff_minutes=${cutoff} where id=${literal(cafe.values.id)};
      select coalesce(json_agg(to_char(t at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') order by t),'[]') from private.order_pickup_slots(${literal(cafe.values.id)}::uuid,${literal(now)}::timestamptz) t;`);
    expect(JSON.parse(result)).toEqual(pickupSlots(hours, cutoff, now));
  }
});
