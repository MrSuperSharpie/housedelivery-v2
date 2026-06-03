import type { Region } from '@/lib/types'

export type CompletionResponsibleParty = 'Builder' | 'Inspector' | 'Auditor' | 'AHJ'
export type CompletionInspectionStatus = 'Pending' | 'Passed' | 'Failed' | 'N/A'
export type CompletionRequiredLogic = boolean | string
export type AhjOverlayType = 'province_base' | 'municipal' | 'vancouver' | 'first_nation'
export type CompletionItemUiSchema = 'field_view' | 'standard'

export interface CompletionStagePhaseDefinition {
  id: string
  label: string
  stageNumbers: number[]
}

export interface CompletionProjectContext {
  city?: string
  address?: string
  projectType?: string
  notes?: string
  region?: string
}

export interface AhjOverlayContext {
  type: AhjOverlayType
  label: string
  jurisdictionName: string
  signals: string[]
  summary: string
}

export interface CompletionChecklistItemDefinition {
  item_code: string
  stage_number: number
  stage_name: string
  item_label: string
  ui_schema: CompletionItemUiSchema
  item_purpose: string
  field_view_details?: string
  view_details?: string
  stop_if?: string[]
  field_checklist: string[]
  inspector_notes_guidance: string
  what_to_check: string[]
  pass_when: string[]
  fail_when: string[]
  pending_when: string[]
  required_evidence: string[]
  optional_evidence: string[]
  evidence_mode: 'required_upload' | 'verify_existing'
  is_required: CompletionRequiredLogic
  permit_type: string
  responsible_party: CompletionResponsibleParty
  document_upload_required: boolean
  inspection_status: CompletionInspectionStatus
  ahj_notes: string
  dependencies: string[]
  code_references?: Array<{
    label: string
    legalReference: string
    sourceTitle?: string | null
    sourceUrl?: string | null
    isVbblOnly?: boolean
  }>
}

export interface CompletionChecklistStageDefinition {
  stage_number: number
  stage_name: string
  summary: string
  items: CompletionChecklistItemDefinition[]
}

interface RawStageDefinition {
  stageNumber: number
  stageName: string
  summary: string
  items: Array<string | StructuredStageItemDefinition>
}

interface StructuredStageItemDefinition {
  code?: string
  label: string
  uiSchema?: CompletionItemUiSchema
  purpose: string
  fieldViewDetails?: string
  viewDetails?: string
  stopIf?: string[]
  fieldChecklist?: string[]
  notesGuidance: string
  whatToCheck: string[]
  passWhen: string[]
  failWhen: string[]
  pendingWhen: string[]
  requiredEvidence: string[]
  optionalEvidence: string[]
  evidenceMode: CompletionChecklistItemDefinition['evidence_mode']
  permitType?: string
  responsibleParty?: CompletionResponsibleParty
  requiredLogic?: CompletionRequiredLogic
  documentUploadRequired?: boolean
  ahjNotes?: string
  dependencies?: string[]
  codeReferences?: Array<{
    label: string
    legalReference: string
    sourceTitle?: string | null
    sourceUrl?: string | null
    isVbblOnly?: boolean
  }>
}

export const COMPLETION_STAGE_PHASES: CompletionStagePhaseDefinition[] = [
  {
    id: 'phase-1',
    label: 'PHASE 1: Project Initiation (S01-S03)',
    stageNumbers: [1, 2, 3],
  },
  {
    id: 'phase-2',
    label: 'PHASE 2: Site & Foundation (S04-S06)',
    stageNumbers: [4, 5, 6],
  },
  {
    id: 'phase-3',
    label: 'PHASE 3: Vertical Structure (S07-S13)',
    stageNumbers: [7, 8, 9, 10, 11, 12, 13],
  },
  {
    id: 'phase-4',
    label: 'PHASE 4: Completion & Occupancy (S14-S15)',
    stageNumbers: [14, 15],
  },
]

const STRUCTURAL_STAGE_1_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S01-01',
    label: 'Project Address and Legal Description',
    uiSchema: 'field_view',
    purpose: 'Confirm the inspection is tied to the correct property, permit file, and legal parcel before any downstream structural review proceeds.',
    viewDetails: 'Confirm the inspection is matched to the correct civic address, legal parcel, and permit file. A civic address or legal description conflict must be resolved before any downstream structural review proceeds reliably.',
    stopIf: [
      'The civic address or legal description conflicts with the permit in a way that prevents reliable identification of the correct project file.',
    ],
    fieldChecklist: [
      'Civic address matches the permit.',
      'Legal description matches the record set.',
      'Project identity is consistent across submitted documents.',
    ],
    notesGuidance: 'Record the civic address reviewed, legal description reviewed, permit reference, documents checked, and any discrepancy or confirmation.',
    whatToCheck: [
      'Civic address matches the permit and supporting documents.',
      'Legal description matches the permit package, drawings, survey, or site documentation.',
      'Project identity is consistent across all uploaded records.',
      'No mismatch exists between site address, permit reference, and supporting documentation.',
    ],
    passWhen: [
      'The civic address is correct and consistent across the record set.',
      'The legal description is present and matches the permit package.',
      'No material discrepancy exists in the project identity.',
    ],
    failWhen: [
      'The civic address conflicts with the permit or submitted documents.',
      'The legal description is missing, incomplete, or inconsistent.',
      'Supporting records identify a different parcel, lot, or project location.',
      'The mismatch creates uncertainty about the correct inspection file.',
    ],
    pendingWhen: [
      'Additional documentation is required before confirming the project identity.',
      'Submitted records are incomplete but may be clarified quickly.',
    ],
    requiredEvidence: [
      'Builder-uploaded permit document or permit cover page.',
      'Builder-uploaded site plan, survey, or drawing showing the project address and legal description.',
    ],
    optionalEvidence: [
      'Supporting correspondence.',
      'Authority comments.',
      'Additional routing or review notes.',
      'Inspector-uploaded supplemental evidence only if a discrepancy must be documented.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Capture any jurisdiction-specific naming differences, civic addressing conventions, legal parcel references, or authority-imposed project identifiers.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Administration and Permit Identification',
        legalReference: 'BCBC 2024 Division C, Part 1',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'Municipal Civic Addressing Requirements',
        legalReference: 'Local Government Act (BC), Part 14',
        sourceTitle: 'Local Government Act (BC)',
      },
    ],
  },
  {
    code: 'S01-02',
    label: 'Governing Authority, Code Path, and Jurisdiction Overlay',
    uiSchema: 'field_view',
    purpose: 'Confirm the governing authority, permit issuing body, code path, code edition, and jurisdiction overlay before field execution begins.',
    viewDetails: 'Confirm the governing authority, permit issuing body, code edition, and jurisdiction overlay are correctly identified before field execution begins. An unresolved AHJ or code path mismatch must be corrected at this stage.',
    stopIf: [
      'Governing authority or applicable code edition cannot be confirmed from the project record.',
      'Local amendments that materially affect the inspection are known but not reflected in the permit basis.',
    ],
    fieldChecklist: [
      'AHJ is correctly identified.',
      'Permit routing matches the project authority.',
      'Code path and code edition are confirmed.',
      'Local overlays or amendments are known.',
    ],
    notesGuidance: 'Record the identified AHJ, permit issuing body, review path, governing code, code edition, and any known local overlay or exception.',
    whatToCheck: [
      'Correct AHJ has been identified.',
      'Permit was issued or routed through the expected authority.',
      'Applicable code family is correctly identified.',
      'Code edition in force for the permit is understood.',
      'Local amendments, municipal overlays, or authority bulletins affecting structural review are known.',
      'The project is not subject to a different municipality, regional district, or First Nation land office than stated.',
    ],
    passWhen: [
      'The governing authority is correctly identified.',
      'Permit routing aligns with the AHJ shown in the project documents.',
      'Code path and code edition are clearly identified.',
      'Any local amendments or adopted variations are known and recorded.',
      'No unresolved jurisdictional or code ambiguity exists.',
    ],
    failWhen: [
      'The wrong AHJ appears to be associated with the project.',
      'Permit routing is inconsistent with the site location or project record.',
      'The wrong code edition appears to have been used.',
      'No governing code path can be identified from the project record.',
      'Local amendments likely apply but are not reflected in the file.',
    ],
    pendingWhen: [
      'Authority confirmation is required on jurisdiction, code edition, or amendment applicability.',
      'The permit record is incomplete but can likely be clarified.',
    ],
    requiredEvidence: [
      'Builder-uploaded permit document showing issuing authority.',
      'Builder-uploaded application, code summary, or routing document identifying governing code basis and authority.',
    ],
    optionalEvidence: [
      'Municipal bulletins.',
      'AHJ circulars.',
      'Consultant code notes.',
      'Inspector-uploaded supplemental evidence only if a code-path or jurisdiction discrepancy must be documented.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Use this container to capture municipality-specific, regional district, or First Nation authority conditions that materially affect the structural inspection path.',
    dependencies: ['S01-01'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Scope and Application',
        legalReference: 'BCBC 2024 Division A, Part 1',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'Vancouver Building By-law 2025 — Local Amendments and Jurisdiction',
        legalReference: 'VBBL 2025, Division A',
        sourceTitle: 'Vancouver Building By-law 2025',
        isVbblOnly: true,
      },
    ],
  },
  {
    code: 'S01-03',
    label: 'Project Type, Building Type, and Structural Scope Classification',
    uiSchema: 'field_view',
    purpose: 'Confirm the project type, building type, occupancy context, and structural review scope so the correct downstream checklist path is used.',
    viewDetails: 'Confirm the project type, building type, occupancy classification, and structural review scope. Misclassification at this stage propagates through all downstream checklist paths and must be resolved before field work proceeds.',
    stopIf: [
      'Project type, building type, or occupancy classification is inconsistent and cannot be resolved from available records.',
      'The selected structural checklist path does not match the actual scope of work.',
    ],
    fieldChecklist: [
      'Project type is correctly identified.',
      'Building type and use context are consistent.',
      'Structural scope is correctly classified.',
      'This is the right structural checklist path.',
    ],
    notesGuidance: 'Record the project type, building type, occupancy or use context, structural work category, and any reason the selected structural path is or is not appropriate.',
    whatToCheck: [
      'Project type is correctly identified.',
      'Building type is identified accurately.',
      'Occupancy or use context is understood where it affects structural requirements.',
      'Structural scope is correctly classified.',
      'The structural permit family is actually applicable to this job.',
      'The next-stage inspection path aligns with the nature of the work.',
    ],
    passWhen: [
      'Project type is clearly identified.',
      'Building type and occupancy or use context are consistent across the record set.',
      'Structural scope is correctly classified.',
      'The project fits the selected structural checklist path.',
    ],
    failWhen: [
      'Project type is misclassified.',
      'Building type is inconsistent across documents.',
      'Occupancy or use context suggests a different review standard than the one applied.',
      'Structural scope appears materially different from the posted job.',
      'The selected checklist path is not appropriate to the actual work.',
    ],
    pendingWhen: [
      'Additional drawings or permit notes are needed to determine the exact project type, building type, occupancy context, or structural scope.',
    ],
    requiredEvidence: [
      'Builder-uploaded permit description or scope-of-work statement.',
      'Builder-uploaded drawings, design notes, or application form showing building type and structural scope.',
    ],
    optionalEvidence: [
      'Builder scope summary.',
      'Consultant notes.',
      'Authority comments.',
      'Inspector-uploaded supplemental evidence only if a misclassification must be documented.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Note any local trigger thresholds or permit-family distinctions that affect whether this project falls into structural review.',
    dependencies: ['S01-02'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Occupancy Classification',
        legalReference: 'BCBC 2024 Division A, Section 3.1',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Building Code 2024 — Building Classification and Construction Type',
        legalReference: 'BCBC 2024 Division B, Part 3',
        sourceTitle: 'British Columbia Building Code 2024',
      },
    ],
  },
  {
    code: 'S01-04',
    label: 'Site Record, Drawings, and Revision Package Readiness',
    uiSchema: 'field_view',
    purpose: 'Confirm the base site record, structural drawing package, and revision context are current, identifiable, and sufficient for the first field inspection stage.',
    viewDetails: 'Confirm the base site record, structural drawing package, and revision set are current and sufficient for the first field inspection stage. Unresolved drawing-set conflicts or missing base records prevent reliable review.',
    stopIf: [
      'Required site plan, survey, or structural drawing set is absent or so outdated that reliable inspection cannot proceed.',
      'Multiple unreconciled drawing revisions create material uncertainty about the current construction set.',
    ],
    fieldChecklist: [
      'Site record and siting documents are available.',
      'Structural drawing set is present.',
      'Revision identifiers are visible.',
      'Latest issue set is being used.',
    ],
    notesGuidance: 'Record what site record and drawing package were reviewed, what revision identifier or date was used, and any missing information affecting confidence.',
    whatToCheck: [
      'Site plan or survey is present where required.',
      'Setback, property line, and siting information are available where required.',
      'Structural drawings are present where required.',
      'Revision dates and identifiers are visible.',
      'The inspector is working from the latest known issue or revision set.',
      'No obvious mismatch exists between the active permit record and the structural drawing set.',
      'There is enough site and drawing context to proceed without material ambiguity.',
    ],
    passWhen: [
      'A sufficient site plan, survey, or equivalent record is available.',
      'Structural drawing package is available and current enough for the stage.',
      'Revision identifiers are visible and coherent.',
      'No major siting, revision, or document-set ambiguity remains.',
    ],
    failWhen: [
      'Required site plan or survey information is absent.',
      'Required structural drawings are missing.',
      'Revision history is unclear or inconsistent.',
      'Multiple drawing versions create unresolved uncertainty.',
      'The absence of the base record undermines reliable review.',
    ],
    pendingWhen: [
      'Site documentation or revised drawings are expected but not yet uploaded.',
      'The current set may be sufficient only after clarification.',
    ],
    requiredEvidence: [
      'Builder-uploaded site plan and or survey, where applicable.',
      'Builder-uploaded permit drawing set showing structure location on site.',
      'Builder-uploaded structural drawing package with revision identifiers, where applicable.',
    ],
    optionalEvidence: [
      'Topographic plan.',
      'Civil plan.',
      'Revision log.',
      'Consultant correspondence.',
      'Inspector-uploaded supplemental evidence only if a document-set discrepancy must be documented.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Capture any municipality-specific setback, frontage, lane, easement, siting, stamped-set, or revision-tracking requirement that affects structural readiness.',
    dependencies: ['S01-03'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Drawing and Document Submission Requirements',
        legalReference: 'BCBC 2024 Division C, Part 2',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'Professional Stamp and Revision Identification',
        legalReference: 'Architects Act (BC); Engineers and Geoscientists Act (BC)',
        sourceTitle: 'BC Professional Practice Standards',
      },
    ],
  },
  {
    code: 'S01-05',
    label: 'Registered Professional and Permit Coordination Flags',
    uiSchema: 'field_view',
    purpose: 'Determine whether registered professional involvement and related permit coordination are required so the structural pathway is not assessed in isolation where coordination is necessary.',
    viewDetails: 'Determine whether registered professional involvement and permit coordination are required for the project scope. An unresolved professional or trade coordination gap must be identified before field inspection proceeds.',
    stopIf: [
      'Registered professional involvement appears required by the code or permit record but is absent or undocumented.',
      'Missing trade permit coordination creates a material gap that blocks structural readiness.',
    ],
    fieldChecklist: [
      'Professional involvement trigger has been checked.',
      'Consultant responsibility is documented if required.',
      'Related permit coordination needs are identified.',
      'No coordination gap blocks structural readiness.',
    ],
    notesGuidance: 'Record whether professional involvement is required, what triggered that determination, what related permit families are involved, and whether their status affects structural readiness.',
    whatToCheck: [
      'The project triggers professional design or field review requirements where applicable.',
      'Relevant registered professional involvement is identified in the file.',
      'Related permit scopes are identified where relevant.',
      'The project is not missing obvious coordinated permit streams that materially affect readiness.',
      'The project record does not suggest required professional oversight or trade coordination that is absent.',
    ],
    passWhen: [
      'Required professional involvement is either not triggered or clearly documented.',
      'Related permit coordination needs are either not applicable or clearly identified.',
      'No unresolved professional or trade coordination issue prevents proceeding.',
    ],
    failWhen: [
      'Registered professional involvement appears required but is absent or undocumented.',
      'Missing or conflicting trade permit coordination materially affects project readiness.',
      'The file suggests unsupported structural design responsibility or incomplete permit context.',
    ],
    pendingWhen: [
      'Additional consultant, permit-office, or builder clarification is required to confirm whether professional involvement or permit coordination is triggered.',
    ],
    requiredEvidence: [
      'Builder-uploaded structural drawings or design notes indicating professional responsibility where applicable.',
      'Builder-uploaded permit or application record identifying consultant involvement and related scopes.',
    ],
    optionalEvidence: [
      'Letters of assurance.',
      'Field review commitments.',
      'Consultant coordination notes.',
      'Permit-office comments.',
      'Inspector-uploaded supplemental evidence only if a coordination or assurance deficiency must be documented.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Capture local triggers that elevate the project into registered professional, assurance-letter, or coordinated trade-permit territory.',
    dependencies: ['S01-04'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Letters of Assurance',
        legalReference: 'BCBC 2024 Division C, Part 2, Section 2.2',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'Schedule B and Schedule C-B — Professional Design and Field Review Assurance',
        legalReference: 'BCBC 2024 Schedule B; Schedule C-B',
        sourceTitle: 'BC Building Code 2024 Assurance Schedules',
      },
      {
        label: 'Engineers and Geoscientists BC — Professional Responsibility',
        legalReference: 'Engineers and Geoscientists Act (BC)',
        sourceTitle: 'EGBC Professional Practice Guidelines',
      },
    ],
  },
]

