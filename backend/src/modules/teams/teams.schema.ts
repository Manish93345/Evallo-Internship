import { z } from 'zod';

/**
 * Zod request shapes for the Teams module + team-member assignment.
 */

const nameField = z.string().trim().min(1, 'Required').max(80);

export const CreateTeamSchema = z.object({
  name: nameField,
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z
  .object({
    name: nameField.optional(),
    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        return v.length > 0 ? v : null;
      }),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

export const TeamIdParamSchema = z.object({
  id: z.string().uuid('Invalid team id'),
});

export const TeamMemberParamsSchema = z.object({
  id: z.string().uuid('Invalid team id'),
  employeeId: z.string().uuid('Invalid employee id'),
});

export const AssignMembersSchema = z.object({
  employeeIds: z
    .array(z.string().uuid('Each employeeId must be a uuid'))
    .min(1, 'At least one employeeId is required')
    .max(100, 'You can assign at most 100 employees at a time'),
});
export type AssignMembersInput = z.infer<typeof AssignMembersSchema>;
