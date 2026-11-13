import "server-only";
export interface OrganizationBootstrapInput { name: string; slug: string }
export interface OrganizationRuntimePort {
  create(input: OrganizationBootstrapInput, idempotencyKey: string): Promise<Record<string, unknown>>;
  read(organizationId: string): Promise<Record<string, unknown>>;
  update(organizationId: string, input: Partial<OrganizationBootstrapInput> & { expectedRevision: number }, idempotencyKey: string): Promise<Record<string, unknown>>;
}
/** Actor-bound atomic adapter is supplied by server composition; no caller-selected owner. */
export class OrganizationDrafts {
  constructor(readonly persistence: OrganizationRuntimePort) {}
  create(input: OrganizationBootstrapInput, key: string) { return this.persistence.create({ name: input.name, slug: input.slug }, key); }
  read(id: string) { return this.persistence.read(id); }
  update(id: string, input: Partial<OrganizationBootstrapInput> & { expectedRevision: number }, key: string) { return this.persistence.update(id, input, key); }
}
