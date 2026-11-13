import type { InputValidationError } from "./errors";
import type { Result } from "./results";

export interface InputValidator<Output> {
  validate(input: unknown): Result<Output, InputValidationError>;
}
