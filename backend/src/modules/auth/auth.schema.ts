import { z } from 'zod';

/**
 * Single source of truth for auth request shapes. The controller validates
 * `req.body` against these and infers TypeScript types — no manual casting.
 *
 * Password rules: ≥ 8 chars, at least one letter and one number. Resist the
 * urge to over-restrict (e.g. forced symbols) — long passphrases are stronger
 * than short complex passwords, and OWASP guidance now favors length checks.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), {
    message: 'Password must contain at least one letter and one number',
  });

// Convert a free-form name into a URL-safe org slug.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export const RegisterSchema = z.object({
  organisationName: z
    .string()
    .min(2, 'Organisation name is required')
    .max(100, 'Organisation name is too long'),
  name: z.string().min(1, 'Your name is required').max(80),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const LogoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});
export type LogoutInput = z.infer<typeof LogoutSchema>;
