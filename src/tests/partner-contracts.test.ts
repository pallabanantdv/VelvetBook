import assert from "node:assert/strict";
import test from "node:test";
import { organizationsDraftSchema } from "../modules/organizations/presentation/validation.server";
import { storesDraftSchema } from "../modules/stores/presentation/validation.server";
import { staffDraftSchema } from "../modules/staff/presentation/validation.server";
import { servicesDraftSchema } from "../modules/services/presentation/validation.server";
import { productsDraftSchema } from "../modules/products/presentation/validation.server";
import { businessPhotosDraftSchema } from "../modules/business-photos/presentation/validation.server";
import { visibilityDraftSchema } from "../modules/visibility/presentation/validation.server";
import { operatingHoursDraftSchema } from "../modules/operating-hours/presentation/validation.server";
import {
  onboardingDraftSchema,
  onboardingReviewDecisionSchema,
  onboardingSectionEnvelopeSchema,
} from "../modules/onboarding/presentation/validation.server";
import { ROLE_PERMISSIONS } from "../modules/authorization/application/policy/role-permissions.server";
import type {
  Onboarding,
  OnboardingSection,
} from "../modules/onboarding/application/public";
import type { OnboardingSectionSubmissionDto } from "../modules/onboarding/application/public";

type Assert<T extends true> = T;
export type OnboardingTypeChecks = [
  Assert<
    OnboardingSection extends OnboardingSectionSubmissionDto["section"]
      ? true
      : false
  >,
  Assert<
    OnboardingSectionSubmissionDto["section"] extends OnboardingSection
      ? true
      : false
  >,
  Assert<
    Extract<
      Onboarding,
      { state: "approved" }
    >["review"]["decision"] extends "approved"
      ? true
      : false
  >,
  Assert<
    Extract<Onboarding, { state: "draft" }>["review"] extends null
      ? true
      : false
  >,
];

const id = "20000000-0000-4000-8000-000000000001";
const service = {
  name: "Consultation",
  description: null,
  durationMinutes: 30,
  price: { amount: "100.00", currency: "INR" },
};
const hours = {
  subject: { kind: "store" },
  timezone: "Asia/Kolkata",
  weekly: Array.from({ length: 7 }, (_, day) => ({ day, intervals: [] })),
  exceptions: [],
};
const examples = [
  [
    "organizations",
    organizationsDraftSchema,
    { name: "VelvetBook", slug: "velvet-book" },
  ],
  [
    "stores",
    storesDraftSchema,
    { name: "Store", slug: "central", timezone: "Asia/Kolkata", address: null },
  ],
  ["staff", staffDraftSchema, { membershipId: id }],
  ["services", servicesDraftSchema, service],
  [
    "products",
    productsDraftSchema,
    {
      sku: "A1",
      name: "Product",
      description: null,
      price: { amount: "25.00", currency: "INR" },
    },
  ],
  [
    "business-photos",
    businessPhotosDraftSchema,
    {
      placement: { kind: "store", storeId: id },
      assetId: id,
      altText: "Store interior",
      sortOrder: 0,
    },
  ],
  [
    "visibility",
    visibilityDraftSchema,
    { requestedMode: "hidden", bookingEnabled: false },
  ],
  ["operating-hours", operatingHoursDraftSchema, hours],
  ["onboarding", onboardingDraftSchema, { selectedStoreIds: [id] }],
] as const;

for (const [name, schema, payload] of examples) {
  test(`${name}: valid shape does not accept client tenant or approval authority`, () => {
    assert.ok(schema.safeParse(payload).success);
    for (const injection of [
      { organizationId: id },
      { state: "approved" },
      { role: "platform_admin" },
      { revision: 10 },
    ]) {
      assert.equal(
        schema.safeParse({ ...payload, ...injection }).success,
        false,
      );
    }
  });
}

test("money rejects floats, negatives, excess precision and invalid currency shape", () => {
  for (const amount of [
    100,
    "-1.00",
    "0.001",
    "1000000000000.00",
    "NaN",
    "1e2",
    "01.00",
  ]) {
    assert.equal(
      servicesDraftSchema.safeParse({
        ...service,
        price: { amount, currency: "INR" },
      }).success,
      false,
    );
  }
  assert.ok(
    servicesDraftSchema.safeParse({
      ...service,
      price: { amount: "999999999999.99", currency: "INR" },
    }).success,
  );
  assert.equal(
    servicesDraftSchema.safeParse({
      ...service,
      price: { amount: "1.00", currency: "inr" },
    }).success,
    false,
  );
});

test("service durations and hours reject out-of-range primitive values", () => {
  for (const durationMinutes of [0, -1, 0.5])
    assert.equal(
      servicesDraftSchema.safeParse({ ...service, durationMinutes }).success,
      false,
    );
  assert.equal(
    operatingHoursDraftSchema.safeParse({ ...hours, weekly: [] }).success,
    false,
  );
  assert.equal(
    operatingHoursDraftSchema.safeParse({
      ...hours,
      weekly: hours.weekly.map((day) => ({
        ...day,
        intervals: [{ startMinute: -1, endMinute: 1441 }],
      })),
    }).success,
    false,
  );
});

test("photo draft accepts asset references, not upload URLs or approval flags", () => {
  const base = {
    placement: { kind: "organization" },
    assetId: id,
    altText: "Business photo",
    sortOrder: 0,
  };
  assert.equal(
    businessPhotosDraftSchema.safeParse({
      ...base,
      uploadUrl: "https://example.com/asset",
    }).success,
    false,
  );
  assert.equal(
    businessPhotosDraftSchema.safeParse({ ...base, moderation: "approved" })
      .success,
    false,
  );
});

test("onboarding uses exactly seven section names and keeps payload untrusted", () => {
  for (const section of [
    "organization",
    "photos",
    "services",
    "products",
    "staff",
    "visibility",
    "review",
  ]) {
    assert.ok(
      onboardingSectionEnvelopeSchema.safeParse({ section, payload: null })
        .success,
    );
  }
  for (const section of ["stores", "operating-hours", "approved"])
    assert.equal(
      onboardingSectionEnvelopeSchema.safeParse({ section, payload: {} })
        .success,
      false,
    );
});

test("review requires explicit nonempty rejection reason and forbids client reviewer IDs", () => {
  assert.ok(
    onboardingReviewDecisionSchema.safeParse({ decision: "approved" }).success,
  );
  assert.ok(
    onboardingReviewDecisionSchema.safeParse({
      decision: "rejected",
      reason: "Missing details",
    }).success,
  );
  for (const decision of [
    { decision: "rejected" },
    { decision: "rejected", reason: " " },
    { decision: "approved", reviewerId: id },
  ])
    assert.equal(
      onboardingReviewDecisionSchema.safeParse(decision).success,
      false,
    );
});

test("onboarding tenant submission and platform review remain separate static capabilities", () => {
  for (const role of ["organization_owner", "organization_manager"] as const) {
    assert.ok(
      ROLE_PERMISSIONS[role].some(
        (p) => p.resource === "onboarding" && p.action === "submit",
      ),
    );
  }
  assert.ok(
    ROLE_PERMISSIONS.platform_admin.some(
      (p) => p.resource === "onboarding" && p.action === "review",
    ),
  );
  assert.ok(
    !ROLE_PERMISSIONS.staff.some(
      (p) => (p.resource as string) === "onboarding",
    ),
  );
});
