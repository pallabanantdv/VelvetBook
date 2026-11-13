import "server-only";
import type { OnboardingState, OnboardingSection, SectionProgress } from "../domain/entities/model";

export class OnboardingError extends Error {
  constructor(readonly category: "validation" | "forbidden" | "conflict" | "not_found" | "unauthenticated", message = "Onboarding operation failed.") { super(message); }
}
export const sectionOrder: readonly OnboardingSection[] = ["organization", "photos", "services", "products", "staff", "visibility", "review"];
export const featureSections = ["photos", "services", "products", "staff", "visibility"] as const;
export type FeatureSection = typeof featureSections[number];
export function requireTransition(from: OnboardingState, to: OnboardingState) {
  const transitions: Record<OnboardingState, readonly OnboardingState[]> = { draft: ["submitted"], submitted: ["under_review"], under_review: ["approved", "rejected"], rejected: ["draft"], approved: [] };
  if (!transitions[from].includes(to)) throw new OnboardingError("conflict");
}
export function completionProgress(input: { selectedStores: number; validStores: number; evidence: readonly { storeId: string; section: FeatureSection; progress: SectionProgress; expiresAt: Date }[]; storeIds: readonly string[]; confirmed: boolean; now: Date }) {
  const progress = Object.fromEntries(sectionOrder.map((section) => [section, "not_started"])) as Record<OnboardingSection, SectionProgress>;
  progress.organization = input.selectedStores > 0 && input.selectedStores === input.validStores ? "complete" : "in_progress";
  for (const section of featureSections) {
    const rows = input.storeIds.map((id) => input.evidence.find((row) => row.section === section && row.storeId === id && row.expiresAt > input.now));
    if (!rows.length || rows.some((row) => !row)) continue;
    if (section === "products" && rows.every((row) => row!.progress === "not_applicable")) progress[section] = "not_applicable";
    else progress[section] = rows.every((row) => row!.progress === "complete" || (section === "products" && row!.progress === "not_applicable")) ? "complete" : "in_progress";
  }
  const ready = sectionOrder.slice(0, -1).every((section) => progress[section] === "complete" || progress[section] === "not_applicable");
  progress.review = ready && input.confirmed ? "complete" : ready ? "in_progress" : "not_started";
  return { sectionProgress: progress, ready: ready && input.confirmed, currentSection: sectionOrder.find((section) => !["complete", "not_applicable"].includes(progress[section])) ?? "review" };
}
