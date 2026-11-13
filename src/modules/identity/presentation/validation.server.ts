import "server-only";
import { z } from "zod";

const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(15)
  .max(72)
  .refine((value) => new TextEncoder().encode(value).length <= 72);
export const registrationSchema = z.strictObject({
  email,
  displayName: z.string().trim().min(1).max(100),
  password,
});
export const loginSchema = z.strictObject({
  email,
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((value) => new TextEncoder().encode(value).length <= 72),
});
export const requestResetSchema = z.strictObject({ email });
export const resetPasswordSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password,
});
export const enrollMfaSchema = z.strictObject({
  password: loginSchema.shape.password,
});
export const verifyMfaSchema = z.strictObject({
  token: z.string().regex(/^\d{6}$/),
});
