import "server-only";
import type { NextRequest } from "next/server";
import { handleOrganizationWorkflow } from "@/infrastructure/onboarding/routes.server";

export async function POST(request: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const params = await context.params;
  return handleOrganizationWorkflow(request, "confirm-review", params);
}
