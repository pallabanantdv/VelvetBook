import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationError } from "@/modules/identity/application/authentication.server";
import { AuthorizationDenied } from "@/modules/authorization/application/access.server";
import type { OrganizationTarget } from "@/modules/authorization/application/access.server";
import type {
  OrganizationPermission,
  PlatformPermission,
  CustomerPermission,
} from "@/modules/authorization/application/public";
import {
  registrationSchema,
  loginSchema,
  requestResetSchema,
  resetPasswordSchema,
  enrollMfaSchema,
  verifyMfaSchema,
} from "@/modules/identity/presentation/validation.server";
import { mapApplicationError } from "@/shared/presentation/error-mapping.server";
import type { ResponseMetadata } from "@/shared/presentation/api-contracts";
import { authenticationRuntime } from "./runtime.server";
import { sessionValidator } from "@/modules/identity/infrastructure/session-validation.server";

type AuthAction =
  | "register"
  | "login"
  | "logout"
  | "me"
  | "request-reset"
  | "reset"
  | "mfa-enroll"
  | "mfa-verify";
const headers = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function enforceOrigin(request: Request, origin: string) {
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AuthenticationError("forbidden");
}
export async function readAuthBody(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AuthenticationError("validation");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthenticationError("validation");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        throw new AuthenticationError("validation");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AuthenticationError("validation");
  } finally {
    reader.releaseLock();
  }
}

export async function requireAuthentication(request: NextRequest) {
  const runtime = authenticationRuntime();
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method))
    enforceOrigin(request, runtime.config.origin);
  return {
    ...runtime,
    session: await runtime.auth.authenticate(
      request.cookies.get(runtime.config.cookieName)?.value ?? null,
    ),
  };
}
export async function requireValidatedSession(request: NextRequest) {
  const { auth, config } = authenticationRuntime();
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method))
    enforceOrigin(request, config.origin);
  const result = await sessionValidator(auth).validate({
    opaqueValue: request.cookies.get(config.cookieName)?.value ?? "",
  });
  if (!result.ok) {
    if (result.error.code === "unauthenticated")
      throw new AuthenticationError("unauthenticated");
    throw new Error("Session validation unavailable.");
  }
  return result.value;
}
export async function requireOrganizationPermission(
  request: NextRequest,
  organizationId: string,
  permission: OrganizationPermission,
  target?: OrganizationTarget,
) {
  const { authorization, session } = await requireAuthentication(request);
  return authorization.organization(
    session.id,
    organizationId,
    permission,
    target,
  );
}
export async function requireCustomerPermission(
  request: NextRequest,
  permission: CustomerPermission,
  target?: { kind: "booking" | "payment" | "profile"; id: string },
) {
  const { authorization, session } = await requireAuthentication(request);
  return authorization.customer(session.id, permission, target);
}
export async function requirePlatformPermission(
  request: NextRequest,
  permission: PlatformPermission,
) {
  const { authorization, session } = await requireAuthentication(request);
  return authorization.platform(session.id, permission);
}

/** A route-local boundary, not an edge proxy: every handler validates its own session. */
export async function handleAuthentication(
  request: NextRequest,
  action: AuthAction,
  runtimeFactory: () => Pick<
    ReturnType<typeof authenticationRuntime>,
    "auth" | "config"
  > & {
    authorization: Pick<
      ReturnType<typeof authenticationRuntime>["authorization"],
      "memberships"
    >;
  } = authenticationRuntime,
) {
  const meta = {
    requestId: randomUUID(),
    correlationId: randomUUID(),
  } as ResponseMetadata;
  try {
    const { auth, config, authorization } = runtimeFactory();
    if (action !== "me") enforceOrigin(request, config.origin);
    await auth.throttle(
      `endpoint-${action}`,
      "global",
      action === "me" ? 1000 : 60,
      60,
    );
    const cookie = request.cookies.get(config.cookieName)?.value ?? null;
    let data: unknown = { accepted: true };
    let status = 200;
    let setCookie: string | undefined;
    switch (action) {
      case "register": {
        const input = registrationSchema.parse(await readAuthBody(request));
        await auth.register(input.email, input.displayName, input.password);
        status = 202;
        break;
      }
      case "login": {
        const input = loginSchema.parse(await readAuthBody(request));
        const result = await auth.login(input.email, input.password);
        setCookie = result.cookie;
        data = {
          user: result.session.user,
          expiresAt: result.session.expiresAt,
        };
        break;
      }
      case "logout":
        await auth.logout(cookie);
        setCookie = "";
        break;
      case "me": {
        const session = await auth.authenticate(cookie);
        data = {
          user: session.user,
          expiresAt: session.expiresAt,
          mfaVerifiedAt: session.mfaVerifiedAt,
          memberships: await authorization.memberships(session.id),
        };
        break;
      }
      case "request-reset": {
        const input = requestResetSchema.parse(await readAuthBody(request));
        await auth.requestReset(input.email);
        status = 202;
        break;
      }
      case "reset": {
        const input = resetPasswordSchema.parse(await readAuthBody(request));
        await auth.reset(input.token, input.password);
        setCookie = "";
        break;
      }
      case "mfa-enroll": {
        const input = enrollMfaSchema.parse(await readAuthBody(request));
        data = await auth.enrollMfa(
          await auth.authenticate(cookie),
          input.password,
        );
        break;
      }
      case "mfa-verify": {
        const input = verifyMfaSchema.parse(await readAuthBody(request));
        await auth.verifyMfa(await auth.authenticate(cookie), input.token);
        break;
      }
    }
    const response = NextResponse.json(
      { ok: true, data, meta },
      { status, headers },
    );
    if (setCookie !== undefined)
      response.cookies.set(config.cookieName, setCookie, {
        httpOnly: true,
        secure: config.secure,
        sameSite: "lax",
        path: "/",
        maxAge: setCookie ? config.sessionSeconds : 0,
      });
    return response;
  } catch (error) {
    const category =
      error instanceof AuthenticationError
        ? error.category
        : error instanceof AuthorizationDenied
          ? "forbidden"
          : error instanceof Error && error.name === "ZodError"
            ? "validation"
            : "unavailable";
    const mapped = mapApplicationError(
      {
        kind: "application",
        category,
        code: "auth_failure",
        message: "Authentication operation failed.",
      },
      meta,
    );
    return NextResponse.json(mapped.body, {
      status: mapped.status,
      headers: {
        ...headers,
        ...(category === "rate_limited" ? { "Retry-After": "60" } : {}),
      },
    });
  }
}
