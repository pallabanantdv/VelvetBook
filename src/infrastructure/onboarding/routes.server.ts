import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db/client.server";
import { authenticationRuntime } from "@/infrastructure/authentication/runtime.server";
import { enforceOrigin, readAuthBody } from "@/infrastructure/authentication/routes.server";
import { AuthenticationError } from "@/modules/identity/application/authentication.server";
import { AuthorizationDenied } from "@/modules/authorization/application/access.server";
import { OrganizationDrafts } from "@/modules/organizations/application/runtime.server";
import { DrizzleOrganizationDrafts } from "@/modules/organizations/infrastructure/drafts.server";
import { organizationsDraftSchema, organizationDraftPatchSchema } from "@/modules/organizations/presentation/validation.server";
import { OnboardingService } from "@/modules/onboarding/application/runtime.server";
import { DrizzleOnboardingWorkflow } from "@/modules/onboarding/infrastructure/workflow.server";
import { OnboardingError } from "@/modules/onboarding/application/lifecycle.server";
import { workflowIdSchema, workflowIdempotencySchema, workflowRevisionSchema, selectedStoresSchema, proposeOnboardingDecisionSchema, applyOnboardingDecisionSchema } from "@/modules/onboarding/presentation/validation.server";
import { mapApplicationError } from "@/shared/presentation/error-mapping.server";
import type { ResponseMetadata } from "@/shared/presentation/api-contracts";
import { WorkflowFailure, type WorkflowActor } from "./transaction.server";

export type WorkflowAction = "create" | "organization-read" | "organization-update" | "progress" | "select-stores" | "confirm-review" | "submit" | "reopen" | "case" | "start-review" | "propose" | "apply";
export interface WorkflowRouteRuntime {
  authorize(request: NextRequest, action: WorkflowAction): Promise<WorkflowActor>;
  organizations(actor: WorkflowActor): OrganizationDrafts;
  onboarding(actor: WorkflowActor): OnboardingService;
  reauthenticate(actor: WorkflowActor, password: string): Promise<void>;
}
export function workflowRuntime(): WorkflowRouteRuntime {
  const { config, auth, authorization } = authenticationRuntime();
  const db = getDatabase().db;
  return {
    async authorize(request, action) {
      if (request.method !== "GET" && request.method !== "HEAD") enforceOrigin(request, config.origin);
      const session = await auth.authenticate(request.cookies.get(config.cookieName)?.value ?? null);
      if (["case", "start-review", "propose", "apply"].includes(action)) await authorization.platform(session.id, { scope: "platform", resource: "onboarding", action: action === "case" ? "read" : "review" });
      await auth.throttle("workflow-" + action, session.user.id, action === "create" ? 10 : 60, action === "create" ? 3600 : 60);
      return { userId: session.user.id, sessionId: session.id, operationId: randomUUID(), correlationId: randomUUID() };
    },
    organizations: (actor) => new OrganizationDrafts(new DrizzleOrganizationDrafts(db, actor)),
    onboarding: (actor) => new OnboardingService(new DrizzleOnboardingWorkflow(db, actor)),
    async reauthenticate(actor, password) {
      await auth.throttle("onboarding-reauth", actor.userId, 5, 900);
      const current = await authorization.activeSession(actor.sessionId);
      const credential = await auth.store.credential(current.user.email);
      if (!credential || credential.user.id !== actor.userId || credential.disabled || !await auth.security.verify(password, credential.passwordHash)) throw new AuthenticationError("unauthenticated");
      actor.reauthenticatedHash = credential.passwordHash;
    },
  };
}
const headers = { "Cache-Control": "no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
export async function handleOrganizationWorkflow(request: NextRequest, action: WorkflowAction,
  selectors: { organizationId?: string; submissionId?: string; decisionId?: string } = {}, factory: () => WorkflowRouteRuntime = workflowRuntime) {
  const meta = { requestId: randomUUID(), correlationId: randomUUID() } as ResponseMetadata;
  try {
    const runtime = factory(); const actor = await runtime.authorize(request, action); actor.correlationId = meta.correlationId;
    if (request.nextUrl.search) throw new WorkflowFailure("validation");
    const organizationId = selectors.organizationId === undefined ? undefined : workflowIdSchema.parse(selectors.organizationId);
    const submissionId = selectors.submissionId === undefined ? undefined : workflowIdSchema.parse(selectors.submissionId);
    const key = ["organization-read", "progress", "case"].includes(action) ? "" : workflowIdempotencySchema.parse(request.headers.get("idempotency-key"));
    const orgs = runtime.organizations(actor); const onboarding = runtime.onboarding(actor);
    let data: Record<string, unknown>;
    switch (action) {
      case "create": data = await orgs.create(organizationsDraftSchema.parse(await readAuthBody(request)), key); break;
      case "organization-read": data = await orgs.read(organizationId!); break;
      case "organization-update": data = await orgs.update(organizationId!, organizationDraftPatchSchema.parse(await readAuthBody(request)), key); break;
      case "progress": data = await onboarding.read(organizationId!); break;
      case "select-stores": data = await onboarding.execute(organizationId!, { kind: "select-stores", ...selectedStoresSchema.parse(await readAuthBody(request)) }, key); break;
      case "confirm-review": case "submit": case "reopen": data = await onboarding.execute(organizationId!, { kind: action, ...workflowRevisionSchema.parse(await readAuthBody(request)) }, key); break;
      case "case": data = await onboarding.readCase(submissionId!); break;
      case "start-review": data = await onboarding.review(submissionId!, { kind: action, ...workflowRevisionSchema.parse(await readAuthBody(request)) }, key); break;
      case "propose": { const { password, ...command } = proposeOnboardingDecisionSchema.parse(await readAuthBody(request)); await runtime.reauthenticate(actor, password); data = await onboarding.review(submissionId!, { kind: action, ...command }, key); break; }
      case "apply": { const { password, ...command } = applyOnboardingDecisionSchema.parse(await readAuthBody(request)); await runtime.reauthenticate(actor, password); data = await onboarding.review(submissionId!, { kind: action, decisionId: workflowIdSchema.parse(selectors.decisionId), ...command }, key); break; }
    }
    return NextResponse.json({ ok: true, data, meta }, { headers, status: action === "create" || action === "submit" ? 201 : action === "propose" ? 202 : 200 });
  } catch (error) {
    const category = error instanceof WorkflowFailure || error instanceof OnboardingError || error instanceof AuthenticationError ? error.category :
      error instanceof AuthorizationDenied ? "forbidden" : error instanceof Error && error.name === "ZodError" ? "validation" : "unavailable";
    const response = mapApplicationError({ kind: "application", category, code: "workflow_failure", message: "Workflow operation failed." }, meta);
    return NextResponse.json(response.body, { status: response.status, headers: { ...headers, ...(category === "rate_limited" ? { "Retry-After": "60" } : {}) } });
  }
}
