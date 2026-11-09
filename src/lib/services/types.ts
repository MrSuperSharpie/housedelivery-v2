/**
 * Service layer — typed interfaces for core data flows.
 * Backend-ready; no new localStorage-only logic for compliance-critical records.
 */

import type {
  Project,
  PropertySite,
  Permit,
  Submission,
  SubmissionVersion,
  EvidenceItem,
  EvidenceManifest,
  EvidenceArchive,
  Deficiency,
  Authority,
  AuditEvent,
} from '@/lib/domain/types'
import type { AuthorityPackage } from '@/lib/packages/authority-package'

// Re-export for consumers
export type { AuthorityPackage }

// ─── Project service ────────────────────────────────────────────────────────

export interface IProjectService {
  getById(id: string): Promise<Project | null>
  listByBuilder(builderId: string): Promise<Project[]>
  create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>
  update(id: string, patch: Partial<Project>): Promise<Project | null>
}

// ─── Property site service ───────────────────────────────────────────────────

export interface IPropertySiteService {
  getById(id: string): Promise<PropertySite | null>
  create(site: Omit<PropertySite, 'id'>): Promise<PropertySite>
  update(id: string, patch: Partial<PropertySite>): Promise<PropertySite | null>
}

// ─── Permit service ──────────────────────────────────────────────────────────

export interface IPermitService {
  getById(id: string): Promise<Permit | null>
  listByProject(projectId: string): Promise<Permit[]>
  create(permit: Omit<Permit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permit>
  update(id: string, patch: Partial<Permit>): Promise<Permit | null>
}

// ─── Submission service ───────────────────────────────────────────────────────

export interface ISubmissionService {
  getById(id: string): Promise<Submission | null>
  listByProject(projectId: string): Promise<Submission[]>
  create(submission: Omit<Submission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Submission>
  addVersion(submissionId: string, version: Omit<SubmissionVersion, 'id' | 'createdAt'>): Promise<SubmissionVersion>
}

// ─── Evidence service ────────────────────────────────────────────────────────

export interface IEvidenceService {
  getById(id: string): Promise<EvidenceItem | null>
  listByProject(projectId: string): Promise<EvidenceItem[]>
  listBySubmission(submissionId: string): Promise<EvidenceItem[]>
  create(item: Omit<EvidenceItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvidenceItem>
  createManifest(submissionId: string, itemIds: string[]): Promise<EvidenceManifest>
  archive(manifestId: string, projectId: string, permitId?: string): Promise<EvidenceArchive>
}

// ─── Deficiency service ──────────────────────────────────────────────────────

export interface IDeficiencyService {
  getById(id: string): Promise<Deficiency | null>
  listBySubmission(submissionId: string): Promise<Deficiency[]>
  create(deficiency: Omit<Deficiency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deficiency>
  updateStatus(id: string, status: Deficiency['status'], tradeResponse?: string): Promise<Deficiency | null>
}

// ─── Authority service ───────────────────────────────────────────────────────

export interface IAuthorityService {
  getById(id: string): Promise<Authority | null>
  listByJurisdiction(jurisdictionId: string): Promise<Authority[]>
}

// ─── Authority package service ───────────────────────────────────────────────

export interface IAuthorityPackageService {
  generate(submissionId: string, options?: { includeAuditTrail: boolean }): Promise<AuthorityPackage>
  getBySubmission(submissionId: string): Promise<AuthorityPackage | null>
}

// ─── Audit service ───────────────────────────────────────────────────────────

export interface IAuditService {
  append(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent>
  listByProject(projectId: string, limit?: number): Promise<AuditEvent[]>
}