const STRUCTURAL_STAGE_2_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S02-01',
    label: 'Zoning and Civic Approvals',
    uiSchema: 'field_view',
    purpose: 'Confirm foundational land-use entitlement, development-path approvals, and civic identity before downstream permit review proceeds.',
    viewDetails: 'Confirm foundational civic permissions are in place. Verify that zoning use, density, setbacks, development-permit pathway, and the civic address all match the governing project record before the submission package moves forward.',
    stopIf: [
      'Base zoning or variance approvals are rejected or mismatched.',
    ],
    fieldChecklist: [
      'Zoning use, density, and setbacks confirmed?',
      'Rezoning, variance, DP, or DP exemption checks complete?',
      'Civic address confirmed against record?',
    ],
    notesGuidance: 'Record the zoning file reviewed, civic address reference used, any applicable rezoning or DP path, and the exact discrepancy or approval basis supporting the decision.',
    whatToCheck: [
      'Zoning use aligns with the proposed project scope.',
      'Permitted density, siting, and setback assumptions match the package being advanced.',
      'Any rezoning, variance, DP, or DP exemption pathway has been identified and resolved to the level required by the AHJ.',
      'The civic address used across the permit package matches the official record and site identity.',
      'No foundational planning inconsistency remains that would undermine permit intake or review.',
    ],
    passWhen: [
      'Base zoning compliance is confirmed for the submitted scope.',
      'Required rezoning, variance, DP, or exemption checks are completed and consistent with the record.',
      'The civic address is confirmed and coherent across the project file.',
    ],
    failWhen: [
      'The zoning assumptions used by the package do not match the site or proposed scope.',
      'A required variance, rezoning, or development-permit pathway is missing, rejected, or unresolved.',
      'The civic address is inconsistent across the project record.',
    ],
    pendingWhen: [
      'Planning review is in progress and final zoning or variance disposition has not yet been issued.',
      'Record documents are incomplete but may still confirm the civic or zoning basis once updated.',
    ],
    requiredEvidence: [
      'Existing zoning confirmation, development review, or civic addressing records already on file.',
    ],
    optionalEvidence: [
      'Local AHJ correspondence.',
      'Approval memos.',
      'Annotated intake or planning notes documenting any mismatch.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'zoning',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Capture municipality-specific zoning schedules, development-permit triggers, civic addressing conventions, or planning comments that materially affect permit readiness.',
    dependencies: ['S01-05'],
    codeReferences: [
      {
        label: 'Local Government Act — Zoning Authority',
        legalReference: 'Local Government Act (BC), Part 14',
        sourceTitle: 'Local Government Act (BC)',
      },
      {
        label: 'Vancouver Zoning and Development By-law',
        legalReference: 'City of Vancouver Zoning and Development By-law (No. 3575)',
        sourceTitle: 'Vancouver Zoning and Development By-law',
        isVbblOnly: true,
      },
      {
        label: 'Development Permit Requirements',
        legalReference: 'Local Government Act (BC), Section 489',
        sourceTitle: 'Local Government Act (BC)',
      },
    ],
  },
  {
    code: 'S02-02',
    label: 'Site Servicing and Access',
    uiSchema: 'field_view',
    purpose: 'Confirm servicing, frontage, and access permits that affect off-site or municipal interface work are cleared before permit execution.',
    viewDetails: 'Verify off-site and frontage impacts are approved by the AHJ. Confirm utility servicing, driveway and boulevard works, ditch enclosure, road occupancy, and construction-access requirements are resolved wherever the project impacts municipal infrastructure.',
    stopIf: [
      'Required access or utility servicing permits are missing.',
    ],
    fieldChecklist: [
      'Site servicing and utility servicing approved?',
      'Driveway crossing, boulevard, ditch enclosure, and frontage works approved?',
      'Road use, lane closure, or construction access permits secured?',
    ],
    notesGuidance: 'Record which servicing, engineering, or traffic-management approvals were reviewed, the permit numbers confirmed, and any unresolved condition affecting access or utility execution.',
    whatToCheck: [
      'Required site servicing and utility servicing approvals are in place for the proposed scope.',
      'Driveway crossing, boulevard, ditch enclosure, and frontage works requirements have been reviewed and cleared where triggered.',
      'Road use, lane closure, or construction access permits are secured where municipal occupation or access control is required.',
      'No unresolved engineering, frontage, or roadway condition remains that would block legal site access or servicing work.',
    ],
    passWhen: [
      'Required servicing and access approvals have been issued or clearly documented as not applicable.',
      'Municipal interface work can proceed without an unresolved frontage or access permit gap.',
    ],
    failWhen: [
      'A required servicing approval, frontage permit, or roadway occupancy permit is missing.',
      'Municipal engineering conditions conflict with the planned site access or off-site work.',
    ],
    pendingWhen: [
      'Engineering or servicing review is still in progress.',
      'The project may trigger frontage or access permits, but the final requirement has not yet been confirmed by the AHJ.',
    ],
    requiredEvidence: [
      'Existing servicing, engineering, frontage, or access permit records already on file.',
    ],
    optionalEvidence: [
      'Municipal reviewer correspondence.',
      'Frontage sketches.',
      'Construction traffic-control notes.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'street_use',
    responsibleParty: 'Builder',
    requiredLogic: 'Conditional: required when the project triggers utility servicing, frontage work, roadway occupation, or controlled construction access.',
    documentUploadRequired: false,
    ahjNotes: 'Capture local engineering, boulevard, driveway, frontage, or traffic-control conditions that must be satisfied before permit execution or site access proceeds.',
    dependencies: ['S02-01'],
    codeReferences: [
      {
        label: 'Municipal Servicing Standards — Road Use and Frontage Works',
        legalReference: 'Local Government Act (BC), Part 14, Division 1',
        sourceTitle: 'Local Government Act (BC)',
      },
      {
        label: 'Vancouver Street and Traffic By-law',
        legalReference: 'City of Vancouver Street and Traffic By-law (No. 2849)',
        sourceTitle: 'Vancouver Street and Traffic By-law',
        isVbblOnly: true,
      },
      {
        label: 'WorkSafeBC — Construction Site Access and Road Safety',
        legalReference: 'OHS Regulation Part 20 (BC)',
        sourceTitle: 'WorkSafeBC OHS Regulation',
      },
    ],
  },
  {
    code: 'S02-03',
    label: 'Site Clearing and Environment',
    uiSchema: 'field_view',
    purpose: 'Confirm environmental protection and demolition controls are resolved before site clearing or destructive work proceeds.',
    viewDetails: 'Verify that tree protection, removals, arborist obligations, and demolition authorization are in place before site clearing or removal activity proceeds. This is where environmental and pre-disturbance site-control readiness is documented.',
    stopIf: [
      'Critical tree protection is absent or unauthorized demolition has occurred.',
    ],
    fieldChecklist: [
      'Tree protection, removal, and arborist requirements met? (Camera or Video Evidence Required)',
      'Demolition permit secured (if applicable)?',
    ],
    notesGuidance: 'Record tree-protection measures, arborist conditions, demolition authorization status, and any visible unauthorized disturbance or removal risk.',
    whatToCheck: [
      'Tree protection, removal permits, and arborist conditions are identified and satisfied where applicable.',
      'Demolition permit status has been confirmed when demolition is part of the scope.',
      'No unauthorized site clearing, protected-tree disturbance, or demolition activity is evident from the record or field observation.',
    ],
    passWhen: [
      'Environmental protection measures and demolition authorization are in place for the scope shown.',
      'No critical tree or demolition compliance gap remains before clearing activity proceeds.',
    ],
    failWhen: [
      'Required tree protection or arborist conditions are missing, breached, or visibly absent.',
      'Demolition work is required but no valid demolition authorization is in place.',
      'Unauthorized demolition or site disturbance has already occurred.',
    ],
    pendingWhen: [
      'Tree or demolition conditions are still being finalized by the AHJ or consultant team.',
      'Field confirmation is still needed to verify the installed environmental protections.',
    ],
    requiredEvidence: [
      'Existing tree, arborist, or demolition approval records.',
    ],
    optionalEvidence: [
      'Inspector-captured photo evidence of tree barriers or site-clearing conditions.',
      'Arborist direction notes.',
      'Demolition clearance correspondence.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'site_environment',
    responsibleParty: 'Builder',
    requiredLogic: 'Conditional: required when tree, arborist, removal, or demolition triggers apply to the project site.',
    documentUploadRequired: false,
    ahjNotes: 'Capture tree-protection bylaws, arborist hold points, demolition sequencing conditions, or environmental restrictions imposed by the AHJ.',
    dependencies: ['S02-02'],
    codeReferences: [
      {
        label: 'Local Government Act — Tree Protection Authority',
        legalReference: 'Local Government Act (BC), Section 8(3)(b)',
        sourceTitle: 'Local Government Act (BC)',
      },
      {
        label: 'Vancouver Protection of Trees By-law',
        legalReference: 'City of Vancouver Protection of Trees By-law (No. 9958)',
        sourceTitle: 'Vancouver Tree Protection By-law',
        isVbblOnly: true,
      },
      {
        label: 'Demolition Permit Requirements',
        legalReference: 'BCBC 2024 Division C, Part 1; applicable municipal by-law',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'WorkSafeBC — Demolition Safety',
        legalReference: 'OHS Regulation Part 20, Subdivision B (BC)',
        sourceTitle: 'WorkSafeBC OHS Regulation',
      },
    ],
  },
]

const STRUCTURAL_STAGE_3_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S03-01',
    label: 'Site and Architectural Matrix',
    uiSchema: 'field_view',
    purpose: 'Confirm the core site-planning and architectural data set is complete, internally consistent, and review-ready.',
    viewDetails: 'Validate the foundational building permit package: site plan, code matrix, occupancy classification, building metrics, siting calculations, parking and open-space counts, and accessibility mapping. This sub-container confirms the architectural intake basis is coherent before technical review advances.',
    stopIf: [
      'Core site-planning metrics or occupancy data are missing or materially inconsistent.',
    ],
    fieldChecklist: [
      'Site plan provided?',
      'Code matrix and occupancy classification complete?',
      'Building area, height, storeys, and unit count verified?',
      'Setbacks, lot coverage, softscape/hardscape, parking, and open space calculated?',
      'Accessibility and adaptable unit requirements mapped?',
    ],
    notesGuidance: 'Record which site-planning and architectural documents were reviewed, the edition or revision basis used, and any inconsistency in area, occupancy, siting, or accessibility metrics.',
    whatToCheck: [
      'A current site plan is included and coordinated with the submission.',
      'The code matrix identifies occupancy and the core code basis used by the package.',
      'Building area, height, storeys, and unit count are calculated and coordinated across the documents.',
      'Setbacks, lot coverage, softscape, hardscape, parking, and open-space metrics are accounted for where applicable.',
      'Accessibility and adaptable-unit obligations are mapped to the project scope.',
    ],
    passWhen: [
      'The site and architectural matrix is complete enough for permit intake and coordinated technical review.',
      'Core project metrics are internally consistent across the package.',
    ],
    failWhen: [
      'The site plan, code matrix, occupancy basis, or core building metrics are missing, inconsistent, or materially unreliable.',
    ],
    pendingWhen: [
      'Architectural intake documents are partially assembled but still awaiting a coordinated revision set.',
      'A metric or accessibility obligation is likely resolvable once missing calculations or sheets are added.',
    ],
    requiredEvidence: [
      'Builder-uploaded site plan, code matrix, and architectural permit package documents already on file.',
    ],
    optionalEvidence: [
      'Annotated intake notes.',
      'Revision logs.',
      'Coordination comments documenting metric discrepancies.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Capture AHJ-specific intake requirements, occupancy classification interpretations, siting expectations, or accessibility conditions affecting permit review.',
    dependencies: ['S02-03'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Occupancy Classification and Building Metrics',
        legalReference: 'BCBC 2024 Division B, Part 3, Section 3.1',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Energy Step Code — Compliance Requirements',
        legalReference: 'BCBC 2024 Division B, Part 10; BC Energy Step Code',
        sourceTitle: 'BC Energy Step Code',
      },
      {
        label: 'Vancouver Building By-law 2025 — Accessibility Requirements',
        legalReference: 'VBBL 2025, Division B, Part 3',
        sourceTitle: 'Vancouver Building By-law 2025',
        isVbblOnly: true,
      },
    ],
  },
  {
    code: 'S03-02',
    label: 'Safety and Structural Calculations',
    uiSchema: 'field_view',
    purpose: 'Confirm core life-safety and building-envelope calculations are present and support the permit submission basis.',
    viewDetails: 'Validate the technical calculation layer supporting the permit package, including firefighting access assumptions, spatial separation and limiting-distance analysis, opening calculations, and sprinkler determination. This sub-container confirms the submission has the minimum defensible technical basis for review.',
    stopIf: [
      'Fire access, spatial separation, or sprinkler basis cannot be verified from the submission.',
    ],
    fieldChecklist: [
      'Firefighting access confirmed?',
      'Spatial separation, limiting distance, and opening calculations verified?',
      'Sprinkler determination completed?',
    ],
    notesGuidance: 'Record which technical calculations or code analyses were reviewed, the basis of the fire-access and sprinkler decision, and any unresolved life-safety gap in the package.',
    whatToCheck: [
      'Firefighting access assumptions are documented and align with the site and building layout.',
      'Spatial separation, limiting distance, and opening calculations are present and internally coordinated.',
      'The sprinkler determination has been completed based on the correct project conditions and code path.',
      'No major life-safety calculation gap exists that would undermine building review.',
    ],
    passWhen: [
      'The submission contains a coherent technical basis for fire access, spatial separation, and sprinkler determination.',
      'No unresolved life-safety calculation deficiency remains at intake level.',
    ],
    failWhen: [
      'Firefighting access assumptions are absent or contradicted by the site plan.',
      'Spatial separation or opening calculations are missing, incomplete, or materially inconsistent.',
      'Sprinkler determination has not been completed where required for the scope.',
    ],
    pendingWhen: [
      'A consultant revision or calculation package is still outstanding.',
      'The submission suggests the analysis exists, but the coordinated sheets or forms have not yet been uploaded.',
    ],
    requiredEvidence: [
      'Builder-uploaded technical calculation package or coordinated code-analysis documents already on file.',
    ],
    optionalEvidence: [
      'Consultant review notes.',
      'AHJ comments.',
      'Supplemental coordination correspondence on fire access or sprinkler basis.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    documentUploadRequired: false,
    ahjNotes: 'Capture AHJ-specific firefighting access, opening calculation, or sprinkler expectations that affect acceptance of the submission package.',
    dependencies: ['S03-01'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Spatial Separation and Limiting Distance',
        legalReference: 'BCBC 2024 Division B, Part 3, Section 3.2',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Building Code 2024 — Fire Suppression Requirements',
        legalReference: 'BCBC 2024 Division B, Part 3, Section 3.2.5',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Building Code 2024 — Firefighting Access',
        legalReference: 'BCBC 2024 Division B, Part 3, Section 3.2.2',
        sourceTitle: 'British Columbia Building Code 2024',
      },
    ],
  },
  {
    code: 'S03-03',
    label: 'Drawing Packages and Assurances',
    uiSchema: 'field_view',
    purpose: 'Confirm the multidisciplinary drawing set, energy package, and professional assurances are complete enough for comprehensive review.',
    viewDetails: 'Validate the full submission package: architectural, structural, mechanical, electrical, and plumbing design documents; energy model and Step Code forms; and signed and sealed professional assurance documentation where the scope requires it. This sub-container is the final completeness gate before a defensible permit review can proceed.',
    stopIf: [
      'Core drawing packages, energy models, or professional assurances are missing.',
    ],
    fieldChecklist: [
      'Architectural, structural, mechanical, and electrical drawings/schedules complete?',
      'Plumbing design provided?',
      'Energy model, Step Code, and compliance forms provided?',
      'Professional assurance documents signed and sealed?',
    ],
    notesGuidance: 'Record which disciplines were reviewed, what drawing packages or forms were present, what assurance letters apply, and the exact omission preventing the package from being considered complete.',
    whatToCheck: [
      'Architectural, structural, mechanical, and electrical drawings or schedules are complete enough for review.',
      'Plumbing design documentation is included where plumbing scope is present.',
      'Energy model, Step Code, and compliance forms are included and coordinated with the package.',
      'Professional assurance documents are signed and sealed where the project scope requires them.',
      'No discipline-critical gap remains that would make the package indefensible for review.',
    ],
    passWhen: [
      'The multidisciplinary drawing and assurance package is complete for the project scope.',
      'Energy and professional-assurance documentation is present wherever required.',
    ],
    failWhen: [
      'One or more core discipline packages are missing or materially incomplete.',
      'The energy model or Step Code compliance documentation is missing where required.',
      'Required professional assurance documents are unsigned, unsealed, or absent.',
    ],
    pendingWhen: [
      'A discipline package is being finalized and is expected in the next coordinated submission.',
      'Professional assurance applicability is known, but the executed documents have not yet been uploaded.',
    ],
    requiredEvidence: [
      'Builder-uploaded drawing packages, energy documentation, and assurance records already on file.',
    ],
    optionalEvidence: [
      'Discipline coordination notes.',
      'Revision transmittals.',
      'Consultant or AHJ correspondence on assurance requirements.',
    ],
    evidenceMode: 'verify_existing',
    permitType: 'building',
    responsibleParty: 'Builder',
    requiredLogic: 'Required: professional assurances are conditional by scope, but complete discipline packages and energy documentation must be present for applicable work.',
    documentUploadRequired: false,
    ahjNotes: 'Capture local drawing-submission expectations, energy-compliance requirements, or professional assurance triggers that must be satisfied for acceptance.',
    dependencies: ['S03-02'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Letters of Assurance (Schedule B)',
        legalReference: 'BCBC 2024 Division C, Part 2, Section 2.2; Schedule B',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Energy Step Code — Energy Compliance Documentation',
        legalReference: 'BCBC 2024 Division B, Part 10',
        sourceTitle: 'BC Energy Step Code',
      },
      {
        label: 'Engineers and Geoscientists BC — Design Submission Requirements',
        legalReference: 'Engineers and Geoscientists Act (BC)',
        sourceTitle: 'EGBC Professional Practice Guidelines',
      },
    ],
  },
]

const STRUCTURAL_STAGE_4_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S04-01',
    label: 'Pre-Disturbance Controls and Demolition',
    uiSchema: 'field_view',
    purpose: 'Confirm the pre-disturbance scope matches the permit, demolition status is verified, utility locates are available, tree protection is in place, and adjacent properties and public realm are identified before any ground disturbance begins.',
    viewDetails: 'Verify the site is prepared for disturbance from a protection and demolition standpoint. Confirm the demolition or pre-disturbance scope matches the approved permit and documents, underground utility locates are available or marked where required, tree protection barriers and root-zone controls are installed where required, the demolition area and access are identified, and adjacent property and public-realm protection is addressed before excavation proceeds.',
    stopIf: [
      'Utilities are unlocated or locates are unavailable where required before ground disturbance.',
      'Required tree protection barriers are absent where tree protection is mandated by permit conditions or municipal by-law.',
      'Demolition scope has proceeded beyond what is authorized under the approved permit.',
    ],
    fieldChecklist: [
      'Pre-disturbance or demolition scope matches the approved permit and supporting documents? (Evidence: Text)',
      'Underground services or utility locates are available or marked where required before excavation? (Evidence: Text)',
      'Tree protection barriers and protected root zones are installed where required by permit conditions or arborist direction? (Camera or Video Evidence Required)',
      'Demolition area, access routes, and protection of adjacent properties and public realm are identified and controlled?',
      'No work outside the approved scope is proceeding without a permit amendment or Hold condition?',
    ],
    notesGuidance: 'Record utility-locate confirmation, tree-protection conditions, demolition completion status, adjacent-property and public-realm protection observations, and any unresolved pre-disturbance control deficiency visible before excavation.',
    whatToCheck: [
      'The demolition or pre-disturbance scope visible on site matches what is authorized under the approved permit and documents.',
      'Underground service locates are available or ground-marking is visible before any ground disturbance begins.',
      'Tree protection barriers and root-zone exclusions are installed where trees are within or near the disturbance area.',
      'Demolition area boundaries, construction access, and protection measures for adjacent structures and public realm are identified.',
      'No destructive work is proceeding against unknown utilities, protected trees, or without authorization under the approved scope.',
      'Unsafe or undocumented pre-disturbance conditions are flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'Pre-disturbance controls, demolition scope confirmation, utility locates, and tree protection are all observable and in place.',
      'The site can move into excavation without an unresolved pre-disturbance control deficiency.',
    ],
    failWhen: [
      'Underground services are unconfirmed or visibly unprotected before excavation.',
      'Required tree barriers or root-zone protections are missing or inadequate where mandated.',
      'Demolition work has exceeded the permitted scope or a safety hazard exists from incomplete or uncontrolled demolition.',
      'Adjacent property or public-realm protection is absent or visibly inadequate for the presented disturbance condition.',
    ],
    pendingWhen: [
      'Utility locates are in progress and not yet available for review.',
      'Tree protection is being installed and requires a re-check before disturbance begins.',
      'Demolition completion or scope clarification is expected shortly.',
    ],
    requiredEvidence: [
      'Inspector-captured field evidence showing utility-locate confirmation, installed tree protection, and pre-disturbance control measures.',
    ],
    optionalEvidence: [
      'Site overview notes documenting demolition limits and access conditions.',
      'Supplemental photos documenting adjacent-property protection or public-realm controls.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local utility-locate requirements, demolition authorization conditions, arborist or tree-protection by-law requirements, and any pre-disturbance control conditions mandated by the AHJ before excavation begins.',
    dependencies: ['S03-03'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Administration and Permit Scope',
        legalReference: 'BCBC 2024 Division C, Part 1',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'WorkSafeBC OHS Regulation — Underground Services and Excavation Safety',
        legalReference: 'WorkSafeBC OHS Regulation Part 20, Subdivision B',
        sourceTitle: 'WorkSafeBC Occupational Health and Safety Regulation',
      },
      {
        label: 'Vancouver Protection of Trees By-law No. 9958 — Tree Protection Zone',
        legalReference: 'City of Vancouver Protection of Trees By-law No. 9958',
        sourceTitle: 'City of Vancouver Protection of Trees By-law',
        isVbblOnly: true,
      },
    ],
  },
  {
    code: 'S04-02',
    label: 'Survey, Setbacks, Siting, and Flood Level Verification',
    uiSchema: 'field_view',
    purpose: 'Confirm that siting, setback, and survey evidence is available before excavation proceeds, and that flood construction level or floodplain conditions are identified where applicable.',
    viewDetails: 'Verify that a survey certificate, siting plan, or equivalent staking information is available where required. Confirm property lines, setbacks, building footprint, and excavation limits are identifiable relative to the approved site plan. Identify any easements, rights-of-way, covenant areas, or no-build zones. Confirm grade references and elevation controls are established where required. Where applicable, identify flood construction level or floodplain conditions before foundation work proceeds.',
    stopIf: [
      'Proposed excavation or building location is not identifiable relative to property lines and the approved site plan before ground disturbance proceeds.',
      'A required flood construction level or floodplain condition is unresolved and affects the foundation design basis.',
    ],
    fieldChecklist: [
      'Survey certificate, siting plan, or staking information is available where required? (Evidence: Text)',
      'Property lines, setbacks, building footprint, and excavation limits are identifiable relative to the approved site plan?',
      'Proposed excavation and building location match the approved site plan within acceptable tolerance?',
      'Easements, rights-of-way, covenant areas, or no-build zones identified where applicable? (Evidence: Text)',
      'Grade references, benchmark, or elevation controls are established where required?',
      'Flood construction level or floodplain conditions identified and addressed where applicable? (Evidence: Text)',
    ],
    notesGuidance: 'Record survey or siting evidence available, setback conditions observed, easement or covenant identifications, grade reference points, and any flood construction level or floodplain condition relevant to the foundation design basis.',
    whatToCheck: [
      'Survey certificate, siting plan, or equivalent staking information is available or accessible where required before excavation.',
      'Property boundaries, required setbacks, and building footprint are identifiable and consistent with the approved site plan.',
      'The proposed excavation location matches the approved site plan within reasonable tolerance for the presented stage.',
      'Easements, rights-of-way, covenant areas, or no-build zones applicable to the site are identified where observable.',
      'Grade references or elevation benchmarks are established and accessible where the structural or drainage design depends on them.',
      'Flood construction level requirements or floodplain conditions are identified and documented where applicable to the site.',
      'A siting discrepancy, missing survey evidence, or unresolved flood or elevation condition is flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'Survey, siting, and setback evidence is available and consistent with the approved site plan for the presented stage.',
      'Flood construction level or floodplain conditions are identified and addressed where applicable.',
      'The site can proceed to excavation without an unresolved siting, survey, or flood-level deficiency.',
    ],
    failWhen: [
      'The proposed building or excavation location cannot be confirmed against property lines or the approved site plan.',
      'A required survey certificate or equivalent siting evidence is unavailable where required before excavation.',
      'An identified easement, no-build zone, or covenant area conflicts with the proposed work without documented resolution.',
      'A required flood construction level or floodplain condition is unresolved and affects foundation work.',
    ],
    pendingWhen: [
      'Survey certificate or siting plan is ordered and expected before excavation begins.',
      'Flood construction level documentation is being finalized and a return visit is scheduled.',
      'Minor siting clarification is in progress and expected to resolve without a formal Hold.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos confirming available survey or siting evidence and observable setback conditions.',
    ],
    optionalEvidence: [
      'Survey certificate or siting plan reference.',
      'Flood construction level documentation or floodplain mapping reference.',
      'Notes on easement, covenant, or no-build zone identification.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local survey requirements, siting-approval conditions, flood construction level obligations, or covenant and easement identifications that must be addressed before excavation proceeds.',
    dependencies: ['S04-01'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Building Location and Siting',
        legalReference: 'BCBC 2024 Division A, Part 1',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'Local Government Act (BC) — Municipal Requirements and Setbacks',
        legalReference: 'Local Government Act (BC), Part 14',
        sourceTitle: 'Local Government Act (BC)',
      },
      {
        label: 'BC Floodplain Management Guidelines — Flood Construction Level',
        legalReference: 'BC Floodplain Mapping Guidelines (Province of BC, Ministry of Environment)',
        sourceTitle: 'BC Floodplain Mapping Guidelines',
      },
    ],
  },
  {
    code: 'S04-03',
    label: 'Earthworks, Geotechnical, and Soil Conditions',
    uiSchema: 'field_view',
    purpose: 'Confirm excavation limits and subgrade conditions are visible, soil or geotechnical conditions are assessed where observable, and any shoring, stability, or adjacent-structure protection concerns are identified before foundation work proceeds.',
    viewDetails: 'Verify that excavation limits are established and subgrade conditions are accessible for review. Identify soil conditions, unsuitable material, organic fill, contamination, or water conditions where observable. Confirm geotechnical review or subgrade acceptance is available or scheduled where required. Identify shoring, sloping, benching, or excavation stability concerns as site-safety and AHJ coordination items. Note any risks to adjacent structures, sidewalks, roads, retaining walls, or neighbouring properties.',
    stopIf: [
      'Visible unsafe excavation conditions — including unsupported walls, surcharge loads over excavation edges, or active sloughing — are present without corrective action underway.',
      'A required geotechnical engineer acceptance of bearing or subgrade conditions is unavailable and foundation concrete is scheduled to proceed.',
    ],
    fieldChecklist: [
      'Excavation limits and subgrade conditions are visible and accessible for review? (Camera or Video Evidence Required)',
      'Soil conditions, unsuitable material, organic material, fill, or water conditions are noted where observable?',
      'Geotechnical review or subgrade acceptance is available or scheduled where required? (Evidence: Text)',
      'Shoring, sloping, benching, or excavation stability issues identified as site-safety and AHJ coordination items where applicable?',
      'Adjacent structures, sidewalks, roads, retaining walls, and neighbouring properties are protected where applicable?',
    ],
    notesGuidance: 'Record observed soil conditions, subgrade readiness, geotechnical report or acceptance status, any shoring or stability observations, and adjacent-property protection conditions. Flag unsafe excavation conditions or unverified bearing as a Hold or Failed observation.',
    whatToCheck: [
      'Excavation limits are established and the subgrade or bearing surface is accessible for visual review.',
      'Soil conditions, unsuitable fill, organic material, contamination, or water intrusion are noted where visible and observable.',
      'Geotechnical engineer review or subgrade acceptance is available or is scheduled where the structural design or AHJ requires it.',
      'Shoring, sloping, or benching conditions are identified as site-safety observations; AHJ and qualified-professional coordination is noted where required.',
      'Adjacent structures, roads, sidewalks, retaining walls, and neighbouring properties show no visible signs of distress from the excavation.',
      'Unsafe excavation, undocumented geotechnical requirements, or unverified bearing conditions are flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'Excavation limits and subgrade conditions are visible and consistent with the foundation design basis.',
      'Geotechnical acceptance is available or is scheduled and does not block the foundation stage.',
      'Adjacent structures and public realm show no visible excavation-related distress.',
    ],
    failWhen: [
      'Observable subgrade conditions — including organic material, loose fill, or water intrusion — are inconsistent with the assumed bearing and have not been assessed by a qualified professional.',
      'Shoring or excavation support is visibly inadequate or absent where the excavation depth and soil conditions require it.',
      'Adjacent structure, road, or retaining wall shows visible excavation-related distress without a documented corrective plan.',
    ],
    pendingWhen: [
      'Geotechnical engineer has been engaged and subgrade acceptance is expected before concrete placement.',
      'Shoring or corrective earthwork is underway and a return inspection is scheduled.',
      'Soil conditions require a brief hold for qualified-professional assessment before the foundation stage proceeds.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing excavation extent, subgrade condition, and any visible soil, water, or stability observations.',
    ],
    optionalEvidence: [
      'Geotechnical engineer acceptance or subgrade report reference.',
      'Shoring design reference where applicable.',
      'Supplemental photos of adjacent-property conditions.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local geotechnical requirements, AHJ subgrade acceptance conditions, shoring-design mandates, and any adjacent-structure protection conditions that must be addressed before the foundation stage proceeds.',
    dependencies: ['S04-02'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Foundation Requirements and Soil Bearing',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.4',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'WorkSafeBC OHS Regulation — Excavation Safety, Shoring, and Sloping',
        legalReference: 'WorkSafeBC OHS Regulation Part 20, Subdivision B',
        sourceTitle: 'WorkSafeBC Occupational Health and Safety Regulation',
      },
      {
        label: 'BC Building Code 2024 — Qualified Professional Involvement',
        legalReference: 'BCBC 2024 Division C, Part 2',
        sourceTitle: 'British Columbia Building Code 2024',
      },
    ],
  },
  {
    code: 'S04-04',
    label: 'Site Safety, Environmental Controls, and Temporary Drainage',
    uiSchema: 'field_view',
    purpose: 'Confirm erosion and sediment controls, temporary drainage and dewatering, runoff management, and site-access safety are established before active earthworks proceed.',
    viewDetails: 'Verify that erosion and sediment control measures are installed where required. Confirm temporary drainage, pumping, dewatering, or runoff controls are in place. Confirm soil stockpiles, construction access routes, and washout areas are controlled. Note any site-runoff risk to neighbouring properties, municipal systems, or waterways. WorkSafeBC and general site-safety observations must be clearly identified as safety observations, not building-code approval items.',
    stopIf: [
      'Sediment control is visibly absent or completely failing where required, and active earthworks are proceeding.',
      'Uncontrolled runoff is visibly reaching municipal drainage systems, waterways, or neighbouring properties.',
    ],
    fieldChecklist: [
      'Erosion and sediment control measures installed where required? (Camera or Video Evidence Required)',
      'Sediment control permit or environmental permit conditions identified where applicable? (Evidence: Text)',
      'Temporary drainage, pumping, dewatering, or runoff controls are in place where required?',
      'Soil stockpiles, construction access routes, and washout areas are controlled?',
      'Site runoff does not create obvious risk to neighbouring properties, municipal systems, or waterways?',
      'WorkSafeBC or general site-safety issues are identified as safety observations, separate from building-code approval items?',
    ],
    notesGuidance: 'Record observed erosion and sediment control conditions, temporary drainage arrangements, dewatering observations, runoff risks, stockpile and washout conditions, and any WorkSafeBC or site-safety concerns noted as safety observations. Flag missing sediment control, uncontrolled runoff, or unsafe access as a Hold or Failed building-inspection finding.',
    whatToCheck: [
      'Erosion and sediment control measures are installed and visibly functioning where required.',
      'Sediment control permit or environmental permit conditions are noted where applicable to the site.',
      'Temporary drainage, pumping, or dewatering arrangements are in place where groundwater, rainfall, or surface runoff affects the excavation.',
      'Soil stockpiles are contained, construction access is controlled, and washout areas are designated.',
      'Site runoff shows no obvious risk of reaching neighbouring properties, municipal storm systems, or waterways.',
      'WorkSafeBC and general site-safety issues are documented as safety observations and are not used as building-code pass/fail grounds.',
      'Missing sediment control, uncontrolled runoff, or unsafe site access is flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'Erosion and sediment controls, temporary drainage, runoff management, and site-access safety measures are in place for the presented earthworks stage.',
      'The site can proceed without an unresolved environmental-control failure or uncontrolled runoff condition.',
    ],
    failWhen: [
      'Erosion and sediment control is missing, visibly failing, or completely inadequate for the active earthworks.',
      'Uncontrolled runoff is reaching or risks reaching neighbouring properties, storm drains, or waterways.',
      'Temporary drainage or dewatering is absent where active groundwater or runoff is affecting the site.',
      'Soil stockpiles or washout areas are creating a visible drainage or contamination risk.',
    ],
    pendingWhen: [
      'Sediment controls are partially installed and require a follow-up before full earthworks commence.',
      'Temporary drainage or dewatering arrangements are being finalized.',
      'Environmental permit documentation is being obtained and is expected before active excavation continues.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing installed erosion and sediment controls, temporary drainage conditions, and site-access arrangements.',
    ],
    optionalEvidence: [
      'Supplemental photos of runoff conditions, stockpile areas, or washout controls.',
      'Environmental permit or sediment control plan reference.',
      'WorkSafeBC safety observation notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local erosion-control permit requirements, municipal stormwater protection requirements, and any sediment or runoff conditions that must be resolved before full earthworks proceed. Note WorkSafeBC safety observations separately from building-code approval findings.',
    dependencies: ['S04-03'],
    codeReferences: [
      {
        label: 'BC Environmental Management Act — Construction Stormwater and Sediment Control',
        legalReference: 'BC Environmental Management Act, Section 6 (Waste Discharge Prohibition)',
        sourceTitle: 'BC Environmental Management Act',
      },
      {
        label: 'WorkSafeBC OHS Regulation — Excavation and Site Safety',
        legalReference: 'WorkSafeBC OHS Regulation Part 20, Subdivision B',
        sourceTitle: 'WorkSafeBC Occupational Health and Safety Regulation',
      },
      {
        label: 'Vancouver Sewer and Watermain By-law — Stormwater Discharge Restrictions',
        legalReference: 'City of Vancouver Sewer and Watermain By-law No. 8093',
        sourceTitle: 'City of Vancouver Sewer and Watermain By-law',
        isVbblOnly: true,
      },
    ],
  },
]

