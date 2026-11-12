/** Stable failure data. Feature modules own their specific error code unions. */
export interface ApplicationError<Code extends string = string> {
  readonly code: Code;
  readonly message: string;
}

export type RepositoryFailure = ApplicationError<"unavailable" | "conflict">;
