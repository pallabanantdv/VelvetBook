/** Time comes from a port when future use cases require deterministic time. */
export interface Clock {
  now(): Date;
}

/** No concrete generator or assumed identifier format is provided. */
export interface IdentifierGenerator<Id> {
  generate(): Id;
}
