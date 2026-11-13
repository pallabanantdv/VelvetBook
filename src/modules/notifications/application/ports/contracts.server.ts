import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";

import type {
  DeliveryState,
  NotificationIntent,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface NotificationSchedulingPort {
  enqueueCommitted(input: {
    readonly context: IntegrationCallContext;
    readonly intent: NotificationIntent;
  }): Promise<
    Result<
      {
        readonly notificationId: NotificationIntent["id"];
        readonly state: "queued" | "suppressed";
      },
      IntegrationFailure
    >
  >;
}
export interface NotificationPreferencesPort {
  check(input: {
    readonly context: IntegrationCallContext;
    readonly intent: NotificationIntent;
  }): Promise<
    Result<
      { readonly permitted: boolean; readonly reason: string | null },
      IntegrationFailure
    >
  >;
}
export interface SmsProviderPort {
  send(input: {
    readonly context: IntegrationCallContext;
    readonly destination: string;
    readonly text: string;
  }): Promise<
    Result<
      { readonly providerMessageId: string; readonly state: DeliveryState },
      IntegrationFailure
    >
  >;
}
export interface PushProviderPort {
  send(input: {
    readonly context: IntegrationCallContext;
    readonly deviceToken: string;
    readonly title: string;
    readonly body: string;
    readonly deepLinkRef: string | null;
  }): Promise<
    Result<
      { readonly providerMessageId: string; readonly state: DeliveryState },
      IntegrationFailure
    >
  >;
}
export interface EmailNotificationDispatchPort {
  dispatch(input: {
    readonly context: IntegrationCallContext;
    readonly intent: NotificationIntent;
  }): Promise<
    Result<
      { readonly providerMessageId: string; readonly state: DeliveryState },
      IntegrationFailure
    >
  >;
}
