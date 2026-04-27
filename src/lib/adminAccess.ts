export type AdminLikeRole = 'admin' | 'super_admin'

export function isAdminLikeRole(role: unknown): role is AdminLikeRole {
  return role === 'admin' || role === 'super_admin'
}

export function resolveUserRoleFromMetadata(user: {
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
} | null | undefined): string | null {
  const metadataRole = user?.user_metadata?.role
  if (typeof metadataRole === 'string') return metadataRole

  const appRole = user?.app_metadata?.role
  if (typeof appRole === 'string') return appRole

  return null
}

