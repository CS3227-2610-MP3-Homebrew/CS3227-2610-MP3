// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { createReviewSchema, ownReviewSchema } from '@/lib/reviews/fields';
import { checkReviewQuery, markReviewQuery, reviewQueryInvalidHeader } from '@/server/reviews/customer-query';
import { asActor, insert, q, rows, scenario } from '../integration/moderation/fixtures';
import { localSqlResult } from '../e2e/accounts/local';

vi.mock('server-only', () => ({}));

test('review schema counts code points and preserves original text without normalization', () => {
  const text = '😀'.repeat(998) + 'e\u0301';
  expect(createReviewSchema.parse({ rating: 5, text }).text).toBe(text);
  expect(createReviewSchema.safeParse({ rating: 5, text: text + 'x' }).success).toBe(false);
  expect(createReviewSchema.safeParse({ rating: 5, text: '\uFEFF\u2000\r\n' }).success).toBe(false);
  const exact = ' \n café e\u0301 😀  ';
  expect(createReviewSchema.parse({ rating: 1, text: exact }).text).toBe(exact);
});
test('own-review decoder preserves microseconds in UTC and rejects extra identity fields', () => {
  const review = { reviewId: 'r', orderId: 'o', rating: 4, text: 'Original', moderationState: 'hidden', submittedAt: '2026-10-22T08:00:00.123456+08:00' };
  expect(ownReviewSchema.parse(review).submittedAt).toBe('2026-10-22T00:00:00.123456Z');
  expect(ownReviewSchema.safeParse({ ...review, customerId: 'private' }).success).toBe(false);
});
test('raw review query marker overwrites caller flags and preserves reserved-key rejection', () => {
  for (const method of ['GET', 'POST']) {
    for (const query of ['__proto__=x', 'constructor=x', 'page=1&page=2']) {
      const request = new Request(`http://localhost/api/customer/orders/example/review?${query}`, { method, headers: { [reviewQueryInvalidHeader]: '0' } });
      markReviewQuery(request); expect(request.headers.get(reviewQueryInvalidHeader)).toBe('1');
      expect(() => checkReviewQuery(new URL(request.url).searchParams)).toThrow();
    }
    const request = new Request('http://localhost/api/customer/orders/example/review', { method, headers: { [reviewQueryInvalidHeader]: '1' } });
    markReviewQuery(request); expect(request.headers.get(reviewQueryInvalidHeader)).toBe('0');
  }
});
test('direct creation RPC independently validates fields and permits mathematically integral JSON numbers', () => {
  const f = scenario(); const id = randomUUID();
  insert('public.orders', { id, cafe_id: f.cafe, customer_id: f.customer.id, state: 'collected' });
  for (const input of [{ rating: 4, text: 'Valid', customerId: f.reader.id }, { rating: 4, text: 'Valid', moderationState: 'kept' }, { rating: 1.5, text: 'Valid' }, { rating: '4', text: 'Valid' }, { rating: 4, text: '😀'.repeat(1001) }, { rating: 4, text: '\uFEFF\u00A0' }]) {
    expect(JSON.parse(asActor(f.customer.id, `select public.create_customer_review(${q(id)},${q(JSON.stringify(input))}::jsonb);`))).toEqual({ error: 'INVALID_REQUEST' });
  }
  // asActor rolls back; this proves the RPC accepts 4.0 without a text-to-int cast failure.
  const result = JSON.parse(asActor(f.customer.id, `select public.create_customer_review(${q(id)},'{"rating":4.0,"text":"Exact"}'::jsonb);`));
  expect(result.review).toMatchObject({ orderId: id, rating: 4, text: 'Exact', moderationState: 'pending' });
  expect(rows(`select * from public.reviews where order_id=${q(id)}`)).toEqual([]);
});
test('direct creation RPC independently denies an owner before mutation', () => {
  const f = scenario();
  const result = localSqlResult(`begin; set local role authenticated; set local request.jwt.claim.sub=${q(f.owner.id)}; select public.create_customer_review('missing','{"rating":4,"text":"Valid"}'::jsonb); rollback;`);
  expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/42501/);
});
