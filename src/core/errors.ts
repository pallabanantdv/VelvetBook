/** Transport-neutral descriptor; module-specific code unions remain owned by modules. */
export interface ErrorDescriptor<Code extends string = string> {
  readonly code: Code;
  readonly message: string;
}

/** Compatible with the existing feature contracts; not automatically safe for clients. */
export interface ApplicationError<
  Code extends string = string,
> extends ErrorDescriptor<Code> {
  readonly kind?: "application";
}

export type ValidationIssueCode =
  | "required"
  | "invalid_type"
  | "invalid_format"
  | "out_of_range"
  | "unknown_field";
export interface FieldValidationIssue {
  /** A schema-owned allowlisted field label; null for private/unknown paths. */
  readonly field: string | null;
  readonly code: ValidationIssueCode;
}
export interface DomainError<
  Code extends string = string,
> extends ErrorDescriptor<Code> {
  readonly kind: "domain";
}
export type ApplicationErrorCategory =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "internal";
export interface ClassifiedApplicationError<
  Code extends string = string,
> extends ApplicationError<Code> {
  readonly kind: "application";
  readonly category: ApplicationErrorCategory;
  readonly issues?: readonly FieldValidationIssue[];
}
export interface InputValidationError extends ClassifiedApplicationError<"invalid_input"> {
  readonly category: "validation";
  readonly issues: readonly FieldValidationIssue[];
}

export type RepositoryFailure = ApplicationError<"unavailable" | "conflict">;
