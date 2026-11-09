export type GovernedAssignmentStatus =
  | 'provisional'
  | 'confirmed'
  | 'cancelled'
  | 'invalidated'
  | 'completed'

export type AssignmentObjectionState =
  | 'none'
  | 'pending_review'
  | 'sustained'
  | 'overruled'

export interface PersistedAssignmentShape {
  status: string
  objectionWindowClosesAt?: string
  objectionState?: string
}

export interface AssignmentUiSnapshot {
  status: GovernedAssignmentStatus
  objectionState: AssignmentObjectionState
  autoConfirm: boolean
}

export function normalizeAssignmentUiSnapshot(
  persisted: PersistedAssignmentShape,
  nowIso = new Date().toISOString(),
): AssignmentUiSnapshot {
  const objectionState = normalizeObjectionState(persisted.objectionState)
  const status = normalizeAssignmentStatus(persisted.status)
  const autoConfirm = shouldAutoConfirmAssignment({
    status,
    objectionState,
    objectionWindowClosesAt: persisted.objectionWindowClosesAt,
    nowIso,
  })

  return {
    status: autoConfirm ? 'confirmed' : status,
    objectionState,
    autoConfirm,
  }
}

export function normalizeAssignmentStatus(value: string | null | undefined): GovernedAssignmentStatus {
  if (value === 'confirmed' || value === 'cancelled' || value === 'invalidated' || value === 'completed') {
    return value
  }

  if (value === 'objected') {
    return 'provisional'
  }

  return 'provisional'
}

export function normalizeObjectionState(value: string | null | undefined): AssignmentObjectionState {
  if (value === 'pending_review' || value === 'sustained' || value === 'overruled') {
    return value
  }

  return 'none'
}

export function shouldAutoConfirmAssignment(input: {
  status: GovernedAssignmentStatus
  objectionState: AssignmentObjectionState
  objectionWindowClosesAt?: string
  nowIso?: string
}): boolean {
  if (input.status !== 'provisional') return false
  if (input.objectionState === 'pending_review') return false
  if (!input.objectionWindowClosesAt) return false

  const closesAt = new Date(input.objectionWindowClosesAt).getTime()
  const now = new Date(input.nowIso ?? new Date().toISOString()).getTime()
  if (Number.isNaN(closesAt) || Number.isNaN(now)) return false
  return closesAt <= now
}

export function canObjectAssignment(input: {
  status: string
  objectionWindowClosesAt?: string
  nowIso?: string
}): boolean {
  if (normalizeAssignmentStatus(input.status) !== 'provisional') return false
  if (!input.objectionWindowClosesAt) return false
  const closesAt = new Date(input.objectionWindowClosesAt).getTime()
  const now = new Date(input.nowIso ?? new Date().toISOString()).getTime()
  if (Number.isNaN(closesAt) || Number.isNaN(now)) return false
  return closesAt > now
}
