import "server-only";
import { z } from "zod";
import type { PaginationLimits } from "@/core/pagination";

export function createPaginationInputSchema(limits: PaginationLimits) {
  if (
    !Number.isInteger(limits.defaultLimit) ||
    !Number.isInteger(limits.maximumLimit) ||
    limits.defaultLimit < 1 ||
    limits.defaultLimit > limits.maximumLimit ||
    limits.maximumLimit > 1000
  ) {
    throw new RangeError("Invalid pagination limits");
  }
  return z.strictObject({
    cursor: z.string().min(1).max(2048).nullable().default(null),
    limit: z
      .number()
      .int()
      .min(1)
      .max(limits.maximumLimit)
      .default(limits.defaultLimit),
  });
}
