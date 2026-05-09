// Canonical event_type registry. Adding a new event? Add it here so consumers compile-check.

export const EventTypes = {
  scraperRunSucceeded: 'scraper_run_succeeded',
  scraperRunFailed: 'scraper_run_failed',
  normalizationAutoLearned: 'normalization_auto_learned',
  normalizationManualResolved: 'normalization_manual_resolved',
  normalizationLlmLowConfidence: 'normalization_llm_low_confidence',
  outlierDetected: 'outlier_detected',
  providerQualityDegraded: 'provider_quality_degraded',
  providerQualityRecovered: 'provider_quality_recovered',
  methodologyChanged: 'methodology_changed',
  indexValueComputed: 'index_value_computed',
  providerCandidateDiscovered: 'provider_candidate_discovered',
  contentDrafted: 'content_drafted',
  contentPublished: 'content_published',
  contentRejected: 'content_rejected',
  alertTriggered: 'alert_triggered',
  newHardwareDetected: 'new_hardware_detected',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface SystemEventInput {
  event_type: EventType;
  entity_type?: string;
  entity_id?: string;
  payload: Record<string, unknown>;
  source: string;
}
