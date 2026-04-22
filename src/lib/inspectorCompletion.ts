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
    purpose: 'Confirm the inspection is tied to the correct property, permit file, and legal parcel before any downstream structural review proceeds.',
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
    ahjNotes: 'Capture any jurisdiction-specific naming differences, civic addressing conventions, legal parcel references, or authority-imposed project identifiers.',
  },
  {
    code: 'S01-02',
    label: 'Governing Authority, Code Path, and Jurisdiction Overlay',
    purpose: 'Confirm the governing authority, permit issuing body, code path, code edition, and jurisdiction overlay before field execution begins.',
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
    ahjNotes: 'Use this container to capture municipality-specific, regional district, or First Nation authority conditions that materially affect the structural inspection path.',
    dependencies: ['S01-01'],
  },
  {
    code: 'S01-03',
    label: 'Project Type, Building Type, and Structural Scope Classification',
    purpose: 'Confirm the project type, building type, occupancy context, and structural review scope so the correct downstream checklist path is used.',
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
    ahjNotes: 'Note any local trigger thresholds or permit-family distinctions that affect whether this project falls into structural review.',
    dependencies: ['S01-02'],
  },
  {
    code: 'S01-04',
    label: 'Site Record, Drawings, and Revision Package Readiness',
    purpose: 'Confirm the base site record, structural drawing package, and revision context are current, identifiable, and sufficient for the first field inspection stage.',
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
    ahjNotes: 'Capture any municipality-specific setback, frontage, lane, easement, siting, stamped-set, or revision-tracking requirement that affects structural readiness.',
    dependencies: ['S01-03'],
  },
  {
    code: 'S01-05',
    label: 'Registered Professional and Permit Coordination Flags',
    purpose: 'Determine whether registered professional involvement and related permit coordination are required so the structural pathway is not assessed in isolation where coordination is necessary.',
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
    ahjNotes: 'Capture local triggers that elevate the project into registered professional, assurance-letter, or coordinated trade-permit territory.',
    dependencies: ['S01-04'],
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
  },
]

const STRUCTURAL_STAGE_4_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S04-01',
    label: 'Demolition and Protection',
    uiSchema: 'field_view',
    purpose: 'Confirm pre-excavation protection, demolition status, and site-clearing readiness before ground disturbance begins.',
    viewDetails: 'Verify the site is ready for disturbance from a protection and demolition standpoint. Confirm underground utility identification, installed tree barriers or arborist controls, demolition completion where applicable, and overall site clearing/removal readiness before excavation proceeds.',
    stopIf: [
      'Utilities are unlocated, tree protection is absent, or demolition status is not verified.',
    ],
    fieldChecklist: [
      'Underground services identified prior to excavation? (Evidence: Text)',
      'Tree barriers and arborist protection installed? (Camera or Video Evidence Required)',
      'Demolition completion verified?',
      'Site clearing and removals complete?',
    ],
    notesGuidance: 'Record utility-locate confirmation, tree-protection conditions, demolition status, and any unresolved clearing or protection deficiency visible before excavation.',
    whatToCheck: [
      'Underground services have been identified before excavation begins.',
      'Tree barriers and arborist protection measures are installed where required.',
      'Demolition work has been completed and verified where applicable.',
      'Site clearing and removals are complete enough for the next inspection hold point.',
      'No destructive work is proceeding against unknown utilities, protected trees, or incomplete demolition conditions.',
    ],
    passWhen: [
      'Protection, demolition, and clearing conditions are in place and observable for the current stage.',
      'The site can move into excavation without an unresolved pre-disturbance control deficiency.',
    ],
    failWhen: [
      'Underground services are unconfirmed or visibly not protected against disturbance.',
      'Required tree barriers or arborist protections are missing or inadequate.',
      'Demolition completion has not been verified where demolition is part of the scope.',
      'Site clearing remains incomplete in a way that blocks safe progression to excavation.',
    ],
    pendingWhen: [
      'Protection measures are being installed and require a re-check before disturbance begins.',
      'Demolition or clearing verification is still in progress and expected shortly.',
    ],
    requiredEvidence: [
      'Inspector-captured field evidence showing utility-locate confirmation and installed protection measures.',
    ],
    optionalEvidence: [
      'Site overview notes.',
      'Supplemental photos documenting demolition completion or clearing limits.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local utility-locate, demolition sign-off, arborist, or pre-disturbance protection conditions that must be visible before excavation begins.',
    dependencies: ['S03-03'],
  },
  {
    code: 'S04-02',
    label: 'Earthworks and Safety Controls',
    uiSchema: 'field_view',
    purpose: 'Confirm earthworks controls and site-safety measures are established before excavation and grading activity proceeds.',
    viewDetails: 'Verify erosion and sediment control, excavation layout, rough grading, shoring or slope protection, and temporary construction access and safety controls are in place before the site enters active earthworks.',
    stopIf: [
      'Underground services are unidentified, or erosion/shoring controls are failing.',
    ],
    fieldChecklist: [
      'Erosion and sediment control securely in place? (Camera or Video Evidence Required)',
      'Excavation layout and rough site grading marked?',
      'Shoring and slope protection installed (if required)?',
      'Temporary construction access and safety controls established?',
    ],
    notesGuidance: 'Record observed erosion controls, excavation layout readiness, shoring conditions, temporary access arrangements, and any visible safety deficiency prior to earthworks.',
    whatToCheck: [
      'Erosion and sediment control measures are installed and visibly functioning.',
      'Excavation layout and rough grading are marked sufficiently for the intended work.',
      'Shoring or slope protection is installed where the excavation condition requires it.',
      'Temporary construction access and safety controls are established and usable for the active site condition.',
      'No visible earthworks-control failure exists that would make excavation unsafe or non-compliant.',
    ],
    passWhen: [
      'Earthworks controls, excavation layout, and temporary safety arrangements are in place for the presented stage.',
      'The site can proceed into excavation without an unresolved control failure.',
    ],
    failWhen: [
      'Erosion and sediment control is missing, failing, or visibly ineffective.',
      'Required shoring or slope protection is absent, inadequate, or not yet installed.',
      'Excavation layout or temporary access controls are not established enough for safe progression.',
    ],
    pendingWhen: [
      'Controls are partially installed and require a return visit before excavation starts.',
      'Shoring, grading, or access arrangements are still being finalized.',
    ],
    requiredEvidence: [
      'Inspector-captured field evidence showing erosion controls, layout condition, and shoring or safety measures.',
    ],
    optionalEvidence: [
      'Supplemental overview photos.',
      'Site safety notes.',
      'Contractor staging clarifications.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: shoring and slope-protection checks are required where the excavation condition triggers them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local erosion-control, shoring, grading, or temporary-access requirements that must be satisfied before earthworks proceed.',
    dependencies: ['S04-01'],
  },
]

