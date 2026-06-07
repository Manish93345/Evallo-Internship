import { z } from 'zod';

/**
 * Standard pagination envelope shared across list endpoints.
 *
 *   {
 *     data: T[],
 *     pagination: { total, page, limit, pages }
 *   }
 *
 * `q` is the optional case-insensitive search term — service layers decide
 * which columns to ILIKE against.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface Paginated<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function buildPagination(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/**
 * Compute Prisma's `skip` / `take` from a page/limit pair.
 */
export function pageToSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}
