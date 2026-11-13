import "server-only";
import type { NextRequest } from "next/server";
import { handleOrganizationWorkflow } from "@/infrastructure/onboarding/routes.server";

export async function GET(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  const params = await context.params;
  return handleOrganizationWorkflow(request, "case", params);
}
