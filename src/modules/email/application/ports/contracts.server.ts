import "server-only";
import type { Result } from "@/core/results";
import type {
  IntegrationCallContext,
  IntegrationFailure,
} from "@/core/integrations";

import type {
  EmailTemplateInput,
  RenderedEmail,
  EmailMessage,
  EmailDeliveryState,
} from "../../domain/entities/model";
/** Provider-neutral contracts only. Contexts are server-verified, never request DTOs. */
export interface EmailRenderingPort {
  render(input: {
    readonly context: IntegrationCallContext;
    readonly template: EmailTemplateInput;
  }): Promise<Result<RenderedEmail, IntegrationFailure>>;
}
export interface EmailProviderPort {
  send(input: {
    readonly context: IntegrationCallContext;
    readonly message: EmailMessage;
  }): Promise<
    Result<
      {
        readonly providerMessageId: string;
        readonly state: EmailDeliveryState;
      },
      IntegrationFailure
    >
  >;
}
