import "server-only";
import { z } from "zod";
import type { StaffAssignmentDraftDto } from "../application/dtos/contracts";

/** Structural validation only, not ownership or domain invariant validation. */
export const staffDraftSchema = z.strictObject({
  membershipId: z.uuid(),
}) satisfies z.ZodType<StaffAssignmentDraftDto>;
