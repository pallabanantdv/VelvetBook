/** Editable fields only. Tenant, state, revision and authorization are not body fields. */
export interface OperatingHoursDraftDto {
  readonly subject:
    | { readonly kind: "store" }
    | { readonly kind: "staff"; readonly staffId: string };
  readonly timezone: string;
  readonly weekly: readonly {
    readonly day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    readonly intervals: readonly {
      readonly startMinute: number;
      readonly endMinute: number;
    }[];
  }[];
  readonly exceptions: readonly {
    readonly date: string;
    readonly intervals: readonly {
      readonly startMinute: number;
      readonly endMinute: number;
    }[];
  }[];
}
/** Edit projection, not a serialization of a domain entity or secret context. */
export interface OperatingHoursViewDto {
  readonly id: string;
  readonly organizationId: string;
  readonly storeId: string | null;
  readonly revision: number;
  readonly updatedAt: string;
  readonly data: OperatingHoursDraftDto;
}
