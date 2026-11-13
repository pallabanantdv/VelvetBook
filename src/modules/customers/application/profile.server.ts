import "server-only";
import type { CustomerOperationContext } from "@/modules/authorization/application/public";
import type { CustomerProfile } from "../domain/entities/model";
import type { CustomerProfileDto, CustomerProfilePatchDto } from "./dtos/contracts";
import type { CustomerProfileRepository, CustomerProfilePort } from "./ports/contracts.server";

/** Defense in depth for server-owned context; never deserialize these objects from clients. */
export function isSelfProfileContext(context: CustomerOperationContext, action: "read" | "update") {
  const request = context.authorization.request;
  return request.scope === "customer" && request.session.sessionId === context.session.sessionId &&
    request.session.identity.userId === context.session.identity.userId && context.session.identity.status === "active" &&
    request.permission.scope === "customer" && request.permission.resource === "profile" && request.permission.action === action &&
    ((request.target.kind === "customer_collection" && request.target.resourceKind === "profile") ||
      (request.target.kind === "existing" && request.target.ownership.resourceKind === "profile" &&
        request.target.ownership.subjectId === context.session.identity.userId &&
        request.target.ownership.ownerUserId === context.session.identity.userId));
}
const denied = { ok: false as const, error: { code: "access_denied" as const, message: "Access denied." } };
function dto(profile: CustomerProfile): CustomerProfileDto {
  // Explicit projection prevents future persistence/auth fields from leaking.
  return { id: profile.id, userId: profile.userId, displayName: profile.displayName, locale: profile.locale,
    timezone: profile.timezone, phone: profile.phone, avatarReference: profile.avatarReference,
    preferences: { theme: profile.preferences.theme, bookingReminders: profile.preferences.bookingReminders },
    revision: profile.revision, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString() };
}
export class CustomerProfiles implements CustomerProfilePort {
  constructor(readonly repository: CustomerProfileRepository, readonly newId: () => CustomerProfile["id"], readonly now: () => Date) {}
  async readSelf(context: CustomerOperationContext) {
    if (!isSelfProfileContext(context, "read")) return denied;
    const result = await this.repository.findSelf(context);
    return result.ok ? { ok: true as const, value: result.value ? dto(result.value) : null } : result;
  }
  async updateSelf(input: { context: CustomerOperationContext; expectedRevision: number; profile: CustomerProfilePatchDto }) {
    const { context, expectedRevision, profile: patch } = input;
    if (!isSelfProfileContext(context, "update")) return denied;
    const current = await this.repository.findSelf(context);
    if (!current.ok) return current;
    const previous = current.value;
    if ((previous?.revision ?? 0) !== expectedRevision) return { ok: false as const, error: { code: "conflict" as const, message: "Profile revision changed." } };
    if (!previous && !patch.displayName) return { ok: false as const, error: { code: "invalid_input" as const, message: "Name is required." } };
    const now = this.now();
    const profile: CustomerProfile = {
      id: previous?.id ?? this.newId(), userId: context.session.identity.userId,
      displayName: patch.displayName ?? previous!.displayName,
      locale: patch.locale ?? previous?.locale ?? "en", timezone: patch.timezone === undefined ? previous?.timezone ?? null : patch.timezone,
      phone: patch.phone === undefined ? previous?.phone ?? null : patch.phone,
      avatarReference: patch.avatarReference === undefined ? previous?.avatarReference ?? null : patch.avatarReference,
      preferences: { theme: patch.preferences?.theme ?? previous?.preferences.theme ?? "system",
        bookingReminders: patch.preferences?.bookingReminders ?? previous?.preferences.bookingReminders ?? true },
      revision: expectedRevision + 1, createdAt: previous?.createdAt ?? now, updatedAt: now,
    };
    const result = await this.repository.saveSelf({ context, profile, expectedRevision: previous ? expectedRevision : null });
    return result.ok ? { ok: true as const, value: dto(result.value) } : result;
  }
}
