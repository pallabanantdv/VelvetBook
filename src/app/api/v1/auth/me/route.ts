import "server-only";
import type { NextRequest } from "next/server";
import { handleAuthentication } from "@/infrastructure/authentication/routes.server";

export async function GET(request: NextRequest) {
  return handleAuthentication(request, "me");
}
