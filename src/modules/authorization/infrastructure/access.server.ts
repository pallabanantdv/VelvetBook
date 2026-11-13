import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/db/client.server";
import {
  users,
  authSessions,
  organizations,
  organizationMembers,
  staff,
  stores,
  services,
  products,
  bookings,
  bookingItems,
  payments,
  platformGrants,
  authMfa,
} from "@/db/schema";
import type {
  OrganizationPermission,
  PlatformPermission,
  CustomerPermission,
} from "../domain/permissions";
import { MEMBERSHIP_ROLE_NAMES } from "../application/policy/role-permissions.server";
import {
  AuthorizationDenied,
  hasPermission,
  type OrganizationTarget,
} from "../application/access.server";

/** All methods reload current authority; callers must keep the returned scope in queries. */
export class DatabaseAuthorization {
  constructor(readonly db: DatabaseClient["db"]) { }
  async activeSession(sessionId: string) {
    const [row] = await this.db
      .select({ session: authSessions, user: users })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.id, sessionId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, sql`now()`),
          isNull(users.disabledAt),
        ),
      )
      .limit(1);
    if (!row) throw new AuthorizationDenied();
    return row;
  }
  async memberships(sessionId: string) {
    const { user } = await this.activeSession(sessionId);
    return this.db
      .select({
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.status, "active"),
          eq(organizations.status, "active"),
        ),
      );
  }
  async organization(
    sessionId: string,
    organizationId: string,
    permission: OrganizationPermission,
    target?: OrganizationTarget,
  ) {
    const { user } = await this.activeSession(sessionId);
    const [membership] = await this.db
      .select({ id: organizationMembers.id, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id),
      )
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.status, "active"),
          eq(organizations.status, "active"),
        ),
      )
      .limit(1);
    if (
      !membership ||
      permission.scope !== "organization" ||
      !hasPermission(MEMBERSHIP_ROLE_NAMES[membership.role], permission)
    )
      throw new AuthorizationDenied();
    const assignments = await this.db
      .select({ id: staff.id, storeId: staff.storeId })
      .from(staff)
      .innerJoin(stores, eq(stores.id, staff.storeId))
      .where(
        and(
          eq(staff.organizationId, organizationId),
          eq(staff.organizationMemberId, membership.id),
          isNull(staff.archivedAt),
          isNull(stores.archivedAt),
        ),
      );
    let storeId: string | null = null;
    if (target) {
      const facts = await this.target(organizationId, target);
      if (facts.resource !== permission.resource)
        throw new AuthorizationDenied();
      storeId = facts.storeId;
    }
    if (membership.role === "staff") {
      // Collections require future assignment-filtered repositories; never return broad access.
      if (
        !target ||
        !storeId ||
        !assignments.some((assignment) => assignment.storeId === storeId)
      )
        throw new AuthorizationDenied();
      if (target.kind === "booking") {
        const [assigned] = await this.db
          .select({ id: bookingItems.id })
          .from(bookingItems)
          .innerJoin(staff, eq(staff.id, bookingItems.staffId))
          .where(
            and(
              eq(bookingItems.bookingId, target.id),
              eq(bookingItems.organizationId, organizationId),
              eq(staff.organizationMemberId, membership.id),
              isNull(staff.archivedAt),
            ),
          )
          .limit(1);
        if (!assigned) throw new AuthorizationDenied();
      }
    }
    return {
      userId: user.id,
      organizationId,
      membershipId: membership.id,
      role: membership.role,
      storeId,
      staffIds: assignments.map((assignment) => assignment.id),
    };
  }
  private async target(
    organizationId: string,
    target: OrganizationTarget,
  ): Promise<{ resource: string; storeId: string | null }> {
    if (target.kind === "organization") {
      if (target.id !== organizationId) throw new AuthorizationDenied();
      return { resource: "organization", storeId: null };
    }
    if (target.kind === "membership") {
      const [row] = await this.db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.id, target.id),
            eq(organizationMembers.organizationId, organizationId),
          ),
        )
        .limit(1);
      if (!row) throw new AuthorizationDenied();
      return { resource: "membership", storeId: null };
    }
    if (target.kind === "store") {
      const [row] = await this.db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(
            eq(stores.id, target.id),
            eq(stores.organizationId, organizationId),
            isNull(stores.archivedAt),
          ),
        )
        .limit(1);
      if (!row) throw new AuthorizationDenied();
      return { resource: "store", storeId: row.id };
    }
    const table =
      target.kind === "service"
        ? services
        : target.kind === "product"
          ? products
          : target.kind === "staff"
            ? staff
            : target.kind === "booking"
              ? bookings
              : null;
    if (table) {
      const [row] = await this.db
        .select({ storeId: table.storeId })
        .from(table)
        .where(
          and(
            eq(table.id, target.id),
            eq(table.organizationId, organizationId),
          ),
        )
        .limit(1);
      if (!row) throw new AuthorizationDenied();
      return {
        resource:
          target.kind === "service" || target.kind === "product"
            ? "catalog"
            : target.kind,
        storeId: row.storeId,
      };
    }
    if (target.kind === "payment") {
      const [row] = await this.db
        .select({ storeId: bookings.storeId })
        .from(payments)
        .innerJoin(bookings, eq(bookings.id, payments.bookingId))
        .where(
          and(
            eq(payments.id, target.id),
            eq(payments.organizationId, organizationId),
          ),
        )
        .limit(1);
      if (row) return { resource: "payment", storeId: row.storeId };
    }
    throw new AuthorizationDenied();
  }
  async customer(
    sessionId: string,
    permission: CustomerPermission,
    target?: { kind: "booking" | "payment" | "profile"; id: string },
  ) {
    const { user } = await this.activeSession(sessionId);
    if (
      permission.scope !== "customer" ||
      !hasPermission("customer", permission)
    )
      throw new AuthorizationDenied();
    if (target) {
      if (target.kind !== permission.resource) throw new AuthorizationDenied();
      if (target.kind === "profile") {
        if (target.id !== user.id) throw new AuthorizationDenied();
      } else if (target.kind === "booking") {
        const [row] = await this.db
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.id, target.id),
              eq(bookings.customerUserId, user.id),
            ),
          )
          .limit(1);
        if (!row) throw new AuthorizationDenied();
      } else {
        const [row] = await this.db
          .select({ id: payments.id })
          .from(payments)
          .innerJoin(bookings, eq(bookings.id, payments.bookingId))
          .where(
            and(
              eq(payments.id, target.id),
              eq(bookings.customerUserId, user.id),
            ),
          )
          .limit(1);
        if (!row) throw new AuthorizationDenied();
      }
    } else if (!["profile", "booking"].includes(permission.resource)) {
      // Other resource ownership/publication verifiers belong to their later slices.
      throw new AuthorizationDenied();
    }
    return { userId: user.id };
  }
  async platform(sessionId: string, permission: PlatformPermission) {
    const { user, session } = await this.activeSession(sessionId);
    const now = Date.now();
    if (
      !user.emailVerifiedAt ||
      !session.mfaVerifiedAt ||
      session.mfaVerifiedAt.getTime() > now ||
      now - session.mfaVerifiedAt.getTime() > 600000 ||
      permission.scope !== "platform" ||
      !hasPermission("platform_admin", permission)
    )
      throw new AuthorizationDenied();
    const [grant] = await this.db
      .select({ id: platformGrants.id })
      .from(platformGrants)
      .innerJoin(authMfa, eq(authMfa.userId, platformGrants.userId))
      .where(
        and(
          eq(platformGrants.userId, user.id),
          eq(platformGrants.status, "active"),
          eq(authMfa.confirmed, true),
        ),
      )
      .limit(1);
    if (!grant) throw new AuthorizationDenied();
    return {
      userId: user.id,
      grantId: grant.id,
      permission,
      verifiedAt: new Date(),
    };
  }
}
