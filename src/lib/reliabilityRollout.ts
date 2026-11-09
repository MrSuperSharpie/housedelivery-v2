import type { ReliabilityEnforcementMode } from '@/lib/types'

export interface InspectorReliabilityFeatureFlags {
  inspectorReliabilityEnabled: boolean
  inspectorTierDashboardEnabled: boolean
  confirmationLadderEnabled: boolean
  standbyReassignmentEnabled: boolean
  payoutReserveEnabled: boolean
  reliabilityGuaranteeBuilderCopyEnabled: boolean
  adminReliabilityControlCentreEnabled: boolean
}

export interface InspectorReliabilityRolloutConfig extends InspectorReliabilityFeatureFlags {
  enforcementMode: ReliabilityEnforcementMode
  emergencyKillSwitch: boolean
  automaticRestrictionRulesEnabled: boolean
  automaticSuspensionEnabled: boolean
  suspensionsRequireAdminConfirmation: boolean
}

export interface InspectorReliabilityRolloutState extends InspectorReliabilityRolloutConfig {
  scoresCalculated: boolean
  adminDataVisible: boolean
  inspectorDashboardVisible: boolean
  confirmationLadderVisible: boolean
  standbyReassignmentVisible: boolean
  builderGuaranteeVisible: boolean
  payoutReserveVisible: boolean
  warningNotificationsEnabled: boolean
  adminReviewedConsequencesEnabled: boolean
  financialConsequencesEnforced: boolean
  moneyMovementAllowed: boolean
  automaticInspectorRestrictionAllowed: boolean
  automaticSuspensionAllowed: boolean
  automaticConsequencesAuditRequired: boolean
}

export const DEFAULT_RELIABILITY_FEATURE_FLAGS: InspectorReliabilityFeatureFlags = {
  inspectorReliabilityEnabled: true,
  inspectorTierDashboardEnabled: false,
  confirmationLadderEnabled: true,
  standbyReassignmentEnabled: true,
  payoutReserveEnabled: true,
  reliabilityGuaranteeBuilderCopyEnabled: true,
  adminReliabilityControlCentreEnabled: true,
}

export const DEFAULT_RELIABILITY_ROLLOUT_CONFIG: InspectorReliabilityRolloutConfig = {
  ...DEFAULT_RELIABILITY_FEATURE_FLAGS,
  enforcementMode: 'observe_only',
  emergencyKillSwitch: false,
  automaticRestrictionRulesEnabled: false,
  automaticSuspensionEnabled: false,
  suspensionsRequireAdminConfirmation: true,
}

const FEATURE_KEYS = Object.keys(DEFAULT_RELIABILITY_FEATURE_FLAGS) as Array<keyof InspectorReliabilityFeatureFlags>

export function resolveReliabilityRolloutConfig(
  rawConfig?: Record<string, unknown> | null,
): InspectorReliabilityRolloutConfig {
  const config = isRecord(rawConfig) ? rawConfig : {}
  const featureFlags = isRecord(config.featureFlags) ? config.featureFlags : {}
  const enforcementMode = isReliabilityEnforcementMode(config.enforcementMode)
    ? config.enforcementMode
    : isReliabilityEnforcementMode(config.enforcement_mode)
      ? config.enforcement_mode
      : DEFAULT_RELIABILITY_ROLLOUT_CONFIG.enforcementMode

  const flags = { ...DEFAULT_RELIABILITY_FEATURE_FLAGS }
  for (const key of FEATURE_KEYS) {
    const rawValue = config[key] ?? featureFlags[key]
    if (typeof rawValue === 'boolean') flags[key] = rawValue
  }

  if (featureFlags.inspectorTierDashboardEnabled === undefined && config.inspectorTierDashboardEnabled === undefined) {
    flags.inspectorTierDashboardEnabled = enforcementMode !== 'observe_only'
  }

  return {
    ...flags,
    enforcementMode,
    emergencyKillSwitch: readBoolean(config, featureFlags, 'emergencyKillSwitch', false),
    automaticRestrictionRulesEnabled: readBoolean(config, featureFlags, 'automaticRestrictionRulesEnabled', false),
    automaticSuspensionEnabled: readBoolean(config, featureFlags, 'automaticSuspensionEnabled', false),
    suspensionsRequireAdminConfirmation: readBoolean(config, featureFlags, 'suspensionsRequireAdminConfirmation', true),
  }
}

