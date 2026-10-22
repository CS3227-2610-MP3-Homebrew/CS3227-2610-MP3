import { expect, test } from '@playwright/test';
import { setup, login, submit, stored, url, failure, origin, reviewResponse, localSql, q } from './fixtures';

for (const [name, data] of [
  ['zero', { rating: 0, text: 'Valid' }], ['six', { rating: 6, text: 'Valid' }], ['fraction', { rating: 2.5, text: 'Valid' }],
  ['string rating', { rating: '4', text: 'Valid' }], ['null rating', { rating: null, text: 'Valid' }], ['boolean rating', { rating: true, text: 'Valid' }],
  ['missing rating', { text: 'Valid' }], ['missing text', { rating: 4 }], ['empty text', { rating: 4, text: '' }],
  ['ECMAScript whitespace', { rating: 4, text: '\t\r\n \uFEFF\u00A0\u1680\u2000\u2028\u2029\u202F\u205F\u3000' }],
  ['over code point limit', { rating: 4, text: '😀'.repeat(1001) }], ['null text', { rating: 4, text: null }],
  ['numeric text', { rating: 4, text: 123 }], ['array text', { rating: 4, text: ['Valid'] }], ['array body', []], ['null body', null],
] as const) test(`CUS-05.10: ${name} rejects without echo, normalization or creation`, async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  const r = await submit(request, f.orderId, data === null ? 'null' : data);
  await failure(r, 400, 'INVALID_REQUEST');
  if (data && 'text' in data && typeof data.text === 'string' && data.text.length > 20) expect((await r.json()).error.message).not.toContain(data.text);
  expect(stored(f.orderId)).toEqual([]);
});
for (const attack of [
  { name: 'missing origin', headers: { 'content-type': 'application/json' }, data: '{"rating":4,"text":"Valid"}', status: 403, code: 'FORBIDDEN' },
  { name: 'foreign origin', headers: { origin: 'https://example.invalid', 'content-type': 'application/json' }, data: '{}', status: 403, code: 'FORBIDDEN' },
  { name: 'malformed origin', headers: { origin: origin + '/', 'content-type': 'application/json' }, data: '{}', status: 403, code: 'FORBIDDEN' },
  { name: 'non JSON', headers: { origin, 'content-type': 'text/plain' }, data: '{}', status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' },
  { name: 'malformed JSON', headers: { origin, 'content-type': 'application/json' }, data: '{', status: 400, code: 'INVALID_REQUEST' },
  { name: 'oversized UTF8', headers: { origin, 'content-type': 'application/json' }, data: JSON.stringify({ rating: 4, text: '😀'.repeat(17000) }), status: 413, code: 'PAYLOAD_TOO_LARGE' },
] as const) test(`CUS-05.10: ${attack.name} gives exact safe transport error`, async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  const headers = Object.fromEntries(Object.entries(attack.headers).filter((e): e is [string, string] => typeof e[1] === 'string'));
  await failure(await request.post(url(f.orderId), { headers, data: attack.data }), attack.status, attack.code); expect(stored(f.orderId)).toEqual([]);
});
for (const method of ['PUT', 'PATCH', 'DELETE']) test(`CUS-05.7 CUS-05.10: ${method} cannot edit/delete, advertises supported methods`, async ({ request }) => {
  const f = setup(); await login(request, f.customer); await reviewResponse(await submit(request, f.orderId)); const before = stored(f.orderId);
  const response = await request.fetch(url(f.orderId), { method, headers: { origin }, data: { rating: 1, text: 'Rewritten' } });
  await failure(response, 405, 'METHOD_NOT_ALLOWED'); expect(response.headers().allow.split(/,\s*/).sort()).toEqual(['GET', 'POST']); expect(stored(f.orderId)).toEqual(before);
});
test('CUS-05.10: strict no-query and bounded Ref apply to create and own-review reads', async ({ request }) => {
  const f = setup(); await login(request, f.customer);
  for (const target of [url(f.orderId) + '?extra=x', url(f.orderId) + '?extra=x&extra=y', url('x'.repeat(129))]) {
    await failure(await request.post(target, { headers: { origin }, data: { rating: 4, text: 'Valid' } }), 400, 'INVALID_REQUEST');
    await failure(await request.get(target), 400, 'INVALID_REQUEST');
  } expect(stored(f.orderId)).toEqual([]);
});
test('CUS-05.1: database insertion failure safely rolls back and leaves review eligibility intact', async ({ request }) => {
  const f = setup(); await login(request, f.customer); const name = `t44_fail_${f.orderId.replaceAll('-', '')}`;
  localSql(`create function private.${name}() returns trigger language plpgsql as $$ begin if new.order_id=${q(f.orderId)}::uuid then raise exception 'Synthetic private failure'; end if; return new; end; $$; create trigger ${name} before insert on public.reviews for each row execute function private.${name}();`);
  try { await failure(await submit(request, f.orderId), 500, 'INTERNAL_ERROR'); expect(stored(f.orderId)).toEqual([]); }
  finally { localSql(`drop trigger ${name} on public.reviews; drop function private.${name}();`); }
  await reviewResponse(await submit(request, f.orderId)); expect(stored(f.orderId)).toHaveLength(1);
});
test('CUS-05.10: streamed body without Content-Length is bounded by actual UTF8 bytes', async ({ request }) => {
  const { request: httpRequest } = await import('node:http');
  const f = setup(); await login(request, f.customer);
  const cookie = (await request.storageState()).cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const body = JSON.stringify({ rating: 4, text: '😀'.repeat(17000) });
  const response = await new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; text: string }>((resolve, reject) => {
    const outgoing = httpRequest(origin + url(f.orderId), { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, incoming => {
      let text = ''; incoming.setEncoding('utf8'); incoming.on('data', part => { text += part; });
      incoming.on('end', () => resolve({ status: incoming.statusCode!, headers: incoming.headers, text }));
    });
    outgoing.on('error', reject); outgoing.setTimeout(15000, () => outgoing.destroy(new Error('Local chunked request timed out')));
    for (let start = 0; start < body.length; start += 512) outgoing.write(body.slice(start, start + 512)); outgoing.end();
  });
  expect(response.status).toBe(413); expect(response.headers['cache-control']).toBe('private, no-store');
  expect(JSON.parse(response.text)).toEqual({ requestId: expect.any(String), error: { code: 'PAYLOAD_TOO_LARGE', message: expect.any(String) } }); expect(stored(f.orderId)).toEqual([]);
});
