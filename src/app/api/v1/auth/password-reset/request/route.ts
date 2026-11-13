import "server-only";
import type { NextRequest } from "next/server";
import { handleAuthentication } from "@/infrastructure/authentication/routes.server";

export async function POST(request: NextRequest) {
  return handleAuthentication(request, "request-reset");
}
