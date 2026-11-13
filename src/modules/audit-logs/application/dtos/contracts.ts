export interface AuditSearchDto {
  readonly from: string;
  readonly to: string;
  readonly actions: readonly string[];
  readonly cursor: string | null;
  readonly limit: number;
}
export interface AuditExportDto {
  readonly from: string;
  readonly to: string;
  readonly scopeFingerprint: string;
  readonly format: "jsonl";
}
