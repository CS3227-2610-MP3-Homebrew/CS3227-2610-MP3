import { z } from 'zod';
import { orderSchema } from '@/server/orders/schema';

export const ownerOrderSchema = orderSchema.extend({ customerName: z.string() });
export type OwnerOrder = z.infer<typeof ownerOrderSchema>;
export const ownerActions = ['accept', 'reject', 'ready', 'collect'] as const;
export type OwnerAction = typeof ownerActions[number];

// ECMAScript WhiteSpace and LineTerminator code points, matching String.prototype.trim.
const words = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length;
export const rejectSchema = z.strictObject({ reason: z.string().refine(value => value.trim() !== '' && words(value) <= 100) });
export const emptySchema = z.strictObject({});