const STRUCTURAL_STAGE_5_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S05-01',
    label: 'Footings, Foundation Walls, Rebar, and Embedded Items',
    uiSchema: 'field_view',
    purpose: 'Confirm footing and foundation-wall work is complete, rebar and embedded items are installed correctly, and the structural hold point is passed before concrete placement or concealment proceeds.',
    viewDetails: 'Validate footing and foundation-wall readiness at the relevant structural hold points. Confirm footing excavation, forms, rebar size and spacing, rebar cover and lap lengths, anchor bolts, hold-downs, embeds, sleeves, and service penetrations are installed and positioned before concrete is placed or work is concealed. Footing steps and stepped foundation conditions are reviewed where applicable.',
    stopIf: [
      'Required rebar is absent, undersized, or materially inconsistent with the structural design without engineer direction.',
      'A required footing or foundation-wall inspection hold point has not been passed but concrete placement is scheduled to proceed.',
      'Required anchor bolts, hold-downs, or embeds are missing where the structural design depends on them.',
    ],
    fieldChecklist: [
      'Footing excavation, forms, and rebar are complete for the current hold point? (Camera or Video Evidence Required)',
      'Rebar size, spacing, cover, lap lengths, splice locations, and dowels are consistent with the approved structural drawings where reviewable?',
      'Foundation wall forms and rebar are complete where wall work is presented? (Camera or Video Evidence Required)',
      'Anchor bolts, hold-downs, embeds, sleeves, blockouts, and service penetrations are located and secured where applicable? (Camera or Video Evidence Required)',
      'Footing steps or stepped foundation conditions match the approved drawings where applicable?',
      'Footing and foundation-wall inspection hold points have passed or are documented for the work presented?',
    ],
    notesGuidance: 'Record which footing or foundation-wall hold point was presented, rebar and embed conditions observed, any deviation in member sizing, cover, lap, or anchor placement, and any inspection-status issue blocking progression.',
    whatToCheck: [
      'Footing excavation, forms, and reinforcing steel are complete and consistent with the approved structural intent for the hold point.',
      'Rebar size, spacing, concrete cover, lap lengths, splice locations, and dowel placement are reviewable and consistent with the structural drawings.',
      'Foundation wall forms and reinforcing steel are complete and reviewable where wall work is presented at the hold point.',
      'Anchor bolts, hold-downs, embeds, sleeves, blockouts, and service penetrations are located and secured where specified.',
      'Footing steps or stepped foundation configurations match the approved drawings where applicable.',
      'Required footing and foundation-wall hold-point inspections have passed or are documented for the presented work.',
      'Missing rebar, insufficient cover, unverified bearing, or missing embeds are flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'Footing and foundation-wall structural readiness is confirmed for the presented stage.',
      'Rebar, cover, lap, anchors, and embeds are in place and reviewable without a material structural discrepancy.',
      'Required hold-point inspections have passed or are documented for the work shown.',
    ],
    failWhen: [
      'Required reinforcing steel is missing, undersized, unsupported, or materially inconsistent with the structural design intent.',
      'Concrete cover is insufficient or rebar is insufficiently supported for the poured condition.',
      'A footing or foundation-wall inspection hold point has not passed but concrete placement is proceeding.',
      'Required anchor bolts, hold-downs, or embeds are missing or mispositioned where the structural design requires them.',
      'Formwork or foundation-wall preparation is materially incomplete for the stage being presented.',
    ],
    pendingWhen: [
      'The site is near readiness but still awaiting final rebar, form, or wall preparation.',
      'Embed or anchor-bolt positioning is being confirmed and a brief return visit is needed.',
      'Inspection status documentation is expected but not yet confirmed in the record.',
    ],
    requiredEvidence: [
      'Inspector-captured photos showing footing and wall formwork, rebar placement and condition, and embedded item locations before concrete placement.',
    ],
    optionalEvidence: [
      'Supplemental structural notes or rebar layout references.',
      'Overview photos documenting staging or sequence conditions.',
      'Engineer clarification records where a deviation is being resolved.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local footing, foundation-wall, rebar, or inspection hold-point requirements that govern whether concrete work may proceed. Note local engineer involvement requirements for subgrade acceptance or structural deviation.',
    dependencies: ['S04-04'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Foundation and Footing Requirements',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.4',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Building Code 2024 — Concrete Construction',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.15',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'CSA A23.3 — Design of Concrete Structures (Referenced by BCBC)',
        legalReference: 'CSA A23.3 (Referenced Standard under BCBC 2024)',
        sourceTitle: 'CSA A23.3 Design of Concrete Structures',
      },
    ],
  },
  {
    code: 'S05-02',
    label: 'Drainage, Dampproofing, and Foundation Protection',
    uiSchema: 'field_view',
    purpose: 'Confirm foundation drainage and moisture-protection systems are complete and reviewable before concealment or backfill proceeds.',
    viewDetails: 'Validate the below-grade protection layer including dampproofing or waterproofing, protection board, perimeter drain or drain tile, cleanout accessibility, granular backfill or free-draining material, drainage path and positive drainage away from the foundation, and foundation wall penetrations and sleeves. This sub-container protects against premature concealment of critical drainage work.',
    stopIf: [
      'Drainage or waterproofing is incomplete, damaged, or concealed before review.',
      'Backfill has proceeded before foundation drainage and protection systems were accepted.',
    ],
    fieldChecklist: [
      'Dampproofing or waterproofing and protection board installed where required? (Camera or Video Evidence Required)',
      'Perimeter drain or drain tile is installed and cleanouts are visible and accessible where applicable? (Camera or Video Evidence Required)',
      'Granular backfill or free-draining material conditions are identifiable where applicable?',
      'Drainage path and positive drainage away from the foundation are considered where observable?',
      'Foundation wall penetrations and sleeves are sealed or protected where required?',
      'Backfill approval granted only after underlying drainage and protection work reached an acceptable state?',
    ],
    notesGuidance: 'Record the observed drainage and waterproofing condition, perimeter drainage system completeness, cleanout accessibility, backfill authorization status, and any below-grade protection concern affecting the concealment or backfill hold point.',
    whatToCheck: [
      'Dampproofing, waterproofing, and protection board are installed where required by the design or code path.',
      'Perimeter drain or drain tile and foundation drainage connections are complete, accessible, and reviewable.',
      'Cleanouts for perimeter drainage are visible and accessible where applicable.',
      'Granular backfill or free-draining material is in place or specified where the design or drainage conditions require it.',
      'Drainage path and positive-slope drainage away from the foundation are considered and observable.',
      'Foundation wall penetrations, sleeves, and service openings are sealed or protected before backfill or concealment.',
      'Backfill has not proceeded before drainage and protection work was accepted at the hold point.',
      'Missing drainage, inaccessible cleanouts, or damaged protection is flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'Drainage and protection systems are complete and reviewable for the current hold point.',
      'Backfill or granular-base progression is appropriate for the verified drainage and protection condition.',
    ],
    failWhen: [
      'Waterproofing, dampproofing, drainage board, or perimeter drainage is incomplete or compromised.',
      'Backfill has proceeded before drainage or protection systems were accepted.',
      'Foundation drainage connections, cleanouts, or perimeter drain are missing, incomplete, or not reviewable.',
      'Foundation wall penetrations are unsealed or unprotected before backfill or concealment.',
    ],
    pendingWhen: [
      'Drainage or protection installation is underway but not yet complete enough for final confirmation.',
      'Backfill approval depends on a final correction or follow-up observation.',
      'Cleanout or drainage connection access is being resolved before final acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured photos showing drainage protection system and perimeter drainage condition before concealment.',
    ],
    optionalEvidence: [
      'Supplemental site notes documenting drainage path or backfill conditions.',
      'Installer clarification notes.',
      'Overview photos documenting concealed-area risk or drainage condition.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local below-grade drainage, dampproofing, waterproofing, or backfill hold-point conditions that must be met before concealment. Note any municipal connection or service-penetration sealing requirements.',
    dependencies: ['S05-01'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Foundation Drainage',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.13',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Building Code 2024 — Below-Grade Dampproofing and Waterproofing',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.14',
        sourceTitle: 'British Columbia Building Code 2024',
      },
    ],
  },
  {
    code: 'S05-03',
    label: 'Slab Preparation, Radon, Soil Gas, and Under-Slab Conditions',
    uiSchema: 'field_view',
    purpose: 'Confirm under-slab conditions, vapour barrier and soil gas barrier continuity, radon rough-in, under-slab insulation and reinforcement, and slab embed readiness are all reviewable before slab placement or concealment proceeds.',
    viewDetails: 'Validate under-slab conditions before concrete placement. Confirm under-slab base, granular layer, compaction, or subgrade conditions are observable. Verify vapour barrier, soil gas barrier, or air barrier continuity. Confirm radon rough-in or soil gas mitigation components where required. Identify under-slab insulation, slab edge insulation, or thermal break details where required by approved drawings or energy design. Review reinforcement, welded wire mesh, rebar, thickened slab areas, slab penetrations, radiant heat loops, and under-slab services before concealment.',
    stopIf: [
      'Under-slab vapour or soil gas barrier continuity is visibly broken or missing and the slab is scheduled for pour.',
      'Required radon rough-in or soil gas mitigation is absent where mandated by the scope or code path.',
      'Required slab reinforcement is missing or materially incomplete.',
    ],
    fieldChecklist: [
      'Under-slab base, granular layer, compaction evidence, or subgrade condition is observable where required?',
      'Vapour barrier or soil gas barrier continuity is visible before slab placement? (Camera or Video Evidence Required)',
      'Radon rough-in or soil gas mitigation components are installed where required by scope or code path? (Camera or Video Evidence Required)',
      'Under-slab insulation, slab edge insulation, or thermal break details are visible where required by approved drawings or energy design?',
      'Reinforcement, welded wire mesh, rebar, thickened slab areas, and slab penetrations are reviewable where applicable? (Camera or Video Evidence Required)',
      'Radiant heat or under-slab services are identified and located where applicable?',
      'Anchor bolts and hold-down embeds are correctly positioned where applicable?',
    ],
    notesGuidance: 'Record slab-preparation conditions, under-slab base or subgrade readiness, vapour and soil gas barrier continuity, radon and soil gas rough-in status, insulation and thermal break visibility, reinforcement condition, and embed positioning issues affecting the structural or environmental hold point.',
    whatToCheck: [
      'Under-slab base, granular layer, and subgrade condition are observable and consistent with the design intent.',
      'Vapour barrier or soil gas barrier continuity is confirmed for the presented slab area.',
      'Radon rough-in or soil gas mitigation components are complete where required by the scope or applicable code path.',
      'Under-slab insulation, slab edge insulation, or thermal break details are in place where required by the approved energy design.',
      'Slab reinforcement, welded wire mesh, and thickened slab areas are consistent with the structural design intent.',
      'Slab penetrations are located and protected before pour.',
      'Radiant heat loops or under-slab services are identified and positioned where applicable.',
      'Anchor bolts and hold-down embeds are correctly positioned for the approved design intent.',
      'Concealed, damaged, incomplete, or undocumented under-slab conditions are flagged as a Hold or Failed observation.',
    ],
    passWhen: [
      'The under-slab and slab-preparation package is complete and reviewable for the presented stage.',
      'Barrier continuity, radon rough-in, insulation, reinforcement, and embeds are all acceptable for progression to concrete pour.',
    ],
    failWhen: [
      'Under-slab vapour or soil gas barrier continuity is visibly broken or incomplete.',
      'Required radon rough-in or soil gas mitigation is missing or materially incomplete where required.',
      'Slab reinforcement is missing, insufficient, or not coordinated with the design intent.',
      'Required under-slab insulation or thermal break is absent where mandated by the approved energy design.',
      'Anchor bolts or hold-down embeds are misplaced or missing where required by the structural design.',
    ],
    pendingWhen: [
      'The slab area is partially prepared and requires a return inspection before final acceptance.',
      'Embed positioning or rough-in completion is expected to resolve with minor corrective work.',
      'Radon or soil gas rough-in is being finalized and a return visit is scheduled before pour.',
    ],
    requiredEvidence: [
      'Inspector-captured photos showing radon rough-in, vapour barrier condition, reinforcement placement, and embed positioning before concealment.',
    ],
    optionalEvidence: [
      'Supplemental slab layout notes.',
      'Overview photos documenting staged preparation conditions.',
      'Insulation or thermal break installation reference.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: soil gas and radon rough-in are required where the project scope or code path triggers them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local slab, vapour barrier, radon, soil gas, under-slab insulation, or embed hold-point expectations that affect whether the slab may proceed to pour.',
    dependencies: ['S05-02'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Slab-on-Grade Construction',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.16',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'BC Energy Step Code — Vapour Barrier and Thermal Break Requirements',
        legalReference: 'BCBC 2024 Division B, Part 10 (BC Energy Step Code)',
        sourceTitle: 'BC Energy Step Code / BCBC 2024 Division B Part 10',
      },
      {
        label: 'Health Canada Radon Guideline — Soil Gas Mitigation Rough-In',
        legalReference: 'Health Canada Radon Guideline for Canadians (2007)',
        sourceTitle: 'Health Canada Radon Guideline',
      },
    ],
  },
  {
    code: 'S05-04',
    label: 'Concrete Pour, Placement, Curing, and Post-Pour Review',
    uiSchema: 'field_view',
    purpose: 'Confirm concrete placement documentation, mix design compliance, pour conditions, curing, and post-pour review are complete before the foundation or slab stage is closed out.',
    viewDetails: 'Review concrete delivery tickets, batch information, mix design, strength requirements, and field test documentation where required. Verify cold-weather or hot-weather protection and curing method where applicable. Confirm pour sequencing, placement, and consolidation are documented or observable. Review post-pour anchor bolt, embed, and sleeve locations. Identify visible honeycombing, voids, cracking, displaced embeds, or failed test evidence as Hold or Failed conditions.',
    stopIf: [
      'Required concrete delivery tickets, batch information, or mix design documentation are unavailable and the pour record cannot be established.',
      'Visible honeycombing, voids, cracking, or displaced embeds are present and have not been assessed.',
      'Concrete cylinder test results or field test reports indicate non-conforming strength or properties and have not been addressed.',
    ],
    fieldChecklist: [
      'Concrete delivery tickets or batch information are available where required? (Evidence: Text)',
      'Mix design, strength class, exposure class, air entrainment, slump, or temperature properties are documented where specified? (Evidence: Text)',
      'Cold-weather or hot-weather concrete protection and curing method are identified where applicable?',
      'Concrete placement, consolidation, and pour sequencing are documented or observable where applicable?',
      'Cylinder tests or field test reports are available or scheduled where specified by the engineer or AHJ? (Evidence: Text)',
      'Post-pour anchor bolt, hold-down, embed, sleeve, and penetration locations confirmed where applicable? (Camera or Video Evidence Required)',
      'Visible honeycombing, voids, cracking, or displaced embeds are noted and assessed where applicable?',
    ],
    notesGuidance: 'Record pour documentation status, mix design or delivery ticket references, cold or hot weather protection and curing conditions, placement and consolidation observations, cylinder test scheduling or results, post-pour embed condition, and any visible defect observed after stripping.',
    whatToCheck: [
      'Concrete delivery tickets or batch information are available where required to establish the pour record.',
      'Mix design, strength, exposure class, air entrainment, slump, temperature, or other specified concrete properties are documented.',
      'Cold-weather or hot-weather concrete protection measures and curing method are identified and appropriate where applicable.',
      'Concrete placement, consolidation, and pour sequencing are documented or observable where applicable.',
      'Cylinder tests or field test reports are scheduled or available where required by the structural engineer or AHJ.',
      'Post-pour anchor bolt, hold-down, embed, sleeve, and penetration locations are confirmed where the structural design depends on them.',
      'Visible honeycombing, voids, cracking, displaced embeds, or adverse test results are assessed and documented.',
    ],
    passWhen: [
      'Pour documentation, mix compliance, curing conditions, post-pour embed confirmation, and visible concrete condition are all acceptable for the presented stage.',
      'No outstanding concrete defects, failed test results, or missing documentation items are blocking progression.',
    ],
    failWhen: [
      'Required concrete delivery tickets or batch documentation are unavailable and the pour cannot be verified.',
      'Visible honeycombing, voids, cracking, or displaced embeds are present without an assessment or corrective plan.',
      'Cylinder test results or field test reports indicate non-conforming concrete properties without a documented engineer-approved resolution.',
      'Cold-weather or hot-weather protection was inadequate or absent where the temperature conditions required it.',
    ],
    pendingWhen: [
      'Cylinder test results are pending and the final concrete acceptance depends on test outcomes.',
      'A minor post-pour embed or penetration condition is being resolved and a return visit is scheduled.',
      'Cold or hot weather protection is still in place and curing period is not yet complete.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos or notes confirming post-pour concrete condition, embed locations, and curing arrangements.',
    ],
    optionalEvidence: [
      'Delivery ticket or batch information reference.',
      'Cylinder test report or schedule reference.',
      'Cold-weather or hot-weather protection documentation.',
      'Engineer field review notes where applicable.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local concrete pour documentation requirements, cylinder-test submission expectations, AHJ cold-weather concrete conditions, and any post-pour inspection hold points mandated before framing or structural work proceeds.',
    dependencies: ['S05-03'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Concrete Placement and Curing',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.15',
        sourceTitle: 'British Columbia Building Code 2024',
      },
      {
        label: 'CSA A23.1 — Concrete Materials and Methods of Concrete Construction',
        legalReference: 'CSA A23.1 (Referenced Standard under BCBC 2024)',
        sourceTitle: 'CSA A23.1 Concrete Materials and Methods of Concrete Construction',
      },
      {
        label: 'CSA A23.3 — Design of Concrete Structures (Test and Acceptance Criteria)',
        legalReference: 'CSA A23.3 (Referenced Standard under BCBC 2024)',
        sourceTitle: 'CSA A23.3 Design of Concrete Structures',
      },
    ],
  },
]

const STRUCTURAL_STAGE_6_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S06-01',
    label: 'Vertical and Horizontal Framing',
    uiSchema: 'field_view',
    purpose: 'Confirm the primary structural skeleton is complete, stable, and aligned with the approved design before concealment proceeds.',
    viewDetails: 'Confirm the core structural skeleton is complete, plumb, and permanently braced. Validate bearing walls, columns, beams, floor framing, roof framing, truss layout, engineered wood products, and load path continuity against the structural design basis before the framing package is concealed or advanced.',
    stopIf: [
      'Primary structural members are altered, missing, or unsupported without engineer approval.',
      'Concealed framing, unsupported load paths, or missing connectors cannot be verified before concealment.',
      'Unapproved modifications to structural members are present.',
    ],
    fieldChecklist: [
      'Framing layout matches approved drawings? (Camera or Video Evidence Required)',
      'Bearing walls, columns, and beams match structural design intent? (Camera or Video Evidence Required)',
      'Truss layout, spacing, and bracing installed per truss design documents where applicable? (Camera or Video Evidence Required)',
      'Engineered wood products (LVL, PSL, I-joists, engineered beams) installed per engineer or manufacturer requirements where applicable?',
      'Floor and roof framing (joists, rafters) correctly sized, spaced, and secured? (Camera or Video Evidence Required)',
      'Posts, beams, point loads, bearing conditions, and load path continuity identifiable before concealment?',
      'Notching, drilling, holes, and penetrations in structural members within approved limits or engineer-approved where applicable?',
      'Required professional field review letter or observation report available, scheduled, or identified where required?',
    ],
    notesGuidance: 'Record which framing zones were observed, what structural members were verified, and any deviation in member sizing, support, alignment, bracing, or engineered product installation. Note any missing connectors, unapproved modifications, or unsupported load paths.',
    whatToCheck: [
      'Framing layout is consistent with the approved drawings for the presented area.',
      'Bearing walls, columns, and beams align with the structural design intent.',
      'Truss layout, truss bracing, and truss documentation are reviewable where trusses are present.',
      'Engineered wood products are installed per engineer or manufacturer requirements where applicable.',
      'Primary load paths are continuous and permanently supported.',
      'Posts, beams, and point-load conditions are properly supported and transferring load continuously.',
      'Floor and roof framing members are correctly sized, spaced, and secured for the presented stage.',
      'Notching, drilling, holes, and penetrations in structural members are within approved limits or engineer-approved.',
      'Professional field review documentation is available or identified where required by the permit scope.',
      'The framing package is plumb, braced, and stable enough for the hold point being reviewed.',
    ],
    passWhen: [
      'The core structural skeleton matches the approved framing intent for the presented area.',
      'Primary members are installed, supported, and braced without a material structural discrepancy.',
      'Engineered products and truss conditions are reviewable and consistent with design documents where applicable.',
      'Required professional field review documentation is available or identified where triggered.',
    ],
    failWhen: [
      'A primary framing member is missing, altered, undersized, or unsupported.',
      'Observed framing conditions deviate materially from the structural design without approved engineering direction.',
      'The structure is not adequately braced or stabilized for the stage being presented.',
      'Concealed framing, unsupported load paths, missing connectors, or unapproved modifications are identified.',
      'Notching or penetrations in structural members exceed approved limits without engineer-approved documentation.',
    ],
    pendingWhen: [
      'The framing package is close to readiness but still awaiting final bracing, support, or installation in the reviewed area.',
      'Supporting structural clarification or professional field review documentation is expected before a final framing decision can be made.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing primary framing members, supports, and overall structural alignment.',
      'Inspector-captured photos showing truss layout and bracing conditions where applicable.',
      'Inspector-captured photos showing engineered wood product installation where applicable.',
    ],
    optionalEvidence: [
      'Supplemental framing notes.',
      'Overview photos documenting sequencing or access constraints.',
      'Engineer clarification records where a deviation is being resolved.',
      'Truss design documents or shop drawings where applicable.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local framing hold-point requirements, engineered framing conditions, truss bracing expectations, or municipal requirements affecting structural acceptance before concealment.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — structural framing and approved construction documents',
        legalReference: 'BC Building Code 2024 — Division B structural and housing/small-building requirements; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved structural drawings, truss layouts, and engineered wood documentation',
        legalReference: 'Project-specific approved permit drawings, structural schedules, truss shop drawings, engineered product documentation, manufacturer requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Letters of Assurance and professional field review where required',
        legalReference: 'BC Building Code 2024 and Vancouver Building By-law 2025 Letters of Assurance — Schedule B and Schedule C-B where triggered',
        sourceTitle: 'Letters of Assurance for building construction in B.C.',
        sourceUrl: null,
      },
    ],
    dependencies: ['S05-04'],
  },
  {
    code: 'S06-02',
    label: 'Lateral and Seismic Systems',
    uiSchema: 'field_view',
    purpose: 'Confirm the lateral-force-resisting and seismic restraint systems are installed in accordance with the structural schedule before concealment.',
    viewDetails: 'Validate the lateral system, including shear walls, braced wall panels, nailing schedules, hold-downs, straps, connectors, anchors, tie-downs, and seismic restraint elements. This sub-container ensures the structure can resist lateral and seismic demands before the framing package is concealed.',
    stopIf: [
      'Shear wall nailing patterns are incorrect or hold-down hardware is missing or loose.',
      'Required lateral connectors, straps, or anchors are absent in the reviewed area.',
    ],
    fieldChecklist: [
      'Shear walls and lateral system installed per structural schedule? (Camera or Video Evidence Required)',
      'Braced wall panels identified and positioned per approved drawings where applicable? (Camera or Video Evidence Required)',
      'Hold-downs, tie-downs, and seismic restraint elements securely fastened? (Camera or Video Evidence Required)',
      'Lateral connectors, straps, and anchors installed at required locations? (Camera or Video Evidence Required)',
      'Nailing schedule compliance reviewable at observed shear wall locations?',
    ],
    notesGuidance: 'Record which shear walls, braced wall panels, or restraint elements were reviewed, what fastening or hardware conditions were observed, and any missing lateral-system component.',
    whatToCheck: [
      'Shear walls are located and configured per the governing schedule or design intent.',
      'Braced wall panels are identified and positioned per the approved drawings where applicable.',
      'Observed fastening patterns are consistent with the required lateral-system nailing schedule.',
      'Hold-downs, tie-downs, straps, and connectors are installed and securely fastened.',
      'Lateral system anchors are present at required locations and reviewable before concealment.',
      'No critical lateral or seismic hardware omission remains in the reviewed area.',
    ],
    passWhen: [
      'The lateral system, braced wall panels, and seismic restraint hardware are installed and reviewable for the presented stage.',
      'No material nailing, fastening, connector, or hardware deficiency remains before concealment.',
    ],
    failWhen: [
      'Shear walls are incomplete, mislocated, or fastened inconsistently with the required schedule.',
      'Braced wall panels are absent or positioned incorrectly where required by the approved drawings.',
      'Hold-downs, tie-downs, straps, connectors, or seismic restraint elements are missing, loose, or inadequately installed.',
      'The observed lateral system would not support a defensible structural review.',
    ],
    pendingWhen: [
      'The lateral system is partially installed and requires a follow-up inspection before concealment.',
      'Fastening, hardware, or connector documentation is expected to clarify the reviewed condition.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing shear walls, fastening patterns, braced wall panels, and installed lateral or seismic hardware.',
    ],
    optionalEvidence: [
      'Supplemental close-up photos of hardware and connectors.',
      'Engineer or supplier detail references.',
      'Field notes documenting corrective items.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local lateral-system, seismic-restraint, braced wall panel, or hardware inspection expectations that affect approval before concealment.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — lateral and seismic structural resistance',
        legalReference: 'BC Building Code 2024 — structural resistance, lateral-force, seismic, and braced-wall requirements; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved lateral system drawings and structural schedules',
        legalReference: 'Project-specific approved drawings, shear wall schedules, braced wall panel layouts, hold-down schedules, connector schedules, structural notes, and AHJ conditions',
        sourceTitle: 'Approved Structural Drawings / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Registered professional field review where required',
        legalReference: 'Letters of Assurance Schedule B and applicable field review obligations where triggered by project scope, AHJ, or registered professional requirements',
        sourceTitle: 'Letters of Assurance for building construction in B.C.',
        sourceUrl: null,
      },
    ],
    dependencies: ['S06-01'],
  },
  {
    code: 'S06-03',
    label: 'Stairs, Openings, Fire Separations, and Engineering',
    uiSchema: 'field_view',
    purpose: 'Confirm secondary structural framing, stair rough-in, fire separation framing conditions, and specialty engineering requirements are addressed before concealment or downstream finishing.',
    viewDetails: 'Ensure all secondary structural elements, stair rough openings, fire separation framing conditions in multi-unit buildings, and specialty engineering components are reviewable before concealment. Verify stair framing, headroom clearance, guard, handrail, and opening-protection blocking readiness, deck and balcony framing and ledger connections, fire blocking and fire separation framing conditions where applicable, and the availability of engineering, supplier, manufacturer, or registered professional documentation where triggered by approved drawings, AHJ conditions, engineered components, or project scope.',
    stopIf: [
      'Secondary structural framing is unsafe or required engineering, registered professional, supplier, or manufacturer documentation is missing for scope identified in approved drawings, AHJ conditions, or permit record.',
      'Stair rough opening, landing, or headroom conditions do not allow for a compliant stair configuration.',
      'Fire separation framing continuity is interrupted or missing at rated assembly locations in multi-unit buildings.',
    ],
    fieldChecklist: [
      'Stair rough openings, landings, and headroom clearances reviewable before closure? (Camera or Video Evidence Required)',
      'Guard, handrail, and opening-protection blocking or backing installed at stair, balcony, and landing guard locations where applicable?',
      'Deck and balcony structural framing, ledgers, and connections secure? (Camera or Video Evidence Required)',
      'Fire separation framing, fire blocking, and rated-assembly framing conditions identified at required locations in multi-unit buildings where applicable? (Camera or Video Evidence Required)',
      'Engineering, supplier, manufacturer, or registered professional documentation available where triggered by approved drawings, AHJ conditions, engineered components, truss layouts, structural schedules, specialty connections, or project scope?',
    ],
    notesGuidance: 'Record observed stair or deck framing conditions, stair rough opening and headroom observations, guard blocking readiness, fire separation framing conditions at rated assemblies, any connection or clearance issue, and whether specialty engineering documentation applies to the project scope.',
    whatToCheck: [
      'Stair rough openings, landings, and headroom clearances are acceptable and reviewable before concealment.',
      'Guard, handrail, and opening-protection backing or blocking is visible at stair, balcony, and landing guard locations where required.',
      'Deck and balcony framing, ledgers, and structural connections are secure and reviewable.',
      'Fire separation framing conditions are continuous and correct at rated walls, floors, and rated assemblies where applicable in multi-unit buildings.',
      'Fire blocking is installed where required by the framing geometry.',
      'Engineering, supplier, manufacturer, or registered professional documentation is available or identified where triggered by approved drawings, AHJ conditions, engineered components, truss layouts, structural schedules, specialty connections, or project scope.',
      'No specialty structural element remains unverified before concealment.',
    ],
    passWhen: [
      'Secondary framing elements, stair rough openings, and guard backing conditions are installed and reviewable without a material structural concern.',
      'Fire separation framing conditions are continuous and correct at all applicable rated assembly locations.',
      'Required engineering documentation is present wherever the scope exceeds prescriptive limits.',
    ],
    failWhen: [
      'Stair or deck framing shows a material structural or clearance deficiency.',
      'Stair rough opening or headroom conditions do not support a compliant stair configuration.',
      'Guard, handrail, and opening-protection blocking or backing is absent at stair, balcony, or landing guard locations where required by the reviewed scope.',
      'Critical ledger or connection detailing is insecure or inconsistent with the structural intent.',
      'Fire separation framing continuity is missing or interrupted at a rated assembly location.',
      'Engineering, supplier, manufacturer, or registered professional documentation is identified as required in the approved drawings, AHJ conditions, or permit record, but absent or materially incomplete.',
    ],
    pendingWhen: [
      'Secondary framing is still being completed and needs a return inspection.',
      'Specialty engineering documentation is expected but not yet fully uploaded.',
      'Guard blocking or fire separation corrections are expected before the stage can advance.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing stair rough openings, headroom, and landing conditions.',
      'Inspector-captured field photos showing deck, balcony, or other secondary structural framing conditions.',
      'Inspector-captured photos showing fire separation framing and fire blocking conditions where applicable.',
    ],
    optionalEvidence: [
      'Part 4 engineering reports already on file.',
      'Supplemental stair measurements or notes.',
      'Connection detail references.',
      'Guard blocking layout references.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: Engineering, supplier, manufacturer, or registered professional documentation applies when triggered by approved drawings, AHJ conditions, engineered components, truss layouts, structural schedules, specialty connections, or project scope. The inspector should verify whether required documentation is available or identified; the inspector should not independently determine whether professional involvement is required. Fire separation framing applies in multi-unit buildings and where required by the approved drawings.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local stair, deck, balcony, guard, fire-separation framing, or engineered-structure requirements that govern acceptance before the framing package is concealed.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — stairs, guards, handrails, and openings',
        legalReference: 'BC Building Code 2024 — stairs, guards, handrails, openings, and related Part 9 / Part 3 requirements as applicable; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'BC Building Code 2024 — fire separation framing and rated assemblies',
        legalReference: 'BC Building Code 2024 — fire protection, fire separations, fire blocking, and rated assembly continuity where applicable; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved drawings and professional documentation for specialty structural elements',
        legalReference: 'Approved permit drawings, structural schedules, registered professional field review requirements, supplier/manufacturer documents, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Letters of Assurance and professional field review where required',
        legalReference: 'BC Building Code 2024 and Vancouver Building By-law 2025 Letters of Assurance — Schedule B and Schedule C-B where triggered',
        sourceTitle: 'Letters of Assurance for building construction in B.C.',
        sourceUrl: null,
      },
    ],
    dependencies: ['S06-02'],
  },
]

