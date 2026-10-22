import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { history } from '../orders/fixtures';
import { moderate } from '../moderation/helpers';
import { setup, login, submit, reviewResponse, stored, url, failure, malicious, localSql, q, origin, rows } from './fixtures';

for (const main of [true, false]) test(`CUS-05.1 CUS-05.5 CUS-05.6: ${main ? 'main' : 'kit'} collected purchase creates exact pending review with session-derived relationships`, async ({ request }) => {
  const f = setup(main); await login(request, f.customer);
  const review = await reviewResponse(await submit(request, f.orderId));
  expect(review).toMatchObject({ orderId: f.orderId, rating: 4, text: malicious, moderationState: 'pending' });
  expect(stored(f.orderId)).toHaveLength(1);
  expect(rows(`select r.customer_id,o.cafe_id,c.workspace_id from public.reviews r join public.orders o on o.id=r.order_id join public.cafes c on c.id=o.cafe_id where r.id=${q(review.reviewId)}`)).toEqual([{ customer_id: f.customer.id, cafe_id: f.cafe, workspace_id: f.customer.workspaceId }]);
  expect(await reviewResponse(await request.get(url(f.orderId)), 200)).toEqual(review);
});
for (const [rating, text] of [[1, 'x'], [5, '😀'.repeat(1000)], [3, '\u200ba\u0301\r\n'], [4, '\uFEFF\u00A0 coffee\n\t ']] as const)
  test(`CUS-05.1 CUS-05.10: valid rating ${rating} and ${Array.from(text).length} code points preserve exact text`, async ({ request }) => {
    const f = setup(); await login(request, f.customer);
    const review = await reviewResponse(await submit(request, f.orderId, { rating, text }));
    expect(review.rating).toBe(rating); expect(review.text).toBe(text);
    expect(stored(f.orderId)[0]).toMatchObject({ rating, text });
  });
