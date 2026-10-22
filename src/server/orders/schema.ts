import { z } from 'zod';

export const ref = z.string().refine(value => [...value].length >= 1 && [...value].length <= 128);
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const createOrderSchema = z.strictObject({
  cafeId: ref,
  pickupAt: z.iso.datetime().regex(/:00(?:\.0+)?Z$/),
  items: z.array(z.strictObject({ itemId: ref, quantity: z.number().int().min(1).max(20) })).min(1).max(20)
    .refine(items => new Set(items.map(i => i.itemId)).size === items.length),
  expectedTotalCents: count,
  submissionKey: z.uuid().regex(/^[0-9a-f-]+$/),
});

// Preserve database microseconds while normalizing timezone to the wire's Z.
const instant = z.iso.datetime({ offset: true }).transform(value => {
  const fraction = /\.(\d+)/.exec(value)?.[1];
  const whole = value.replace(/\.\d+(?=Z|[+-])/, '');
  return new Date(whole).toISOString().replace('.000Z', '') + (fraction ? `.${fraction}` : '') + 'Z';
});
export const orderSchema = z.strictObject({
  orderId: ref, cafeId: ref, cafeName: z.string(), placedAt: instant, pickupAt: instant,
  state: z.enum(['pending', 'accepted', 'ready', 'collected', 'rejected', 'cancelled']),
  items: z.array(z.strictObject({ itemId: ref, name: z.string(), quantity: z.number().int().min(1).max(20), unitPriceCents: count, lineTotalCents: count })),
  totalCents: count, currency: z.literal('SGD'), cancellationReason: z.literal('Cafe is suspended').nullable(), rejectionReason: z.string().nullable(),
  acceptedAt: instant.nullable(), readyAt: instant.nullable(), collectedAt: instant.nullable(), rejectedAt: instant.nullable(), cancelledAt: instant.nullable(),
});
export type Order = z.infer<typeof orderSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export const codes = ['INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'STATE_CONFLICT', 'SOURCE_UNAVAILABLE', 'INTERNAL_ERROR'] as const;
export class OrderError extends Error {
  constructor(public code: typeof codes[number], public accountName = false) { super(code); }
}