const STRUCTURAL_STAGE_7_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S07-01',
    label: 'Sheathing, WRB, and Weather Barrier',
    uiSchema: 'field_view',
    purpose: 'Confirm the base enclosure layers are installed continuously and correctly before cladding integration proceeds.',
    viewDetails: 'Validate the initial enclosure package, including wall and roof sheathing, weather-resistive barrier continuity, air-barrier integration, and rainscreen cavity preparation. This sub-container confirms the building has a defensible base water and air control layer before exterior finish systems advance.',
    stopIf: [
      'WRB is torn, improperly lapped, or missing at critical junctions.',
      'Sheathing seams, transitions, or membrane laps are not reviewable before cladding conceals them.',
      'Air barrier or water-resistive barrier continuity is interrupted at a key transition without a visible remedy.',
    ],
    fieldChecklist: [
      'Exterior sheathing installed, fastened, and visible for review before cladding? (Camera or Video Evidence Required)',
      'Weather-resistive barrier (WRB) installed with correct laps and continuity reviewable at observable joints? (Camera or Video Evidence Required)',
      'Rainscreen cavity or drainage plane conditions visible where required by the assembly?',
      'Sheathing seams, transitions, and membrane laps reviewable before cladding proceeds?',
      'Air barrier and water-resistive barrier continuity maintained at key transitions (wall-to-roof, wall-to-foundation, openings)?',
      'Damaged, reversed, incomplete, or concealed barrier work identified before proceeding?',
    ],
    notesGuidance: 'Record observed sheathing, WRB, and rainscreen conditions, including continuity issues, missing laps, tears, reverse-lapping, or fastening deficiencies at key transitions.',
    whatToCheck: [
      'Exterior sheathing is installed and fastened consistently for the presented area and reviewable before cladding.',
      'The WRB and air barrier are lapped, integrated, and continuous at observable joints and transitions.',
      'The rainscreen assembly or cavity setup is established where the enclosure system requires it.',
      'Sheathing seams and membrane laps are reviewable in critical zones before cladding conceals them.',
      'Air and water-resistive barrier continuity is maintained at wall-to-roof, wall-to-foundation, and opening transitions.',
      'No critical enclosure-control layer is missing, damaged, or visibly compromised before cladding integration.',
    ],
    passWhen: [
      'The sheathing and weather-barrier package is complete enough for the reviewed stage.',
      'Observed water and air control layers are continuous and suitable for downstream integration.',
      'Rainscreen cavity is established where required by the assembly.',
    ],
    failWhen: [
      'Sheathing fastening is materially deficient or incomplete.',
      'The WRB or air barrier is torn, missing, reverse-lapped, or discontinuous at a critical junction.',
      'The rainscreen cavity or strapping setup is absent where required by the assembly.',
      'Damaged, reversed, or incomplete barrier work is identified that cannot be remedied before cladding.',
    ],
    pendingWhen: [
      'The enclosure base layer is partially installed and requires a return inspection before cladding proceeds.',
      'Localized corrections or continuity repairs are expected before final acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing sheathing, WRB continuity, membrane laps, and rainscreen setup.',
    ],
    optionalEvidence: [
      'Supplemental close-up photos of lap conditions at transitions.',
      'Installer notes.',
      'Manufacturer detail references for the reviewed assembly.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local enclosure, WRB, air-barrier, or rainscreen expectations that must be satisfied before cladding or concealment proceeds.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — building envelope, sheathing, weather barrier, and moisture control',
        legalReference: 'BC Building Code 2024 — building envelope, rain penetration control, sheathing, weather-resistive barrier, air barrier, and moisture control requirements; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved envelope drawings, assembly details, and manufacturer requirements',
        legalReference: 'Project-specific approved permit drawings, envelope assemblies, WRB details, rainscreen details, manufacturer installation requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Vancouver Building By-law 2025 — rain screen cladding system where Vancouver jurisdiction applies',
        legalReference: 'Vancouver Building By-law 2025 — Vancouver-specific building envelope and rain screen cladding requirements where applicable',
        sourceTitle: 'Vancouver Building By-law 2025',
        sourceUrl: null,
        isVbblOnly: true,
      },
    ],
    dependencies: ['S06-03'],
  },
  {
    code: 'S07-02',
    label: 'Penetrations, Openings, Flashings, and Cladding Integration',
    uiSchema: 'field_view',
    purpose: 'Confirm penetrations, openings, and cladding-support systems are integrated correctly with the enclosure control layers.',
    viewDetails: 'Ensure the building is made watertight and the rainscreen system is ready for exterior cladding. Validate window and door rough-opening preparation before installation or concealment, flashing integration at heads, jambs, and sills, sill pans, back dams, and membrane integration, through-wall flashings and transition membranes, service penetration flashing and sealing, and cladding support and attachment systems.',
    stopIf: [
      'Reverse-flashing at windows, doors, or exterior penetrations.',
      'Material incompatibility, unsealed penetrations, or missing flashings that cannot be corrected before concealment.',
    ],
    fieldChecklist: [
      'Window and door rough openings prepared and reviewable before installation or concealment? (Camera or Video Evidence Required)',
      'Sill pans, head flashings, jamb membranes, back dams, and end dams installed and integrated with WRB where applicable? (Camera or Video Evidence Required)',
      'Through-wall flashings and transition membranes installed where required?',
      'Service penetrations flashed, sealed, sleeved, or gasketed where required? (Camera or Video Evidence Required)',
      'Cladding attachment, clearances, drainage cavity, fasteners, and material compatibility reviewable where applicable?',
      'Material incompatibility, unsealed penetrations, or missing flashings identified before concealment?',
    ],
    notesGuidance: 'Record observed window, door, flashing, sill pan, and penetration-sealing conditions, including any reverse laps, missing integration, unsealed penetrations, or insecure cladding support system.',
    whatToCheck: [
      'Window and door rough openings are prepared and reviewable before installation or concealment.',
      'Sill pans, head flashings, jamb membranes, back dams, and end dams are installed and integrated with the WRB in the correct drainage sequence.',
      'Through-wall flashings and transition membranes are installed where required by the enclosure design.',
      'Service penetrations are flashed, sealed, sleeved, or gasketed where required.',
      'Cladding support and attachment systems are secure, compatible with the enclosure, and ready to receive the exterior finish.',
      'No penetration or opening detail undermines enclosure watertightness in the reviewed area.',
    ],
    passWhen: [
      'Openings, flashing transitions, penetration sealing, and cladding supports are integrated correctly for the presented stage.',
      'The enclosure is ready to move into the next exterior-cladding step without a critical water-management defect.',
    ],
    failWhen: [
      'Windows or doors are materially out of plumb or incompletely integrated with the enclosure.',
      'Flashing is missing, reverse-lapped, or not integrated into the WRB drainage sequence.',
      'Service penetrations are unsealed, unflashed, or open to water ingress.',
      'Cladding support or attachment systems are insecure or incompatible for the reviewed area.',
      'Material incompatibility is identified that compromises the enclosure system.',
    ],
    pendingWhen: [
      'Opening integration is still being completed and requires a follow-up inspection.',
      'Localized flashing or penetration sealing corrections are expected before the cladding stage can proceed.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing flashing integration, sill pans, penetration sealing, and cladding support systems.',
    ],
    optionalEvidence: [
      'Supplemental penetration-detail photos.',
      'Installer notes.',
      'Manufacturer flashing details.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local window, door, flashing, penetration-sealing, or rainscreen integration requirements that must be met before cladding proceeds.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — openings, flashings, penetrations, and rain penetration control',
        legalReference: 'BC Building Code 2024 — openings, flashings, penetrations, cladding integration, and rain penetration control requirements; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved window, door, flashing, and cladding integration details',
        legalReference: 'Project-specific approved permit drawings, window and door installation details, flashing details, cladding attachment details, manufacturer installation requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Vancouver Building By-law 2025 — rain screen and envelope integration where Vancouver jurisdiction applies',
        legalReference: 'Vancouver Building By-law 2025 — Vancouver-specific envelope, rain screen, and exterior-wall integration requirements where applicable',
        sourceTitle: 'Vancouver Building By-law 2025',
        sourceUrl: null,
        isVbblOnly: true,
      },
    ],
    dependencies: ['S07-01'],
  },
  {
    code: 'S07-03',
    label: 'Roof System, Drainage, Ventilation, and Weatherproofing',
    uiSchema: 'field_view',
    purpose: 'Confirm the upper enclosure and drainage systems are complete enough to protect the building from water ingress and uncontrolled runoff.',
    viewDetails: 'Validate roof underlayment and membrane continuity, final roofing installation consistent with approved drawings or manufacturer requirements, roof penetration and stack flashing, roof drainage and positive drainage conditions, roof ventilation path and attic baffle continuity, and eave fire protection conditions near property lines where applicable.',
    stopIf: [
      'Roofing or drainage systems are incomplete at a condition that exposes the building to active water ingress.',
      'Missing roof drainage, blocked ventilation path, or unflashed roof penetration that cannot be remedied before concealment.',
    ],
    fieldChecklist: [
      'Roof underlayment, membrane, and roofing system installed consistent with approved drawings or manufacturer requirements? (Camera or Video Evidence Required)',
      'Roof penetrations, vents, plumbing stacks, exhausts, and flashings reviewable? (Camera or Video Evidence Required)',
      'Roof drainage, gutters, scuppers, overflows, and positive drainage identified where applicable?',
      'Roof ventilation path, attic baffles, soffit ventilation, or vented cavity continuity visible where applicable?',
      'Eave fire protection or projection conditions near property lines identified where applicable?',
      'Soffits, fascia, gutters, and downspouts installed where required for the presented stage?',
    ],
    notesGuidance: 'Record roof, drainage, ventilation, and eave condition observations, including any incomplete drainage path, blocked ventilation, unflashed penetration, ponding risk, or membrane deficiency.',
    whatToCheck: [
      'Roof underlayment, membrane, and roofing material are installed and coordinated for the reviewed area, consistent with approved drawings or manufacturer requirements.',
      'Roof penetrations, vents, plumbing stacks, and exhaust terminations are reviewable and flashed where required.',
      'Roof drainage, gutters, scuppers, overflow provisions, and positive drainage conditions are identifiable where applicable.',
      'Roof ventilation path, attic baffles, soffit ventilation, or vented cavity continuity are visible where applicable.',
      'Eave fire protection or projection limitations near property lines are identified where applicable.',
      'No unresolved roof or drainage condition remains that would compromise enclosure performance.',
    ],
    passWhen: [
      'The roof and associated drainage systems are complete enough for the presented stage.',
      'Observed roof drainage conditions support positive water shedding away from the building.',
      'Ventilation path continuity is identifiable where applicable.',
    ],
    failWhen: [
      'Roof membrane or roofing installation is incomplete in a way that compromises weather protection.',
      'Drainage components are missing, improperly installed, or incapable of managing runoff as presented.',
      'Roof penetrations are unflashed or open to water ingress.',
      'Ventilation path is blocked and cannot be remedied before concealment.',
    ],
    pendingWhen: [
      'The roof or drainage package is still being completed and requires a return inspection.',
      'A localized membrane, flashing, or drainage correction is expected before final acceptance of the stage.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing roof drainage, membrane condition, and penetration flashing.',
      'Inspector-captured field photos showing ventilation path conditions where applicable.',
    ],
    optionalEvidence: [
      'Supplemental roof overview photos.',
      'Drainage notes.',
      'Installer or consultant coordination comments.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local roofing, drainage, roof ventilation, eave fire projection, or positive-slope expectations that affect acceptance of the enclosure stage.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — roofing, roof drainage, ventilation, and weather protection',
        legalReference: 'BC Building Code 2024 — roofing, roof membrane, roof drainage, attic/roof ventilation, projections, and weather protection requirements; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved roof assembly, drainage, ventilation, and manufacturer requirements',
        legalReference: 'Project-specific approved permit drawings, roof assembly details, roof drainage details, ventilation details, manufacturer requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
    ],
    dependencies: ['S07-02'],
  },
  {
    code: 'S07-04',
    label: 'Envelope Field Review and Assurance',
    uiSchema: 'field_view',
    purpose: 'Confirm envelope field review, assurance documentation, and open deficiency resolution are complete before cladding or concealment progresses.',
    viewDetails: 'Validate that building-envelope field review letters, reports, or sign-offs are available, scheduled, confirmed not applicable, or identified for Hold resolution — required where triggered by approved drawings, AHJ conditions, Letters of Assurance, registered professional involvement, manufacturer requirements, building-envelope consultant requirements, or project scope. Confirm manufacturer representative observations, AHJ envelope conditions, and special inspection requirements are addressed where triggered. Ensure any envelope deficiencies, open field review items, or missing assurance documentation are listed and resolved before cladding or concealment proceeds.',
    stopIf: [
      'Required envelope field review letter or report is unresolved and cladding or concealment is about to proceed.',
      'Unresolved envelope deficiencies or missing assurance documentation block downstream progress.',
    ],
    fieldChecklist: [
      'Required building-envelope field review letter or report available, scheduled, or identified where professional involvement is required?',
      'Manufacturer representative observation or installation confirmation identified where specified by drawings or specifications?',
      'AHJ envelope condition or special inspection requirement identified and addressed where applicable?',
      'Envelope deficiencies, open field review items, or missing assurance documentation listed before cladding or concealment progression?',
      'Unresolved envelope field review requirements identified before proceeding?',
    ],
    notesGuidance: 'Record whether envelope field review documentation is available, pending, or not required for the project scope. Note any open deficiencies, unresolved field review items, or manufacturer observation requirements. Flag any missing assurance documentation that would hold downstream progress.',
    whatToCheck: [
      'Required building-envelope field review letter, report, or engineering sign-off is available or scheduled where triggered by the permit scope or AHJ.',
      'Manufacturer representative observation requirements are identified and confirmed where specified.',
      'AHJ envelope conditions or special inspection requirements are identified and addressed where applicable.',
      'Any known envelope deficiencies or open field review items are listed and tracked before cladding or concealment.',
      'Missing assurance documentation is identified and a resolution path is established.',
    ],
    passWhen: [
      'Required envelope field review documentation is available, scheduled, or confirmed not required for the project scope.',
      'Manufacturer and AHJ assurance requirements are identified and addressed for the presented stage.',
      'No outstanding envelope deficiency or missing assurance item would block downstream progress.',
    ],
    failWhen: [
      'Required envelope field review letter or report is absent and cladding or concealment is imminent.',
      'Manufacturer observation or AHJ special inspection requirements are unresolved at a critical stage.',
    ],
    pendingWhen: [
      'Envelope field review documentation is expected but not yet received or uploaded.',
      'Manufacturer representative observation is scheduled but not yet completed.',
      'AHJ envelope condition or special inspection requirement is outstanding and under review.',
    ],
    requiredEvidence: [
      'Inspector-captured notes confirming envelope field review status and documentation availability.',
    ],
    optionalEvidence: [
      'Building-envelope field review letter or report where available.',
      'Manufacturer observation confirmation.',
      'AHJ correspondence or special inspection notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: building-envelope field review applies where triggered by approved drawings, AHJ conditions, Letters of Assurance, registered professional involvement, manufacturer requirements, building-envelope consultant requirements, or project scope. If not triggered, mark as not applicable or confirmed not required. If the trigger is unclear, Hold for AHJ, registered professional, or qualified professional confirmation. Do not make the inspector independently determine whether field review is legally required.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local building-envelope assurance, field review letter, manufacturer observation, or special inspection requirements that govern acceptance before cladding or concealment proceeds.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — building envelope performance and professional field review where required',
        legalReference: 'BC Building Code 2024 — building envelope performance, professional responsibility, and field review requirements where triggered by project scope, AHJ, approved drawings, or Letters of Assurance; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Letters of Assurance and building-envelope field review where required',
        legalReference: 'BC Building Code 2024 and Vancouver Building By-law 2025 Letters of Assurance — Schedule B and Schedule C-B where registered professional field review is triggered',
        sourceTitle: 'Letters of Assurance for building construction in B.C.',
        sourceUrl: null,
      },
      {
        label: 'Approved envelope review requirements, manufacturer observations, and AHJ conditions',
        legalReference: 'Project-specific approved drawings, building-envelope consultant requirements, manufacturer observation requirements, special inspection requirements, and AHJ permit conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
    ],
    dependencies: ['S07-03'],
  },
]