const STRUCTURAL_STAGE_5_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S05-01',
    label: 'Footings and Foundation Walls',
    uiSchema: 'field_view',
    purpose: 'Confirm footing and foundation-wall work is complete and presented at the correct structural hold points before concrete proceeds or is accepted.',
    viewDetails: 'Validate footing and foundation-wall readiness at the relevant inspection hold points. Confirm excavation, forms, rebar, wall formwork, and the status of both footing and foundation-wall inspections before structural work advances beyond reviewable stages.',
    stopIf: [
      'Rebar is undersized or missing, or footing/foundation inspections cannot be verified at the presented hold point.',
    ],
    fieldChecklist: [
      'Footing excavation, forms, and rebar complete? (Camera or Video Evidence Required)',
      'Footing inspection passed?',
      'Foundation wall forms and rebar complete? (Camera or Video Evidence Required)',
      'Foundation wall inspection passed?',
    ],
    notesGuidance: 'Record which footing or foundation-wall hold point was presented, what formwork or rebar conditions were observed, and any inspection-status issue blocking progression.',
    whatToCheck: [
      'Footing excavation, forms, and reinforcing steel are complete enough for the intended hold point.',
      'The footing inspection status has been confirmed before progression.',
      'Foundation wall forms and reinforcing steel are complete enough for review where wall work is presented.',
      'The foundation wall inspection status has been confirmed before progression beyond the hold point.',
      'No structural work has bypassed a required footing or wall inspection gate.',
    ],
    passWhen: [
      'Footing and foundation-wall structural readiness is confirmed for the presented stage.',
      'Required hold-point inspections have passed or are documented as completed for the work shown.',
    ],
    failWhen: [
      'Required reinforcing steel is missing, undersized, unsupported, or materially inconsistent with the design intent.',
      'A footing or foundation-wall inspection hold point has not passed but the work is proceeding.',
      'Formwork or wall preparation is materially incomplete for the stage being presented.',
    ],
    pendingWhen: [
      'The site is near readiness but still awaiting final rebar, form, or wall preparation.',
      'Inspection status documentation is expected but not yet confirmed in the record.',
    ],
    requiredEvidence: [
      'Inspector-captured photos showing footing and wall formwork, rebar, and hold-point condition.',
    ],
    optionalEvidence: [
      'Supplemental structural notes.',
      'Overview photos documenting staging or sequence conditions.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local footing, foundation-wall, or inspection hold-point expectations that govern whether concrete work may proceed.',
    dependencies: ['S04-02'],
  },
  {
    code: 'S05-02',
    label: 'Drainage and Protection',
    uiSchema: 'field_view',
    purpose: 'Confirm foundation drainage and moisture-protection systems are complete before concealment or backfill.',
    viewDetails: 'Validate the below-grade protection layer, including damp-proofing or waterproofing, drainage board, perimeter drain or drain tile, foundation drainage connection, and the point at which backfill and granular base become acceptable. This sub-container protects against premature concealment of critical drainage work.',
    stopIf: [
      'Drainage or waterproofing is incomplete, damaged, or concealed before review.',
    ],
    fieldChecklist: [
      'Damp-proofing/waterproofing and drainage board installed?',
      'Perimeter drain/drain tile and foundation drainage connection complete? (Camera or Video Evidence Required)',
      'Backfill approval granted and granular base installed?',
    ],
    notesGuidance: 'Record the observed drainage and waterproofing condition, whether the perimeter drainage system is complete, and whether backfill was appropriate for the reviewed state.',
    whatToCheck: [
      'Damp-proofing, waterproofing, and drainage board are installed where required.',
      'Perimeter drain or drain tile and foundation drainage connections are complete and reviewable.',
      'Backfill approval has been granted only after the underlying protection and drainage work reached an acceptable state.',
      'Granular base is installed where the current stage requires it.',
      'Critical below-grade protection work has not been concealed before review.',
    ],
    passWhen: [
      'Drainage and protection systems are complete enough for the current hold point.',
      'Backfill or granular-base progression is appropriate for the verified condition.',
    ],
    failWhen: [
      'Waterproofing, damp-proofing, drainage board, or perimeter drainage is incomplete or compromised.',
      'Backfill has proceeded before drainage or protection systems were accepted.',
      'Foundation drainage connections are missing, incomplete, or not reviewable.',
    ],
    pendingWhen: [
      'Drainage or protection installation is underway but not yet complete enough for final confirmation.',
      'Backfill approval depends on a final correction or follow-up observation.',
    ],
    requiredEvidence: [
      'Inspector-captured photos showing drainage protection and perimeter drainage condition before concealment.',
    ],
    optionalEvidence: [
      'Supplemental site notes.',
      'Installer clarifications.',
      'Overview photos documenting concealed-area risk.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local below-grade drainage, waterproofing, or backfill hold-point conditions that must be met before concealment.',
    dependencies: ['S05-01'],
  },
  {
    code: 'S05-03',
    label: 'Slab Preparation',
    uiSchema: 'field_view',
    purpose: 'Confirm slab-support and embed conditions are complete before slab placement or concealment proceeds.',
    viewDetails: 'Validate under-slab continuity and embed readiness, including poly and vapour barrier continuity, soil gas and radon rough-in, slab reinforcement, slab-on-grade preparation or placement, and the positioning of anchor bolts and hold-down embeds. This sub-container confirms the slab package is structurally and environmentally reviewable before concealment.',
    stopIf: [
      'Rebar is undersized/missing, or drainage/waterproofing is compromised before backfill.',
    ],
    fieldChecklist: [
      'Under-slab poly and vapour barrier continuous?',
      'Soil gas and radon rough-in complete? (Camera or Video Evidence Required)',
      'Slab reinforcement in place and slab-on-grade poured?',
      'Anchor bolts and hold-down embeds correctly positioned? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record slab-preparation conditions, continuity of under-slab barriers, soil-gas/radon readiness, reinforcement status, and embed positioning issues affecting the structural or environmental hold point.',
    whatToCheck: [
      'Under-slab poly and vapour barrier continuity is confirmed for the presented area.',
      'Soil gas and radon rough-in is complete where required by scope or code path.',
      'Slab reinforcement is in place and coordinated with the intended slab-on-grade stage.',
      'Anchor bolts and hold-down embeds are correctly positioned for the approved design intent.',
      'No slab-support or embed condition remains that would make the pour or concealment indefensible.',
    ],
    passWhen: [
      'The slab preparation package is complete and reviewable for the presented stage.',
      'Barrier continuity, rough-ins, reinforcement, and embeds are all acceptable for progression.',
    ],
    failWhen: [
      'Under-slab barrier continuity is visibly broken or incomplete.',
      'Required soil gas or radon rough-in is missing or materially incomplete.',
      'Slab reinforcement is missing, insufficient, or not coordinated with the design intent.',
      'Anchor bolts or hold-down embeds are misplaced or missing where required.',
    ],
    pendingWhen: [
      'The slab area is partially prepared and requires a return inspection before final acceptance.',
      'Embed positioning or rough-in completion is expected to be resolved with minor corrective work.',
    ],
    requiredEvidence: [
      'Inspector-captured photos showing radon rough-in, reinforcement, and embed positioning before concealment.',
    ],
    optionalEvidence: [
      'Supplemental slab layout notes.',
      'Overview photos documenting staged preparation conditions.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: soil gas and radon rough-in are required where the project scope or code path triggers them.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local slab, vapour barrier, radon, or embed hold-point expectations that affect whether the slab stage may proceed.',
    dependencies: ['S05-02'],
  },
]

const STRUCTURAL_STAGE_6_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S06-01',
    label: 'Vertical and Horizontal Framing',
    uiSchema: 'field_view',
    purpose: 'Confirm the primary structural skeleton is complete, stable, and aligned with the approved design before concealment proceeds.',
    viewDetails: 'Confirm the core structural skeleton is complete, plumb, and permanently braced. Validate bearing walls, columns, beams, floor framing, and roof framing against the structural design basis before the framing package is concealed or advanced.',
    stopIf: [
      'Primary structural members are altered, missing, or unsupported without engineer approval.',
    ],
    fieldChecklist: [
      'Bearing walls, columns, and beams match structural design? (Camera or Video Evidence Required)',
      'Floor and roof framing (joists, trusses) correctly sized, spaced, and secured? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record which framing zones were observed, what structural members were verified, and any deviation in member sizing, support, alignment, or bracing.',
    whatToCheck: [
      'Bearing walls, columns, and beams align with the structural design intent.',
      'Primary load paths are continuous and permanently supported.',
      'Floor and roof framing members are correctly sized, spaced, and secured for the presented stage.',
      'The framing package is plumb, braced, and stable enough for the hold point being reviewed.',
    ],
    passWhen: [
      'The core structural skeleton matches the approved framing intent for the presented area.',
      'Primary members are installed, supported, and braced without a material structural discrepancy.',
    ],
    failWhen: [
      'A primary framing member is missing, altered, undersized, or unsupported.',
      'Observed framing conditions deviate materially from the structural design without approved engineering direction.',
      'The structure is not adequately braced or stabilized for the stage being presented.',
    ],
    pendingWhen: [
      'The framing package is close to readiness but still awaiting final bracing, support, or installation in the reviewed area.',
      'Supporting structural clarification is expected before a final framing decision can be made.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing primary framing members, supports, and overall structural alignment.',
    ],
    optionalEvidence: [
      'Supplemental framing notes.',
      'Overview photos documenting sequencing or access constraints.',
      'Engineer clarification records where a deviation is being resolved.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local framing hold-point requirements, engineered framing conditions, or municipal expectations affecting structural acceptance before concealment.',
    dependencies: ['S05-03'],
  },
  {
    code: 'S06-02',
    label: 'Lateral and Seismic Systems',
    uiSchema: 'field_view',
    purpose: 'Confirm the lateral-force-resisting and seismic restraint systems are installed in accordance with the structural schedule before concealment.',
    viewDetails: 'Validate the lateral system, including shear walls, nailing schedules, hold-downs, tie-downs, and seismic restraint elements. This sub-container ensures the structure can resist lateral and seismic demands before the framing package is concealed.',
    stopIf: [
      'Shear wall nailing patterns are incorrect or hold-down hardware is missing/loose.',
    ],
    fieldChecklist: [
      'Shear walls and lateral system installed per schedule? (Camera or Video Evidence Required)',
      'Hold-downs, tie-downs, and seismic restraint elements securely fastened? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record which shear walls or restraint elements were reviewed, what fastening or hardware conditions were observed, and any missing lateral-system component.',
    whatToCheck: [
      'Shear walls are located and configured per the governing schedule or design intent.',
      'Observed fastening patterns are consistent with the required lateral-system details.',
      'Hold-downs, tie-downs, and seismic restraint elements are installed and securely fastened.',
      'No critical lateral or seismic hardware omission remains in the reviewed area.',
    ],
    passWhen: [
      'The lateral system and seismic restraint hardware are installed and reviewable for the presented stage.',
      'No material nailing, fastening, or hardware deficiency remains before concealment.',
    ],
    failWhen: [
      'Shear walls are incomplete, mislocated, or fastened inconsistently with the required schedule.',
      'Hold-downs, tie-downs, or seismic restraint elements are missing, loose, or inadequately installed.',
      'The observed lateral system would not support a defensible structural review.',
    ],
    pendingWhen: [
      'The lateral system is partially installed and requires a follow-up inspection before concealment.',
      'Fastening or hardware documentation is expected to clarify the reviewed condition.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing shear walls, fastening patterns, and installed lateral or seismic hardware.',
    ],
    optionalEvidence: [
      'Supplemental close-up photos of hardware.',
      'Engineer or supplier detail references.',
      'Field notes documenting corrective items.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local lateral-system, seismic-restraint, or hardware inspection expectations that affect approval before concealment.',
    dependencies: ['S06-01'],
  },
  {
    code: 'S06-03',
    label: 'Stairs, Decks, and Engineering',
    uiSchema: 'field_view',
    purpose: 'Confirm secondary structural framing and specialty engineering requirements are addressed before concealment or downstream finishing.',
    viewDetails: 'Ensure all secondary structural elements and specialty engineering components are approved before concealment. Verify stair framing, headroom clearance, deck and balcony framing and ledger connections, and the presence of Part 4 engineering documentation where the project exceeds Part 9 limits.',
    stopIf: [
      'Secondary structural framing is unsafe, or required Part 4 engineering documentation is missing for scope beyond Part 9 limits.',
    ],
    fieldChecklist: [
      'Stairs framing and headroom clearances verified?',
      'Deck and balcony structural framing, ledgers, and connections secure? (Camera or Video Evidence Required)',
      "Verify Part 4 engineering reports. (If project is within Part 9 limits, mark as 'Pass' or 'N/A').",
    ],
    notesGuidance: 'Record observed stair or deck framing conditions, any connection or clearance issue, and whether specialty engineering documentation applies to the project scope.',
    whatToCheck: [
      'Stair framing geometry and headroom clearances are acceptable for the presented stage.',
      'Deck and balcony framing, ledgers, and structural connections are secure and reviewable.',
      'Projects exceeding Part 9 limits include the required Part 4 engineering reports or supporting documents.',
      'No specialty structural element remains unverified before concealment.',
    ],
    passWhen: [
      'Secondary framing elements are installed and reviewable without a material structural concern.',
      'Required engineering documentation is present wherever the scope exceeds prescriptive limits.',
    ],
    failWhen: [
      'Stair or deck framing shows a material structural or clearance deficiency.',
      'Critical ledger or connection detailing is insecure or inconsistent with the structural intent.',
      'Part 4 engineering documentation is required for the scope but absent or materially incomplete.',
    ],
    pendingWhen: [
      'Secondary framing is still being completed and needs a return inspection.',
      'Specialty engineering documentation is expected but not yet fully uploaded.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing deck, balcony, or other secondary structural framing conditions.',
    ],
    optionalEvidence: [
      'Part 4 engineering reports already on file.',
      'Supplemental stair measurements or notes.',
      'Connection detail references.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    requiredLogic: 'Conditional: Part 4 engineering documentation is required when the project exceeds Part 9 limits or includes engineered specialty structural elements.',
    documentUploadRequired: true,
    ahjNotes: 'Capture local stair, deck, balcony, or engineered-structure requirements that govern acceptance before the framing package is concealed.',
    dependencies: ['S06-02'],
  },
]

const STRUCTURAL_STAGE_7_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S07-01',
    label: 'Sheathing and Weather Barrier',
    uiSchema: 'field_view',
    purpose: 'Confirm the base enclosure layers are installed continuously and correctly before cladding integration proceeds.',
    viewDetails: 'Validate the initial enclosure package, including wall and roof sheathing, weather-resistive barrier continuity, air-barrier integration, and rainscreen cavity preparation. This sub-container confirms the building has a defensible base water and air control layer before exterior finish systems advance.',
    stopIf: [
      'WRB is torn, improperly lapped, or missing at critical junctions.',
    ],
    fieldChecklist: [
      'Wall and roof sheathing correctly fastened?',
      'Weather-resistive barrier (WRB) and air barrier installed, lapped correctly, and continuous? (Camera or Video Evidence Required)',
      'Rainscreen assembly (strapping/cavity) properly established?',
    ],
    notesGuidance: 'Record observed sheathing, WRB, and rainscreen conditions, including continuity issues, missing laps, tears, or fastening deficiencies.',
    whatToCheck: [
      'Wall and roof sheathing is installed and fastened consistently for the presented area.',
      'The WRB and air barrier are lapped, integrated, and continuous at observable joints.',
      'The rainscreen assembly or cavity setup is established where the enclosure system requires it.',
      'No critical enclosure-control layer is missing or visibly compromised before cladding integration.',
    ],
    passWhen: [
      'The sheathing and weather-barrier package is complete enough for the reviewed stage.',
      'Observed water and air control layers are continuous and suitable for downstream integration.',
    ],
    failWhen: [
      'Sheathing fastening is materially deficient or incomplete.',
      'The WRB or air barrier is torn, missing, reverse-lapped, or discontinuous at a critical junction.',
      'The rainscreen cavity or strapping setup is absent where required by the assembly.',
    ],
    pendingWhen: [
      'The enclosure base layer is partially installed and requires a return inspection before cladding proceeds.',
      'Localized corrections or continuity repairs are expected before final acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing sheathing, WRB continuity, and rainscreen setup.',
    ],
    optionalEvidence: [
      'Supplemental close-up photos of lap conditions.',
      'Installer notes.',
      'Manufacturer detail references for the reviewed assembly.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local enclosure, WRB, air-barrier, or rainscreen expectations that must be satisfied before cladding or concealment proceeds.',
    dependencies: ['S06-03'],
  },
  {
    code: 'S07-02',
    label: 'Penetrations and Cladding Integration',
    uiSchema: 'field_view',
    purpose: 'Confirm penetrations, openings, and cladding-support systems are integrated correctly with the enclosure control layers.',
    viewDetails: 'Ensure the building is made watertight and the rainscreen system is ready for exterior cladding. Validate window and door installation, flashing integration at heads, jambs, and sills, and the readiness of cladding support and attachment systems.',
    stopIf: [
      'Reverse-flashing at windows, doors, or exterior penetrations.',
    ],
    fieldChecklist: [
      'Windows and exterior doors installed and plumb?',
      'Head, jamb, and sill flashing integrated with WRB? (Camera or Video Evidence Required)',
      'Cladding support and attachment systems secure? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record observed window, door, flashing, and cladding-support conditions, including any reverse laps, missing integration, or insecure support system.',
    whatToCheck: [
      'Windows and exterior doors are installed plumb and in a reviewable condition.',
      'Head, jamb, and sill flashing is integrated with the WRB in the correct drainage sequence.',
      'Cladding support and attachment systems are secure and ready to receive the exterior finish.',
      'No penetration or opening detail undermines enclosure watertightness in the reviewed area.',
    ],
    passWhen: [
      'Openings, flashing transitions, and cladding supports are integrated correctly for the presented stage.',
      'The enclosure is ready to move into the next exterior-cladding step without a critical water-management defect.',
    ],
    failWhen: [
      'Windows or doors are materially out of plumb or incompletely integrated with the enclosure.',
      'Flashing is missing, reverse-lapped, or not integrated into the WRB drainage sequence.',
      'Cladding support or attachment systems are insecure or incomplete for the reviewed area.',
    ],
    pendingWhen: [
      'Opening integration is still being completed and requires a follow-up inspection.',
      'Localized flashing corrections are expected before the cladding stage can proceed.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing flashing integration, penetrations, and cladding support systems.',
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
    ahjNotes: 'Capture local window, door, flashing, or rainscreen integration requirements that must be met before cladding proceeds.',
    dependencies: ['S07-01'],
  },
  {
    code: 'S07-03',
    label: 'Roof and Drainage',
    uiSchema: 'field_view',
    purpose: 'Confirm the upper enclosure and drainage systems are complete enough to protect the building from water ingress and uncontrolled runoff.',
    viewDetails: 'Validate roof underlayment and membrane continuity, final roofing installation, soffits, fascia, gutters, downspouts, and balcony or terrace membrane drainage. This sub-container confirms the building is shedding water properly before exterior completion advances.',
    stopIf: [
      'Roofing or drainage systems are incomplete at a condition that exposes the building to active water ingress.',
    ],
    fieldChecklist: [
      'Roof underlayment, membrane, and roofing material complete?',
      'Soffits, fascia, gutters, and downspouts installed?',
      'Balcony/terrace membranes installed with positive slope to drain? (Camera or Video Evidence Required)',
    ],
    notesGuidance: 'Record roof, drainage, and balcony membrane conditions, including any incomplete drainage path, ponding risk, or membrane deficiency.',
    whatToCheck: [
      'Roof underlayment, membrane, and roofing material are installed and coordinated for the reviewed area.',
      'Soffits, fascia, gutters, and downspouts are installed where the presented stage requires them.',
      'Balcony or terrace membranes are installed with positive slope and a clear drainage path.',
      'No unresolved roof or drainage condition remains that would compromise enclosure performance.',
    ],
    passWhen: [
      'The roof and associated drainage systems are complete enough for the presented stage.',
      'Observed balcony or terrace drainage conditions support positive water shedding away from the building.',
    ],
    failWhen: [
      'Roof membrane or roofing installation is incomplete in a way that compromises weather protection.',
      'Drainage components are missing, improperly installed, or incapable of managing runoff as presented.',
      'Balcony or terrace membrane conditions suggest ponding, reverse slope, or an inadequate drainage path.',
    ],
    pendingWhen: [
      'The roof or drainage package is still being completed and requires a return inspection.',
      'A localized membrane or drainage correction is expected before final acceptance of the stage.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing roof drainage, membrane condition, and balcony or terrace slope to drain.',
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
    ahjNotes: 'Capture local roofing, drainage, balcony membrane, or positive-slope expectations that affect acceptance of the enclosure stage.',
    dependencies: ['S07-02'],
  },
]

const STRUCTURAL_STAGE_8_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S08-01',
    label: 'Fire Separations and Blocking',
    uiSchema: 'field_view',
    purpose: 'Confirm passive fire-protection assemblies are complete and continuous before insulation or drywall conceals them.',
    viewDetails: 'Verify passive fire protection systems are intact before drywall or insulation conceals the assemblies. Validate rated walls and floors, demising continuity, penetration firestopping, draft stopping, and stair fire blocking against the required assembly intent.',
    stopIf: [
      'Compromised fire separations, missing intumescent caulking, or open combustible concealed spaces.',
    ],
    fieldChecklist: [
      'Fire-resistance-rated walls and floors constructed per assembly specs? (Camera or Video Evidence Required)',
      'Demising walls and continuity of fire separations verified?',
      'Penetration firestopping (caulking/collars) applied correctly? (Camera or Video Evidence Required)',
      'Draft stopping and stair fire blocking installed?',
    ],
    notesGuidance: 'Record observed fire-separation assemblies, any interrupted continuity, missing firestopping, or concealed-space deficiency before closure.',
    whatToCheck: [
      'Rated walls and floors match the expected assembly intent for the reviewed area.',
      'Demising walls and fire separations remain continuous across transitions and intersections.',
      'Penetration firestopping is installed correctly at observed service penetrations.',
      'Draft stopping and stair fire blocking are installed where required before concealment.',
      'No passive fire-protection gap remains in the reviewed area.',
    ],
    passWhen: [
      'Passive fire-protection assemblies are complete and continuous for the presented stage.',
      'No critical separation, firestopping, or concealed-space deficiency remains before closure.',
    ],
    failWhen: [
      'A required fire separation is incomplete, interrupted, or compromised.',
      'Intumescent caulking, collars, or other firestopping elements are missing or improperly installed.',
      'Required draft stopping or stair fire blocking is absent where concealed spaces remain open.',
    ],
    pendingWhen: [
      'Fire-protection measures are partially complete and require a return inspection before closure.',
      'Localized corrections are expected before a final decision on the assembly can be made.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing fire separations, firestopping, and blocking conditions before concealment.',
    ],
    optionalEvidence: [
      'Assembly references.',
      'Installer notes.',
      'Supplemental close-up photos of firestopping details.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local fire-separation, firestopping, or concealed-space protection expectations that must be satisfied before closure.',
    dependencies: ['S07-03'],
  },
  {
    code: 'S08-02',
    label: 'Egress and Alarms',
    uiSchema: 'field_view',
    purpose: 'Confirm occupant warning and egress provisions are roughed in and spatially compliant before finishes conceal or limit access.',
    viewDetails: 'Validate rough-in readiness for smoke and carbon monoxide alarms, and confirm that egress doors and windows provide the required exit and rescue geometry for the reviewed scope. This sub-container protects core occupant life-safety functionality before closure.',
    stopIf: [
      'Required alarm rough-in is absent, or observed egress openings do not provide a compliant path of escape.',
    ],
    fieldChecklist: [
      'Smoke and carbon monoxide alarms roughed-in at correct locations? (Camera or Note Evidence Required)',
      'Egress doors and minimum window opening sizes verified?',
    ],
    notesGuidance: 'Record alarm rough-in locations, egress observations, and any dimensional or placement issue affecting occupant life safety.',
    whatToCheck: [
      'Smoke and carbon monoxide alarm rough-in is present at the correct locations for the reviewed scope.',
      'Egress doors and windows appear to satisfy the intended opening and escape function.',
      'No visible life-safety rough-in omission remains before the assembly is concealed or finished.',
    ],
    passWhen: [
      'Alarm rough-in and egress provisions are in place and reviewable for the presented stage.',
      'No material location or opening-size concern remains in the observed area.',
    ],
    failWhen: [
      'Required alarm rough-in is missing or materially mislocated.',
      'Observed egress doors or windows appear insufficient for the intended egress function.',
    ],
    pendingWhen: [
      'Alarm rough-in or egress elements are still being completed and require re-inspection.',
      'A dimensional confirmation or corrective adjustment is expected before final acceptance.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos documenting alarm rough-in and egress conditions where needed to support the decision.',
    ],
    optionalEvidence: [
      'Supplemental measurement notes.',
      'Product details.',
      'Coordination comments for alarm placement.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'building',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local alarm placement, rescue opening, or egress configuration requirements affecting acceptance of the life-safety stage.',
    dependencies: ['S08-01'],
  },
  {
    code: 'S08-03',
    label: 'Accessibility and Guards',
    uiSchema: 'field_view',
    purpose: 'Confirm guard-related protection and accessibility-support details are installed before closure or finish work obscures them.',
    viewDetails: 'Validate guards, handrails, and grab-bar backing, along with accessible or adaptable entrance details relevant to the project scope. This sub-container ensures the life-safety and accessibility support layer is reviewable before finishes conceal critical backing or mounting conditions.',
    stopIf: [
      'Required guard support, handrail backing, or accessible-entry provisions are absent in a way that would compromise life safety or adaptability.',
    ],
    fieldChecklist: [
      'Guards, handrails, and grab-bar backing installed in walls? (Camera or Video Evidence Required)',
      'Accessible and adaptable entrance details confirmed?',
    ],
    notesGuidance: 'Record observed guard or backing conditions, accessibility detail confirmation, and any missing support or entrance feature affecting compliance.',
    whatToCheck: [
      'Guards, handrails, and grab-bar backing are installed where required by the reviewed scope.',
      'Accessible or adaptable entrance details are identified and coordinated with the project requirements.',
      'No critical support or accessibility-preparation element is missing before closure.',
    ],
    passWhen: [
      'Guard and accessibility support features are in place and reviewable for the presented stage.',
      'No material support or entrance-detail deficiency remains before finish work proceeds.',
    ],
    failWhen: [
      'Required guard or handrail support conditions are missing or inadequate.',
      'Grab-bar backing is absent where required for the reviewed scope.',
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
    ahjNotes: 'Capture local guard, handrail, backing, or accessibility-detail requirements that govern acceptance before finishes proceed.',
    dependencies: ['S08-02'],
  },
]

const STRUCTURAL_STAGE_9_CONTAINERS: StructuredStageItemDefinition[] = [
  {
    code: 'S09-01',
    label: 'Rough-in and Drainage',
    uiSchema: 'field_view',
    purpose: 'Confirm the rough plumbing distribution and drainage framework is complete enough for inspection before enclosure.',
    viewDetails: 'Validate the rough plumbing backbone, including sanitary piping, domestic water routing and support, vent completion, and the coordination of roof, site, and foundation drainage connections. This sub-container confirms the system framework is in place before downstream testing and closure.',
    stopIf: [
      'Core plumbing rough-in or drainage routing is incomplete in a way that prevents a defensible inspection.',
    ],
    fieldChecklist: [
      'Sanitary and domestic water piping routed and supported? (Camera or Note Evidence Required)',
      'Venting system complete and terminated correctly?',
      'Roof, site, and foundation drainage connections verified?',
    ],
    notesGuidance: 'Record observed rough plumbing routing, venting, drainage connections, and any support or slope concern affecting system readiness.',
    whatToCheck: [
      'Sanitary and domestic water piping is routed and supported in a reviewable condition.',
      'The venting system is complete enough for the presented stage and appears properly terminated or continued.',
      'Roof, site, and foundation drainage connections are coordinated with the plumbing scope.',
      'No core rough-in omission remains that would undermine the next plumbing hold point.',
    ],
    passWhen: [
      'The plumbing rough-in backbone is complete enough for the presented inspection stage.',
      'Observed drainage and venting conditions support progression to testing and inspection.',
    ],
    failWhen: [
      'Sanitary or domestic water piping is materially incomplete, unsupported, or inconsistent with the intended system layout.',
      'The venting system is incomplete or terminated incorrectly for the presented stage.',
      'Critical drainage connections are missing, unverified, or not coordinated with the plumbing package.',
    ],
    pendingWhen: [
      'The rough plumbing package is substantially installed but still awaiting final completion in the reviewed area.',
      'A support, routing, or connection issue is expected to be resolved before the next inspection.',
    ],
    requiredEvidence: [
      'Inspector-captured field notes or photos documenting plumbing rough-in and drainage conditions where needed to support the decision.',
    ],
    optionalEvidence: [
      'Supplemental routing photos.',
      'Installer notes.',
      'Coordination records for drainage tie-ins.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local plumbing rough-in, venting, or drainage-connection requirements that must be satisfied before enclosure.',
    dependencies: ['S08-03'],
  },
  {
    code: 'S09-02',
    label: 'Fixtures and Testing',
    uiSchema: 'field_view',
    purpose: 'Confirm rough plumbing has been tested, inspected, and coordinated at penetrations before framing is enclosed.',
    viewDetails: 'Confirm rough plumbing is complete, tested, and inspected before framing is enclosed. Validate pressure or leak testing, fixture installation where applicable, and continuity of fire separation at plumbing penetrations before concealment.',
    stopIf: [
      'System fails pressure test, or DWV slopes are inadequate for drainage.',
    ],
    fieldChecklist: [
      'Rough-in inspection passed and pressure/leak testing complete? (Camera or Note Evidence Required)',
      'Plumbing fixtures (tubs/showers) installed?',
      'Fire separation continuity maintained at plumbing penetrations?',
    ],
    notesGuidance: 'Record testing status, observed fixture conditions, penetration fire-separation continuity, and any failure or drainage concern affecting the rough plumbing sign-off.',
    whatToCheck: [
      'The rough-in inspection status has been confirmed for the presented plumbing stage.',
      'Pressure or leak testing has been completed and does not indicate a system failure.',
      'Fixtures such as tubs or showers are installed where the presented stage requires them.',
      'Fire-separation continuity is maintained at plumbing penetrations through rated assemblies.',
      'Observed drainage slopes and routing do not suggest a material performance deficiency.',
    ],
    passWhen: [
      'Rough plumbing has passed or been documented as acceptable for the presented hold point.',
      'Testing, fixture readiness, and penetration protection support enclosure without an unresolved plumbing risk.',
    ],
    failWhen: [
      'The system fails pressure or leak testing, or required testing has not been completed.',
      'Observed DWV conditions suggest inadequate slope or a material drainage deficiency.',
      'Required fire-separation continuity has been compromised at plumbing penetrations.',
    ],
    pendingWhen: [
      'Testing or rough-in inspection is scheduled but not yet complete.',
      'A localized corrective item is expected before rough plumbing can be accepted for enclosure.',
    ],
    requiredEvidence: [
      'Inspector-captured field evidence showing test status, fixture readiness, and penetration conditions before enclosure.',
    ],
    optionalEvidence: [
      'Supplemental test notes.',
      'Installer corrections.',
      'Close-up penetration photos.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'plumbing',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local rough-plumbing inspection, testing, or penetration-protection requirements that govern whether the framing package may be enclosed.',
    dependencies: ['S09-01'],
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
    label: 'Thermal Boundaries',
    uiSchema: 'field_view',
    purpose: 'Confirm the installed thermal envelope matches the approved energy-performance basis before drywall conceals it.',
    viewDetails: 'Ensure the building envelope meets the required thermal performance before drywall installation. Validate insulation packages at walls, roof, and slab or foundation interfaces, and confirm window performance values against the approved energy model.',
    stopIf: [
      'Installed insulation R-values or window specifications fall below the approved energy model.',
    ],
    fieldChecklist: [
      'Wall, roof, and slab/foundation insulation packages installed per design? (Camera or Video Evidence Required)',
      'Window U-values and SHGC match energy model?',
    ],
    notesGuidance: 'Record observed insulation installation quality, window performance references, and any mismatch between installed thermal components and the approved energy basis.',
    whatToCheck: [
      'Wall, roof, and slab or foundation insulation packages are installed per the design intent.',
      'Installed insulation appears consistent with the required thermal package for the reviewed scope.',
      'Window U-values and SHGC align with the approved energy model or supporting documentation.',
      'No visible thermal-envelope deficiency remains before concealment.',
    ],
    passWhen: [
      'The installed thermal boundary components align with the approved energy basis for the presented stage.',
      'No material insulation or window-performance mismatch remains before drywall.',
    ],
    failWhen: [
      'Insulation installation is incomplete or materially inconsistent with the required thermal package.',
      'Installed window performance values fall below the approved energy-model assumptions.',
      'Observed thermal-envelope conditions would undermine required energy performance.',
    ],
    pendingWhen: [
      'Thermal-envelope installation is near completion but still requires final corrections or verification.',
      'Energy documentation is expected to resolve a currently unconfirmed thermal-value question.',
    ],
    requiredEvidence: [
      'Inspector-captured field photos showing installed insulation conditions before drywall.',
    ],
    optionalEvidence: [
      'Window schedule records already on file.',
      'Energy-model references.',
      'Supplemental insulation notes.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'Inspector',
    documentUploadRequired: true,
    ahjNotes: 'Capture local insulation, thermal-envelope, or fenestration-performance requirements that must be met before concealment.',
    dependencies: ['S09-02', 'S10-03', 'S11-03'],
  },
  {
    code: 'S12-02',
    label: 'Airtightness and Modeling',
    uiSchema: 'field_view',
    purpose: 'Confirm the airtightness strategy and modeled energy assumptions remain valid against the installed work.',
    viewDetails: 'Validate execution of the airtightness strategy, the applicable Step Code or Energy Step Code target, and the consistency of the energy model assumptions, including heat pump assumptions, with the reviewed installation.',
    stopIf: [
      'The airtightness strategy is visibly discontinuous, or the installed systems no longer support the approved energy-model assumptions.',
    ],
    fieldChecklist: [
      'Airtightness strategy executed and continuous? (Camera or Note Evidence Required)',
      'Step Code/Energy Step Code target verified?',
      'Energy model and heat pump assumptions validated?',
    ],
    notesGuidance: 'Record observed airtightness continuity, the applicable Step Code target, and any inconsistency between modeled assumptions and installed systems.',
    whatToCheck: [
      'The airtightness strategy is executed and appears continuous in the reviewed areas.',
      'The project’s Step Code or Energy Step Code target is identified and still supported by the installation.',
      'Energy-model assumptions, including heat pump assumptions where applicable, remain valid against the built condition.',
      'No major modeling or continuity gap remains before documentation closeout.',
    ],
    passWhen: [
      'Observed airtightness and installed systems remain consistent with the approved energy-compliance path.',
      'The project can continue toward energy documentation closeout without a material model mismatch.',
    ],
    failWhen: [
      'Airtightness continuity is visibly broken or not executed for the reviewed scope.',
      'The installed systems no longer align with the approved Step Code or modeled performance assumptions.',
      'Heat pump or equipment assumptions in the energy model are contradicted by the built condition.',
    ],
    pendingWhen: [
      'Airtightness work or system coordination is still in progress and requires follow-up verification.',
      'Final modeling confirmation is expected once supporting documentation is updated.',
    ],
    requiredEvidence: [
      'Field notes or supporting documentation confirming airtightness execution and modeled energy assumptions.',
    ],
    optionalEvidence: [
      'Supplemental photos of airtightness details.',
      'Energy-model coordination notes.',
      'Consultant clarifications.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'Auditor',
    documentUploadRequired: true,
    ahjNotes: 'Capture local Step Code, airtightness, or modeled-performance requirements that govern energy-compliance acceptance.',
    dependencies: ['S12-01'],
  },
  {
    code: 'S12-03',
    label: 'Approvals and Documentation',
    uiSchema: 'field_view',
    purpose: 'Confirm the inspection and documentation gates for energy compliance are complete before the project advances to interior closeout.',
    viewDetails: 'Validate the final administrative layer of the energy package, including insulation inspection status and uploaded energy-compliance documentation. This sub-container captures the formal transition from installed energy measures to accepted energy compliance records.',
    stopIf: [
      'Required insulation inspection or energy-compliance documentation is missing.',
    ],
    fieldChecklist: [
      'Insulation inspection passed? (Camera or Note Evidence Required)',
      'Energy compliance documentation uploaded?',
    ],
    notesGuidance: 'Record inspection status, documentation completeness, and any missing report or compliance form blocking energy closeout.',
    whatToCheck: [
      'The insulation inspection has passed or is clearly documented for the reviewed scope.',
      'Energy-compliance documentation has been uploaded and is available for closeout.',
      'No outstanding inspection or reporting hold remains on the energy package.',
    ],
    passWhen: [
      'The energy-compliance package has cleared both the field inspection and document-submission gates.',
      'No unresolved insulation or reporting item remains before interior completion.',
    ],
    failWhen: [
      'The insulation inspection has not passed or remains unresolved.',
      'Required energy-compliance documents are missing or materially incomplete.',
      'Administrative records do not support closure of the energy stage.',
    ],
    pendingWhen: [
      'Inspection or documentation upload is in progress but not yet complete.',
      'A final report or supporting form is expected shortly and may resolve the hold.',
    ],
    requiredEvidence: [
      'Inspection records or uploaded compliance documents confirming energy package closeout.',
    ],
    optionalEvidence: [
      'Supplemental text notes documenting outstanding review comments.',
      'Consultant correspondence.',
    ],
    evidenceMode: 'required_upload',
    permitType: 'energy_compliance',
    responsibleParty: 'AHJ',
    documentUploadRequired: true,
    ahjNotes: 'Capture local insulation-inspection or energy-documentation requirements that must be satisfied before the project advances to interior completion.',
    dependencies: ['S12-02'],
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
    dependencies: ['S12-03'],
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
    summary: 'Confirm rough plumbing, drainage coordination, testing, and penetration protection before framing is enclosed.',
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
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

  const city = normalize(context.city)
  if (city.includes('vancouver')) {
    return {
      type: 'vancouver',
      label: 'Vancouver By-law Overlay',
      jurisdictionName: 'City of Vancouver',
      signals: ['cov_detected', ...signals],
      summary: 'Vancouver-specific by-law, frontage, and permit routing checks are surfaced in addition to the BC base checklist.',
    }
  }

  const jurisdictionName = context.city?.trim()
    ? `City of ${context.city.trim().replace(/,?\s*bc$/i, '')}`
    : 'Municipal AHJ'

  return {
    type: city || context.region ? 'municipal' : 'province_base',
    label: city || context.region ? 'Municipal AHJ Overlay' : 'Province-Wide Base',
    jurisdictionName,
    signals,
    summary: city || context.region
      ? 'Municipal servicing, tree, frontage, and occupancy expectations are layered onto the BC base checklist.'
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
