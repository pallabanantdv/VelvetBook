import "server-only";
import { readAuthenticationConfiguration } from "@/config/authentication.server";
import { getDatabase } from "@/db/client.server";
import { AuthenticationService } from "@/modules/identity/application/authentication.server";
import { PostgresIdentityStore } from "@/modules/identity/infrastructure/postgres.server";
import { createIdentitySecurity } from "@/modules/identity/infrastructure/security.server";
import { DatabaseAuthorization } from "@/modules/authorization/infrastructure/access.server";

export function authenticationRuntime() {
  const config = readAuthenticationConfiguration(process.env);
  const { db } = getDatabase();
  return {
    config,
    auth: new AuthenticationService(
      new PostgresIdentityStore(db),
      createIdentitySecurity(config.secret),
      config.sessionSeconds,
      config.resetSeconds,
    ),
    authorization: new DatabaseAuthorization(db),
  };
}