export function evaluateReliabilityRollout(
  rawConfig?: Record<string, unknown> | null,
): InspectorReliabilityRolloutState {
  const config = resolveReliabilityRolloutConfig(rawConfig)
  const reliabilityEnabled = config.inspectorReliabilityEnabled
  const enforcementActive = reliabilityEnabled && !config.emergencyKillSwitch
  const fullEnforcement = enforcementActive && config.enforcementMode === 'full_enforcement'
  const softOrFull = enforcementActive && config.enforcementMode !== 'observe_only'

  return {
    ...config,
    scoresCalculated: reliabilityEnabled,
    adminDataVisible: reliabilityEnabled && config.adminReliabilityControlCentreEnabled,
    inspectorDashboardVisible: reliabilityEnabled && config.inspectorTierDashboardEnabled,
    confirmationLadderVisible: reliabilityEnabled && config.confirmationLadderEnabled,
    standbyReassignmentVisible: reliabilityEnabled && config.standbyReassignmentEnabled,
    builderGuaranteeVisible: reliabilityEnabled && config.reliabilityGuaranteeBuilderCopyEnabled,
    payoutReserveVisible: reliabilityEnabled && config.payoutReserveEnabled,
    warningNotificationsEnabled: softOrFull,
    adminReviewedConsequencesEnabled: softOrFull,
    financialConsequencesEnforced: fullEnforcement && config.payoutReserveEnabled,
    moneyMovementAllowed: fullEnforcement && config.payoutReserveEnabled,
    automaticInspectorRestrictionAllowed: fullEnforcement && config.automaticRestrictionRulesEnabled,
    automaticSuspensionAllowed: fullEnforcement
      && config.automaticSuspensionEnabled
      && !config.suspensionsRequireAdminConfirmation,
    automaticConsequencesAuditRequired: true,
  }
}

export function isReliabilityFeatureVisible(
  feature: keyof InspectorReliabilityFeatureFlags,
  rawConfig?: Record<string, unknown> | null,
): boolean {
  const state = evaluateReliabilityRollout(rawConfig)
  switch (feature) {
    case 'inspectorTierDashboardEnabled':
      return state.inspectorDashboardVisible
    case 'confirmationLadderEnabled':
      return state.confirmationLadderVisible
    case 'standbyReassignmentEnabled':
      return state.standbyReassignmentVisible
    case 'payoutReserveEnabled':
      return state.payoutReserveVisible
    case 'reliabilityGuaranteeBuilderCopyEnabled':
      return state.builderGuaranteeVisible
    case 'adminReliabilityControlCentreEnabled':
      return state.adminDataVisible
    case 'inspectorReliabilityEnabled':
      return state.scoresCalculated
    default:
      return false
  }
}

export function buildEmergencyEnforcementDisablePatch(adminNote: string): {
  enforcementMode: ReliabilityEnforcementMode
  patch: Record<string, unknown>
  auditMetadata: Record<string, unknown>
} {
  if (!adminNote.trim()) throw new Error('Admin rationale is required to disable enforcement.')

  return {
    enforcementMode: 'observe_only',
    patch: {
      emergencyKillSwitch: true,
      automaticRestrictionRulesEnabled: false,
      automaticSuspensionEnabled: false,
    },
    auditMetadata: {
      action: 'reliability.enforcement_disabled',
      reason: adminNote,
      moneyMovementAllowed: false,
      automaticConsequencesDisabled: true,
    },
  }
}

function readBoolean(
  config: Record<string, unknown>,
  featureFlags: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = config[key] ?? featureFlags[key]
  return typeof value === 'boolean' ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isReliabilityEnforcementMode(value: unknown): value is ReliabilityEnforcementMode {
  return value === 'observe_only' || value === 'soft_enforcement' || value === 'full_enforcement'
}
