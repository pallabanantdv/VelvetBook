import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db/client.server";
import { authenticationRuntime } from "@/infrastructure/authentication/runtime.server";
import { enforceOrigin, readAuthBody } from "@/infrastructure/authentication/routes.server";
import { AuthenticationError } from "@/modules/identity/application/authentication.server";
import { sessionValidator } from "@/modules/identity/infrastructure/session-validation.server";
import { AuthorizationDenied } from "@/modules/authorization/application/access.server";
import type { CustomerOperationContext, AuthorizedOperation } from "@/modules/authorization/application/public";
import { CustomerProfiles } from "@/modules/customers/application/profile.server";
import { DrizzleCustomerProfiles } from "@/modules/customers/infrastructure/profile-repository.server";
import { customerProfilePatchSchema } from "@/modules/customers/presentation/validation.server";
import type { CustomerProfile } from "@/modules/customers/domain/entities/model";
import type { CustomerProfilePort } from "@/modules/customers/application/public";
import { mapApplicationError } from "@/shared/presentation/error-mapping.server";
import type { ApplicationErrorCategory } from "@/core/errors";
import type { ResponseMetadata } from "@/shared/presentation/api-contracts";

export interface ProfileRuntime {
  profiles: CustomerProfilePort;
  authorize(request: NextRequest, action: "read" | "update"): Promise<CustomerOperationContext>;
}
export function profileRuntime(): ProfileRuntime {
  const { auth, config, authorization } = authenticationRuntime();
  return {
    profiles: new CustomerProfiles(new DrizzleCustomerProfiles(getDatabase().db), () => randomUUID() as CustomerProfile["id"], () => new Date()),
    async authorize(request, action) {
      if (action === "update") enforceOrigin(request, config.origin);
      const validated = await sessionValidator(auth).validate({ opaqueValue: request.cookies.get(config.cookieName)?.value ?? "" });
      if (!validated.ok) {
        if (validated.error.code === "unauthenticated") throw new AuthenticationError("unauthenticated");
        throw new Error("Session validation unavailable.");
      }
      const session = validated.value;
      const permission = { scope: "customer" as const, resource: "profile" as const, action };
      await authorization.customer(session.sessionId, permission, { kind: "profile", id: session.identity.userId });
      await auth.throttle("profile-" + action, session.identity.userId, action === "read" ? 120 : 30, 60);
      // Minted here only after current DB session, permission and self ownership verification.
      const operation = { request: { scope: "customer", session, permission,
        target: { kind: "customer_collection", resourceKind: "profile" } }, authorizedAt: new Date() } as AuthorizedOperation;
      return { session, authorization: operation as CustomerOperationContext["authorization"] };
    },
  };
}
const headers = { "Cache-Control": "no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
export async function handleCustomerProfile(request: NextRequest, factory: () => ProfileRuntime = profileRuntime) {
  const meta = { requestId: randomUUID(), correlationId: randomUUID() } as ResponseMetadata;
  function failure(category: ApplicationErrorCategory) {
    const mapped = mapApplicationError({ kind: "application", category, code: "profile_failure", message: "Profile operation failed." }, meta);
    return NextResponse.json(mapped.body, { status: mapped.status, headers: { ...headers, ...(category === "rate_limited" ? { "Retry-After": "60" } : {}) } });
  }
  try {
    const runtime = factory();
    const context = await runtime.authorize(request, request.method === "GET" ? "read" : "update");
    if (request.nextUrl.search) return failure("validation");
    let result;
    if (request.method === "GET") result = await runtime.profiles.readSelf(context);
    else {
      const { expectedRevision, ...profile } = customerProfilePatchSchema.parse(await readAuthBody(request));
      result = await runtime.profiles.updateSelf({ context, expectedRevision, profile });
    }
    if (!result.ok) return failure(result.error.code === "access_denied" ? "forbidden" : result.error.code === "conflict" ? "conflict" : result.error.code === "invalid_input" ? "validation" : "unavailable");
    if (!result.value) return failure("not_found");
    return NextResponse.json({ ok: true, data: result.value, meta }, { headers });
  } catch (error) {
    return failure(error instanceof AuthenticationError ? error.category : error instanceof AuthorizationDenied ? "forbidden" : error instanceof Error && error.name === "ZodError" ? "validation" : "unavailable");
  }
}
