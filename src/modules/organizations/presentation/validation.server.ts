import "server-only";
import { z } from "zod";
import type { OrganizationDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const organizationsDraftSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
}) satisfies z.ZodType<OrganizationDraftDto>;
