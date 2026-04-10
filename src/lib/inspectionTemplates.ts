/**
 * Official Vancouver BC inspection checklists.
 * Source: Vero field operations checklist set, March 2026.
 *
 * Usage:
 *   import { INSPECTION_PHASES, getPhasesForStage, getPhaseById } from '@/lib/inspectionTemplates'
 */

export interface ChecklistItem {
  id: string
  item_name: string
  description: string
  is_critical: boolean
  /** Authoritative BC code / standard reference — shown in the 'View Code' panel. */
  code_ref: string
}

export interface InspectionPhase {
  phase_id: string
  phase_name: string
  inspection_stage: 'structural' | 'envelope' | 'plumbing' | 'electrical' | 'life_safety'
  items: ChecklistItem[]
}

/**
 * Stage number → phase_id mapping (1-indexed per Vancouver building permit stages).
 * Trade phases (RIP / RIE / FPL / FEL) are selected by discipline via getPhasesForStage().
 */
export const STAGE_PHASE_MAP: Record<number, string> = {
  1: 'EXC',
  2: 'FND',
  3: 'FRM',
  4: 'INS',
  5: 'FOC',
}

/** Discipline → phase IDs that apply to rough-in and final trade inspections. */
export const DISCIPLINE_PHASE_MAP: Record<string, string[]> = {
  plumbing:    ['RIP', 'FPL'],
  electrical:  ['RIE', 'FEL'],
  structural:  ['EXC', 'FND', 'FRM'],
  envelope:    ['INS'],
  life_safety: ['FOC'],
}