const STRUCTURAL_STAGE_8_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S08-01',
    label: 'Fire Separations and Blocking',
    uiSchema: 'field_view',
    purpose: 'Confirm passive fire-protection assemblies are complete and continuous before insulation or drywall conceals them.',
    viewDetails: 'Verify passive fire protection systems are intact before drywall or insulation conceals the assemblies. Validate rated walls and floors, demising wall continuity, service penetration firestopping, draft stopping, stair fire blocking, and the correct firestopping approach for the penetration type and rated assembly before closure.',
    stopIf: [
      'Compromised fire separations, missing firestopping, or open combustible concealed spaces that cannot be verified before closure.',
      'Fire separation continuity is interrupted at a rated assembly and cannot be confirmed before concealment.',
    ],
    fieldChecklist: [
      'Rated wall, floor, ceiling, shaft, service space, and demising assemblies identified where applicable? (Camera or Video Evidence Required)',
      'Fire separation continuity visible and continuous before concealment? (Camera or Video Evidence Required)',
      'Fire blocking installed where required?',
      'Service penetrations through rated assemblies identified? (Camera or Video Evidence Required)',
      'Correct firestopping approach identified for penetration type (intumescent collars, intumescent sealant, firestop systems, or listed assemblies where applicable)?',
      'Fire rating basis identified from approved drawings where applicable?',
      'Draft stopping and stair fire blocking installed where required?',
    ],
    notesGuidance: 'Record observed fire-separation assemblies, penetration types, firestopping approach used, any interrupted continuity, missing firestopping, or concealed-space deficiency before closure. Distinguish intumescent collars, sealant, firestop systems, and listed assemblies where applicable.',
    whatToCheck: [
      'Rated walls and floors match the expected assembly intent for the reviewed area.',
      'Fire separation continuity is visible and continuous across transitions, intersections, and service space junctions.',
      'Fire blocking is installed where required by the framing geometry before concealment.',
      'Service penetrations through rated assemblies are identified and the firestopping approach is consistent with the penetration type.',
      'Firestopping approach distinguishes between intumescent collars, intumescent sealant, firestop systems, and listed assemblies where applicable.',
      'Fire rating basis is identified from the approved drawings where applicable.',
      'Draft stopping and stair fire blocking are installed where required before concealment.',
      'No passive fire-protection gap remains in the reviewed area.',
    ],
    passWhen: [
      'Passive fire-protection assemblies are complete and continuous for the presented stage.',
      'Firestopping approach is consistent with the penetration type and rated assembly requirements.',
      'No critical separation, firestopping, or concealed-space deficiency remains before closure.',
    ],
    failWhen: [
      'A required fire separation is incomplete, interrupted, or compromised.',
      'Firestopping is missing, improperly installed, or the wrong approach is used for the penetration type.',
      'Required draft stopping or stair fire blocking is absent where concealed spaces remain open.',
      'Fire separation continuity cannot be confirmed before concealment proceeds.',
    ],
    pendingWhen: [
      'Fire-protection measures are partially complete and require a return inspection before closure.',
      'Localized corrections or firestopping completion is expected before a final decision on the assembly can be made.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing fire separations, firestopping conditions, and blocking before concealment.',
      'Inspector-captured photos showing firestopping approach at service penetrations.',
    ],
    optionalEvidence: [
      'Assembly references.',
      'Installer notes.',
      'Supplemental close-up photos of firestopping details.',
      'Listed firestop system product references.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local fire-separation, firestopping approach, concealed-space protection, or draft-stopping expectations that must be satisfied before closure.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — fire separations, fire blocking, firestopping, and rated assemblies',
        legalReference: 'BC Building Code 2024 — fire protection, fire separations, fire blocking, firestopping, service penetrations, and rated assembly continuity where applicable; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved fire separation drawings, listed assemblies, and firestop system documentation',
        legalReference: 'Project-specific approved drawings, rated assembly details, firestop system listings, manufacturer installation requirements, registered professional review requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Vancouver Building By-law 2025 — fire protection requirements where Vancouver jurisdiction applies',
        legalReference: 'Vancouver Building By-law 2025 — Vancouver-specific fire protection, fire separation, and building inspection requirements where applicable',
        sourceTitle: 'Vancouver Building By-law 2025',
        sourceUrl: null,
        isVbblOnly: true,
      },
    ],
    dependencies: ['S07-04'],
  },
  {
    code: 'S08-02',
    label: 'Egress, Smoke/CO Alarms, Emergency Lighting, and Exit Sign Rough-In',
    uiSchema: 'field_view',
    purpose: 'Confirm occupant warning, emergency lighting, and egress provisions are roughed in and spatially compliant before finishes conceal or limit access.',
    viewDetails: 'Validate rough-in readiness for smoke and carbon monoxide alarms, emergency lighting, and exit sign locations where required. Confirm egress paths, exit routes, doors, corridors, stairs, and landings are framed or roughed in consistent with the approved drawings. Identify fire department access, civic addressing, suite numbering, or lock box requirements as AHJ-dependent flags where applicable.',
    stopIf: [
      'Required alarm rough-in is absent or observed egress openings do not provide a compliant path of escape.',
      'Blocked egress, missing rough-in for a required life-safety device, or unresolved AHJ egress condition that cannot proceed without resolution.',
    ],
    fieldChecklist: [
      'Egress paths, exit routes, doors, corridors, stairs, and landings framed or roughed in consistent with approved drawings?',
      'Smoke alarm rough-in locations identified and positioned where applicable? (Camera or Note Evidence Required)',
      'Carbon monoxide alarm rough-in locations identified and positioned where applicable?',
      'Emergency lighting rough-in locations identified where applicable?',
      'Exit sign rough-in locations identified where applicable?',
      'Fire department access, civic addressing, suite numbering, or lock box requirements identified as AHJ-dependent flags where applicable?',
    ],
    notesGuidance: 'Record alarm rough-in locations, egress observations, emergency lighting and exit sign rough-in status, and any dimensional or placement issue affecting occupant life safety. Identify AHJ-specific requirements such as fire department access, addressing, or lock boxes as flags.',
    whatToCheck: [
      'Egress paths, exit routes, doors, corridors, stairs, and landings are framed or roughed in consistent with the approved drawings.',
      'Smoke alarm rough-in is present at the correct locations for the reviewed scope.',
      'Carbon monoxide alarm rough-in is present where applicable.',
      'Emergency lighting and exit sign rough-in locations are identified where required.',
      'Fire department access, civic addressing, suite numbering, or lock box requirements are identified as AHJ-dependent flags where applicable.',
      'No visible life-safety rough-in omission remains before the assembly is concealed or finished.',
    ],
    passWhen: [
      'Alarm rough-in, emergency lighting, exit sign, and egress provisions are in place and reviewable for the presented stage.',
      'No material location or opening-size concern remains in the observed area.',
      'AHJ-dependent requirements are identified and flagged.',
    ],
    failWhen: [
      'Required alarm rough-in is missing or materially mislocated.',
      'Observed egress doors or windows appear insufficient for the intended egress function.',
      'Emergency lighting or exit sign rough-in is missing where required by the approved drawings.',
      'Blocked egress or unresolved AHJ egress condition is present and cannot proceed.',
    ],
    pendingWhen: [
      'Alarm rough-in or egress elements are still being completed and require re-inspection.',
      'A dimensional confirmation or corrective adjustment is expected before final acceptance.',
      'AHJ-dependent requirements are outstanding and require confirmation before the stage can be accepted.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos documenting alarm rough-in, emergency lighting, exit sign, and egress conditions.',
    ],
    optionalEvidence: [
      'Supplemental measurement notes.',
      'Product details.',
      'Coordination comments for alarm or emergency lighting placement.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local alarm placement, emergency lighting, exit sign, rescue opening, egress configuration, fire department access, civic addressing, or lock box requirements affecting acceptance of the life-safety stage.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — egress, smoke alarms, carbon monoxide alarms, emergency lighting, and exit signs',
        legalReference: 'BC Building Code 2024 — egress, smoke alarm, carbon monoxide alarm, emergency lighting, exit sign, and occupant life-safety requirements where applicable; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved life-safety drawings and AHJ permit conditions',
        legalReference: 'Project-specific approved drawings, life-safety plans, alarm rough-in notes, emergency lighting layouts, exit sign layouts, fire department access requirements, civic addressing requirements, suite numbering requirements, lock box requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
    ],
    dependencies: ['S08-01'],
  },
  {
    code: 'S08-03',
    label: 'Accessibility and Guards',
    uiSchema: 'field_view',
    purpose: 'Confirm guard-related protection and accessibility-support details are installed before closure or finish work obscures them.',
    viewDetails: 'Validate guards, handrails, and grab-bar backing, adaptable and accessibility features triggered by the approved drawings or permit scope, corridor widths, door clearances, bathroom clearances, blocking, backing, and mobility-friendly features where applicable, and stair guard, balcony guard, landing guard, and opening limitation conditions.',
    stopIf: [
      'Required guard support, handrail backing, or accessible-entry provisions are absent in a way that would compromise life safety or adaptability.',
      'Guard blocking, backing, or anchorage rough-in support is absent where required and concealment is imminent.',
    ],
    fieldChecklist: [
      'Adaptable or accessibility features identified where triggered by approved drawings, permit scope, or AHJ? (Camera or Video Evidence Required)',
      'Corridor widths, door clearances, bathroom clearances, blocking, backing, and mobility-friendly features reviewable where applicable?',
      'Stair guard, balcony guard, landing guard, and opening limitation conditions reviewable where applicable? (Camera or Video Evidence Required)',
      'Guard blocking, backing, anchorage, or rough-in support visible before concealment where required? (Camera or Video Evidence Required)',
      'Handrail backing and grab-bar backing installed in walls where required?',
    ],
    notesGuidance: 'Record observed guard or backing conditions, accessibility detail confirmation, corridor or door clearance observations, and any missing support, backing, or entrance feature affecting compliance. Note whether accessibility or adaptable features are triggered by the project scope.',
    whatToCheck: [
      'Adaptable and accessibility features are identified where triggered by approved drawings, permit scope, or AHJ.',
      'Corridor widths, door clearances, bathroom clearances, blocking, backing, and mobility-friendly features are reviewable where applicable.',
      'Stair guard, balcony guard, landing guard, and opening limitations are reviewable where applicable.',
      'Guard blocking, backing, anchorage, and rough-in support are visible before concealment where required.',
      'Handrail and grab-bar backing is installed where required for the reviewed scope.',
      'No critical support or accessibility-preparation element is missing before closure.',
    ],
    passWhen: [
      'Guard and accessibility support features are in place and reviewable for the presented stage.',
      'No material support, backing, or entrance-detail deficiency remains before finish work proceeds.',
      'Accessibility or adaptable features are identified and addressed where triggered.',
    ],
    failWhen: [
      'Required guard or handrail support conditions are missing or inadequate.',
      'Grab-bar backing is absent where required for the reviewed scope.',
      'Guard blocking, backing, or anchorage rough-in support is absent where required and concealment is imminent.',
      'Accessible or adaptable entrance details are missing, contradicted, or not supported by the installation.',
    ],
    pendingWhen: [
      'Backing or entrance details are partially complete and require a follow-up inspection.',
      'Final confirmation depends on a minor correction or the next coordinated installation step.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing installed backing, guard support conditions, and accessibility-preparation details.',
    ],
    optionalEvidence: [
      'Supplemental detail notes.',
      'Accessibility coordination records.',
      'Measurement or layout references.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: accessibility and adaptable-entry details are required where the project scope or occupancy triggers them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local guard, handrail, backing, accessibility-detail, or adaptable-entry requirements that govern acceptance before finishes proceed.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — accessibility, adaptable features, guards, handrails, and opening protection',
        legalReference: 'BC Building Code 2024 — accessibility, adaptable dwelling features, guards, handrails, openings, and related life-safety support requirements where applicable; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved accessibility, guard, and backing details',
        legalReference: 'Project-specific approved drawings, accessibility requirements, adaptable unit details, guard and handrail backing details, blocking layouts, manufacturer requirements, registered professional review requirements, and AHJ conditions',
        sourceTitle: 'Approved Project Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'Vancouver Building By-law 2025 — accessibility and life-safety requirements where Vancouver jurisdiction applies',
        legalReference: 'Vancouver Building By-law 2025 — Vancouver-specific accessibility, guard, handrail, and opening-protection requirements where applicable',
        sourceTitle: 'Vancouver Building By-law 2025',
        sourceUrl: null,
        isVbblOnly: true,
      },
    ],
    dependencies: ['S08-02'],
  },
  {
    code: 'S08-04',
    label: 'Fire Suppression System Rough-In',
    uiSchema: 'field_view',
    purpose: 'Confirm fire suppression system applicability, approved design basis, rough-in conditions, and pre-concealment review are complete where the system is required.',
    viewDetails: 'This container is applicability-gated. Fire suppression systems are not universally required. Applicability is determined by approved drawings, permit scope, occupancy, building type, AHJ conditions, or code path. If not applicable, mark as Not Applicable and proceed. If applicability is unclear, the item must Hold for AHJ or qualified professional confirmation. Where applicable, confirm approved sprinkler drawings, NFPA pathway, hydraulic calculations, water supply basis, FDC, backflow prevention, zone valves, drains, test connections, alarms, freeze protection, concealed-space pre-concealment review, and hydrostatic test status.',
    stopIf: [
      'Applicability of fire suppression is unresolved and closure, cover, or concealment is about to proceed without confirmation.',
      'Concealed sprinkler work has proceeded without a pre-concealment review being completed.',
      'Required hydrostatic test or test record has not been completed or scheduled before concealment.',
    ],
    fieldChecklist: [
      'Fire suppression applicability confirmed as: Required, Not Required, or Unresolved? (If unresolved, Hold for AHJ or qualified professional confirmation)',
      'If applicable: Approved sprinkler or fire suppression drawings available on site?',
      'If applicable: NFPA pathway identified as NFPA 13, NFPA 13R, NFPA 13D, or other AHJ-approved path?',
      'If applicable: Hydraulic calculations or design basis available where required?',
      'If applicable: Water supply test, water service, or fire service basis identified where required?',
      'If applicable: FDC, backflow prevention, zone valves, drains, test connections, alarms, and freeze protection identified where required?',
      'If applicable: Concealed space review complete before cover?',
      'If applicable: Hydrostatic test witness or test record available, scheduled, or pending?',
      'If applicable: Intermediate certificate or final sprinkler acceptance certificate requirement identified?',
    ],
    notesGuidance: 'Record applicability determination and its basis (approved drawings, AHJ condition, occupancy, code path, or permit scope). If applicable, record NFPA pathway, design basis availability, and pre-concealment review status. Flag any unresolved applicability or missing evidence before concealment proceeds.',
    whatToCheck: [
      'Fire suppression applicability is confirmed as required, not required, or unresolved — with the basis documented.',
      'If applicability is unclear, the item must Hold for AHJ or qualified professional confirmation before closure, cover, or concealment proceeds.',
      'If applicable, approved sprinkler or fire suppression drawings are available on site.',
      'If applicable, NFPA pathway is identified as NFPA 13, NFPA 13R, NFPA 13D, or another AHJ-approved path.',
      'If applicable, hydraulic calculations or design basis are available where required.',
      'If applicable, water supply test, water service, or fire service basis is identified where required.',
      'If applicable, FDC, backflow prevention, zone valves, drains, test connections, alarms, and freeze protection are identified where required.',
      'If applicable, concealed space review is complete before cover.',
      'If applicable, hydrostatic test witness or test record is available, scheduled, or pending.',
      'If applicable, intermediate or final sprinkler acceptance certificate requirement is identified.',
    ],
    passWhen: [
      'Fire suppression is confirmed not required for the project scope, with the basis documented.',
      'If applicable, approved drawings, NFPA pathway, and design basis are available and pre-concealment conditions are met.',
      'If applicable, hydrostatic test status is known and tracked.',
    ],
    failWhen: [
      'Approved sprinkler drawings are required and absent.',
      'Concealed sprinkler work has been covered without a pre-concealment review.',
      'Missing test evidence or unresolved applicability is present at a stage requiring closure.',
    ],
    pendingWhen: [
      'Applicability is unresolved and requires AHJ or qualified professional confirmation.',
      'Required drawings, calculations, or test records are expected but not yet available.',
      'Hydrostatic test is scheduled but not yet completed.',
    ],
    requiredEvidence: [
      'Inspector-captured notes documenting applicability determination and its basis.',
    ],
    optionalEvidence: [
      'Approved sprinkler or fire suppression drawings where available.',
      'NFPA pathway documentation.',
      'Hydraulic calculation summary where available.',
      'Hydrostatic test record where completed.',
      'Intermediate or acceptance certificate where available.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Applicability-gated: fire suppression is required where triggered by approved drawings, permit scope, occupancy, building type, AHJ conditions, or applicable code path. If not triggered, mark as Not Applicable. If unclear, Hold for AHJ or QP confirmation.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local fire suppression applicability determination, NFPA pathway, pre-concealment review requirement, hydrostatic test requirement, or acceptance certificate requirement.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — fire suppression and sprinkler systems where applicable',
        legalReference: 'BC Building Code 2024 — fire suppression, sprinkler system, water supply, fire department connection, backflow prevention, and acceptance requirements where triggered by occupancy, building type, approved drawings, AHJ conditions, or applicable code path; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved fire suppression drawings, calculations, tests, and AHJ conditions',
        legalReference: 'Project-specific approved sprinkler drawings, hydraulic calculations, water supply test records, FDC details, backflow prevention details, hydrostatic test records, acceptance documentation, registered professional requirements, and AHJ conditions',
        sourceTitle: 'Approved Fire Suppression Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'NFPA 13 / 13R / 13D — sprinkler design and installation pathways where adopted or required',
        legalReference: 'NFPA 13, NFPA 13R, NFPA 13D, or other AHJ-approved fire suppression pathway where adopted, referenced by approved drawings, or required by the AHJ',
        sourceTitle: 'NFPA Sprinkler Standards',
        sourceUrl: null,
      },
    ],
    dependencies: ['S08-03'],
  },
  {
    code: 'S08-05',
    label: 'Fire Alarm Rough-In',
    uiSchema: 'field_view',
    purpose: 'Confirm fire alarm system applicability, approved design basis, rough-in conditions, and pre-concealment review are complete where the system is required.',
    viewDetails: 'This container is applicability-gated. Fire alarm systems are not universally required. Applicability is determined by approved drawings, permit scope, occupancy, building type, AHJ conditions, or code path. If not applicable, mark as Not Applicable and proceed. If applicability is unclear, the item must Hold for AHJ or qualified professional confirmation. Where applicable, confirm approved fire alarm drawings or design basis, initiating devices, notification appliances, control panel, annunciator, power supply, and district monitoring pathway, horn or strobe or audible or visual notification rough-in, smoke and heat detector, pull station, and sprinkler supervisory interface rough-in, and verification report or final fire alarm acceptance certificate requirement.',
    stopIf: [
      'Applicability of fire alarm is unresolved and concealment is about to proceed without confirmation.',
      'Required fire alarm rough-in or wiring has been concealed without a pre-concealment review.',
    ],
    fieldChecklist: [
      'Fire alarm applicability confirmed as: Required, Not Required, or Unresolved? (If unresolved, Hold for AHJ or qualified professional confirmation)',
      'If applicable: Approved fire alarm drawings or fire alarm design basis available?',
      'If applicable: Initiating devices, notification appliances, control panel, annunciator, power supply, and district monitoring pathway identified where required?',
      'If applicable: Horn, strobe, or audible and visual notification appliance rough-in locations visible?',
      'If applicable: Smoke or heat detector rough-in, pull station rough-in, and sprinkler supervisory interface identified where required?',
      'If applicable: Verification report or final fire alarm acceptance certificate requirement identified as a closeout item?',
    ],
    notesGuidance: 'Record applicability determination and its basis (approved drawings, AHJ condition, occupancy, code path, or permit scope). If applicable, record design basis availability, device rough-in status, and wiring or rough-in pre-concealment status. Flag any unresolved applicability or concealed rough-in before proceeding.',
    whatToCheck: [
      'Fire alarm applicability is confirmed as required, not required, or unresolved — with the basis documented.',
      'If applicability is unclear, the item must Hold for AHJ or qualified professional confirmation.',
      'If applicable, approved fire alarm drawings or fire alarm design basis are available.',
      'If applicable, initiating devices, notification appliances, control panel, annunciator, power supply, and district monitoring pathway are identified where required.',
      'If applicable, horn, strobe, or audible and visual notification rough-in locations are visible.',
      'If applicable, smoke or heat detector rough-in, pull station rough-in, and sprinkler supervisory interface are identified where required.',
      'If applicable, verification report or final fire alarm acceptance certificate requirement is identified as a closeout item.',
    ],
    passWhen: [
      'Fire alarm is confirmed not required for the project scope, with the basis documented.',
      'If applicable, approved drawings or design basis are available, device rough-in locations are identified, and pre-concealment conditions are met.',
    ],
    failWhen: [
      'Approved fire alarm drawings are required and absent.',
      'Fire alarm rough-in or wiring has been concealed without a pre-concealment review.',
      'Unresolved device locations or unclear applicability is present at a stage requiring closure.',
    ],
    pendingWhen: [
      'Applicability is unresolved and requires AHJ or qualified professional confirmation.',
      'Required drawings or design basis are expected but not yet available.',
      'Device rough-in is in progress and requires a return inspection.',
    ],
    requiredEvidence: [
      'Inspector-captured notes documenting applicability determination and its basis.',
    ],
    optionalEvidence: [
      'Approved fire alarm drawings or design basis where available.',
      'Device layout plan or rough-in notes where available.',
      'Verification report where completed.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Applicability-gated: fire alarm system is required where triggered by approved drawings, permit scope, occupancy, building type, AHJ conditions, or applicable code path. If not triggered, mark as Not Applicable. If unclear, Hold for AHJ or QP confirmation.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local fire alarm applicability determination, approved design basis, district monitoring pathway, verification report requirement, or final acceptance certificate requirement.',
    codeReferences: [
      {
        label: 'BC Building Code 2024 — fire alarm and detection systems where applicable',
        legalReference: 'BC Building Code 2024 — fire alarm, detection, notification, monitoring, verification, and acceptance requirements where triggered by occupancy, building type, approved drawings, AHJ conditions, or applicable code path; exact clause to be verified by AHJ or qualified professional',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: null,
      },
      {
        label: 'Approved fire alarm drawings, verification requirements, and AHJ conditions',
        legalReference: 'Project-specific approved fire alarm drawings, device layouts, control panel and annunciator requirements, notification appliance layouts, monitoring requirements, verification report requirements, registered professional requirements, and AHJ conditions',
        sourceTitle: 'Approved Fire Alarm Documents / AHJ Permit Record',
        sourceUrl: null,
      },
      {
        label: 'ULC fire alarm installation and verification standards where adopted or required',
        legalReference: 'ULC fire alarm installation and verification standards, including ULC S524 where adopted, referenced by approved drawings, or required by the AHJ',
        sourceTitle: 'ULC Fire Alarm Standards',
        sourceUrl: null,
      },
    ],
    dependencies: ['S08-04'],
  },
]

