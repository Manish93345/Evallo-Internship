import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/**
 * Pre-computed bcrypt hash of the string "dummy-password-do-not-match" using
 * 12 rounds. We compare against this when the email lookup fails so that the
 * login response time is constant whether the user exists or not — closes a
 * classic timing-attack side channel that lets attackers enumerate emails.
 */
const DUMMY_HASH =
  '$2a$12$CwTycUXWue0Thq9StjUM0uJ8U0t9Q8X3hQ5b1Z2t8s9rQ8X3hQ5b1';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  // If we have no hash (user not found), still spend bcrypt CPU on a dummy
  // so attackers can't infer existence from response time.
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