export const INSPECTION_PHASES: InspectionPhase[] = [
  // ─── EXC — Excavation / Forms ────────────────────────────────────────────
  {
    phase_id: 'EXC',
    phase_name: 'Excavation / Forms',
    inspection_stage: 'structural',
    items: [
      {
        id: 'EXC-001', is_critical: true,
        item_name: 'Permit posting',
        description: 'Confirm building permit is posted and visible at the site entry prior to any inspection. Verify permit number matches approved drawings.',
        code_ref: 'Building Act s.16 — Permit must be posted & visible at site entry before any work',
      },
      {
        id: 'EXC-002', is_critical: true,
        item_name: 'Property line verification',
        description: 'Confirm excavation limits and formwork setbacks comply with approved site plan. Check for encroachment onto adjacent lots or city right-of-way.',
        code_ref: 'BCBC 9.12.3 — Setback compliance verified against approved site plan',
      },
      {
        id: 'EXC-003', is_critical: true,
        item_name: 'Excavation depth and dimensions',
        description: 'Measure excavation depth against structural drawings. Verify bearing strata is consistent with the geotechnical report on file.',
        code_ref: 'BCBC 4.2.1.1 — Excavation depth vs. bearing strata per geotech report on file',
      },
      {
        id: 'EXC-004', is_critical: true,
        item_name: 'Geotechnical report compliance',
        description: 'Confirm soil conditions match assumptions in the geotechnical report. Look for unexpected soft spots, fill, organic material, or groundwater intrusion.',
        code_ref: 'BCBC 4.2.1 — Soil conditions must match geotech assumptions; deviations require EOR directive',
      },
      {
        id: 'EXC-005', is_critical: true,
        item_name: 'Shoring and slope stability',
        description: 'Inspect shoring systems or excavation slopes for signs of instability, undercutting, or movement. Verify shoring design is stamped by a registered engineer.',
        code_ref: 'BCBC 4.2.2 — Shoring design must be stamped by a registered professional engineer',
      },
      {
        id: 'EXC-006', is_critical: false,
        item_name: 'Dewatering provisions',
        description: 'Confirm groundwater is being managed and is not undermining bearing soils or adjacent structures. Dewatering plan should be on site if required.',
        code_ref: 'BCBC 9.12.2 — Dewatering plan required where groundwater affects bearing soils',
      },
      {
        id: 'EXC-007', is_critical: true,
        item_name: 'Footing form alignment and level',
        description: 'Check forms are set to correct dimensions, plumb, and level per structural drawings. Measure width and depth of footing forms at multiple points.',
        code_ref: 'BCBC 9.15.1 — Footing forms: correct dimensions, plumb & level per structural drawings',
      },
      {
        id: 'EXC-008', is_critical: false,
        item_name: 'Form material condition',
        description: 'Inspect form lumber or steel for integrity. No warped, split, or inadequately braced members that could cause blowout during pour.',
        code_ref: 'BCBC 9.15.1.2 — Form material must resist blowout pressure during concrete pour',
      },
      {
        id: 'EXC-009', is_critical: true,
        item_name: 'Cleanout of excavation base',
        description: 'Verify bearing surface is free of loose soil, debris, frost, standing water, and organic material before rebar placement.',
        code_ref: 'BCBC 9.15.1.1 — Bearing surface must be free of debris, frost & standing water',
      },
      {
        id: 'EXC-010', is_critical: true,
        item_name: 'Utility location and protection',
        description: 'Confirm existing underground utilities have been located, marked, and protected. Check for compliance with BC One Call requirements.',
        code_ref: 'BC One Call Act — Underground utilities located, marked & protected before excavation',
      },
      {
        id: 'EXC-011', is_critical: false,
        item_name: 'Erosion and sediment control',
        description: 'Inspect silt fencing, inlet protection, and other SWMP measures are in place and functional. Required under City of Vancouver Sewer By-law.',
        code_ref: 'CoV Sewer By-law / SWMP — Silt fencing & inlet protection in place and functional',
      },
      {
        id: 'EXC-012', is_critical: true,
        item_name: 'Adjacent structure protection',
        description: 'Assess whether excavation is affecting neighboring buildings, retaining walls, or infrastructure. Any cracking or movement must be reported immediately.',
        code_ref: 'BCBC 4.2.2 — Adjacent structure movement must be reported to EOR immediately',
      },
      {
        id: 'EXC-013', is_critical: false,
        item_name: 'Form release agent application',
        description: 'Confirm release agent has been applied evenly to form faces. Absence can cause form adhesion and damage to concrete surface.',
        code_ref: 'BCBC 9.15.1 — Release agent applied evenly to all form faces before rebar placement',
      },
      {
        id: 'EXC-014', is_critical: true,
        item_name: 'Void fill and compaction',
        description: 'Where over-excavation has occurred, verify engineered fill has been placed and compacted to specification before forming.',
        code_ref: 'BCBC 9.15.3 — Over-excavation: engineered fill placed & compacted to specification',
      },
    ],
  },

  // ─── FND — Foundation / Rebar ────────────────────────────────────────────
  {
    phase_id: 'FND',
    phase_name: 'Foundation / Rebar',
    inspection_stage: 'structural',
    items: [
      {
        id: 'FND-001', is_critical: true,
        item_name: 'Rebar size and grade',
        description: 'Verify rebar size (e.g. 15M, 20M) and grade (Grade 400) match structural drawings. Check mill certificates if specified by engineer.',
        code_ref: 'BCBC 9.15.4 / CSA G30.18 — Rebar grade (400W) & size per structural drawings',
      },
      {
        id: 'FND-002', is_critical: true,
        item_name: 'Rebar spacing and layout',
        description: 'Measure spacing of horizontal and vertical reinforcing in footings, walls, and piers. Verify matches approved structural drawings exactly.',
        code_ref: 'BCBC 9.15.4 / Struct. drawings — Rebar spacing measured at multiple points',
      },
      {
        id: 'FND-003', is_critical: true,
        item_name: 'Concrete cover to rebar',
        description: 'Measure concrete cover on all exposed surfaces. Minimum 75mm cover for concrete in contact with earth (BCBC 9.15.4 & structural drawings). Use cover blocks or chairs.',
        code_ref: 'BCBC 9.15.4.1 — Min. 75 mm concrete cover for earth-contact concrete; use cover chairs',
      },
      {
        id: 'FND-004', is_critical: true,
        item_name: 'Rebar condition and cleanliness',
        description: 'Inspect for excessive rust, oil, mud, or loose mill scale that could impair bond. Light rust is acceptable; flaking rust or coating is not.',
        code_ref: 'CSA G30.18 — Light rust acceptable; flaking rust, oil or mud coating is not permitted',
      },
      {
        id: 'FND-005', is_critical: true,
        item_name: 'Rebar lap splice lengths',
        description: "Measure lap splice lengths and confirm they meet minimum requirements per structural engineer's schedule (typically 40–50 bar diameters for Grade 400).",
        code_ref: 'BCBC 9.15.4 — Lap splices: 40–50 bar diameters for Grade 400 per struct. ENG schedule',
      },
      {
        id: 'FND-006', is_critical: true,
        item_name: 'Anchor bolts and hold-downs',
        description: "Verify location, embedment depth, size, and template positioning of anchor bolts and hold-down hardware against structural drawings before pour.",
        code_ref: 'BCBC 9.15.5 / Struct. drawings — Anchor bolts: size, embedment depth & template position',
      },
      {
        id: 'FND-007', is_critical: false,
        item_name: 'Tie wire and rebar support',
        description: 'Confirm all rebar intersections are properly tied and rebar is securely supported on chairs/dobies to prevent displacement during pour.',
        code_ref: 'BCBC 9.15.4 — All rebar intersections tied; rebar on chairs/dobies, not displaced',
      },
      {
        id: 'FND-008', is_critical: true,
        item_name: 'Footing dimensions',
        description: 'Re-measure footing width and depth against structural drawings. Check bearing area is correct for column and wall loads.',
        code_ref: 'BCBC 9.15.2 — Footing width & depth re-measured against structural drawings',
      },
      {
        id: 'FND-009', is_critical: true,
        item_name: 'Keyway or dowel provision',
        description: 'Confirm construction joints include keyed or doweled connections as required for shear transfer between footing and wall.',
        code_ref: 'BCBC 9.15.5 — Keyed or doweled construction joints required for shear transfer',
      },
      {
        id: 'FND-010', is_critical: true,
        item_name: 'Concrete mix design',
        description: 'Confirm approved concrete mix design is on site. Verify specified compressive strength (MPa), water-cement ratio, and air entrainment for exposed conditions.',
        code_ref: 'BCBC 9.15.3 / CSA A23.1 — Approved mix design on site; MPa, w/c ratio & air entrainment',
      },
      {
        id: 'FND-011', is_critical: false,
        item_name: 'Drain tile and waterproofing provisions',
        description: 'Inspect footing drain tile installation and filter fabric wrap. Confirm drainage outlets to approved location (sump or storm).',
        code_ref: 'BCBC 9.16.4 — Footing drain tile with filter fabric wrap; outlet to sump or storm sewer',
      },
      {
        id: 'FND-012', is_critical: true,
        item_name: 'Vapour barrier under slab',
        description: 'Verify minimum 10-mil poly vapour barrier is installed with laps of at least 300mm and taped, continuous and free of punctures before slab pour.',
        code_ref: 'BCBC 9.15.3.5 — Min. 10-mil poly vapour barrier; 300 mm laps, taped & puncture-free',
      },
      {
        id: 'FND-013', is_critical: true,
        item_name: 'Slab subbase preparation',
        description: 'Confirm granular subbase (min. 100mm compacted gravel) is in place, properly graded, and adequately compacted under slab-on-grade.',
        code_ref: 'BCBC 9.15.3 — Granular subbase: min. 100 mm compacted gravel, graded under slab',
      },
      {
        id: 'FND-014', is_critical: true,
        item_name: 'Pre-pour engineering sign-off',
        description: "For complex foundations, verify geotechnical or structural engineer has reviewed and provided written approval before concrete placement.",
        code_ref: 'BCBC 2.2.7 — Complex foundations: written EOR approval required before concrete pour',
      },
      {
        id: 'FND-015', is_critical: true,
        item_name: 'Cold weather or hot weather plan',
        description: 'If ambient temperature is below 5°C or above 30°C at time of pour, confirm approved concrete protection plan (CSA A23.1) is in place.',
        code_ref: 'CSA A23.1 — Cold (<5°C) or hot (>30°C) weather concreting protection plan required',
      },
    ],
  },

  // ─── FRM — Framing ───────────────────────────────────────────────────────
  {
    phase_id: 'FRM',
    phase_name: 'Framing',
    inspection_stage: 'structural',
    items: [
      {
        id: 'FRM-001', is_critical: true,
        item_name: 'Lumber grade and species stamps',
        description: 'Spot-check dimension lumber and engineered wood products for grade stamps matching the structural drawings and specifications. Reject unmarked or improper grades.',
        code_ref: 'BCBC 9.3.2 — Grade stamps must be visible on all structural dimension lumber',
      },
      {
        id: 'FRM-002', is_critical: true,
        item_name: 'Sill plate anchor bolt connection',
        description: 'Inspect sill plate installation. Confirm correct anchor bolt spacing, washer size, and nut torque. Treated lumber (ACQ) where in contact with concrete.',
        code_ref: 'BCBC 9.23.3 — Sill plate: anchor bolt spacing, washer size & ACQ treated lumber at concrete',
      },
      {
        id: 'FRM-003', is_critical: true,
        item_name: 'Floor joist size, spacing, and span',
        description: 'Verify joist size and spacing match structural schedule. Check spans against span tables (BCBC Part 9) or engineer\'s drawings. Inspect bearing lengths.',
        code_ref: 'BCBC 9.23.4 — Floor joist size, spacing & span per structural schedule & Part 9 tables',
      },
      {
        id: 'FRM-004', is_critical: true,
        item_name: 'Engineered wood product installation',
        description: 'Confirm LVL, I-joist, and glulam installation matches manufacturer\'s specs: no unauthorized notching or drilling, correct bearing, and required web stiffeners.',
        code_ref: 'BCBC 9.23.4 / Mfr. specs — Engineered wood: no unauthorized notching; correct bearing',
      },
      {
        id: 'FRM-005', is_critical: false,
        item_name: 'Blocking and bridging',
        description: 'Inspect mid-span blocking or bridging for joists and rafters per BCBC requirements. Verify solid blocking at supports and at shear wall locations.',
        code_ref: 'BCBC 9.23.6 — Mid-span blocking at supports and shear wall locations required',
      },
      {
        id: 'FRM-006', is_critical: true,
        item_name: 'Wall stud size, spacing, and height',
        description: 'Verify stud size and spacing (typically 2×6 @ 400mm o/c) against structural drawings. Check for doubled studs at openings and point loads.',
        code_ref: 'BCBC 9.23.3 — Stud size & spacing per structural drawings; doubled studs at openings',
      },
      {
        id: 'FRM-007', is_critical: true,
        item_name: 'Header size at openings',
        description: 'Inspect header dimensions at all door and window openings against structural schedule. Confirm bearing stud quantity and post-to-beam connections.',
        code_ref: 'BCBC 9.23.3.3 — Header dimensions vs. structural schedule at all door & window openings',
      },
      {
        id: 'FRM-008', is_critical: true,
        item_name: 'Notching and drilling of structural members',
        description: 'Inspect for unauthorized notches or holes that exceed BCBC limits. Particular attention to top and bottom third of joist depth for notching violations.',
        code_ref: 'BCBC 9.23.4.3 — No notches or holes exceeding BCBC limits; top/bottom third of joist critical',
      },
      {
        id: 'FRM-009', is_critical: true,
        item_name: 'Shear wall sheathing and nailing',
        description: "Verify shear wall panel thickness, layout, and nailing schedule (nail size, spacing at panel edges and field) exactly match the engineered shear wall schedule.",
        code_ref: 'BCBC 9.23.13 / Struct. ENG — Shear wall: panel thickness, nail size & edge/field spacing',
      },
      {
        id: 'FRM-010', is_critical: true,
        item_name: 'Hold-down and strap connector installation',
        description: "Inspect hold-down hardware, straps, and framing connectors for correct product, fastener count, and installation per structural drawings.",
        code_ref: 'BCBC 9.23.13 / Struct. drawings — Hold-downs: correct product, fastener count & placement',
      },
      {
        id: 'FRM-011', is_critical: false,
        item_name: 'Rim joist and band joist continuity',
        description: 'Confirm continuous rim joist installation with blocking at bearing walls. Check for proper connection between floor levels and shear wall lines.',
        code_ref: 'BCBC 9.23.6 — Continuous rim joist with blocking at bearing walls and shear wall lines',
      },
      {
        id: 'FRM-012', is_critical: true,
        item_name: 'Plumb, level, and alignment',
        description: 'Use level and plumb bob to check walls and columns for verticality. Confirm floor assemblies are level. Excessive out-of-plumb must be corrected before sheathing.',
        code_ref: 'BCBC 9.23.2 — Walls plumb & floor level; out-of-plumb corrected before sheathing applied',
      },
      {
        id: 'FRM-013', is_critical: true,
        item_name: 'Roof framing and rafter ties',
        description: 'Verify rafter size and spacing. Confirm rafter ties or ceiling joists are in place to resist outward thrust. Check ridge beam sizing and bearing.',
        code_ref: 'BCBC 9.23.5 — Rafter ties or ceiling joists resist outward thrust; ridge beam sized & bearing',
      },
      {
        id: 'FRM-014', is_critical: true,
        item_name: 'Fireblocking and draftstopping',
        description: 'Confirm fireblocking at all concealed vertical and horizontal stud cavities, including at floor/ceiling levels, per BCBC 9.10.17 requirements.',
        code_ref: 'BCBC 9.10.17 — Fireblocking at all concealed cavities & floor/ceiling levels required',
      },
      {
        id: 'FRM-015', is_critical: false,
        item_name: 'Ceiling height compliance',
        description: 'Measure floor-to-ceiling heights in all habitable rooms. Verify minimum BCBC requirements are met (2.3m for Part 9 residential).',
        code_ref: 'BCBC 9.5.1 — Min. 2.3 m floor-to-ceiling height in all habitable rooms (Part 9)',
      },
      {
        id: 'FRM-016', is_critical: false,
        item_name: 'Stairway framing and rough opening',
        description: 'Check stair rough opening dimensions, stringer size, and headroom clearance against approved drawings and BCBC 9.8 stairway requirements.',
        code_ref: 'BCBC 9.8.4 — Stair rough opening: stringer size, headroom clearance per approved drawings',
      },
      {
        id: 'FRM-017', is_critical: true,
        item_name: 'Pre-engineered truss installation',
        description: "If roof or floor trusses are used, confirm installation matches engineer's sealed layout, including bearing, bracing, and web member restrictions.",
        code_ref: 'BCBC 9.23.4 / Truss ENG — Sealed truss layout: correct bearing, bracing & web restrictions',
      },
    ],
  },

  // ─── INS — Insulation & Vapour Barrier ───────────────────────────────────
  {
    phase_id: 'INS',
    phase_name: 'Insulation & Vapour Barrier',
    inspection_stage: 'envelope',
    items: [
      {
        id: 'INS-001', is_critical: true,
        item_name: 'Insulation type and R-value',
        description: 'Confirm insulation product type and labeled R-value match the approved energy compliance documentation (BC Energy Step Code or BCBC). Request product data sheets if in doubt.',
        code_ref: 'BCBC 9.25 / BC Energy Step Code — R-value & product type match energy compliance docs',
      },
      {
        id: 'INS-002', is_critical: true,
        item_name: 'Continuous insulation compliance',
        description: 'Verify continuous insulation (ci) is installed without gaps, voids, or compression on all required assemblies. Measure thickness at multiple locations.',
        code_ref: 'BCBC 9.25.2 — Continuous insulation (ci): no gaps, voids or compression; measured at multiple pts',
      },
      {
        id: 'INS-003', is_critical: true,
        item_name: 'Attic insulation depth and coverage',
        description: 'Measure attic insulation depth at multiple points including eaves. Confirm wind baffles are installed to maintain clear ventilation path from soffit to ridge.',
        code_ref: 'BCBC 9.25.3 — Attic depth at eaves; wind baffles maintain soffit-to-ridge ventilation path',
      },
      {
        id: 'INS-004', is_critical: false,
        item_name: 'Below-grade insulation',
        description: 'Inspect insulation type and placement at foundation walls and underslab. Rigid insulation must be rated for below-grade use (e.g., XPS ASTM C578 Type IV or higher).',
        code_ref: 'BCBC 9.25.2 / ASTM C578 Type IV — Below-grade insulation must be rated for burial use',
      },
      {
        id: 'INS-005', is_critical: true,
        item_name: 'Vapour barrier material specification',
        description: 'Confirm vapour barrier is minimum 6-mil polyethylene (or approved equivalent with required perm rating). Verify product label is visible on a sample section.',
        code_ref: 'BCBC 9.25.4 — Vapour barrier: min. 6-mil poly; product label visible on installed section',
      },
      {
        id: 'INS-006', is_critical: true,
        item_name: 'Vapour barrier installation — warm-side rule',
        description: 'Verify vapour barrier is installed on the warm side of insulation (interior face of insulation in exterior walls). Incorrect placement is a major moisture risk.',
        code_ref: 'BCBC 9.25.4.1 — Vapour barrier on warm side (interior face) of insulation in exterior walls',
      },
      {
        id: 'INS-007', is_critical: true,
        item_name: 'Vapour barrier continuity and lapping',
        description: 'Inspect all laps for minimum 150mm (6") overlap. Confirm laps are located over framing members and are taped or sealed with approved acoustical sealant.',
        code_ref: 'BCBC 9.25.4.1 — Laps ≥150 mm over framing; taped or sealed with acoustical sealant',
      },
      {
        id: 'INS-008', is_critical: true,
        item_name: 'Penetration sealing',
        description: 'Inspect all penetrations through the vapour barrier (electrical boxes, pipes, vents) for airtight sealing with acoustical sealant, foam, or approved gaskets.',
        code_ref: 'BCBC 9.25.4.2 — All penetrations (boxes, pipes, vents) sealed airtight through vapour barrier',
      },
      {
        id: 'INS-009', is_critical: true,
        item_name: 'Vapour barrier at floor-to-wall junction',
        description: 'Confirm vapour barrier wraps continuously from wall to floor assembly without gaps at the sill plate connection. This junction is a high-risk area for air leakage.',
        code_ref: 'BCBC 9.25.4.1 — Vapour barrier continuous at sill plate floor-to-wall junction; high-risk zone',
      },
      {
        id: 'INS-010', is_critical: true,
        item_name: 'Air barrier integrity',
        description: 'Assess the air barrier system as a whole for continuity. Identify any areas where the air and vapour control layers are interrupted by framing or services.',
        code_ref: 'BCBC 9.25.4 — Air barrier must be continuous; no interruptions at framing members or services',
      },
      {
        id: 'INS-011', is_critical: false,
        item_name: 'Batt insulation fit and compression',
        description: 'Inspect batt insulation for proper fit in cavities — full width, not compressed or folded. Gaps or voids reduce effective R-value significantly.',
        code_ref: 'BCBC 9.25.1 — Batt insulation: full width in cavity; not compressed, folded or with voids',
      },
      {
        id: 'INS-012', is_critical: true,
        item_name: 'Spray foam insulation',
        description: 'For open or closed-cell spray foam, verify manufacturer-required minimum and maximum installed thickness per pass, and confirm product approval (Section 9.25 BCBC).',
        code_ref: 'BCBC 9.25.2 / 9.25.3 — Spray foam: per-pass thickness per mfr.; product approval on file',
      },
      {
        id: 'INS-013', is_critical: true,
        item_name: 'Insulation protection requirements',
        description: 'Confirm any exposed spray foam or rigid insulation is protected with a thermal barrier (e.g., 12.7mm drywall) in occupied spaces per BCBC fire protection requirements.',
        code_ref: 'BCBC 9.10.16 — Exposed foam must be protected by thermal barrier (12.7 mm drywall) in occupied space',
      },
      {
        id: 'INS-014', is_critical: false,
        item_name: 'Crawlspace insulation and moisture',
        description: 'Inspect crawlspace for ground cover, insulation placement, and vapour management. Check for moisture accumulation or mold before insulating.',
        code_ref: 'BCBC 9.18 — Crawlspace: ground cover present, insulation placed, no moisture accumulation or mold',
      },
      {
        id: 'INS-015', is_critical: false,
        item_name: 'Roof assembly ventilation',
        description: 'Confirm vented roof assembly has adequate free ventilation area: minimum 1/300 of insulated ceiling area (BCBC 9.19.1), with balanced intake and exhaust.',
        code_ref: 'BCBC 9.19.1 — Roof ventilation: min. 1/300 of insulated ceiling area, balanced intake & exhaust',
      },
      {
        id: 'INS-016', is_critical: true,
        item_name: 'Energy Step Code compliance documentation',
        description: 'Confirm required blower door test scheduling or air leakage compliance path is documented. For Step 3+ projects, mid-construction testing may be required.',
        code_ref: 'BC Energy Step Code Reg. — Blower door test scheduling documented; mid-construction test for Step ≥3',
      },
    ],
  },

  // ─── RIP — Rough-in Plumbing ─────────────────────────────────────────────
  {
    phase_id: 'RIP',
    phase_name: 'Rough-in Plumbing',
    inspection_stage: 'plumbing',
    items: [
      {
        id: 'RIP-001', is_critical: true,
        item_name: 'Permit and approved drawings on site',
        description: 'Confirm the plumbing permit is posted and approved drawings are on site before beginning inspection. Permit must match the issued City of Vancouver Plumbing Permit.',
        code_ref: 'BC Building Act / CoV By-law — Plumbing permit posted; approved drawings on site before inspection',
      },
      {
        id: 'RIP-002', is_critical: true,
        item_name: 'Pipe material specification',
        description: 'Verify pipe material type and grade matches the approved drawings and BC Plumbing Code Table 2.3.1.1. Common materials include ABS, PVC (DWV), copper (Type L/M), and PEX. Reject non-listed products.',
        code_ref: 'BCPC Table 2.3.1.1 — Pipe material type & grade per approved drawings; reject non-listed products',
      },
      {
        id: 'RIP-003', is_critical: true,
        item_name: 'Drain, waste, and vent pipe sizing',
        description: 'Confirm drain and vent pipe diameters match the plumbing schedule. Check that no DWV pipe is undersized for the fixture unit load it serves per BCPC Table 2.3.5.',
        code_ref: 'BCPC Table 2.3.5 — DWV pipe diameter sized per fixture unit load; no undersized runs',
      },
      {
        id: 'RIP-004', is_critical: true,
        item_name: 'Pipe slope — drain and waste lines',
        description: 'Verify horizontal drain pipes slope at minimum 1:50 (2%) for pipes 65mm and under, and 1:100 (1%) for pipes over 65mm, per BCPC 2.4.1. Check with a level at multiple points.',
        code_ref: 'BCPC 2.4.1 — Drain slope: 1:50 (≤65 mm), 1:100 (>65 mm); verified at multiple points',
      },
      {
        id: 'RIP-005', is_critical: true,
        item_name: 'Vent stack height and termination',
        description: 'Confirm vent stack extends minimum 150mm above finished roof surface and is positioned per BCPC 2.6.5 clearances from windows, doors, and air intakes. Verify vent size is maintained.',
        code_ref: 'BCPC 2.6.5 — Vent stack: min. 150 mm above roof; clearances from windows, doors & air intakes',
      },
      {
        id: 'RIP-006', is_critical: true,
        item_name: 'Trap installation',
        description: 'Confirm every fixture has a code-compliant trap installed. Check trap-to-vent distance (max 600mm for 32mm traps per BCPC 2.5.2). No S-traps permitted under BCPC.',
        code_ref: 'BCPC 2.5.2 — Trap-to-vent max 600 mm (32 mm trap); S-traps not permitted under BCPC',
      },
      {
        id: 'RIP-007', is_critical: false,
        item_name: 'Cleanout provision',
        description: 'Verify cleanouts are installed at every change of direction greater than 45°, at the base of each vertical stack, and at intervals not exceeding 15m per BCPC 2.4.8. Ensure cleanouts are accessible.',
        code_ref: 'BCPC 2.4.8 — Cleanouts at direction changes >45°, stack bases & at max 15 m intervals',
      },
      {
        id: 'RIP-008', is_critical: true,
        item_name: 'Water supply pipe sizing',
        description: 'Confirm supply pipe sizing matches hydraulic design or fixture unit load tables. Check that main line, branches, and risers are correctly sized to maintain adequate pressure.',
        code_ref: 'BCPC Ch. 7 — Supply pipe sizing per fixture unit load & hydraulic design calculations',
      },
      {
        id: 'RIP-009', is_critical: false,
        item_name: 'Water supply shut-off provisions',
        description: 'Verify individual shut-off valves are installed at each fixture supply, at the water meter, and at branch points per BCPC 7.2. Confirm valve type is appropriate (full-port ball valve preferred).',
        code_ref: 'BCPC 7.2 — Individual shut-off valves at each fixture, meter & branch points required',
      },
      {
        id: 'RIP-010', is_critical: true,
        item_name: 'Pressure-test — water supply',
        description: 'Confirm water supply system has been pressure-tested at minimum 1.5 times working pressure or 860 kPa (125 psi) for minimum 15 minutes with no measurable drop, per BCPC 2.1.4.',
        code_ref: 'BCPC 2.1.4 — Pressure test: 860 kPa (125 psi) held for min. 15 minutes, no measurable drop',
      },
      {
        id: 'RIP-011', is_critical: true,
        item_name: 'Air test — DWV system',
        description: 'Confirm DWV rough-in has been air-tested at 35 kPa (5 psi) maintained for 15 minutes with no loss, prior to concealment, per BCPC 2.1.3. Inspector must witness or receive certified report.',
        code_ref: 'BCPC 2.1.3 — DWV air test: 35 kPa (5 psi) for 15 min. before concealment; inspector witnesses',
      },
      {
        id: 'RIP-012', is_critical: false,
        item_name: 'Pipe support and spacing',
        description: 'Inspect pipe hangers and supports for correct spacing (max 1.2m for ABS/PVC horizontal, 3m for copper horizontal per BCPC Table 2.2.7). Check that supports do not crush flexible pipe.',
        code_ref: 'BCPC Table 2.2.7 — Hanger spacing: max 1.2 m (ABS/PVC) and 3 m (copper) horizontal runs',
      },
      {
        id: 'RIP-013', is_critical: true,
        item_name: 'Penetrations through fire-rated assemblies',
        description: 'Confirm all plumbing penetrations through fire-rated walls, floors, or ceilings are protected with listed fire-stop systems. No open annular spaces permitted.',
        code_ref: 'BCBC 9.10 — Listed firestop system at all plumbing penetrations through rated assemblies',
      },
      {
        id: 'RIP-014', is_critical: false,
        item_name: 'Hot and cold supply separation',
        description: 'Verify minimum 150mm separation between hot and cold water lines where run parallel, or that insulation is provided to prevent thermal transfer per BCPC requirements.',
        code_ref: 'BCPC — Min. 150 mm separation between hot & cold parallel supply runs; or insulation provided',
      },
      {
        id: 'RIP-015', is_critical: true,
        item_name: 'Backflow prevention',
        description: 'Confirm backflow preventers or vacuum breakers are installed wherever required: hose bibs, irrigation systems, boilers, and any cross-connection potential with non-potable water.',
        code_ref: 'BCPC 2.7 / BCBC — Backflow preventers at hose bibs, irrigation systems & boilers',
      },
      {
        id: 'RIP-016', is_critical: false,
        item_name: 'In-floor heating rough-in',
        description: 'If hydronic in-floor heating is included, confirm loop layout, manifold location, and pressure test have been completed per manufacturer specs and mechanical drawings before slab pour.',
        code_ref: 'BCPC / Mfr. specs — Hydronic in-floor loops: layout, manifold & pressure test before slab pour',
      },
      {
        id: 'RIP-017', is_critical: true,
        item_name: 'Drain body and shower pan liner',
        description: 'For tiled shower applications, confirm shower pan liner is installed, properly flashed, and liner flood-tested (holding water for 24 hrs) before tile substrate is applied.',
        code_ref: 'BCPC 2.3.8 — Shower pan liner: properly flashed & flood-tested (24 hr) before tile substrate',
      },
    ],
  },

  // ─── RIE — Rough-in Electrical ───────────────────────────────────────────
  {
    phase_id: 'RIE',
    phase_name: 'Rough-in Electrical',
    inspection_stage: 'electrical',
    items: [
      {
        id: 'RIE-001', is_critical: true,
        item_name: 'Electrical permit and drawings on site',
        description: 'Confirm BC Safety Authority (BCSA) electrical permit is posted and approved drawings are on site. Verify permit scope covers all electrical work proposed.',
        code_ref: 'Electrical Safety Act / BCSA — Electrical permit posted; approved drawings on site before inspection',
      },
      {
        id: 'RIE-002', is_critical: true,
        item_name: 'Panel location, size, and labeling',
        description: 'Confirm the main panel and sub-panel locations match approved drawings. Verify panel ampacity, number of spaces, and manufacturer listing. Check for minimum 1m working clearance in front of panel.',
        code_ref: 'BCEC Rule 26-000 — Panel: location per drawings, ampacity, spaces & min. 1 m clear working space',
      },
      {
        id: 'RIE-003', is_critical: true,
        item_name: 'Grounding and bonding',
        description: 'Verify grounding electrode conductor size and connection to grounding electrode system (ground rods, water pipe, building steel) per BC Electrical Code Rule 10. Confirm bonding of all metallic systems.',
        code_ref: 'BCEC Rule 10-400 — Grounding electrode system: GEC size, connections & bonding of all metallic systems',
      },
      {
        id: 'RIE-004', is_critical: true,
        item_name: 'Conductor size and type',
        description: 'Spot-check wire gauge and insulation type against the circuit schedule. Verify conductor ampacity meets load requirements and is derated for conduit fill and temperature per BCEC Rules 4-004 and 4-006.',
        code_ref: 'BCEC Rules 4-004 / 4-006 — Conductor ampacity per circuit load; derated for conduit fill & temperature',
      },
      {
        id: 'RIE-005', is_critical: false,
        item_name: 'Circuit identification',
        description: 'Confirm all circuits are identified at the panel with circuit numbers and a directory. Verify no double-tapping of breakers unless the breaker is rated for it.',
        code_ref: 'BCEC Rule 2-100 — Circuit directory complete at panel; no double-tapping unless breaker is listed',
      },
      {
        id: 'RIE-006', is_critical: true,
        item_name: 'Breaker sizing and type',
        description: 'Verify breaker size matches wire gauge per BCEC ampacity tables. Check that AFCI breakers are installed on all bedroom, living, and family room circuits per BCEC Rule 26-722.',
        code_ref: 'BCEC Rule 26-722 / Rule 14-104 — AFCI breakers required on bedroom, living & family room circuits',
      },
      {
        id: 'RIE-007', is_critical: true,
        item_name: 'GFCI protection locations',
        description: 'Confirm GFCI protection is installed at all required locations: bathrooms, kitchens (within 1.5m of sink), garages, outdoor outlets, and unfinished basements per BCEC Rule 26-700.',
        code_ref: 'BCEC Rule 26-700(7) — GFCI at bathrooms, kitchen within 1.5 m of sink, garage & outdoor outlets',
      },
      {
        id: 'RIE-008', is_critical: true,
        item_name: 'AFCI protection',
        description: 'Verify arc-fault circuit interrupter protection is installed per BCEC Rule 26-722 in all required locations. Confirm AFCI breakers are from a listed manufacturer and match panel brand where required.',
        code_ref: 'BCEC Rule 26-722 — AFCI from listed mfr.; matches panel brand where required; scope per rule',
      },
      {
        id: 'RIE-009', is_critical: false,
        item_name: 'Box fill calculations',
        description: 'Inspect junction and device boxes for compliance with box fill rules (BCEC Rule 12-3034). Check for overcrowding — count conductors, devices, and fittings against the box volume.',
        code_ref: 'BCEC Rule 12-3034 — Box fill: conductors + devices + fittings ≤ listed box volume',
      },
      {
        id: 'RIE-010', is_critical: false,
        item_name: 'Conduit fill and bend radius',
        description: 'For conduit wiring, verify conductor fill does not exceed permitted percentage per BCEC Appendix B tables. Check conduit bends for minimum radius and confirm no more than 360° of bends between pull points.',
        code_ref: 'BCEC Appendix B — Conduit fill ≤ permitted %; bend radius & max 360° bends between pull points',
      },
      {
        id: 'RIE-011', is_critical: true,
        item_name: 'Cable protection — physical damage',
        description: 'Inspect NMD-90 or other non-metallic cable for protection against physical damage in exposed or partially exposed locations. Requires conduit or protection board at vulnerable sections per BCEC Rule 12-516.',
        code_ref: 'BCEC Rule 12-516 — NMD-90 cable: conduit or protection board at all exposed/vulnerable sections',
      },
      {
        id: 'RIE-012', is_critical: true,
        item_name: 'Penetrations through fire-rated assemblies',
        description: 'Confirm all electrical penetrations through fire-rated walls, floors, and ceilings are sealed with listed firestop systems. Electrical boxes in fire walls require listed fire-rated boxes or putty pads.',
        code_ref: 'BCBC 9.10 — Listed firestop at all electrical penetrations; rated boxes or putty pads in fire walls',
      },
      {
        id: 'RIE-013', is_critical: true,
        item_name: 'Smoke and CO alarm rough-in',
        description: 'Verify rough-in wiring for interconnected smoke alarms on every floor level, in every bedroom, and outside sleeping areas per BCBC 9.10.19. CO alarms required adjacent to all sleeping areas where fuel appliances are present.',
        code_ref: 'BCBC 9.10.19 — Interconnected smoke alarms: every floor, bedroom & outside sleeping areas',
      },
      {
        id: 'RIE-014', is_critical: false,
        item_name: 'Dedicated circuits for appliances',
        description: 'Confirm dedicated 20A circuits are rough-in for all required appliances: refrigerator, dishwasher, microwave, and two small-appliance circuits for kitchen countertops per BCEC Rule 26-712.',
        code_ref: 'BCEC Rule 26-712 — Dedicated 20 A circuits: fridge, dishwasher, microwave & countertop circuits',
      },
      {
        id: 'RIE-015', is_critical: false,
        item_name: 'EV charger rough-in',
        description: 'If EV charger is included or is a Vancouver by-law requirement, confirm conduit and conductor sizing for Level 2 charging (typically 240V/40A circuit) is roughed in to garage or parking area.',
        code_ref: 'CoV By-law / BCEC — EV charger conduit & 240 V/40 A conductor roughed in to garage',
      },
      {
        id: 'RIE-016', is_critical: false,
        item_name: 'Low-voltage and communications rough-in',
        description: 'Confirm low-voltage wiring (data, telephone, audio/video, security) is rough-in with adequate separation from power wiring per BCEC Rule 16-000 series and manufacturer requirements.',
        code_ref: 'BCEC Rule 16-000 — Low-voltage wiring: adequate separation from power per mfr. requirements',
      },
      {
        id: 'RIE-017', is_critical: false,
        item_name: 'Bathroom exhaust fan wiring',
        description: 'Verify exhaust fan rough-in wiring and switch locations. Where fan/light combo units are used, confirm correct switched and unswitched conductors are provided as per unit requirements.',
        code_ref: 'BCBC 9.32 — Bathroom exhaust fan rough-in wiring & switch locations per unit requirements',
      },
      {
        id: 'RIE-018', is_critical: true,
        item_name: 'Dryer and range circuits',
        description: 'Confirm 240V/30A circuit for dryer and 240V/40-50A circuit for range are correctly sized, correctly terminated, and located per the approved drawings.',
        code_ref: 'BCEC Rule 26-744 — Dryer: 240 V/30 A circuit; Range: 240 V/40–50 A circuit per drawings',
      },
    ],
  },

  // ─── FPL — Final Plumbing ────────────────────────────────────────────────
  {
    phase_id: 'FPL',
    phase_name: 'Final Plumbing',
    inspection_stage: 'plumbing',
    items: [
      {
        id: 'FPL-001', is_critical: true,
        item_name: 'All fixture installations complete',
        description: 'Confirm all fixtures listed on the permit (toilets, sinks, tubs, showers, dishwashers, washing machine connections) are fully installed, sealed, and functional.',
        code_ref: 'BCPC 2.1 / Permit — All permitted fixtures installed, sealed & functional before sign-off',
      },
      {
        id: 'FPL-002', is_critical: true,
        item_name: 'Fixture supply stops functional',
        description: 'Test all fixture shut-off valves (angle stops) for operation. Valves must open and close fully with no leaks at packing or supply connections under operating pressure.',
        code_ref: 'BCPC 7.2 — Fixture shut-off valves: full open/close with no leaks at packing under pressure',
      },
      {
        id: 'FPL-003', is_critical: true,
        item_name: 'Drain and overflow function test',
        description: 'Perform a functional drain test on all fixtures. Fill basins, tubs, and showers and confirm drains flow freely with no overflow, gurgling, or siphoning of traps.',
        code_ref: 'BCPC 2.4.1 — Drain & overflow functional test: free flow, no gurgling or trap siphoning',
      },
      {
        id: 'FPL-004', is_critical: true,
        item_name: 'Toilet flush and seal',
        description: 'Test each toilet for full flush function, fill valve shut-off, and base-to-floor seal. Check for rocking, inadequate floor bolts, or cracked base. Flush twice to observe tank refill rate.',
        code_ref: 'BCPC 2.3.3 — Toilet: full flush, fill shut-off, base-to-floor sealed; no rocking or cracked base',
      },
      {
        id: 'FPL-005', is_critical: true,
        item_name: 'Hot water temperature at fixtures',
        description: 'Measure hot water delivery temperature at each fixture. Maximum 49°C (120°F) at accessible fixtures per BCPC and Vancouver By-law. Confirm thermostatic mixing valve is installed and set correctly if required.',
        code_ref: 'BCPC 7.4 / CoV By-law — Hot water max 49°C (120°F) at accessible fixtures; TMV set & verified',
      },
      {
        id: 'FPL-006', is_critical: true,
        item_name: 'Shower and tub surround sealing',
        description: 'Inspect all grout and caulk joints at tub and shower surrounds, particularly at changes of plane (floor-to-wall, wall corners). Gaps or missing sealant are a water intrusion deficiency.',
        code_ref: 'BCPC 2.3 — Shower/tub surround: grout & caulk continuous at all changes of plane',
      },
      {
        id: 'FPL-007', is_critical: true,
        item_name: 'Water heater installation',
        description: 'Inspect water heater for correct capacity (as specified), pressure-relief valve with discharge pipe terminating within 150mm of floor, seismic strapping where required, and proper combustion air.',
        code_ref: 'BCPC 7.6 — Water heater: PRV discharge pipe within 150 mm of floor; seismic strap required',
      },
      {
        id: 'FPL-008', is_critical: false,
        item_name: 'Water pressure at fixtures',
        description: 'Measure static water pressure at a hose bib or laundry connection. Should be between 200 kPa and 550 kPa at the building. Pressure-reducing valve (PRV) setting must be verified if one is installed.',
        code_ref: 'BCPC 7.1 — Static pressure: 200–550 kPa at building; PRV setting verified if installed',
      },
      {
        id: 'FPL-009', is_critical: false,
        item_name: 'Dishwasher and appliance connections',
        description: 'Inspect dishwasher supply and drain connection. Confirm high-loop or air-gap device is installed on the drain line to prevent backflow per BCPC.',
        code_ref: 'BCPC 2.4.9 — Dishwasher drain: high-loop or air-gap device required to prevent backflow',
      },
      {
        id: 'FPL-010', is_critical: false,
        item_name: 'Hose bib and exterior connections',
        description: 'Inspect all hose bibs and exterior plumbing connections. Confirm vacuum breakers are installed. Verify frost-free sillcocks or winterization provisions where applicable.',
        code_ref: 'BCPC 2.7 — Hose bibs: vacuum breaker installed; frost-free sillcock or winterization provided',
      },
      {
        id: 'FPL-011', is_critical: true,
        item_name: 'Gas line pressure test and meter connection',
        description: 'Confirm gas rough-in pressure test has been completed and approved by FortisBC. Verify meter connection, sediment trap at each appliance, and gas shut-off at each appliance location.',
        code_ref: 'FortisBC Regs. — Gas pressure test approved; sediment trap at each appliance; shut-offs verified',
      },
      {
        id: 'FPL-012', is_critical: true,
        item_name: 'Sewer connection and cleanout',
        description: 'Confirm sewer lateral connection to City system has been approved by Engineering Services. Verify exterior cleanout is installed, accessible, and properly capped.',
        code_ref: 'CoV Engineering — Sewer lateral to City system approved; exterior cleanout accessible & capped',
      },
      {
        id: 'FPL-013', is_critical: true,
        item_name: 'Floor drain trap primers',
        description: 'Inspect all floor drains for p-trap with primer (mechanical or electronic trap primer), particularly in utility rooms and garages, to prevent sewer gas entry.',
        code_ref: 'BCPC 2.4.6 — Floor drains: p-trap with mechanical or electronic trap primer required',
      },
      {
        id: 'FPL-014', is_critical: false,
        item_name: 'Laundry standpipe and trap',
        description: 'Confirm laundry standpipe is minimum 450mm height, correctly trapped, and vented. Washing machine drain hose is properly seated without being inserted more than 150mm.',
        code_ref: 'BCPC 2.4.3 — Laundry standpipe: min. 450 mm height, trapped & vented; hose max 150 mm insert',
      },
      {
        id: 'FPL-015', is_critical: true,
        item_name: 'Tub and shower controls — anti-scald',
        description: 'Test all shower and tub faucets for pressure-balancing or thermostatic control function. Confirm controls limit hot water delivery to 49°C max per BCPC 7.4 and CSA B125.3.',
        code_ref: 'BCPC 7.4 / CSA B125.3 — Anti-scald: pressure-balance or thermostatic; max 49°C at shower/tub',
      },
    ],
  },

  // ─── FEL — Final Electrical ──────────────────────────────────────────────
  {
    phase_id: 'FEL',
    phase_name: 'Final Electrical',
    inspection_stage: 'electrical',
    items: [
      {
        id: 'FEL-001', is_critical: true,
        item_name: 'BCSA electrical inspection approval',
        description: 'Confirm BC Safety Authority has completed their final electrical inspection and issued an Electrical Inspection Certificate or approval letter. This is a mandatory prerequisite for City occupancy sign-off.',
        code_ref: 'Electrical Safety Act — BCSA Electrical Inspection Certificate mandatory for occupancy sign-off',
      },
      {
        id: 'FEL-002', is_critical: false,
        item_name: 'Panel labeling and directory complete',
        description: 'Verify all breakers are labeled with circuit descriptions matching actual loads. Panel directory must be legible, accurate, and affixed inside the panel door.',
        code_ref: 'BCEC Rule 2-100 — Panel directory: accurate circuit labels, legible & affixed inside panel door',
      },
      {
        id: 'FEL-003', is_critical: true,
        item_name: 'All devices and fixtures installed',
        description: 'Confirm all outlets, switches, light fixtures, and cover plates are installed with no open boxes. Every device box must have a cover plate — open boxes are a safety hazard.',
        code_ref: 'BCEC Rule 12-3000 — All boxes covered; open boxes are a prohibited safety hazard',
      },
      {
        id: 'FEL-004', is_critical: true,
        item_name: 'GFCI outlet function test',
        description: 'Test all GFCI outlets and breakers using a calibrated tester. Confirm trip and reset function. Verify all downstream devices protected by that GFCI are confirmed non-functional when tripped.',
        code_ref: 'BCEC Rule 26-700 — GFCI trip/reset tested; downstream devices non-live when tripped',
      },
      {
        id: 'FEL-005', is_critical: true,
        item_name: 'AFCI breaker function test',
        description: 'Test AFCI breakers using the test button on the breaker. Verify correct breakers are designated AFCI in the panel directory and match the circuit they protect.',
        code_ref: 'BCEC Rule 26-722 — AFCI breaker test-button function; correct directory designation verified',
      },
      {
        id: 'FEL-006', is_critical: true,
        item_name: 'Smoke alarm function test',
        description: 'Test all smoke alarms for operation using the test button and confirm interconnection: activating one alarm must trigger all others on the same floor and in all sleeping areas. Test battery backup.',
        code_ref: 'BCBC 9.10.19 — Smoke alarms: test-button function, interconnection & battery backup verified',
      },
      {
        id: 'FEL-007', is_critical: true,
        item_name: 'Carbon monoxide alarm function test',
        description: 'Test all CO alarms for function and confirm correct locations adjacent to sleeping areas. CO alarms must be interconnected with smoke alarms where required by BCBC 9.10.19.3.',
        code_ref: 'BCBC 9.10.19.3 — CO alarms adjacent to sleeping areas; interconnected with smoke alarms',
      },
      {
        id: 'FEL-008', is_critical: true,
        item_name: 'Exterior lighting and weatherproofing',
        description: 'Inspect all exterior outlets and fixtures for in-use covers, proper weatherproofing, and GFCI protection. Confirm no exposed wiring or open conduit penetrations in exterior walls.',
        code_ref: 'BCEC Rule 26-700 — Exterior outlets: in-use covers, weatherproofing & GFCI protection required',
      },
      {
        id: 'FEL-009', is_critical: false,
        item_name: 'Bathroom exhaust fan function',
        description: 'Test each bathroom exhaust fan for operation. Confirm fan vents to the exterior (not to attic or crawlspace) through a listed duct with a damper. Measure airflow if CFM specification is on drawings.',
        code_ref: 'BCBC 9.32 — Bathroom exhaust: exterior duct with damper; no attic or crawlspace termination',
      },
      {
        id: 'FEL-010', is_critical: false,
        item_name: 'Kitchen range hood and exhaust',
        description: 'Test range hood fan operation and lighting. Confirm exterior termination with a functioning damper and correct makeup air provision if required for high-CFM hoods.',
        code_ref: 'BCBC 9.32.3 — Range hood: exterior damper functional; makeup air provided if >500 CFM',
      },
      {
        id: 'FEL-011', is_critical: true,
        item_name: 'Dryer and range connections',
        description: 'Confirm range and dryer final connections are complete, correctly polarized, and properly grounded. Check for correct strain relief and no exposed conductors at appliance terminal blocks.',
        code_ref: 'BCEC Rule 26-744 — Dryer & range: correct polarity, grounding & strain relief at terminals',
      },
      {
        id: 'FEL-012', is_critical: false,
        item_name: 'EV charger final connection',
        description: 'If EV charger is installed, confirm Level 2 charger is connected, labeled at panel, GFCI protected where required, and unit is listed by a recognized certification body (CSA, UL).',
        code_ref: 'BCEC Rule 26-740 — EV charger: listed (CSA/UL), labeled at panel & GFCI where required',
      },
      {
        id: 'FEL-013', is_critical: true,
        item_name: 'Service entrance and meter base',
        description: 'Inspect service entrance conductor condition, meter base seal, and weatherhead. Confirm BC Hydro service connection is complete and metered. Check for approved service entrance rating.',
        code_ref: 'BCEC Rule 6-300 — Service entrance: conductor condition, meter base seal & BC Hydro connected',
      },
      {
        id: 'FEL-014', is_critical: true,
        item_name: 'No double-lugging or improper terminations',
        description: 'Open panel and inspect all terminations. Confirm no double-lugged breakers (unless breaker is listed for two conductors), all conductors are torqued to manufacturer specs, and no aluminum-to-copper direct connections.',
        code_ref: 'BCEC Rule 14-104 — No double-lugging; all conductors torqued to mfr. specs; no Al-to-Cu direct',
      },
      {
        id: 'FEL-015', is_critical: false,
        item_name: 'Bathroom heat source',
        description: 'Confirm each bathroom has a permanently installed heat source per BCBC 9.33.1. Confirm it is hardwired (not plug-in) and that a GFCI-protected outlet is within reach of the sink.',
        code_ref: 'BCBC 9.33.1 — Each bathroom requires a permanently installed hardwired heat source',
      },
      {
        id: 'FEL-016', is_critical: false,
        item_name: 'Tamper-resistant receptacles',
        description: 'Verify tamper-resistant (TR) receptacles are installed throughout the dwelling per BCEC Rule 26-700(11). Test with a TR tester or probe to confirm shutters are functional.',
        code_ref: 'BCEC Rule 26-700(11) — Tamper-resistant (TR) receptacles throughout the dwelling; shutters tested',
      },
    ],
  },

  // ─── FOC — Final Occupancy / Life Safety ─────────────────────────────────
  {
    phase_id: 'FOC',
    phase_name: 'Final Occupancy / Life Safety',
    inspection_stage: 'life_safety',
    items: [
      {
        id: 'FOC-001', is_critical: true,
        item_name: 'All prior inspections signed off',
        description: 'Confirm all intermediate inspection approvals are recorded in the file: Excavation, Foundation, Framing, Insulation, Rough-in Plumbing, Rough-in Electrical, and all trade sub-inspections. No occupancy without complete inspection history.',
        code_ref: 'BCBC 2.2.7 — All prior inspections (EXC, FND, FRM, INS, RIP, RIE) signed off and on file',
      },
      {
        id: 'FOC-002', is_critical: true,
        item_name: 'BCSA electrical certificate received',
        description: 'Confirm BC Safety Authority Electrical Inspection Certificate is in the permit file. This is mandatory — no occupancy permit may be issued without it.',
        code_ref: 'Electrical Safety Act — BCSA Electrical Inspection Certificate mandatory prerequisite for occupancy',
      },
      {
        id: 'FOC-003', is_critical: true,
        item_name: 'Engineered systems sign-off letters',
        description: 'Confirm Letters of Assurance (Schedule B/C) from the structural engineer of record and any other design professionals are received and on file as required by BCBC Section 2.2.',
        code_ref: 'BCBC 2.2.7.2 / 2.2.7.3 — Schedule B/C assurance letters from all design professionals on file',
      },
      {
        id: 'FOC-004', is_critical: true,
        item_name: 'Energy compliance documentation',
        description: "Confirm the required BC Energy Step Code compliance path documentation is complete: either an EnerGuide label, air leakage test results, or confirmed compliance report per the project's declared Step level.",
        code_ref: 'BC Energy Step Code Reg. — EnerGuide label, air test results or compliance report on file',
      },
      {
        id: 'FOC-005', is_critical: true,
        item_name: 'Smoke alarms — locations and interconnection',
        description: 'Conduct a full site test of the smoke alarm system. One alarm on each floor level, one in each bedroom, one outside each sleeping area. All must be interconnected and functional with battery backup.',
        code_ref: 'BCBC 9.10.19 — Smoke alarms: one per floor, bedroom & outside sleeping; all interconnected',
      },
      {
        id: 'FOC-006', is_critical: true,
        item_name: 'Carbon monoxide alarms',
        description: 'Confirm CO alarms are installed adjacent to all sleeping areas in any building with a fuel-burning appliance, attached garage, or forced-air system. Test each unit and confirm interconnection.',
        code_ref: 'BCBC 9.10.19.3 — CO alarms: fuel appliances, attached garage & forced-air; all interconnected',
      },
      {
        id: 'FOC-007', is_critical: true,
        item_name: 'Means of egress — all floors',
        description: 'Walk all egress paths. Confirm each sleeping room has a window with minimum 0.35m² openable area and minimum 380mm clear height and width per BCBC 9.9.10. Confirm all egress doors open from the inside without a key.',
        code_ref: 'BCBC 9.9.10 — Egress window: min. 0.35 m² openable area; 380 mm clear height & width',
      },
      {
        id: 'FOC-008', is_critical: true,
        item_name: 'Stairway guards and handrails',
        description: 'Inspect all interior and exterior stairs. Verify guard height (min 900mm for stairs, 1070mm for decks over 1.8m), picket spacing (no opening greater than 100mm), and continuous graspable handrail on all flights.',
        code_ref: 'BCBC 9.8.7 — Guards: ≥900 mm (stairs), ≥1070 mm (decks >1.8 m); picket gap ≤100 mm',
      },
      {
        id: 'FOC-009', is_critical: true,
        item_name: 'Balcony and deck guards',
        description: 'Inspect all deck, balcony, and porch guards. Minimum height 900mm for deck heights under 1.8m, 1070mm above. Confirm structural connection of guard posts to framing and check for lateral load capacity.',
        code_ref: 'BCBC 9.8.8 — Deck guards: structural post connection to framing; lateral load capacity verified',
      },
      {
        id: 'FOC-010', is_critical: true,
        item_name: 'Exterior stairs and landings',
        description: 'Inspect front and rear exit stairs for correct rise/run dimensions (max 200mm rise, min 210mm run per BCBC 9.8.4), slip-resistant surfaces, and proper landing dimensions at all doors.',
        code_ref: 'BCBC 9.8.4 — Exterior stairs: max 200 mm rise / min. 210 mm run; slip-resistant surface',
      },
      {
        id: 'FOC-011', is_critical: true,
        item_name: 'Mechanical ventilation system',
        description: 'Test whole-house mechanical ventilation system (HRV/ERV or exhaust-only system) for operation. Confirm principal exhaust and supply flows meet minimum rates per BCBC 9.32 and ASHRAE 62.2.',
        code_ref: 'BCBC 9.32 / ASHRAE 62.2 — HRV/ERV flow rates meet minimum principal exhaust & supply rates',
      },
      {
        id: 'FOC-012', is_critical: false,
        item_name: 'Bathroom and kitchen exhaust',
        description: 'Confirm all bathroom fans and kitchen exhaust terminate to exterior with functioning dampers. Measure airflow or confirm minimum 25L/s bath / 50L/s kitchen per BCBC 9.32.3.7.',
        code_ref: 'BCBC 9.32.3.7 — Bath exhaust: min. 25 L/s; Kitchen exhaust: min. 50 L/s to exterior',
      },
      {
        id: 'FOC-013', is_critical: true,
        item_name: 'Combustion appliance safety',
        description: 'Inspect all fuel-burning appliances (furnace, boiler, water heater, fireplace) for adequate combustion air supply, proper venting, and draft. Check for signs of spillage or back-drafting at the draft diverter.',
        code_ref: 'BCBC 9.33 — Fuel-burning appliances: combustion air adequate, proper venting & no back-draft signs',
      },
      {
        id: 'FOC-014', is_critical: true,
        item_name: 'Garage-to-dwelling fire separation',
        description: 'Inspect the fire separation between attached garage and dwelling. Required minimum 12.7mm Type X drywall on garage side of common wall and ceiling. Confirm self-closing, solid-core or 45-min fire-rated door between garage and dwelling.',
        code_ref: 'BCBC 9.10.3 — Garage: 12.7 mm Type X drywall on common wall + 45-min self-closing fire-rated door',
      },
      {
        id: 'FOC-015', is_critical: true,
        item_name: 'Exterior cladding and weatherproofing completeness',
        description: 'Conduct a full exterior perimeter walk. Confirm siding, flashing, trim, sealants, and caulking are complete with no open penetrations, missing kick-out flashings, or unsealed window/door perimeters.',
        code_ref: 'BCBC 9.27 — Exterior cladding: flashing, kick-out flashings, sealants & no open penetrations',
      },
      {
        id: 'FOC-016', is_critical: true,
        item_name: 'Address number visibility',
        description: 'Confirm civic address number is installed, visible from the street, and meets minimum size and contrast requirements of the Vancouver Fire By-law and Building By-law. Required for emergency response.',
        code_ref: 'CoV Fire By-law — Civic address: visible from street, meets size & contrast requirements',
      },
      {
        id: 'FOC-017', is_critical: true,
        item_name: 'Site drainage and grading',
        description: 'Inspect final site grading. Confirm positive drainage away from the building (minimum 2% slope for first 1.5m per BCBC 9.12). No ponding adjacent to foundation or in window wells.',
        code_ref: 'BCBC 9.12.3 — Site grading: min. 2% slope away from building for first 1.5 m; no ponding',
      },
      {
        id: 'FOC-018', is_critical: false,
        item_name: 'Window and door operation',
        description: 'Operate all windows and exterior doors to confirm smooth function, latching, weatherstripping seal, and locking hardware. Confirm egress windows open without tools or keys.',
        code_ref: 'BCBC 9.7 — Windows & doors: smooth operation, latch, weatherstrip seal & egress without key',
      },
      {
        id: 'FOC-019', is_critical: true,
        item_name: 'Accessibility compliance (if applicable)',
        description: 'If the project is subject to BCBC Part 3 accessibility requirements or City of Vancouver accessibility policies, confirm all required features are installed: accessible routes, door widths, grab bar blocking.',
        code_ref: 'BCBC Part 3 Div. B / CoV Policy — Accessible routes, door widths & grab bar blocking verified',
      },
      {
        id: 'FOC-020', is_critical: true,
        item_name: 'Occupancy permit issuance authorization',
        description: "Confirm the inspector's final checklist is complete, all deficiencies are resolved or have agreed-upon compliance schedules, and the file is ready for occupancy permit issuance by the Chief Building Inspector.",
        code_ref: 'BCBC 2.3 — Occupancy permit: all deficiencies resolved; CBI authorization confirmed on file',
      },
    ],
  },
]

