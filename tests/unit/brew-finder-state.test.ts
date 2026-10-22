// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import { fallback, setup } from '../integration/brew-finder/fixtures';
import { createUsageAdmission, type UsageRpc } from '@/server/llm/usage';
import { limits } from './usage/contracts';
import { nextStateChangeAt } from '@/lib/catalogue/clock';
import { createAiState } from '@/server/llm/ai-state';
import { brewSource } from '../integration/ai-state/fixtures';
vi.mock('server-only', () => ({}));
afterEach(() => { vi.clearAllMocks(); });

test('a catalogue revision changing during cache delivery rejects advice even when its references remain available', async () => {
  const f = await setup();
  f.cache.read.mockImplementation(async () => { f.source.cafes[1].reviews[0].rating = 1; return f.data; });
  await fallback(await f.post(), 'unavailable');
  expect(f.transport).not.toHaveBeenCalled(); expect(f.cache.write).not.toHaveBeenCalled();
});

test('a stale source cannot dispatch a cafe that current eligibility excludes', async () => {
  const actorId = randomUUID(); const cafeId = randomUUID();
  const reserve = vi.fn(async () => ({ admitted: true })); const transport = vi.fn();
  const state = createAiState({ environment: 'ci', eligibleCafeIds: async () => [], admission: { reserve },
    rpc: async (_fn,args) => ({ data: [{ result: args.p_action === 'authorize' ? { now: '2040-01-01T01:00:00Z' } : { ok: true } }], error: null }) });
  const result = await state.runOperation({ feature: 'brew_finder', operationId: randomUUID(), actorId, scope: { actorId },
    input: { query: 'coffee', filters: { timeMode: 'all', at: null, area: null, drinkType: null } }, source: brewSource(cafeId,randomUUID()) },
  { requestId: 'synthetic', transport, getConfig: () => ({ APP_ENV: 'ci', AI_PROVIDER: 'fake', SOCLAAS_BASE_URL: 'https://provider.invalid/v1',
    SOCLAAS_MODEL: 'synthetic', SOCLAAS_REASONING_EFFORT: 'none', ...limits() }) });
  expect(result).toMatchObject({ mode: 'fallback', reason: 'unavailable' });
  expect(reserve).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
});

test('composed admission distinguishes infrastructure failure from a genuine quota denial', async () => {
  const request = { admissionId: randomUUID(), operationId: randomUUID(), actorId: randomUUID(), feature: 'brew-finder' as const, event: 'action' as const };
  for (const rpc of [async () => ({ data: null, error: { message: 'synthetic private detail' } }),
    async () => ({ data: [], error: null }), async () => { throw new Error('synthetic private detail'); }] satisfies UsageRpc[]) {
    const state = createUsageAdmission({ environment: 'ci', limits: limits(), rpc, throwOnUnavailable: true });
    await expect(state.reserve(request)).rejects.toThrow('Usage admission unavailable.');
    await expect(createUsageAdmission({ environment: 'ci', limits: limits(), rpc }).reserve(request)).resolves.toEqual({ admitted: false });
  }
  const state = createUsageAdmission({ environment: 'ci', limits: limits(), throwOnUnavailable: true,
    rpc: async () => ({ data: [{ admitted: false }], error: null }) });
  await expect(state.reserve(request)).resolves.toEqual({ admitted: false });
});
test('source transition identity stays stable within an interval and changes at closing, including adjacent and overnight hours', () => {
  const hours = [{ weekday: 1, opensAt: '09:00', closesAt: '10:00', closesNextDay: false },
    { weekday: 1, opensAt: '10:00', closesAt: '11:00', closesNextDay: false },
    { weekday: 7, opensAt: '23:00', closesAt: '01:00', closesNextDay: true }];
  expect(nextStateChangeAt(hours,'2026-10-19T01:00:00Z')).toBe('2026-10-19T03:00:00Z');
  expect(nextStateChangeAt(hours,'2026-10-19T02:59:59Z')).toBe('2026-10-19T03:00:00Z');
  expect(nextStateChangeAt(hours,'2026-10-19T03:00:00Z')).toBe('2026-10-25T15:00:00Z');
  expect(nextStateChangeAt(hours,'2026-10-18T16:30:00Z')).toBe('2026-10-18T17:00:00Z');
  expect(nextStateChangeAt([],'2026-10-19T01:00:00Z')).toBeNull();
});