test('CUS-05.1: suspension and deleted original menu do not revoke a collected purchase or expose restricted cafe', async ({ request }) => {
  const f = setup(); localSql(`update public.cafes set suspended=true where id=${q(f.cafe)}; delete from public.menu_items where id=${q(f.item)};`);
  await login(request, f.customer);
  await failure(await request.get(`/api/customer/cafes/${f.cafe}`), 404, 'NOT_FOUND');
  await reviewResponse(await submit(request, f.orderId));
  expect(stored(f.orderId)).toHaveLength(1);
});
for (const state of ['pending', 'accepted', 'ready', 'rejected', 'cancelled'] as const) test.describe(state, () => { test('CUS-05.2: own uncollected purchase cannot be reviewed', async ({ request }) => {
  const f = setup(); const id = history(f, state); await login(request, f.customer);
  await failure(await submit(request, id), 409, 'STATE_CONFLICT'); expect(stored(id)).toEqual([]);
}); });
test('CUS-05.3: concurrent different submissions admit one winner, identical retry conflicts without upsert', async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  const payloads = [{ rating: 1, text: 'First contender' }, { rating: 5, text: 'Second contender' }];
  const results = await Promise.all(payloads.map(data => submit(request, f.orderId, data)));
  expect(results.map(r => r.status()).sort()).toEqual([201, 409]);
  const winner = results.findIndex(r => r.status() === 201); const review = await reviewResponse(results[winner]);
  await failure(results[1-winner], 409, 'STATE_CONFLICT'); expect(review).toMatchObject(payloads[winner]);
  const before = stored(f.orderId); expect(before).toHaveLength(1);
  await failure(await submit(request, f.orderId, payloads[winner]), 409, 'STATE_CONFLICT');
  expect(stored(f.orderId)).toEqual(before);
});
test('CUS-05.3 CUS-05.6 CUS-05.7: hiding and restoring retain immutable review and never release uniqueness', async ({ request, playwright }) => {
  const f = setup(); await login(request, f.customer); const review = await reviewResponse(await submit(request, f.orderId));
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(admin, f.admin);
    for (const [action, state] of [['hide', 'hidden'], ['restore', 'kept']] as const) {
      expect((await moderate(admin, review.reviewId, action)).status()).toBe(200);
      const own = await reviewResponse(await request.get(url(f.orderId)), 200);
      expect(own).toEqual({ ...review, moderationState: state });
      await failure(await submit(request, f.orderId, { rating: 1, text: 'Overwrite attempt' }), 409, 'STATE_CONFLICT');
      expect(stored(f.orderId)).toHaveLength(1); expect(stored(f.orderId)[0]).toMatchObject({ text: malicious, rating: 4 });
      const publicResponse = await request.get(`/api/customer/cafes/${f.cafe}/reviews`); expect(publicResponse.status()).toBe(200);
      const items = (await publicResponse.json()).items; expect(items.length).toBe(state === 'hidden' ? 0 : 1);
      if (items.length) { expect(items[0].authorLabel).toBe('Verified customer'); expect(items[0]).not.toHaveProperty('customerId'); }
    }
  } finally { await admin.dispose(); }
});
for (const target of ['same-workspace', 'other-kit', 'missing']) test(`CUS-05.4: ${target} orders have indistinguishable create and own-read not-found errors`, async ({ request }) => {
  const f = setup(); const foreign = target === 'other-kit' ? setup() : null;
  if (target === 'same-workspace') localSql(`update public.orders set customer_id=${q(f.reader.id)} where id=${q(f.orderId)};`);
  const id = foreign?.orderId ?? (target === 'missing' ? randomUUID() : f.orderId);
  await login(request, f.customer);
  await failure(await submit(request, id), 404, 'NOT_FOUND'); await failure(await request.get(url(id)), 404, 'NOT_FOUND'); expect(stored(id)).toEqual([]);
});
test('CUS-05.3: own collected order without review gives JSON 404 on own-review GET', async ({ request }) => {
  const f = setup(); await login(request, f.customer); await failure(await request.get(url(f.orderId)), 404, 'NOT_FOUND'); expect(stored(f.orderId)).toEqual([]);
});
for (const key of ['customerId', 'authorId', 'orderId', 'cafeId', 'workspaceId', 'moderationState', 'state']) test(`CUS-05.5 CUS-05.6: caller-injected ${key} cannot create a review`, async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  await failure(await submit(request, f.orderId, { rating: 4, text: 'Valid', [key]: key.includes('tate') ? 'kept' : randomUUID() }), 400, 'INVALID_REQUEST'); expect(stored(f.orderId)).toEqual([]);
});
test('CUS-05.9: anonymous review create/read return safe 401', async ({ request }) => {
  const f = setup(); await failure(await submit(request, f.orderId), 401, 'UNAUTHENTICATED'); await failure(await request.get(url(f.orderId)), 401, 'UNAUTHENTICATED'); expect(stored(f.orderId)).toEqual([]);
});
for (const role of ['owner', 'admin'] as const) test(`CUS-05.9: ${role} review create/read return safe 403`, async ({ request }) => {
  const f = setup(); await login(request, f[role]); await failure(await submit(request, f.orderId), 403, 'FORBIDDEN'); await failure(await request.get(url(f.orderId)), 403, 'FORBIDDEN'); expect(stored(f.orderId)).toEqual([]);
});
test('CUS-05.3: simultaneous identical requests create one review and return a conflict for the other', async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  const results = await Promise.all([submit(request, f.orderId), submit(request, f.orderId)]);
  expect(results.map(r => r.status()).sort()).toEqual([201, 409]);
  await reviewResponse(results.find(r => r.status() === 201)!); await failure(results.find(r => r.status() === 409)!, 409, 'STATE_CONFLICT');
  expect(stored(f.orderId)).toHaveLength(1);
});
test('CUS-05.9: authenticated session uses current protected role rather than stale browser claims', async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  localSql(`update public.profiles set role='owner' where id=${q(f.customer.id)};`);
  await failure(await submit(request, f.orderId), 403, 'FORBIDDEN'); expect(stored(f.orderId)).toEqual([]);
});
