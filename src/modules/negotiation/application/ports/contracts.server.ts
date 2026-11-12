import "server-only";
import type { ApplicationError, RepositoryFailure } from "@/core/errors";
import type { Result } from "@/core/results";
import type {
  CustomerOperationContext,
  OrganizationOperationContext,
} from "@/modules/authorization/application/public";
import type { Identifier } from "@/core/identifiers";
import type {
  Negotiation,
  NegotiationOffer,
} from "../../domain/entities/model";
import type { NegotiationOfferDto } from "../dtos/contracts";

export type FeatureFailure = ApplicationError<
  | "invalid_input"
  | "access_denied"
  | "conflict"
  | "unavailable"
  | "invalid_state"
>;
export type NegotiationActorContext =
  CustomerOperationContext | OrganizationOperationContext;
export interface NegotiationRepository {
  findById(input: {
    readonly context: NegotiationActorContext;
    readonly threadId: Identifier<"Negotiation">;
  }): Promise<Result<Negotiation | null, RepositoryFailure>>;
}
export interface NegotiationPort {
  offerOrCounter(input: {
    readonly context: NegotiationActorContext;
    readonly offer: NegotiationOfferDto;
  }): Promise<Result<NegotiationOffer, FeatureFailure>>;
  accept(input: {
    readonly context: NegotiationActorContext;
    readonly threadId: Identifier<"Negotiation">;
    readonly offerId: Identifier<"NegotiationOffer">;
    readonly expectedRevision: number;
  }): Promise<Result<Negotiation, FeatureFailure>>;
}
