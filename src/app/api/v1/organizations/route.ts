import "server-only";
import type { NextRequest } from "next/server";
import { handleOrganizationWorkflow } from "@/infrastructure/onboarding/routes.server";

export async function POST(request: NextRequest) {
  return handleOrganizationWorkflow(request, "create");
}
