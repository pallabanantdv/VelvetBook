import "server-only";
import type { NextRequest } from "next/server";
import { handleCustomerProfile } from "@/infrastructure/customers/profile.server";

export async function GET(request: NextRequest) { return handleCustomerProfile(request); }
export async function PATCH(request: NextRequest) { return handleCustomerProfile(request); }