/**
 * Return the relevant phase(s) for a given job stage and optional discipline.
 *
 * - Structural stages 1–4 use STAGE_PHASE_MAP directly.
 * - Stage 5 (Final Occupancy) always returns FOC.
 * - Plumbing discipline → RIP (rough) or FPL (final) based on stage.
 * - Electrical discipline → RIE (rough) or FEL (final) based on stage.
 * - Unknown stage with no discipline → all phases.
 */
export function getPhasesForStage(
  stage: number,
  discipline?: string
): InspectionPhase[] {
  if (discipline === 'plumbing') {
    const phaseId = stage >= 5 ? 'FPL' : 'RIP'
    const phase = INSPECTION_PHASES.find(p => p.phase_id === phaseId)
    return phase ? [phase] : INSPECTION_PHASES
  }
  if (discipline === 'electrical') {
    const phaseId = stage >= 5 ? 'FEL' : 'RIE'
    const phase = INSPECTION_PHASES.find(p => p.phase_id === phaseId)
    return phase ? [phase] : INSPECTION_PHASES
  }

  const phaseId = STAGE_PHASE_MAP[stage]
  if (!phaseId) return INSPECTION_PHASES
  const phase = INSPECTION_PHASES.find(p => p.phase_id === phaseId)
  return phase ? [phase] : INSPECTION_PHASES
}

/** Look up a single phase by ID. */
export function getPhaseById(phaseId: string): InspectionPhase | undefined {
  return INSPECTION_PHASES.find(p => p.phase_id === phaseId)
}

/** All item IDs across all phases — useful for initialising empty response maps. */
export function allItemIds(): string[] {
  return INSPECTION_PHASES.flatMap(p => p.items.map(i => i.id))
}
