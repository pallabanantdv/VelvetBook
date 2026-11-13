import "server-only";
import type { NextRequest } from "next/server";
import { handleOrganizationWorkflow } from "@/infrastructure/onboarding/routes.server";

export async function GET(request: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const params = await context.params;
  return handleOrganizationWorkflow(request, "progress", params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ organizationId: string }> }) {
  const params = await context.params;
  return handleOrganizationWorkflow(request, "select-stores", params);
}
