import { z } from 'zod';

/**
 * Zod request shapes for the Employees module. Same single-source-of-truth
 * pattern as auth.schema.ts — the controller calls `Schema.parse(req.body)`
 * and gets a strongly-typed value, with a ZodError automatically mapped to
 * a 400 by the global error handler.
 */

// Common rules
const nameField = z.string().trim().min(1, 'Required').max(80);
const optionalString = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

export const CreateEmployeeSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  position: optionalString(120),
  // ISO date string ("2024-03-15") or full ISO datetime — coerce to Date.
  joinedAt: z
    .union([z.string().datetime({ offset: true }), z.string().date(), z.date()])
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  // Optional team assignments at creation time.
  teamIds: z.array(z.string().uuid()).max(50).optional(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

// PATCH: every field optional, but at least one field must be present.
export const UpdateEmployeeSchema = z
  .object({
    firstName: nameField.optional(),
    lastName: nameField.optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    position: optionalString(120),
    joinedAt: z
      .union([z.string().datetime({ offset: true }), z.string().date(), z.date(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        return new Date(v);
      }),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

export const EmployeeIdParamSchema = z.object({
  id: z.string().uuid('Invalid employee id'),
});