const STRUCTURAL_STAGE_9_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S09-01',
    label: 'Permit Scope, Readiness, and Visibility',
    uiSchema: 'field_view',
    purpose: 'Confirm the plumbing work area is safe, accessible, and ready for inspection, that visible work matches the approved permit scope, and that no inspectable plumbing work has been concealed without authorization.',
    viewDetails: 'Before any plumbing rough-in inspection proceeds, confirm the site is safe and accessible, the approved permit and drawings are available for reference, and no plumbing work requiring inspection has been concealed. This container establishes inspection readiness and flags scope deviations or concealed-work conditions that must be resolved before the inspector can proceed.',
    stopIf: [
      'Inspectable plumbing work has been concealed before inspection without authorization.',
      'The inspection area is unsafe or inaccessible for the inspector.',
    ],
    fieldChecklist: [
      'Approved plumbing permit and drawings available on site or accessible for reference?',
      'No plumbing work requiring inspection has been concealed before this inspection?',
      'Visible plumbing work is consistent with the approved permit scope and drawings?',
      'Work outside the approved permit scope identified and flagged for review?',
      'Site access is safe, clear, and suitable for inspector entry to all inspection areas?',
    ],
    notesGuidance: 'Record any scope deviations, concealed-work concerns, accessibility issues, or missing permit documents that affect inspection readiness. Note specific areas of concern and flag for Hold or Failed status if concealment has occurred without authorization.',
    whatToCheck: [
      'Approved plumbing permit and drawings are present and available for comparison with installed work.',
      'No plumbing rough-in or drainage work requiring inspection has been enclosed or concealed before this hold point.',
      'Visible plumbing work scope, routing, and configuration are consistent with the approved permit drawings.',
      'Any work performed outside the approved scope is identified and flagged for AHJ review.',
      'The inspection area is safe and accessible throughout the scope of the plumbing rough-in.',
    ],
    passWhen: [
      'Permit documents are present, accessible, and consistent with the visible scope of installed work.',
      'No unauthorized concealment of inspectable plumbing work is identified.',
      'Site is safe, accessible, and ready for the inspector to review all required areas.',
    ],
    failWhen: [
      'Plumbing work requiring inspection has been concealed or enclosed without prior authorization or inspection.',
      'Visible work materially deviates from the approved permit scope or drawings without an approved amendment.',
      'Required permit documents or drawings are absent and no equivalent reference is available on site.',
    ],
    pendingWhen: [
      'Plumbing work is in progress and not yet complete in one or more areas required for inspection.',
      'Permit documents are expected on site but have not yet arrived or been made accessible.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos confirming permit scope review, site readiness, and accessibility conditions.',
    ],
    optionalEvidence: [
      'Permit drawing excerpt or scope summary noting approved system configuration.',
      'Notes documenting any identified scope deviation or outstanding work area.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture any local requirements for permit document availability, scope deviation notification, or concealed-work protocols that must be satisfied before the plumbing rough-in inspection proceeds.',
    dependencies: ['S08-05'],
    codeReferences: [
      {
        label: 'Plumbing systems match approved permit scope',
        legalReference: 'BC Plumbing Code 2024 / BCBC Schedule B, Plumbing 4.3',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
    ],
  },
  {
    code: 'S09-02',
    label: 'Potable Water Supply Rough-In',
    uiSchema: 'field_view',
    purpose: 'Confirm domestic water piping is routed, supported, protected, and visible for inspection, and that pressure testing, material compatibility, and scald or backflow protection conditions are reviewable where applicable.',
    viewDetails: 'Inspect the domestic water supply rough-in for routing, support, material consistency, and protection from damage, freezing, and incompatible contact. Confirm waterline pressure testing has been completed or is ready for verification. Identify hot water tempering and scald protection provisions, and flag any visible cross-connection or backflow risk. This container confirms the potable water system is ready for concealment from an inspection standpoint.',
    stopIf: [
      'Waterline pressure test has failed and the system has not been corrected and re-tested.',
      'Domestic water piping is not yet installed in areas required for inspection at this stage.',
    ],
    fieldChecklist: [
      'Domestic water piping routed, supported, and visible throughout the inspected area?',
      'Waterline pressure test complete or ready for verification? (Test result or test-readiness evidence required)',
      'Hot and cold distribution, branches, shutoffs, and fixture supplies identifiable?',
      'Pipe material, sizing, and routing consistent with the approved permit scope?',
      'Piping protected from freezing, physical damage, and incompatible material contact where applicable?',
      'Cross-connection or backflow risk identified and flagged where applicable?',
      'Hot water tempering or scald protection provisions identifiable where applicable?',
    ],
    notesGuidance: 'Record observed piping routing, support, material, and protection conditions. Note pressure test status, any identified cross-connection or backflow risk, and scald protection provisions. Flag failed or missing test evidence as a Hold or Failed item.',
    whatToCheck: [
      'Domestic water piping is routed and supported throughout the inspection area and visible for assessment.',
      'Waterline pressure test has passed or the system is ready for test verification at this hold point.',
      'Hot and cold distribution, fixture supply branches, shutoffs, and valves are identifiable and consistent with the permit scope.',
      'Pipe material, sizing, and routing are consistent with the approved permit drawings and applicable code requirements.',
      'Piping is protected from freezing, physical damage, and incompatible material contact where applicable.',
      'Any visible cross-connection risk or missing backflow prevention condition is identified and flagged.',
      'Hot water tempering or scald protection provisions are identifiable where required by the permit scope.',
    ],
    passWhen: [
      'Domestic water piping is routed, supported, and visible for inspection throughout the required scope.',
      'Waterline pressure test has passed or is documented as ready for verification without a known failure.',
      'Pipe material, sizing, and routing are consistent with the approved permit scope, and no unresolved protection or compatibility concern is identified.',
    ],
    failWhen: [
      'Waterline pressure test has failed or required test evidence is absent and no re-test is scheduled.',
      'Domestic piping routing, support, or sizing is materially inconsistent with the approved permit scope.',
      'Incompatible pipe materials are in direct contact without approved transition fittings.',
      'Required hot water tempering or scald protection is absent where mandated by the permit scope or code.',
    ],
    pendingWhen: [
      'Pressure test is scheduled but not yet complete at the time of inspection.',
      'Fixture supply branches or a section of the distribution system is partially installed and expected to be completed before concealment.',
    ],
    requiredEvidence: [
      'Inspector-captured photos or field notes confirming piping routing, support, material conditions, and pressure test status.',
    ],
    optionalEvidence: [
      'Installer-supplied pressure test documentation or test certificate where available.',
      'Pipe material certification or specification sheet where applicable.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local requirements for water supply rough-in inspection, pressure test witnessing, backflow prevention, or scald protection that must be confirmed before enclosure.',
    dependencies: ['S09-01'],
    codeReferences: [
      {
        label: 'Domestic water distribution systems and sizing',
        legalReference: 'BC Plumbing Code 2024, Division B — Domestic Water Systems',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'Pressure test requirements for water supply systems',
        legalReference: 'BC Plumbing Code 2024, Division B — Testing of Piping Systems',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'Hot water tempering and scald protection',
        legalReference: 'BC Plumbing Code 2024, Division B — Hot Water Temperature Control',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
    ],
  },
  {
    code: 'S09-03',
    label: 'Drain, Waste, Vent, and Drainage Rough-In',
    uiSchema: 'field_view',
    purpose: 'Confirm DWV piping is installed, supported, correctly sloped, and visible for inspection, and that cleanouts, vent routing, trap arms, and all drainage tie-ins are reviewable before concealment.',
    viewDetails: 'Inspect the drain, waste, and vent rough-in for completeness, support, slope, fitting configuration, and system continuity. Confirm DWV testing has been completed or is ready. Verify cleanout placement and accessibility, vent sizing and routing, trap arm configuration, and the coordination of sanitary, storm, roof, site, and foundation drainage tie-ins. This container gates enclosure of the DWV system.',
    stopIf: [
      'DWV test has failed and the system has not been corrected and re-tested.',
      'Drain, waste, or vent piping is not yet installed in areas required for inspection at this stage.',
    ],
    fieldChecklist: [
      'DWV piping installed, supported, and visible throughout the inspected area?',
      'DWV test complete or ready for verification? (Test result or test-readiness evidence required)',
      'Drainage slope reviewable and consistent with code requirements throughout the system?',
      'Cleanouts installed and accessible at all required locations?',
      'Vent sizing and routing reviewable from the fixtures to point of termination or continuation?',
      'Trap arms and fittings appear correctly configured for the connected fixtures?',
      'Sanitary, storm, roof, site, and foundation drainage tie-ins visible and coordinated where applicable?',
      'No reversed, unsupported, improperly sloped, or concealed drainage or vent work present?',
    ],
    notesGuidance: 'Record DWV routing, slope conditions, cleanout locations, vent routing, trap arm configurations, and drainage tie-in status. Flag DWV test failures, missing cleanouts, inadequate slope, or vent deficiencies as Hold or Failed items. Note any concealed drainage or vent work identified.',
    whatToCheck: [
      'DWV piping is installed, supported, and visible for inspection throughout the scope of the review.',
      'DWV test has passed or the system is ready for test verification at this hold point without a known failure.',
      'Drainage slope is reviewable and consistent with code minimum requirements across the visible system.',
      'Cleanouts are installed at code-required locations and are accessible for future maintenance.',
      'Vent sizing and routing are reviewable to point of termination or continuation, and appear consistent with code requirements.',
      'Trap arms and drainage fittings appear correctly configured for the fixture types and drainage conditions presented.',
      'Sanitary, storm, roof, site, and foundation drainage tie-ins are visible, coordinated, and consistent with the permit scope where applicable.',
    ],
    passWhen: [
      'DWV piping is installed, supported, and visible for inspection throughout the required scope.',
      'Drainage slope is reviewable and consistent with code requirements, and no material slope deficiency is identified.',
      'Cleanouts are installed at required locations and are accessible.',
      'DWV test has passed or is documented as ready for verification, and vent routing is reviewable without a material deficiency.',
    ],
    failWhen: [
      'DWV test has failed or required test evidence is absent and no re-test is scheduled.',
      'Drainage slope is inadequate, reversed, or materially inconsistent with code minimum requirements across one or more sections.',
      'Cleanouts are missing at required locations or are inaccessible due to installation conditions.',
      'Vent sizing or routing is materially deficient or termination conditions are inconsistent with code requirements.',
      'Trap arms or drainage fittings are incorrectly configured in a way that affects drainage performance or code compliance.',
    ],
    pendingWhen: [
      'DWV test is scheduled but not yet complete at the time of inspection.',
      'Vent routing continues to a portion of the building not yet complete or accessible for review.',
    ],
    requiredEvidence: [
      'Inspector-captured photos or field notes documenting DWV routing, slope conditions, cleanout locations, vent routing, and test status.',
    ],
    optionalEvidence: [
      'Installer-supplied DWV test records or test certificate where available.',
      'Drainage layout notes or sketch showing drainage tie-in coordination.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local requirements for DWV inspection, drainage slope minimums, cleanout spacing, vent termination, or trap arm configuration that must be confirmed before the DWV system is enclosed.',
    dependencies: ['S09-01'],
    codeReferences: [
      {
        label: 'Drainage and venting systems',
        legalReference: 'BC Plumbing Code 2024, Division B — Drainage Systems',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'DWV testing requirements',
        legalReference: 'BC Plumbing Code 2024, Division B — Testing of Piping Systems',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'Trap and trap arm requirements',
        legalReference: 'BC Plumbing Code 2024, Division B — Traps and Interceptors',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'Cleanout installation requirements',
        legalReference: 'BC Plumbing Code 2024, Division B — Drainage Systems',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
    ],
  },
  {
    code: 'S09-04',
    label: 'Testing, Fixtures, and Fire Separation Penetrations',
    uiSchema: 'field_view',
    purpose: 'Confirm all required plumbing tests are complete and documented, fixture rough-ins are consistent with the permit scope, access to service points is maintained, and plumbing penetrations through fire-rated assemblies are identified and firestopped before concealment.',
    viewDetails: 'Confirm that all required pressure, leak, water, and air tests have been completed, documented, witnessed, or are ready for verification. Review fixture rough-in count and locations against the permit scope, confirm access to cleanouts, traps, shutoffs, and service points is maintained, and identify plumbing penetrations through fire-separation assemblies. Firestopping must be in place or ready for inspection before any fire-rated assembly is enclosed.',
    stopIf: [
      'A required pressure or leak test has failed and the system has not been corrected and re-tested.',
      'Plumbing penetrations through fire-rated assemblies are present and firestopping is not in place before concealment of the assembly.',
    ],
    fieldChecklist: [
      'All required pressure, leak, water, or air tests complete, documented, witnessed, or ready for verification?',
      'Fixture count and rough-in locations consistent with the approved permit scope where applicable?',
      'Tubs, showers, and fixture drains, traps, supplies, and valves installed or roughed in where applicable?',
      'Fixture rough-ins do not block required access to cleanouts, traps, shutoffs, or service points?',
      'Plumbing penetrations through fire-rated or fire-separation assemblies identified?',
      'Firestopping in place or ready for inspection at all identified plumbing penetrations before concealment?',
      'Failed or missing test evidence recorded and appropriate Hold or Failed status applied?',
    ],
    notesGuidance: 'Record test completion status, fixture rough-in conditions, service point access, and firestopping readiness at plumbing penetrations. Flag any failed test, missing firestopping, or blocked service access as a Hold or Failed item. Note specific locations and conditions for each identified issue.',
    whatToCheck: [
      'All required plumbing tests have been completed, are documented, have been witnessed, or are confirmed ready for test at this hold point.',
      'Fixture rough-in count and locations are consistent with the approved permit scope where fixture rough-ins are required at this stage.',
      'Tubs, showers, and other fixture drains, traps, supplies, and valves are installed or correctly roughed in where applicable.',
      'Fixture rough-ins do not block required inspector or maintenance access to cleanouts, traps, shutoffs, or other service points.',
      'All plumbing penetrations through fire-rated or fire-separation assemblies are identified and firestopping is in place or ready for review before any assembly is enclosed.',
    ],
    passWhen: [
      'All required plumbing tests have passed or are documented as complete without a known failure.',
      'Fixture rough-ins are consistent with the permit scope and do not block required access to cleanouts, traps, shutoffs, or service points.',
      'Fire-separation penetrations are identified and firestopping is in place or confirmed ready for inspection before concealment of any fire-rated assembly.',
    ],
    failWhen: [
      'A required pressure, leak, water, or air test has failed or evidence of test completion is absent and no re-test is scheduled.',
      'Fixture count or rough-in locations materially deviate from the approved permit scope without an approved amendment.',
      'Plumbing penetrations through fire-separation assemblies are present and firestopping is not in place before concealment of the assembly.',
      'Fixture rough-ins block required access to cleanouts, traps, shutoffs, or other service points in a way that cannot be resolved without correction.',
    ],
    pendingWhen: [
      'Required testing is scheduled or in progress but results are not yet available at the time of inspection.',
      'Firestopping installation is expected before concealment but is not yet complete at the time of review.',
    ],
    requiredEvidence: [
      'Inspector-captured photos or field notes showing test completion status, fixture rough-in conditions, and firestopping readiness at plumbing penetrations.',
    ],
    optionalEvidence: [
      'Installer-supplied test certificates or test documentation where available.',
      'Fixture schedule or permit drawing excerpt confirming approved fixture count and locations.',
      'Firestopping product documentation or installer records where applicable.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local requirements for plumbing test witnessing, fixture inspection, or firestopping review at plumbing penetrations that must be confirmed before framing or fire-rated assemblies are enclosed.',
    dependencies: ['S09-02', 'S09-03'],
    codeReferences: [
      {
        label: 'Fire separation continuity at plumbing penetrations',
        legalReference: 'BCBC 2024 Schedule B, Plumbing 4.4',
        sourceTitle: 'BC Building Code 2024 — Schedule B Letters of Assurance',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'Functional testing of plumbing fire emergency systems',
        legalReference: 'BCBC 2024 Schedule B, Plumbing 4.5',
        sourceTitle: 'BC Building Code 2024 — Schedule B Letters of Assurance',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'Structural capacity and seismic restraint of plumbing components',
        legalReference: 'BCBC 2024 Schedule B, Plumbing 4.7',
        sourceTitle: 'BC Building Code 2024 — Schedule B Letters of Assurance',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'Plumbing shop drawings',
        legalReference: 'BCBC 2024 Schedule B, Plumbing 4.8',
        sourceTitle: 'BC Building Code 2024 — Schedule B Letters of Assurance',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
    ],
  },
  {
    code: 'S09-05',
    label: 'City Connection, Backflow, Sump, and Jurisdictional Requirements',
    uiSchema: 'field_view',
    purpose: 'Confirm sewer and storm connection conditions, placard compliance, backflow prevention, backwater valve installation, and sump or drainage discharge conditions are reviewable where applicable before plumbing is concealed.',
    viewDetails: 'Review the city connection and jurisdictional compliance conditions for the plumbing scope. Where applicable, confirm the sewer/storm placard is present, complete, and consistent with the installed system. Identify backwater valve installation, backflow prevention assemblies, and sump or pump discharge conditions. Review foundation drain and roof drain tie-ins for coordination. Missing or mismatched placard, inaccessible backflow prevention, or undocumented city connection conditions must be flagged before the system proceeds to concealment.',
    stopIf: [
      'A required sewer or storm placard is missing or materially inconsistent with the installed system and concealment of the connection area is imminent.',
      'A backwater valve is required by the permit scope or AHJ and is absent.',
    ],
    fieldChecklist: [
      'Sewer and storm connection conditions visible and consistent with permit scope where applicable?',
      'Sewer/storm placard present, visible, complete, and consistent with the installed system where required?',
      'Backwater valve installed and accessible where required by permit scope or AHJ?',
      'Sump, pump, and discharge conditions reviewable where applicable?',
      'Foundation drain and roof drain connections reviewable and coordinated with the plumbing scope where applicable?',
      'Backflow prevention assemblies identified and installed where required?',
      'Backflow testing and reporting status identified where applicable?',
    ],
    notesGuidance: 'Record sewer/storm connection conditions, placard status, backwater valve installation, backflow prevention assembly locations, and sump and drainage discharge conditions. Flag missing or inconsistent placards, absent or inaccessible backwater valves, missing backflow prevention, or undocumented city connection conditions as Hold or Failed items.',
    whatToCheck: [
      'Sewer and storm connection conditions are visible and consistent with the approved permit scope where applicable.',
      'The sewer/storm placard is present, visible, legible, and consistent with the installed connection conditions where required by the AHJ.',
      'The backwater valve is installed and accessible where required by the permit scope or AHJ drainage requirements.',
      'Sump, pump, and discharge conditions are reviewable and consistent with the permit scope where applicable.',
      'Foundation drain and roof drain tie-ins are visible and coordinated with the plumbing scope where applicable.',
      'Backflow prevention assemblies are identified and installed at required locations where mandated by code or permit scope.',
      'Backflow testing and reporting status has been identified where applicable, and outstanding requirements are flagged.',
    ],
    passWhen: [
      'Sewer and storm connection conditions are visible and consistent with the permit scope where applicable.',
      'The sewer/storm placard is present, complete, and consistent with the installed system where required.',
      'The backwater valve is installed and accessible where required, and backflow prevention assemblies are identified where mandated.',
      'Sump, foundation drain, and roof drain conditions are reviewable and coordinated with the plumbing scope where applicable.',
    ],
    failWhen: [
      'The required sewer/storm placard is missing, incomplete, or does not match the installed connection conditions where the placard is required.',
      'The backwater valve is required but absent, incorrectly installed, or inaccessible for future maintenance.',
      'A required backflow prevention assembly is absent or identified as non-compliant.',
      'An undocumented or unauthorized city connection condition is identified that conflicts with the approved permit scope.',
    ],
    pendingWhen: [
      'The sewer/storm placard is expected but not yet installed or completed at the time of inspection.',
      'Backflow testing documentation is expected but not yet submitted for review.',
      'Foundation or roof drain tie-ins are partially complete and expected to be finalized before concealment.',
    ],
    requiredEvidence: [
      'Inspector-captured photos or field notes confirming placard status, backwater valve installation, backflow prevention assembly locations, and connection conditions where applicable.',
    ],
    optionalEvidence: [
      'Close-up photo of the installed sewer/storm placard.',
      'Backflow prevention test report or submission record where applicable.',
      'Sump installation records or discharge routing notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local requirements for sewer/storm placard inspection, backwater valve verification, backflow prevention reporting, or city connection review that must be satisfied before the plumbing rough-in is accepted.',
    dependencies: ['S09-01'],
    codeReferences: [
      {
        label: 'Sewer/storm connection placard data',
        legalReference: 'City of Vancouver sewer connection placard inspection guidance',
        sourceTitle: 'City of Vancouver — Plumbing and Drainage Permits',
        sourceUrl: 'https://vancouver.ca/home-property-development/plumbing-drainage-permits.aspx',
        isVbblOnly: true,
      },
      {
        label: 'Backwater valve requirements',
        legalReference: 'BC Plumbing Code 2024, Division B — Drainage Systems',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'Cross-connection control and backflow prevention',
        legalReference: 'BC Plumbing Code 2024, Division B — Cross-Connection Control',
        sourceTitle: 'BC Plumbing Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-plumbing-code.html',
      },
      {
        label: 'Site and foundation drainage systems',
        legalReference: 'BCBC 2024 Schedule B, Plumbing 4.2',
        sourceTitle: 'BC Building Code 2024 — Schedule B Letters of Assurance',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
    ],
  },
]

const STRUCTURAL_STAGE_10_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S10-01',
    label: 'Service and Distribution',
    uiSchema: 'field_view',
    purpose: 'Confirm the electrical service and distribution backbone is installed safely and ready for downstream rough wiring.',
    viewDetails: 'Validate the service entrance, meter base, main distribution panel, grounding, and bonding package. This sub-container establishes whether the electrical system has a safe, reviewable service and distribution foundation before concealment or energization progression.',
    stopIf: [
      'Panel bonding/grounding is missing or service entrance is unprotected.',
    ],
    fieldChecklist: [
      'Service entrance, meter base, and main distribution panel installed? (Camera or Video Evidence Required)',
      'Grounding and bonding complete? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record observed service equipment, panel condition, grounding and bonding details, and any unprotected or incomplete service installation issue.',
    whatToCheck: [
      'The service entrance, meter base, and main distribution panel are installed for the presented stage.',
      'Grounding and bonding components are complete and visible enough for review.',
      'No critical protection or bonding deficiency undermines the service installation.',
    ],
    passWhen: [
      'The service and distribution backbone is installed and reviewable for the presented stage.',
      'Grounding and bonding conditions support safe progression of the electrical scope.',
    ],
    failWhen: [
      'Service equipment is materially incomplete, unprotected, or not installed safely for the presented condition.',
      'Required grounding or bonding is missing, incomplete, or visibly deficient.',
      'The panel or service entrance condition would not support a defensible electrical review.',
    ],
    pendingWhen: [
      'The service installation is near readiness but still awaiting final grounding, bonding, or protection work.',
      'A follow-up inspection is needed after a minor corrective action or completion step.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing service equipment, panel condition, and grounding/bonding components.',
    ],
    optionalEvidence: [
      'Supplemental panel-detail photos.',
      'Installer notes.',
      'Utility coordination comments.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'electrical',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local service-equipment, grounding, or bonding requirements that affect electrical rough-in acceptance before concealment or energization.',
    dependencies: ['S08-03'],
  },
  {
    code: 'S10-02',
    label: 'Rough Wiring and Devices',
    uiSchema: 'field_view',
    purpose: 'Confirm branch-circuit rough wiring and device locations are installed, supported, and protected before enclosure.',
    viewDetails: 'Validate rough electrical branch wiring, including cable routing, support, protection with nail plates, device box mounting, and rough-in for exterior weatherproof devices. This sub-container confirms the wiring package is physically ready for concealment.',
    stopIf: [
      'Rough wiring is unsupported, unprotected at vulnerable framing points, or device rough-in is materially incomplete.',
    ],
    fieldChecklist: [
      'Rough wiring pulled, stapled, and protected by nail plates? (Camera or Note Evidence Required)',
      'Outlet boxes and switches securely mounted at correct heights?',
      'Exterior weatherproof devices roughed-in?',
    ],
    notesGuidance: 'Record observed cable support, protection, box placement, and any device rough-in deficiency affecting readiness for concealment.',
    whatToCheck: [
      'Rough wiring is pulled, supported, and protected where it passes vulnerable framing locations.',
      'Outlet boxes and switch boxes are securely mounted and placed appropriately for the reviewed scope.',
      'Exterior weatherproof device rough-in is present where the project requires it.',
      'No visible wiring-support or protection deficiency remains before concealment.',
    ],
    passWhen: [
      'Rough wiring and device rough-in are complete enough for the presented stage.',
      'Observed support, protection, and mounting conditions support safe concealment.',
    ],
    failWhen: [
      'Wiring is inadequately supported, improperly protected, or visibly vulnerable to damage.',
      'Boxes or device rough-ins are insecure, missing, or materially mislocated.',
      'Required exterior weatherproof device rough-in is absent where applicable.',
    ],
    pendingWhen: [
      'The rough wiring package is substantially complete but still awaiting final support, protection, or box installation.',
      'A localized corrective item is expected before the electrical rough-in can be accepted.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos documenting rough wiring support, protection, and device mounting conditions.',
    ],
    optionalEvidence: [
      'Supplemental wiring photos.',
      'Installer notes.',
      'Layout clarifications for box locations.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'electrical',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local rough-wiring, box placement, or protection requirements that must be satisfied before enclosure.',
    dependencies: ['S10-01'],
  },
  {
    code: 'S10-03',
    label: 'Life Safety and Telecom',
    uiSchema: 'field_view',
    purpose: 'Confirm life-safety circuit coordination and low-voltage pathway provisions are in place before enclosure.',
    viewDetails: 'Ensure rough electrical wiring is safely installed, properly supported, and ready for power/concealment. Validate smoke and carbon monoxide interconnect wiring and telecom or conduit provisions needed for the project scope before the electrical rough-in is concealed.',
    stopIf: [
      'Life-safety interconnect wiring is absent, or required telecom or conduit pathways have not been installed for the reviewed scope.',
    ],
    fieldChecklist: [
      'Smoke and CO detector interconnect wiring in place? (Camera or Note Evidence Required)',
      'Telecom and conduit provisions installed?',
    ],
    notesGuidance: 'Record observed interconnect wiring and telecom pathway conditions, including any omission affecting life-safety coordination or future serviceability.',
    whatToCheck: [
      'Smoke and carbon monoxide detector interconnect wiring is installed for the reviewed scope.',
      'Telecom and conduit provisions are installed where the project requires them.',
      'No critical life-safety or low-voltage pathway omission remains before concealment.',
    ],
    passWhen: [
      'Life-safety interconnects and telecom provisions are present and coordinated for the presented stage.',
      'The electrical rough-in is ready to proceed without an unresolved low-voltage or detector-wiring gap.',
    ],
    failWhen: [
      'Smoke or carbon monoxide interconnect wiring is missing or materially incomplete.',
      'Required telecom or conduit provisions are absent for the reviewed scope.',
      'Observed low-voltage or life-safety routing would undermine downstream system completion.',
    ],
    pendingWhen: [
      'Low-voltage or life-safety provisions are partially installed and require follow-up before concealment.',
      'A final coordination step is expected before the rough electrical package can be accepted.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos documenting detector interconnect and telecom pathway readiness where needed to support the decision.',
    ],
    optionalEvidence: [
      'Supplemental wiring notes.',
      'Coordination comments.',
      'Layout references for future devices or services.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'electrical',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: telecom and conduit provisions are required where the project scope, AHJ, or utility coordination triggers them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local life-safety wiring, interconnect, telecom, or conduit requirements that must be satisfied before enclosure.',
    dependencies: ['S10-02'],
  },
]

const STRUCTURAL_STAGE_11_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S11-01',
    label: 'Equipment and Piping Rough-In',
    uiSchema: 'field_view',
    purpose: 'Confirm the core gas and mechanical equipment rough-in is complete, coordinated, and supported by the required design basis before concealment or activation.',
    viewDetails: 'Verify core heating and gas appliances meet design specifications and clearance requirements. Validate gas piping and venting, heat-load calculations, appliance rough-in, and HVAC equipment installation before the mechanical package advances.',
    stopIf: [
      'Heat-load calculations are missing, or gas piping fails pressure tests.',
    ],
    fieldChecklist: [
      'Gas piping and venting routed and supported?',
      'Heat-load calculations provided and verified?',
      'Furnace, boiler, fireplace, range, or water heater roughed-in?',
      'Heat pump or other HVAC equipment installed? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record observed gas or mechanical rough-in conditions, appliance readiness, heat-load documentation basis, and any support, venting, or clearance issue affecting approval.',
    whatToCheck: [
      'Gas piping and venting are routed, supported, and coordinated for the reviewed scope.',
      'Heat-load calculations are present and support the installed equipment selection.',
      'Primary gas or heating appliances are roughed in where the presented stage requires them.',
      'Heat pumps or other HVAC equipment are installed and reviewable for the current stage.',
      'No equipment, piping, or design-basis deficiency remains that would undermine a defensible rough mechanical review.',
    ],
    passWhen: [
      'Core gas and mechanical equipment rough-in is complete enough for the presented stage.',
      'Observed appliance, venting, and piping conditions align with the documented design basis.',
    ],
    failWhen: [
      'Heat-load calculations are missing, inconsistent, or clearly inadequate for the installed equipment.',
      'Gas piping or venting is incomplete, unsupported, or deficient for the presented stage.',
      'A required appliance or mechanical unit is missing or materially misinstalled.',
    ],
    pendingWhen: [
      'The rough mechanical package is substantially installed but still awaiting final equipment, venting, or support completion.',
      'A design or equipment clarification is expected before a final decision can be made.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing gas piping, venting, equipment installation, and appliance rough-in conditions.',
    ],
    optionalEvidence: [
      'Heat-load calculation records already on file.',
      'Supplemental equipment label photos.',
      'Installer or engineer coordination notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'mechanical_hvac',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local gas, appliance-clearance, venting, or mechanical rough-in requirements that must be satisfied before concealment or activation.',
    dependencies: ['S08-03'],
  },
  {
    code: 'S11-02',
    label: 'Ventilation and Exhaust',
    uiSchema: 'field_view',
    purpose: 'Confirm the ventilation and exhaust systems are installed, terminated, and unobstructed before enclosure.',
    viewDetails: 'Validate ERV or HRV installation, bathroom and kitchen exhaust routing, and combustion-air provisions. This sub-container confirms the building ventilation strategy is physically complete and able to support the intended appliances and indoor air pathways.',
    stopIf: [
      'Required ventilation, exhaust, or combustion-air pathways are incomplete or obstructed.',
    ],
    fieldChecklist: [
      'Ventilation system (ERV/HRV) installed and ducted?',
      'Bathroom and kitchen exhaust routed to exterior?',
      'Combustion air provisions complete and unobstructed? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record ventilation and exhaust routing conditions, observed terminations, combustion-air readiness, and any obstruction or incomplete ducting affecting compliance.',
    whatToCheck: [
      'The ventilation system is installed and ducted for the reviewed scope.',
      'Bathroom and kitchen exhaust routes discharge to the exterior as required.',
      'Combustion-air provisions are complete and unobstructed where fuel-fired appliances require them.',
      'No visible ventilation or exhaust deficiency remains before the mechanical package is enclosed.',
    ],
    passWhen: [
      'Ventilation, exhaust, and combustion-air systems are installed and reviewable for the presented stage.',
      'Air movement and termination pathways appear complete enough for downstream testing or final approval.',
    ],
    failWhen: [
      'A required ventilation or exhaust path is incomplete, incorrectly routed, or not terminated to exterior where required.',
      'Combustion-air provisions are missing, blocked, or materially inadequate for the appliance setup.',
    ],
    pendingWhen: [
      'Ventilation or exhaust ducting is still being completed and requires re-inspection.',
      'A termination or air-path correction is expected before the system can be accepted.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing ventilation ducting, exhaust routing, and combustion-air conditions.',
    ],
    optionalEvidence: [
      'Supplemental duct routing notes.',
      'Installer balancing or coordination records.',
      'Equipment detail references.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'mechanical_hvac',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local ventilation, exhaust termination, or combustion-air requirements that affect approval before enclosure.',
    dependencies: ['S11-01'],
  },
  {
    code: 'S11-03',
    label: 'Testing and Approvals',
    uiSchema: 'field_view',
    purpose: 'Confirm the mechanical and gas package has cleared the required inspection, declaration, and approval gates before closeout.',
    viewDetails: 'Validate the administrative closeout of the mechanical scope, including rough mechanical inspection status, gas declaration and inspection completion, and final mechanical or gas approval. This sub-container captures the formal gate between installed work and accepted work.',
    stopIf: [
      'Required mechanical or gas inspection and approval steps remain incomplete for the reviewed scope.',
    ],
    fieldChecklist: [
      'Rough mechanical inspection passed? (Camera or Note Evidence Required)',
      'Gas declaration and inspection completed?',
      'Final mechanical/gas approval granted?',
    ],
    notesGuidance: 'Record the current mechanical and gas approval status, any declaration or inspection reference, and the exact unresolved item blocking closeout.',
    whatToCheck: [
      'The rough mechanical inspection has passed or is clearly documented for the presented scope.',
      'Gas declaration and inspection requirements have been completed where applicable.',
      'Final mechanical or gas approval has been granted where the reviewed scope is at final stage.',
      'No outstanding mechanical administrative hold remains that would block closeout.',
    ],
    passWhen: [
      'Required mechanical and gas inspection gates are documented as cleared for the presented scope.',
      'No unresolved declaration, inspection, or approval item remains before closeout.',
    ],
    failWhen: [
      'A required rough or final mechanical inspection has not passed.',
      'Gas declaration, gas inspection, or final approval is missing where required.',
      'Administrative records contradict the readiness of the installed mechanical work.',
    ],
    pendingWhen: [
      'Inspection or approval activity is scheduled but not yet complete.',
      'Supporting declaration or approval records are expected shortly and may resolve the hold.',
    ],
    requiredEvidence: [
      'Inspection records, declaration references, or approval documents confirming mechanical and gas closeout status.',
    ],
    optionalEvidence: [
      'Supplemental text notes documenting inspector feedback or outstanding conditions.',
      'Approval correspondence.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'gas',
    responsibleParty: 'AHJ',
    requiredLogic: 'Conditional: gas declaration and final approval items are required when the project scope includes regulated gas or final mechanical closeout.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local mechanical inspection, gas declaration, or final-approval conditions that must be satisfied before mechanical closeout.',
    dependencies: ['S11-02'],
  },
]

const STRUCTURAL_STAGE_12_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S12-01',
    label: 'Thermal Insulation and Continuity',
    uiSchema: 'field_view',
    purpose: 'Confirm installed insulation packages, R-values, and thermal continuity match the approved design basis before drywall conceals the thermal envelope.',
    viewDetails: 'Validate insulation installation across all thermal-envelope assemblies including walls, roof, floor, slab, and foundation interfaces. Confirm continuity at thermal bridging risk zones such as rim joists, headers, corners, and assembly transitions. Verify window and door performance values against the approved schedule or energy documentation where required by the applicable compliance path. This container gates drywall installation and concealment of the thermal envelope.',
    stopIf: [
      'Insulation installation is materially incomplete in areas that will be concealed and cannot be re-inspected after drywall.',
      'Insulation R-values or assembly types are visibly inconsistent with the design package and concealment is about to proceed.',
    ],
    fieldChecklist: [
      'Insulation type confirmed against design package where applicable? (Camera or Video Evidence Required)',
      'Wall insulation installed to required R-value and continuous throughout reviewed areas, with no visible gaps, voids, or compression?',
      'Roof and ceiling insulation installed to required R-value without gaps at parapets, eaves, or assembly transitions?',
      'Floor, slab edge, or foundation interface insulation installed where required by design or applicable code path?',
      'Rim joist insulation installed and continuous at floor-to-wall transitions?',
      'Headers, corners, and framing-transition zones insulated where applicable?',
      'Attic insulation depth, baffles, ventilation path, and wind-wash protection present where applicable?',
      'Thermal bridging at framing transitions identified and addressed in accordance with design intent where applicable?',
      'No visible gaps, voids, compression, or discontinuity in insulation before concealment?',
      'Window U-values and SHGC confirmed against approved window schedule or energy documentation where required by the compliance path?',
    ],
    notesGuidance: 'Record observed insulation type, R-value confirmation, installation continuity, any visible deficiency at bridging zones or transitions, and fenestration performance references where applicable.',
    whatToCheck: [
      'Insulation is installed to the required R-value and assembly type consistent with the approved design package across all reviewed areas.',
      'Thermal continuity is maintained at rim joists, headers, corners, parapets, and all assembly transition zones.',
      'Slab, foundation, or crawlspace insulation is present where required by the design or applicable code path.',
      'Attic insulation depth, baffles, and wind-wash protection are present where applicable.',
      'Window U-values and SHGC align with the approved window schedule or energy documentation where required.',
      'No visible gap, void, compression, or thermal-envelope discontinuity remains before concealment.',
    ],
    passWhen: [
      'Installed insulation packages are consistent with the approved design basis across all reviewed thermal-envelope assemblies.',
      'Thermal continuity is maintained at all reviewed bridging zones and transitions with no material gap before concealment.',
    ],
    failWhen: [
      'Insulation is missing, compressed, or materially inconsistent with the required R-value or assembly type for the reviewed scope.',
      'Thermal continuity is visibly broken at rim joists, headers, corners, or assembly transitions.',
      'Fenestration performance values are confirmed to fall below the approved window schedule or energy documentation requirements.',
    ],
    pendingWhen: [
      'Insulation installation is near completion but local corrections at specific locations are still in progress.',
      'Fenestration confirmation is pending a consultant clarification or updated window schedule before the stage can be closed.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing insulation installation and continuity conditions before drywall concealment.',
    ],
    optionalEvidence: [
      'Approved window schedule or energy documentation on file.',
      'Supplemental insulation notes or manufacturer data sheets.',
      'Consultant confirmation of thermal performance where applicable.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local insulation, thermal-continuity, or fenestration requirements applying before concealment, including any AHJ-specific R-value minimums or assembly restrictions.',
    dependencies: ['S09-02', 'S10-03', 'S11-03'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Thermal insulation and building envelope requirements',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.36; Part 12, Section 12.2',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'BC Building Code 2024 — Fenestration thermal performance where required by energy compliance path',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.7; Part 12, Section 12.3',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'Vancouver Building By-law 2025 — Energy performance and thermal envelope requirements',
        legalReference: 'VBBL 2025, Division B, Part 10 — Energy Performance',
        sourceTitle: 'Vancouver Building By-law 2025',
        isVbblOnly: true,
      },
    ],
  },
  {
    code: 'S12-02',
    label: 'Air Barrier, Vapour Control, and Penetrations',
    uiSchema: 'field_view',
    purpose: 'Confirm the air barrier strategy is continuous and all penetrations are sealed, and that the vapour control layer is appropriate to the assembly type and applicable code path, before drywall conceals the assembly.',
    viewDetails: 'Inspect the air barrier membrane or assembly for continuity and integration with the thermal envelope. Confirm the vapour control layer — which may be a polyethylene membrane, airtight drywall, a smart retarder, or another assembly-appropriate strategy — is present and compatible with the approved wall assembly where required by the applicable code path. Verify sealing at all penetrations through the air or vapour control layer including pipes, wires, ducts, recessed lights, and service entries. Confirm detailing is complete at top and bottom plates, rim joists, window and door rough openings, and roof-wall transitions. This container gates drywall and interior finish progression.',
    stopIf: [
      'Air barrier continuity is visibly broken or unsealed penetrations remain in areas that will be concealed before corrections can be made.',
      'Vapour control layer is absent in a zone where it is required by the applicable assembly type and code path, and concealment is about to proceed.',
    ],
    fieldChecklist: [
      'Air barrier strategy visible and continuous throughout reviewed areas? (Camera or Video Evidence Required)',
      'Top plate and bottom plate air sealing applied at exterior and party wall transitions where applicable?',
      'Rim joist air sealing applied at floor-to-wall transitions?',
      'All penetrations through the air barrier sealed, including pipes, wires, ducts, recessed lights, and service entries?',
      'Window and door rough opening sealing applied where required by the air barrier strategy?',
      'Vapour control layer appropriate to the assembly type and applicable code path present where required?',
      'No visible punctures, tears, or discontinuities in the air or vapour control layer before concealment?',
    ],
    notesGuidance: 'Record observed air barrier continuity, vapour control layer type and compatibility, penetration sealing status at each service type, and any detailing gap requiring correction before drywall.',
    whatToCheck: [
      'Air barrier membrane or assembly is continuous and correctly integrated with the thermal envelope in reviewed areas.',
      'Top and bottom plate air sealing is applied at exterior and party wall transitions where applicable.',
      'Rim joist air sealing is applied at floor-to-wall transitions.',
      'All penetrations — including pipes, wires, ducts, recessed lights, and service entries — are sealed at the air barrier layer.',
      'Window and door rough opening sealing is applied where required by the air barrier strategy.',
      'The vapour control layer is present and compatible with the approved assembly type and applicable code path where required.',
      'No visible tear, gap, or discontinuity remains in the air or vapour control layer before concealment.',
    ],
    passWhen: [
      'Air barrier is continuous and all penetrations are sealed for the reviewed scope.',
      'Vapour control layer is present, correctly specified for the assembly type, and compatible with the applicable code path where required.',
    ],
    failWhen: [
      'Air barrier continuity is visibly broken, unsealed, or incorrectly integrated at joints, plates, or transitions.',
      'Penetrations through the air barrier at pipes, wires, ducts, or other services remain unsealed before drywall.',
      'Vapour control layer is absent in a zone where it is required by the assembly type and applicable code path.',
    ],
    pendingWhen: [
      'Air barrier or vapour control detailing is still in progress at specific locations and requires a return review before drywall.',
      'Penetration sealing is partially complete and expected to be corrected before concealment proceeds.',
    ],
    requiredEvidence: [
      'Field photos showing air barrier installation, penetration sealing conditions, and vapour control layer presence before concealment.',
    ],
    optionalEvidence: [
      'Manufacturer installation guidance for the air barrier system.',
      'Consultant review notes or air barrier strategy document.',
      'Supplemental penetration sealing records where extensive.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local air barrier, vapour control, or penetration sealing requirements applying before concealment, including any AHJ-specific assembly or material requirements.',
    dependencies: ['S12-01'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Air barrier and vapour control requirements',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.25; Part 12, Section 12.3',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'BC Building Code 2024 — Penetration sealing and continuity at mechanical, electrical, and structural elements',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.25.3; Part 12, Section 12.3',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'Vancouver Building By-law 2025 — Air barrier requirements under applicable Step Code or equivalence path',
        legalReference: 'VBBL 2025, Division B, Part 10 — Energy Performance',
        sourceTitle: 'Vancouver Building By-law 2025',
        isVbblOnly: true,
      },
    ],
  },
  {
    code: 'S12-03',
    label: 'Energy Documentation and Compliance Path',
    uiSchema: 'field_view',
    purpose: 'Confirm the energy compliance path is identified and that documentation, modeling, and testing requirements applicable to the project scope and local authority have been addressed before energy package closeout.',
    viewDetails: 'Validate the applicable energy compliance path for the project, which may be a prescriptive path, a performance path, or a BC Energy Step Code tier where adopted by local authority or required by permit scope. Confirm that energy model or documentation assumptions are consistent with installed insulation, fenestration, mechanical, and ventilation systems where an energy model is required by the compliance path. Where required by the applicable energy compliance path, confirm blower door or pressurization test scheduling or results are on file. Record heat pump, HRV or ERV, and other mechanical assumptions only where those systems are installed and relevant to the compliance path.',
    stopIf: [
      'The energy compliance path is unconfirmed and the project is advancing toward interior completion without resolution.',
      'A blower door or pressurization test is required by the applicable compliance path or AHJ and no scheduling or result has been submitted.',
    ],
    fieldChecklist: [
      'Energy compliance path identified: prescriptive, performance, BC Energy Step Code tier, or other applicable project-specific path?',
      'BC Energy Step Code target or tier identified where adopted by local authority or required by permit scope?',
      'Energy model or documentation available where required by the applicable compliance path, and consistent with installed insulation, fenestration, and mechanical systems?',
      'Blower door or pressurization test completed, scheduled, or identified as applicable where required by the energy compliance path?',
      'Heat pump and mechanical equipment assumptions consistent with installed systems where applicable?',
      'Ventilation assumptions consistent with installed HRV or ERV conditions where applicable?',
      'Window performance documentation available and consistent with installed fenestration where required by the compliance path?',
    ],
    notesGuidance: 'Record the confirmed compliance path, energy documentation status, Step Code tier where applicable, blower door test status where required, and any inconsistency between energy model assumptions and installed systems.',
    whatToCheck: [
      'The energy compliance path — prescriptive, performance, or Step Code tier where applicable — is confirmed and consistent with the permit basis.',
      'Energy documentation, where required by the compliance path, is available and consistent with installed insulation, fenestration, mechanical, and ventilation systems.',
      'Blower door or pressurization test results or scheduling confirmation are on file where required by the compliance path or AHJ.',
      'Heat pump, HRV or ERV, and other installed mechanical assumptions in energy documentation are consistent with the installed work where applicable.',
      'Window performance documentation is available where required by the applicable compliance path.',
      'No major documentation or compliance-path gap remains before energy package closeout.',
    ],
    passWhen: [
      'The energy compliance path is confirmed and energy documentation is consistent with the installed scope where documentation is required.',
      'Blower door or pressurization test evidence, or AHJ confirmation that testing is not required, is on file where applicable.',
    ],
    failWhen: [
      'The energy compliance path is unconfirmed or energy documentation assumptions are materially inconsistent with the installed systems.',
      'Required blower door or pressurization test evidence is missing or overdue for a compliance path that mandates testing.',
      'Energy documentation gaps or model inconsistencies cannot be resolved before interior completion proceeds.',
    ],
    pendingWhen: [
      'Energy adviser review or blower door testing is in progress and expected to be resolved before the next stage.',
      'Updated energy documentation is being prepared to reflect minor changes from the installed scope.',
    ],
    requiredEvidence: [
      'Energy compliance path confirmation, energy adviser letter, or compliance documentation record applicable to the project scope and compliance path.',
    ],
    optionalEvidence: [
      'Energy model summary or performance report where applicable.',
      'Blower door test result or AHJ correspondence regarding testing where applicable.',
      'Supplemental mechanical coordination notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local Step Code tier requirements, blower door testing mandates, or energy documentation requirements applying to this stage and jurisdiction.',
    dependencies: ['S12-02'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Part 9 and Part 10 energy compliance requirements',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.36; Part 10 — Energy Performance',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'BC Energy Step Code — Provincial compliance framework and tier requirements where adopted',
        legalReference: 'BCBC 2024 Division B, Part 10; BC Energy Step Code provincial framework',
        sourceTitle: 'BC Energy Step Code',
      },
      {
        label: 'Vancouver Building By-law 2025 — Mandatory minimum Step Code tier requirements for Vancouver',
        legalReference: 'VBBL 2025, Division B, Part 10 — Energy Performance',
        sourceTitle: 'Vancouver Building By-law 2025',
        isVbblOnly: true,
      },
    ],
  },
  {
    code: 'S12-04',
    label: 'Insulation Inspection and Energy Closeout',
    uiSchema: 'field_view',
    purpose: 'Confirm the insulation inspection gate is passed and all required energy-compliance documentation has been submitted before the project advances to interior wall and finish work.',
    viewDetails: 'This sub-container captures the administrative closeout of the energy compliance package. Confirm the insulation inspection has passed or is formally documented for the reviewed scope. Verify that energy-compliance records applicable to the project — including energy adviser reports, compliance certificates, blower door results where required, and Letters of Assurance from Registered Professionals where required by project scope — have been uploaded or confirmed. Flag any unresolved deficiency, missing record, or conflicting compliance assumption before Stage 13 proceeds.',
    stopIf: [
      'Insulation inspection has not passed or remains formally unresolved before interior completion proceeds.',
      'Required energy-compliance documentation or Letters of Assurance are missing and cannot be confirmed as in-progress.',
    ],
    fieldChecklist: [
      'Insulation inspection status confirmed: passed, pending, or outstanding? (Camera or Note Evidence Required)',
      'Energy compliance certificate or equivalent documentation uploaded where required by the compliance path?',
      'Letters of Assurance from Registered Professionals available where required by project scope and permit path?',
      'Blower door test report uploaded where required by the applicable compliance path?',
      'AHJ acceptance of energy compliance records confirmed, or outstanding acceptance items documented?',
      'Any unresolved deficiencies, missing records, or conflicting compliance assumptions flagged before downstream completion?',
    ],
    notesGuidance: 'Record insulation inspection status, energy compliance documentation completeness, Letters of Assurance status where applicable, and any outstanding acceptance item or deficiency blocking energy package closeout.',
    whatToCheck: [
      'The insulation inspection has passed or is formally documented as complete for the reviewed scope.',
      'Energy compliance certificate or equivalent documentation has been uploaded where required.',
      'Letters of Assurance from Registered Professionals are on file where required by project scope and permit path.',
      'Blower door test report is on file where required by the applicable compliance path.',
      'AHJ acceptance of the energy compliance package is confirmed or outstanding acceptance items are documented.',
      'No unresolved deficiency, missing record, or compliance conflict remains before Stage 13 interior work proceeds.',
    ],
    passWhen: [
      'Insulation inspection has passed and all required energy-compliance documents are submitted and complete for the project scope.',
      'No outstanding inspection, documentation, or AHJ acceptance hold remains on the energy package.',
    ],
    failWhen: [
      'Insulation inspection has not passed or contains formally unresolved conditions.',
      'Required energy-compliance documentation, Letters of Assurance, or blower door results are missing or materially incomplete.',
      'An unresolved deficiency or compliance conflict exists that cannot be addressed before interior completion proceeds.',
    ],
    pendingWhen: [
      'Final documentation upload, Letters of Assurance, or AHJ acceptance is in progress but not yet complete.',
      'A supporting report or compliance form is expected shortly and may resolve the outstanding hold.',
    ],
    requiredEvidence: [
      'Insulation inspection records and energy-compliance documentation confirming the energy package closeout for the applicable project scope.',
    ],
    optionalEvidence: [
      'Supplemental AHJ correspondence or acceptance records.',
      'Consultant confirmation letters or RFI responses.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local insulation inspection acceptance criteria, energy documentation requirements, or Letters of Assurance obligations that must be satisfied before the project advances to interior completion.',
    dependencies: ['S12-03'],
    codeReferences: [
      {
        label: 'BC Building Code 2024 — Energy compliance acceptance and inspection requirements',
        legalReference: 'BCBC 2024 Division B, Part 9, Section 9.36; Part 10 — Energy Performance',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'BC Building Code 2024 — Schedule B Letters of Assurance requirements where applicable',
        legalReference: 'BCBC 2024 Division C, Part 2 — Assurance Schedules',
        sourceTitle: 'British Columbia Building Code 2024',
        sourceUrl: 'https://www.bccodes.ca/bc-building-code.html',
      },
      {
        label: 'Vancouver Building By-law 2025 — Energy documentation and acceptance requirements under Vancouver municipal rules',
        legalReference: 'VBBL 2025, Division B, Part 10 — Energy Performance',
        sourceTitle: 'Vancouver Building By-law 2025',
        isVbblOnly: true,
      },
    ],
  },
]

const STRUCTURAL_STAGE_13_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S13-01',
    label: 'Wall Systems and Backing',
    uiSchema: 'field_view',
    purpose: 'Confirm interior wall assemblies, moisture-protected wet-area substrates, and concealed backing are complete before finish closure progresses.',
    viewDetails: 'Validate drywall and moisture-resistant board installation, tile backer in wet areas, and blocking for future fixtures such as grab bars and cabinets. This sub-container confirms the concealed support layer of the interior package is complete before finish work obscures it.',
    stopIf: [
      'Required moisture-resistant substrates or concealed backing are missing where they will no longer be reviewable after finishes proceed.',
    ],
    fieldChecklist: [
      'Drywall and moisture-resistant board installed and taped?',
      'Tile backer installed in wet areas? (Camera or Video Evidence Required)',
      'Blocking for fixtures (grab bars, cabinets) confirmed?',
    ],
    notesGuidance: 'Record observed wall-system installation, wet-area substrate conditions, and any missing backing or board condition affecting interior readiness.',
    whatToCheck: [
      'Drywall and moisture-resistant board are installed and prepared for the reviewed stage.',
      'Tile backer is installed in wet areas where required.',
      'Blocking for future fixtures such as grab bars or cabinets is present where needed.',
      'No concealed support or substrate deficiency remains before finish progression.',
    ],
    passWhen: [
      'Wall systems and concealed backing are complete enough for the presented stage.',
      'No missing substrate or backing condition remains that would be difficult to correct after finishes proceed.',
    ],
    failWhen: [
      'Required moisture-resistant board or tile backer is missing or installed incorrectly in wet areas.',
      'Concealed blocking for future fixtures is absent where required.',
      'Interior wall-system preparation is materially incomplete for the presented stage.',
    ],
    pendingWhen: [
      'Wall-system installation is still being completed and requires a return inspection.',
      'Localized backing or substrate corrections are expected before final acceptance of the stage.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing wet-area backer, wall-system conditions, and concealed backing before finishes obscure them.',
    ],
    optionalEvidence: [
      'Supplemental room notes.',
      'Layout references.',
      'Coordination records for accessibility or cabinet backing.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local substrate, wet-area, or concealed-backing requirements that must be satisfied before interior finish progression.',
    dependencies: ['S12-04'],
  },
  {
    code: 'S13-02',
    label: 'Finishes and Systems Trim',
    uiSchema: 'field_view',
    purpose: 'Confirm the primary interior finish components and final trim-outs for building systems are complete enough for occupancy readiness.',
    viewDetails: 'Validate interior doors, hardware, flooring, cabinetry, millwork, plumbing and electrical trim, and HVAC grilles and controls. This sub-container tracks the visible interior completion layer that supports functional readiness of the occupied space.',
    stopIf: [
      'Critical interior trim or system completion gaps remain that would prevent safe or functional use of the space.',
    ],
    fieldChecklist: [
      'Interior doors, hardware, and flooring complete? (Camera or Note Evidence Required)',
      'Cabinets and millwork installed?',
      'Plumbing and electrical trim (fixtures, plates) complete?',
      'HVAC grilles and controls installed?',
    ],
    notesGuidance: 'Record the completion state of finish carpentry, trim, and visible systems, and note any missing element affecting function or readiness.',
    whatToCheck: [
      'Interior doors, hardware, and flooring are complete enough for the reviewed scope.',
      'Cabinets and millwork are installed where required.',
      'Plumbing and electrical trim components are installed and coordinated.',
      'HVAC grilles and controls are installed and accessible.',
      'No major finish or trim omission remains that would block functional interior use.',
    ],
    passWhen: [
      'Interior finishes and systems trim are complete enough for the presented stage.',
      'The reviewed spaces are functionally ready to progress toward final occupancy conditions.',
    ],
    failWhen: [
      'Critical doors, hardware, flooring, or millwork remain incomplete for the reviewed scope.',
      'Required plumbing or electrical trim is missing or materially incomplete.',
      'HVAC final components necessary for normal operation are absent.',
    ],
    pendingWhen: [
      'Interior trim work is underway and requires a follow-up inspection before closeout.',
      'A localized finish or device correction is expected before the stage can be accepted.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos documenting interior finish and trim readiness where needed to support the decision.',
    ],
    optionalEvidence: [
      'Supplemental room photos.',
      'Deficiency notes.',
      'Trade coordination records.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local final-trim or interior-completion requirements that affect readiness for occupancy review.',
    dependencies: ['S13-01'],
  },
  {
    code: 'S13-03',
    label: 'Accessibility and Final Touch',
    uiSchema: 'field_view',
    purpose: 'Confirm finish-stage accessibility elements and final visible completion details are installed before final site and occupancy closeout.',
    viewDetails: 'Validate paint and finish completion and confirm that accessibility finish items required by the plan are installed. This sub-container captures the last interior readiness layer before the project moves into exterior finalization and final approvals.',
    stopIf: [
      'Required accessibility finish items are absent or the interior remains materially incomplete for final readiness.',
    ],
    fieldChecklist: [
      'Paint and finishes complete?',
      'Accessibility finish items installed per plan? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record final interior finish condition, accessibility item installation status, and any remaining deficiency affecting readiness for final closeout.',
    whatToCheck: [
      'Paint and visible finishes are complete enough for the reviewed scope.',
      'Accessibility finish items required by the plan are installed and reviewable.',
      'No material interior-finish or accessibility deficiency remains before final closeout proceeds.',
    ],
    passWhen: [
      'Final interior finishes and accessibility-related items are complete for the presented area.',
      'The interior package is ready to transition to exterior finalization and occupancy closeout.',
    ],
    failWhen: [
      'Paint or finish work is materially incomplete for the reviewed scope.',
      'Required accessibility finish items are missing or inconsistent with the plan.',
      'Visible interior deficiencies remain that would undermine final readiness.',
    ],
    pendingWhen: [
      'Final finish work is still in progress and requires a return inspection.',
      'A minor accessibility or finish correction is expected before acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing completed finishes and accessibility items in the reviewed area.',
    ],
    optionalEvidence: [
      'Supplemental closeout notes.',
      'Finish-schedule references.',
      'Coordination comments.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: accessibility finish items are required where the project scope or approved plans trigger them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local accessibility-finish or final interior-completion requirements that must be satisfied before final closeout.',
    dependencies: ['S13-02'],
  },
]

const STRUCTURAL_STAGE_14_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S14-01',
    label: 'Grading and Drainage',
    uiSchema: 'field_view',
    purpose: 'Confirm final exterior grading and drainage direct water safely away from the building and that utility servicing is complete.',
    viewDetails: 'Validate final site grading, drainage pathways, downspout discharge, and completion of utility and servicing work. This sub-container protects the building from post-construction water issues and confirms the site services are ready for final occupancy conditions.',
    stopIf: [
      'Final grading slopes toward the building or downspouts discharge improperly.',
    ],
    fieldChecklist: [
      'Final grading and site drainage established? (Camera or Video Evidence Required)',
      'Downspout discharge directed away from foundation?',
      'Utility and servicing completion verified?',
    ],
    notesGuidance: 'Record observed final grading, drainage direction, downspout discharge conditions, and the status of utility and servicing completion.',
    whatToCheck: [
      'Final grading directs water away from the building in the reviewed areas.',
      'Site drainage pathways are established and not visibly blocked or reversed.',
      'Downspouts discharge appropriately away from the foundation.',
      'Utility and servicing work is complete enough for final site use.',
      'No site-drainage deficiency remains that would undermine final closeout.',
    ],
    passWhen: [
      'Exterior grading and drainage conditions support proper water shedding away from the building.',
      'Utility and servicing completion is confirmed for the reviewed scope.',
    ],
    failWhen: [
      'Final grading directs water toward the building or creates ponding risk at the foundation.',
      'Downspouts discharge improperly or too close to the building.',
      'Utility or servicing completion remains materially unresolved for final site readiness.',
    ],
    pendingWhen: [
      'Final grading or servicing work is still being completed and requires re-inspection.',
      'A localized drainage correction is expected before acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing final grading, drainage conditions, and downspout discharge.',
    ],
    optionalEvidence: [
      'Supplemental site notes.',
      'Servicing completion records.',
      'Overview photos documenting drainage pathways.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local grading, drainage, or servicing requirements that must be satisfied before final site acceptance.',
    dependencies: ['S13-03'],
  },
  {
    code: 'S14-02',
    label: 'Access and Hardscaping',
    uiSchema: 'field_view',
    purpose: 'Confirm exterior circulation, hardscape safety features, and vehicular access elements are complete for final use.',
    viewDetails: 'Validate walks, stairs, guards, ramps, accessible exterior path conditions, and driveway completion. This sub-container confirms the primary site-access and hardscape features are safe and usable before final approval.',
    stopIf: [
      'Critical exterior access or guard conditions remain incomplete in a way that compromises safe use.',
    ],
    fieldChecklist: [
      'Walks, stairs, guards, and ramps installed?',
      'Accessible exterior path completed? (Camera or Video Evidence Required)',
      'Driveway completion verified?',
    ],
    notesGuidance: 'Record observed hardscape and access conditions, including guard installation, accessible-route readiness, and any unresolved driveway issue.',
    whatToCheck: [
      'Walks, stairs, guards, and ramps are installed where required by the reviewed scope.',
      'The accessible exterior path is complete enough for the intended route.',
      'Driveway construction is complete and usable where applicable.',
      'No major hardscape or access deficiency remains that would block final acceptance.',
    ],
    passWhen: [
      'Exterior access and hardscaping features are complete enough for final use in the reviewed area.',
      'The accessible route and driveway conditions support progression toward final approval.',
    ],
    failWhen: [
      'Required walks, stairs, guards, or ramps are incomplete or unsafe for the reviewed scope.',
      'The accessible exterior path is missing, interrupted, or materially deficient.',
      'Driveway completion remains unresolved where it is required for the site.',
    ],
    pendingWhen: [
      'Hardscape or access work is still being finished and requires a return inspection.',
      'A localized guard, path, or driveway correction is expected before acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing exterior access routes, guard conditions, and hardscape completion.',
    ],
    optionalEvidence: [
      'Supplemental site measurements.',
      'Accessibility coordination notes.',
      'Overview photos documenting route continuity.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: accessible exterior path requirements apply where the approved plans or occupancy type trigger them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local hardscape, accessible-route, or exterior safety-feature requirements that affect final site acceptance.',
    dependencies: ['S14-01'],
  },
  {
    code: 'S14-03',
    label: 'Softscaping and Environment',
    uiSchema: 'field_view',
    purpose: 'Confirm landscape restoration and environmental closeout obligations are complete before final approvals are issued.',
    viewDetails: 'Validate landscaping and softscape restoration, along with final tree compliance sign-off where required. This sub-container closes the environmental and site-restoration layer that often remains outstanding near final approval.',
    stopIf: [
      'Required tree compliance sign-off or environmental restoration remains outstanding for the reviewed scope.',
    ],
    fieldChecklist: [
      'Landscaping and softscape restoration complete? (Camera or Note Evidence Required)',
      'Tree compliance sign-off obtained?',
    ],
    notesGuidance: 'Record final softscape conditions, any outstanding restoration work, and the status of tree compliance sign-off or environmental closeout.',
    whatToCheck: [
      'Landscaping and softscape restoration are complete enough for final site presentation.',
      'Tree compliance sign-off has been obtained where required.',
      'No unresolved environmental or restoration condition remains that would block final approvals.',
    ],
    passWhen: [
      'Softscape restoration and environmental closeout obligations are satisfied for the reviewed scope.',
      'No tree or landscape compliance hold remains before final approval.',
    ],
    failWhen: [
      'Landscaping or softscape restoration is materially incomplete for final closeout.',
      'Required tree compliance sign-off is missing or unresolved.',
      'Environmental restoration obligations remain outstanding in a way that blocks final approval.',
    ],
    pendingWhen: [
      'Final restoration or sign-off activity is in progress and requires follow-up.',
      'A final document or minor landscape completion item is expected before acceptance.',
    ],
    requiredEvidence: [
      'Closeout records or field notes confirming landscape restoration and tree compliance status.',
    ],
    optionalEvidence: [
      'Supplemental site photos.',
      'Arborist sign-off records.',
      'Environmental-restoration notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'trees',
    responsibleParty: 'AHJ',
    requiredLogic: 'Conditional: tree compliance sign-off is required where tree protection, removal, or restoration obligations apply to the project site.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local landscape-restoration, tree, or environmental-closeout requirements that must be satisfied before final approvals proceed.',
    dependencies: ['S14-02'],
  },
]

const STRUCTURAL_STAGE_15_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S15-01',
    label: 'Final Document Verification',
    uiSchema: 'field_view',
    purpose: 'Confirm all required inspection records and professional closeout schedules are complete before occupancy is issued.',
    viewDetails: 'Ensure all administrative and physical requirements are satisfied prior to issuing occupancy. Validate the full inspection history, confirm all scheduled and passed inspections are tracked and cleared, and verify final professional assurance schedules such as Letters of Assurance are submitted where required.',
    stopIf: [
      'Outstanding life-safety deficiencies or missing professional schedules.',
    ],
    fieldChecklist: [
      'All scheduled and passed inspections tracked and cleared? (Camera or Note Evidence Required)',
      'Final professional assurance schedules (Letters of Assurance) submitted?',
    ],
    notesGuidance: 'Record the status of outstanding inspections, professional schedules, and any unresolved administrative or life-safety hold blocking occupancy.',
    whatToCheck: [
      'All scheduled inspections required for the project have been tracked and cleared.',
      'No outstanding inspection record indicates an unresolved life-safety deficiency.',
      'Final professional assurance schedules are submitted where the project scope requires them.',
      'Administrative closeout records support progression toward occupancy.',
    ],
    passWhen: [
      'Inspection tracking is complete and no unresolved administrative or life-safety hold remains.',
      'Required professional schedules are submitted and available in the record.',
    ],
    failWhen: [
      'An outstanding inspection or life-safety deficiency remains unresolved.',
      'Required professional assurance schedules are missing or incomplete.',
      'Administrative records do not support readiness for occupancy issuance.',
    ],
    pendingWhen: [
      'A final inspection or professional schedule is expected shortly and may clear the hold.',
      'Closeout documentation is in progress but not yet complete enough for acceptance.',
    ],
    requiredEvidence: [
      'Final inspection tracking records and professional schedule submissions supporting occupancy readiness.',
    ],
    optionalEvidence: [
      'Supplemental text notes documenting outstanding closeout items.',
      'Consultant correspondence.',
      'Approval-status summaries.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'occupancy',
    responsibleParty: 'Auditor',
    requiredLogic: 'Conditional: final professional assurance schedules are required where the project scope triggers Letters of Assurance or similar professional closeout records.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local closeout-document, inspection-tracking, or professional-assurance requirements that must be satisfied prior to occupancy issuance.',
    dependencies: ['S14-03'],
  },
  {
    code: 'S15-02',
    label: 'Final Occupancy Gate',
    uiSchema: 'field_view',
    purpose: 'Confirm the AHJ has granted final building approval and issued occupancy or final acceptance for the project.',
    viewDetails: 'Validate the final authority-issued approvals that complete the project lifecycle. This sub-container captures the formal transition from a completed project to an approved and occupiable building or accepted final state.',
    stopIf: [
      'Final building approval or occupancy acceptance has not been issued.',
    ],
    fieldChecklist: [
      'Final building approval granted? (Camera or Note Evidence Required)',
      'Occupancy / final acceptance issued?',
    ],
    notesGuidance: 'Record final approval status, occupancy issuance details, and any remaining AHJ hold preventing project closeout.',
    whatToCheck: [
      'Final building approval has been granted by the AHJ for the reviewed scope.',
      'Occupancy or final acceptance has been issued where required.',
      'No outstanding authority hold remains that would prevent project closeout.',
    ],
    passWhen: [
      'The AHJ has granted final building approval and issued occupancy or final acceptance as required.',
      'The project is fully clear to close out within the completion workflow.',
    ],
    failWhen: [
      'Final building approval has not been granted.',
      'Occupancy or final acceptance remains withheld or unresolved.',
      'Authority records indicate a remaining final-approval hold.',
    ],
    pendingWhen: [
      'Final authority review is underway but the decision has not yet been issued.',
      'An administrative issuance step remains in progress and may resolve shortly.',
    ],
    requiredEvidence: [
      'AHJ-issued final approval or occupancy records confirming formal project acceptance.',
    ],
    optionalEvidence: [
      'Supplemental issuance notes.',
      'Approval correspondence.',
      'Closeout summaries.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'occupancy',
    responsibleParty: 'AHJ',
    documentUploadRequired: true,
    ahjNotes: 'Capture local final-approval, occupancy, or acceptance conditions that govern the project closeout gate.',
    dependencies: ['S15-01'],
  },
]

const RAW_STAGES: RawStageDefinition[] = [
  {
    stageNumber: 1,
    stageName: 'Project Setup and Jurisdiction Check',
    summary: 'Confirm the project identity, governing authority, code path, permit scope, and foundational review context before field inspection activity proceeds.',
    items: STRUCTURAL_STAGE_1_CONTAINERS,
  },
  {
    stageNumber: 2,
    stageName: 'Planning and Site Approvals',
    summary: 'Verify that all pre-building-permit parallel approvals are satisfied before the core permit package moves forward.',
    items: STRUCTURAL_STAGE_2_CONTAINERS,
  },
  {
    stageNumber: 3,
    stageName: 'Building Permit Submission Package',
    summary: 'Ensure the core building permit module contains all necessary documents for comprehensive review.',
    items: STRUCTURAL_STAGE_3_CONTAINERS,
  },
  {
    stageNumber: 4,
    stageName: 'Site Prep and Pre-Excavation',
    summary: 'Verify that all permit-able and inspectable site preparation items are complete before earthworks begin.',
    items: STRUCTURAL_STAGE_4_CONTAINERS,
  },
  {
    stageNumber: 5,
    stageName: 'Footings, Foundation, and Slab',
    summary: 'Confirm excavation, bearing preparation, formwork, and reinforcement are suitable for structural review prior to concrete placement.',
    items: STRUCTURAL_STAGE_5_CONTAINERS,
  },
  {
    stageNumber: 6,
    stageName: 'Structural Frame',
    summary: 'Confirm the structural frame, lateral system, and specialty structural elements are complete and reviewable before concealment.',
    items: STRUCTURAL_STAGE_6_CONTAINERS,
  },
  {
    stageNumber: 7,
    stageName: 'Building Envelope',
    summary: 'Confirm the enclosure layers, opening integration, and drainage systems are watertight and ready for exterior completion.',
    items: STRUCTURAL_STAGE_7_CONTAINERS,
  },
  {
    stageNumber: 8,
    stageName: 'Fire and Life Safety',
    summary: 'Validate passive fire protection, egress, alarms, and accessibility support details before closure or finish concealment.',
    items: STRUCTURAL_STAGE_8_CONTAINERS,
  },
  {
    stageNumber: 9,
    stageName: 'Plumbing Permit and Scope',
    summary: 'Confirm rough plumbing scope, potable water distribution, DWV systems, testing, city connections, and jurisdictional requirements before framing is enclosed.',
    items: STRUCTURAL_STAGE_9_CONTAINERS,
  },
  {
    stageNumber: 10,
    stageName: 'Electrical Permit and Scope',
    summary: 'Confirm service equipment, rough wiring, life-safety circuits, and telecom provisions are installed safely before enclosure.',
    items: STRUCTURAL_STAGE_10_CONTAINERS,
  },
  {
    stageNumber: 11,
    stageName: 'Gas Permit and Mechanical / HVAC Scope',
    summary: 'Confirm gas, mechanical, HVAC, and approval pathways are complete before the project advances to energy and interior closeout.',
    items: STRUCTURAL_STAGE_11_CONTAINERS,
  },
  {
    stageNumber: 12,
    stageName: 'Insulation and Energy Compliance',
    summary: 'Confirm thermal-envelope installation, airtightness strategy, and energy-compliance documentation before drywall and interior closeout.',
    items: STRUCTURAL_STAGE_12_CONTAINERS,
  },
  {
    stageNumber: 13,
    stageName: 'Interior Completion',
    summary: 'Verify interior wall systems, finish trim, and accessibility details are complete enough for final site and occupancy readiness.',
    items: STRUCTURAL_STAGE_13_CONTAINERS,
  },
  {
    stageNumber: 14,
    stageName: 'Exterior Works and Site Finalization',
    summary: 'Confirm grading, access, landscape restoration, and environmental site-closeout conditions are complete before final approval.',
    items: STRUCTURAL_STAGE_14_CONTAINERS,
  },
  {
    stageNumber: 15,
    stageName: 'Inspections, Final Approval, and Occupancy',
    summary: 'Close out inspection records, confirm final approvals, and complete the occupancy gate before the final seal is relied upon.',
    items: STRUCTURAL_STAGE_15_CONTAINERS,
  },
]

function normalize(value?: string): string {
  return (value ?? '').trim().toLowerCase()
}

const BC_MUNICIPALITY_HINTS = [
  'abbotsford',
  'burnaby',
  'chilliwack',
  'coquitlam',
  'delta',
  'kamloops',
  'kelowna',
  'langley',
  'maple ridge',
  'nanaimo',
  'new westminster',
  'north vancouver',
  'port moody',
  'prince george',
  'richmond',
  'surrey',
  'victoria',
  'west vancouver',
  'vancouver',
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function titleCaseMunicipality(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part)
    .join(' ')
}

function isProvinceOnlySegment(value: string): boolean {
  return /^(b\.?c\.?|british columbia)$/i.test(value.trim())
}

function cleanMunicipalityCandidate(value?: string): string | null {
  const parts = (value ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  const candidate = parts.find(part => !isProvinceOnlySegment(part))
  if (!candidate) return null

  const withoutProvince = candidate
    .replace(/^city\s+of\s+/i, '')
    .replace(/\s+(bc|b\.c\.|british columbia)$/i, '')
    .trim()

  if (!withoutProvince || isProvinceOnlySegment(withoutProvince)) return null
  return titleCaseMunicipality(withoutProvince)
}

function inferBcMunicipality(context: CompletionProjectContext): string | null {
  const blob = [context.city, context.address, context.region]
    .map(value => normalize(value))
    .filter(Boolean)
    .join(' ')

  const knownMunicipality = BC_MUNICIPALITY_HINTS.find(municipality => {
    const escaped = municipality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(blob)
  })

  if (knownMunicipality) return titleCaseMunicipality(knownMunicipality)
  return cleanMunicipalityCandidate(context.city)
}

function createItemCode(stageNumber: number, index: number): string {
  return `S${String(stageNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
}

function isStructuredItemDefinition(
  item: RawStageDefinition['items'][number]
): item is StructuredStageItemDefinition {
  return typeof item !== 'string'
}

function overlaySignals(context: CompletionProjectContext): string[] {
  return [
    normalize(context.city),
    normalize(context.address),
    normalize(context.projectType),
    normalize(context.notes),
    normalize(context.region),
  ].filter(Boolean)
}

export function inferAhjOverlay(context: CompletionProjectContext): AhjOverlayContext {
  const signals = overlaySignals(context)
  const blob = signals.join(' ')

  if (/(first nation|band office|land office|on-reserve|reserve|musqueam|squamish|tsleil-waututh|sechelt|nisga'a)/i.test(blob)) {
    return {
      type: 'first_nation',
      label: 'First Nation Land Office Overlay',
      jurisdictionName: context.city?.trim() || 'First Nation Land Office',
      signals,
      summary: 'Land office, lease, land code, and community-specific servicing checks take precedence alongside the provincial base.',
    }
  }

  const municipalityName = inferBcMunicipality(context)
  if (municipalityName?.toLowerCase() === 'vancouver') {
    return {
      type: 'vancouver',
      label: 'Vancouver By-law Overlay',
      jurisdictionName: 'City of Vancouver',
      signals: ['cov_detected', ...signals],
      summary: 'Vancouver-specific by-law, frontage, and permit routing checks are surfaced in addition to the BC base checklist.',
    }
  }

  const hasMunicipalSignal = Boolean(municipalityName || context.city?.trim() || context.region?.trim())
  const jurisdictionName = municipalityName
    ? `City of ${municipalityName}`
    : 'Municipal AHJ'

  return {
    type: hasMunicipalSignal ? 'municipal' : 'province_base',
    label: municipalityName
      ? `City of ${municipalityName} AHJ Overlay`
      : hasMunicipalSignal ? 'Municipal AHJ Overlay' : 'Province-Wide Base',
    jurisdictionName,
    signals,
    summary: hasMunicipalSignal
      ? 'British Columbia Building Code 2024 base checklist with municipal servicing, tree, frontage, and occupancy expectations layered on.'
      : 'Only the province-wide base checklist is currently inferred from the available project data.',
  }
}

function inferPermitType(stageName: string, itemLabel: string): string {
  const text = `${stageName} ${itemLabel}`.toLowerCase()
  if (text.includes('plumbing')) return 'plumbing'
  if (text.includes('electrical') || text.includes('meter') || text.includes('panel')) return 'electrical'
  if (text.includes('gas')) return 'gas'
  if (text.includes('hvac') || text.includes('ventilation') || text.includes('heat pump') || text.includes('mechanical')) return 'mechanical_hvac'
  if (text.includes('tree')) return 'trees'
  if (text.includes('driveway') || text.includes('road use') || text.includes('lane closure') || text.includes('frontage')) return 'street_use'
  if (text.includes('demolition')) return 'demolition'
  if (text.includes('occupancy') || text.includes('final acceptance')) return 'occupancy'
  if (text.includes('zoning') || text.includes('rezoning') || text.includes('variance') || text.includes('dp')) return 'zoning'
  if (text.includes('energy') || text.includes('step code')) return 'energy_compliance'
  return 'building'
}

function inferResponsibleParty(stageNumber: number, permitType: string, itemLabel: string): CompletionResponsibleParty {
  const text = itemLabel.toLowerCase()
  if (stageNumber === 15 || text.includes('approval') || text.includes('occupancy')) return 'AHJ'
  if (text.includes('inspection') || text.includes('tracking')) return 'Inspector'
  if (permitType === 'electrical' || permitType === 'plumbing' || permitType === 'gas' || permitType === 'mechanical_hvac') return 'Inspector'
  if (text.includes('professional assurance')) return 'Auditor'
  return 'Builder'
}

function inferDocumentRequirement(stageNumber: number, itemLabel: string): boolean {
  const text = itemLabel.toLowerCase()
  if (stageNumber >= 3) return true
  return /(survey|approval|permit|inspection|tracking|design|drawings|model|forms|sign-off|acceptance|declaration|testing)/i.test(text)
}

function inferRequiredLogic(stageNumber: number, itemLabel: string, overlay: AhjOverlayContext): CompletionRequiredLogic {
  const text = itemLabel.toLowerCase()
  if (text.includes('if applicable')) return 'Conditional: required when the project scope triggers this permit or approval.'
  if (text.includes('separate trade permits')) return 'Conditional: required when project scope includes regulated plumbing, electrical, gas, or HVAC work.'
  if (text.includes('registered professionals')) return 'Conditional: required when Part 3, engineered, or assurance-based scope applies.'
  if (text.includes('driveway') || text.includes('boulevard') || text.includes('frontage works')) {
    return overlay.type === 'province_base'
      ? 'Conditional: required when municipal frontage or access work is part of the scope.'
      : true
  }
  if (overlay.type === 'first_nation' && text.includes('civic address')) {
    return 'Conditional: use community civic addressing or lot identification if a municipal civic address is not assigned.'
  }
  return true
}

function buildDependencies(stage: RawStageDefinition, index: number): string[] {
  const deps: string[] = []
  if (index > 0) deps.push(createItemCode(stage.stageNumber, index - 1))
  return deps
}

function defaultItemPurpose(stageName: string, itemLabel: string): string {
  return `Confirm ${itemLabel.toLowerCase()} is resolved before ${stageName.toLowerCase()} can proceed.`
}

function defaultNotesGuidance(itemLabel: string): string {
  return `Record what was reviewed for ${itemLabel.toLowerCase()}, what was confirmed, and any discrepancy, deficiency, or follow-up needed.`
}

function defaultWhatToCheck(itemLabel: string): string[] {
  return [
    `Verify the current project record supports ${itemLabel.toLowerCase()}.`,
    'Confirm there is no unresolved discrepancy that would block the next inspection step.',
  ]
}

function defaultDecisionGuide(itemLabel: string): {
  passWhen: string[]
  failWhen: string[]
  pendingWhen: string[]
} {
  return {
    passWhen: [`The record supports ${itemLabel.toLowerCase()} with no material discrepancy.`],
    failWhen: [`A material discrepancy, omission, or conflict prevents ${itemLabel.toLowerCase()} from being accepted.`],
    pendingWhen: [`Additional clarification or documentation is needed before ${itemLabel.toLowerCase()} can be resolved.`],
  }
}

function defaultRequiredEvidence(documentUploadRequired: boolean, itemLabel: string): string[] {
  if (!documentUploadRequired) return []
  return [`At least one supporting document or evidence file for ${itemLabel.toLowerCase()}.`]
}

function defaultOptionalEvidence(): string[] {
  return ['Supplemental notes or supporting documents when they help explain the decision.']
}

function buildAhjNotes(stage: RawStageDefinition, itemLabel: string, overlay: AhjOverlayContext): string {
  const common = overlay.summary
  if (overlay.type === 'vancouver') {
    if (/occupancy|code path|accessibility|sprinkler|firefighting access/i.test(itemLabel)) {
      return `${common} Verify Vancouver-specific permit routing and by-law expectations before closing this item.`
    }
    return `${common} Capture Vancouver-specific comments, reviewers, or permit numbers here when they differ from the provincial base.`
  }

  if (overlay.type === 'first_nation') {
    if (/address|jurisdiction|approval|acceptance|servicing/i.test(itemLabel)) {
      return `${common} Record the land office reviewer, resolution, or lease reference that governs this item.`
    }
    return `${common} Note any community-specific standards, land code references, or servicing exceptions here.`
  }

  if (overlay.type === 'municipal') {
    if (/tree|frontage|driveway|road use|servicing/i.test(itemLabel)) {
      return `${common} Capture the municipality-specific permit number, reviewer note, or engineering requirement here.`
    }
    return `${common} Record local AHJ comments or deviations from the BC base checklist here.`
  }

  return 'Province-wide base requirement. Add AHJ comments here only when a local reviewer introduces extra conditions.'
}

export function buildCompletionChecklist(context: CompletionProjectContext): {
  overlay: AhjOverlayContext
  stages: CompletionChecklistStageDefinition[]
} {
  const overlay = inferAhjOverlay(context)

  const stages = RAW_STAGES.map(stage => ({
    stage_number: stage.stageNumber,
    stage_name: stage.stageName,
    summary: stage.summary,
    items: stage.items.map((itemDefinition, index) => {
      const itemLabel = isStructuredItemDefinition(itemDefinition) ? itemDefinition.label : itemDefinition
      const permitType = isStructuredItemDefinition(itemDefinition) && itemDefinition.permitType
        ? itemDefinition.permitType
        : inferPermitType(stage.stageName, itemLabel)
      const documentUploadRequired = isStructuredItemDefinition(itemDefinition) && itemDefinition.documentUploadRequired !== undefined
        ? itemDefinition.documentUploadRequired
        : inferDocumentRequirement(stage.stageNumber, itemLabel)
      const defaults = defaultDecisionGuide(itemLabel)
      return {
        item_code: isStructuredItemDefinition(itemDefinition) && itemDefinition.code
          ? itemDefinition.code
          : createItemCode(stage.stageNumber, index),
        stage_number: stage.stageNumber,
        stage_name: stage.stageName,
        item_label: itemLabel,
        ui_schema: isStructuredItemDefinition(itemDefinition) && itemDefinition.uiSchema
          ? itemDefinition.uiSchema
          : stage.stageNumber === 1
            ? 'field_view'
            : 'standard',
        item_purpose: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.purpose
          : defaultItemPurpose(stage.stageName, itemLabel),
        field_view_details: isStructuredItemDefinition(itemDefinition)
          ? (itemDefinition.fieldViewDetails ?? itemDefinition.viewDetails)
          : undefined,
        view_details: isStructuredItemDefinition(itemDefinition)
          ? (itemDefinition.viewDetails ?? itemDefinition.fieldViewDetails)
          : undefined,
        stop_if: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.stopIf
          : undefined,
        field_checklist: isStructuredItemDefinition(itemDefinition)
          ? (itemDefinition.fieldChecklist ?? itemDefinition.whatToCheck)
          : defaultWhatToCheck(itemLabel),
        inspector_notes_guidance: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.notesGuidance
          : defaultNotesGuidance(itemLabel),
        what_to_check: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.whatToCheck
          : defaultWhatToCheck(itemLabel),
        pass_when: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.passWhen
          : defaults.passWhen,
        fail_when: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.failWhen
          : defaults.failWhen,
        pending_when: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.pendingWhen
          : defaults.pendingWhen,
        required_evidence: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.requiredEvidence
          : defaultRequiredEvidence(documentUploadRequired, itemLabel),
        optional_evidence: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.optionalEvidence
          : defaultOptionalEvidence(),
        evidence_mode: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.evidenceMode
          : (documentUploadRequired ? 'required_upload' : 'verify_existing'),
        is_required: isStructuredItemDefinition(itemDefinition) && itemDefinition.requiredLogic !== undefined
          ? itemDefinition.requiredLogic
          : inferRequiredLogic(stage.stageNumber, itemLabel, overlay),
        permit_type: permitType,
        responsible_party: isStructuredItemDefinition(itemDefinition) && itemDefinition.responsibleParty
          ? itemDefinition.responsibleParty
          : inferResponsibleParty(stage.stageNumber, permitType, itemLabel),
        document_upload_required: documentUploadRequired,
        inspection_status: 'Pending',
        ahj_notes: isStructuredItemDefinition(itemDefinition) && itemDefinition.ahjNotes
          ? itemDefinition.ahjNotes
          : buildAhjNotes(stage, itemLabel, overlay),
        dependencies: isStructuredItemDefinition(itemDefinition) && itemDefinition.dependencies
          ? itemDefinition.dependencies
          : buildDependencies(stage, index),
        code_references: isStructuredItemDefinition(itemDefinition)
          ? itemDefinition.codeReferences
          : undefined,
      } satisfies CompletionChecklistItemDefinition
    }),
  }))

  return { overlay, stages }
}

export function regionFromCity(city?: string): Region | undefined {
  const value = normalize(city)
  if (value.includes('vancouver')) return 'vancouver'
  if (value.includes('burnaby')) return 'burnaby'
  if (value.includes('surrey')) return 'surrey'
  if (value.includes('coquitlam')) return 'coquitlam'
  if (value.includes('richmond')) return 'richmond'
  return undefined
}

export function checklistSlug(stageName: string, itemLabel: string): string {
  return `${slugify(stageName)}-${slugify(itemLabel)}`
}
