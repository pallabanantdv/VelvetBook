import type { OrganizationDraftDto } from "@/modules/organizations/application/public";
import type { StoreDraftDto } from "@/modules/stores/application/public";
import type { BusinessPhotoDraftDto } from "@/modules/business-photos/application/public";
import type { ServiceDraftDto } from "@/modules/services/application/public";
import type { ProductDraftDto } from "@/modules/products/application/public";
import type { StaffAssignmentDraftDto } from "@/modules/staff/application/public";
import type { BusinessVisibilityDraftDto } from "@/modules/visibility/application/public";
import type { OnboardingSection } from "../../domain/entities/model";

/** Parsed envelope remains untrusted until the selected module validates its payload. */
export interface OnboardingSectionEnvelopeDto {
  readonly section: OnboardingSection;
  readonly payload: unknown;
}

/** Store/item IDs are selectors; the same verified organization must own every reference. */
export type OnboardingSectionSubmissionDto =
  | {
      readonly section: "organization";
      readonly payload: {
        readonly organization: OrganizationDraftDto;
        readonly stores: readonly {
          readonly storeId: string;
          readonly draft: StoreDraftDto;
        }[];
      };
    }
  | {
      readonly section: "photos";
      readonly payload: readonly BusinessPhotoDraftDto[];
    }
  | {
      readonly section: "services";
      readonly payload: readonly {
        readonly storeId: string;
        readonly itemId: string | null;
        readonly draft: ServiceDraftDto;
      }[];
    }
  | {
      readonly section: "products";
      readonly payload: readonly {
        readonly storeId: string;
        readonly itemId: string | null;
        readonly draft: ProductDraftDto;
      }[];
    }
  | {
      readonly section: "staff";
      readonly payload: readonly {
        readonly storeId: string;
        readonly assignmentId: string | null;
        readonly draft: StaffAssignmentDraftDto;
      }[];
    }
  | {
      readonly section: "visibility";
      readonly payload: readonly {
        readonly storeId: string;
        readonly draft: BusinessVisibilityDraftDto;
      }[];
    }
  | {
      readonly section: "review";
      readonly payload: { readonly confirmedRevision: number };
    };

export type OnboardingReviewDecisionDto =
  | { readonly decision: "approved" }
  | { readonly decision: "rejected"; readonly reason: string };
