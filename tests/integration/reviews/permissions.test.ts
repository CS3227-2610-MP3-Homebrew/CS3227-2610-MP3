// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { asActor, q, scenario, stored } from '../moderation/fixtures';
import { localSqlResult } from '../../e2e/accounts/local';

function mutation(actor: string, statement: string) {
  return localSqlResult(`begin; set local role authenticated; set local request.jwt.claims=${q(JSON.stringify({ role: 'authenticated', sub: actor }))}; set local request.jwt.claim.sub=${q(actor)}; with changed as (${statement} returning 1) select count(*) from changed; rollback;`);
}
test('CUS-05.3: database unique order constraint independently prevents a second review', () => {
  const f = scenario(); const id = f.review('hidden'); const before = stored(id);
  const result = localSqlResult(`begin; insert into public.reviews(id,order_id,customer_id,rating,text) values (${q(randomUUID())},${q(before.order_id)},${q(f.customer.id)},5,'Second review'); rollback;`);
  expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/23505/); expect(stored(id)).toEqual(before);
});
test('CUS-05.3 CUS-05.4: own hidden review survives suspended cafe RLS while other actors cannot read private content', () => {
  const f = scenario(); const foreign = scenario(); const id = f.review('hidden');
  const result = localSqlResult(`update public.cafes set suspended=true where id=${q(f.cafe)};`); expect(result.status).toBe(0);
  const query = `select count(*) from public.reviews where id=${q(id)};`;
  expect(asActor(f.customer.id, query)).toBe('1');
  for (const actor of [f.reader, foreign.customer, foreign.admin]) expect(asActor(actor.id, query)).toBe('0');
});
test('CUS-05.5 CUS-05.6 CUS-05.7: raw SQL denies forged create, moderation writes, text/rating edits and deletion', () => {
  const f = scenario(); const id = f.review(); const before = stored(id);
  for (const statement of [
    `update public.reviews set text='Changed',rating=1 where id=${q(id)}`,
    `update public.reviews set moderation_state='kept' where id=${q(id)}`,
    `delete from public.reviews where id=${q(id)}`,
    `insert into public.reviews(order_id,customer_id,rating,text,moderation_state) values (${q(before.order_id)},${q(f.reader.id)},5,'Forged','kept')`,
  ]) {
    const result = mutation(f.customer.id, statement);
    if (result.status === 0) expect(result.stdout).toBe('0');
    else expect(result.stderr).toMatch(/42501|23514|P0001/);
    expect(stored(id)).toEqual(before);
  }
});
