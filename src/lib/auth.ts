import { createHash, randomBytes } from "crypto";

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const computed = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return computed === hash;
}
