import type { UserId } from "./identifiers";
import type { Result } from "./results";

/** Identity established by a trusted adapter, never directly from request input. */
export interface Principal {
  readonly subjectId: UserId;
}

export interface AuthorizationRequest<Action extends string, Resource> {
  readonly principal: Principal;
  readonly action: Action;
  readonly resource: Resource;
}

export interface AuthorizationDenied {
  readonly code: "authorization_denied";
}

/** Generic boundary only. Concrete security contracts live in authorization/application/public. */
export interface AuthorizationPort<Action extends string, Resource> {
  authorize(
    request: AuthorizationRequest<Action, Resource>,
  ): Promise<Result<void, AuthorizationDenied>>;
}
