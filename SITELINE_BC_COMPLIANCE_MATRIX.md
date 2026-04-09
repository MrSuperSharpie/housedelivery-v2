# SiteLine BC Compliance & Permitting Matrix

## Architectural Philosophy: The Three Layers
SiteLine does not assume a single universal permit list. Compliance is structured in three cascading layers:
1. **Province-Wide Base:** BC Building Code / Plumbing Code / Electrical / Gas framework.
2. **AHJ Overlay:** Municipality (e.g., Surrey, Burnaby), Vancouver (Custom By-law), or First Nation Land Office.
3. **Project-Specific Overlay:** House, Duplex, Kit-of-parts, Modular, On-reserve, Off-reserve.

## Database Field Schema per Stage Item
Every item in the stages below must contain the following data structure:
* `is_required` (Boolean or Conditional Logic)
* `permit_type` (String)
* `responsible_party` (Enum: Builder, Inspector, Auditor, AHJ)
* `document_upload_required` (Boolean)
* `inspection_status` (Enum: Pending, Passed, Failed, N/A)
* `ahj_notes` (Text)
* `dependencies` (Array of preceding required items)

---

## Core Permit Stages

### 1. Project Setup and Jurisdiction Check
* Project address and legal description
* AHJ / municipality / First Nation land office / Vancouver exception flag
* Project type: new build, addition, renovation, change of occupancy, demolition
* Building type: house, duplex, rowhouse, fourplex, multi-unit
* Code path: Part 9 or Part 3
* Site survey / topo / legal setbacks
* Zoning use, density, height, setbacks, parking, frontage, access
* Registered professionals required flag
* Separate trade permits required flag

### 2. Planning and Site Approvals
* Zoning confirmation
* Rezoning, variance, DP, or DP exemption check
* Civic address confirmation
* Site servicing / utility servicing approval
* Driveway crossing / boulevard / ditch enclosure / frontage works approval
* Tree protection / removal / arborist requirements
* Demolition permit (if applicable)
* Road use, lane closure, or construction access permits

### 3. Building Permit Submission Package
* Site plan
* Code matrix & Occupancy classification
* Building area, height, storeys, unit count
* Setbacks, lot coverage, softscape / hardscape, parking, open space
* Firefighting access
* Accessibility / adaptable unit requirements
* Spatial separation / limiting distance / opening calculations
* Sprinkler determination
* Architectural, structural, mechanical, electrical drawings/schedules
* Plumbing design
* Energy model / Step Code / compliance forms
* Professional assurance documents

### 4. Site Prep and Pre-Excavation
* Underground services identification
* Tree barriers / arborist protection
* Demolition completion
* Site clearing and removals
* Erosion and sediment control
* Excavation layout & Rough site grading
* Shoring / slope protection
* Temporary construction access and safety controls

### 5. Footings, Foundation, and Slab
* Footing excavation, forms, and rebar
* Footing inspection
* Foundation wall forms and rebar
* Foundation wall inspection
* Damp-proofing / waterproofing & Drainage board
* Perimeter drain / drain tile & Foundation drainage connection
* Backfill approval & Granular base
* Under-slab poly / vapour barrier
* Soil gas / radon rough-in
* Slab reinforcement & Slab-on-grade pour
* Anchor bolts / hold-down embeds

### 6. Structural Frame
* Bearing walls, Columns / beams
* Floor and Roof framing / trusses
* Shear walls and lateral system
* Hold-downs and tie-downs
* Stairs framing & Deck / balcony structural framing
* Seismic restraint elements
* Part 4 engineering (if exceeding Part 9 limits)
* Framing inspection

### 7. Building Envelope
* Wall and Roof sheathing
* Weather-resistive barrier / air barrier
* Rainscreen assembly
* Cladding support and attachment
* Windows and Exterior doors
* Flashing (heads, sills, penetrations, transitions)
* Roof underlayment / membrane & Roofing
* Soffits, fascia, gutters, downspouts
* Balcony / terrace membranes and drainage
* Confirm positive slope to drain away from building

### 8. Fire and Life Safety
* Fire-resistance-rated walls and floors
* Demising walls & Continuity of fire separations
* Penetration firestopping & Stair fire blocking
* Smoke and Carbon monoxide alarms
* Egress doors and egress windows
* Guards, handrails, grab-bar backing
* Accessible / adaptable entrance details

### 9. Plumbing Permit and Scope
* Sanitary and Domestic water piping
* Venting
* Roof, site, and foundation drainage connections
* Plumbing fixtures (tubs / showers / toilets / sinks)
* Rough-in inspection & Pressure / leak testing
* Fire separation continuity at penetrations
* Final plumbing inspection

### 10. Electrical Permit and Scope
* Service entrance, Meter, and main distribution
* Grounding and bonding
* Rough wiring & Outlet boxes
* Branch circuits, Lighting, and switching
* Smoke / CO interconnection
* Exterior weatherproof devices
* Telecom / conduit provisions
* Panel installation
* Rough and Final electrical inspection

### 11. Gas Permit and Mechanical / HVAC Scope
* Gas piping and venting
* Furnace / boiler / fireplace / range / water heater
* Heat pump or other HVAC equipment
* Ventilation system (ERV / HRV)
* Bathroom and kitchen exhaust
* Combustion air / appliance clearances
* Heat-load calculations
* Rough mechanical inspection
* Gas declaration / inspection
* Final mechanical / gas approval

### 12. Insulation and Energy Compliance
* Wall, Roof, and Slab/foundation insulation packages
* Window U-values / SHGC
* Airtightness strategy
* Step Code / Energy Step Code target
* Energy model & Heat pump assumptions
* Insulation inspection
* Energy compliance documentation upload

### 13. Interior Completion
* Drywall & Moisture-resistant board
* Tile backer
* Interior doors, hardware, flooring
* Cabinets and millwork
* Blocking for fixtures
* Plumbing and Electrical trim
* HVAC grilles and controls
* Paint and finishes
* Accessibility finish items

### 14. Exterior Works and Site Finalization
* Final grading & Site drainage
* Downspout discharge
* Walks, stairs, guards, ramps
* Accessible exterior path
* Driveway completion
* Landscaping / softscape restoration
* Tree compliance sign-off
* Utility and servicing completion

### 15. Inspections, Final Approval, and Occupancy
* Scheduled and passed inspections tracking
* Final building approval
* Occupancy / final acceptance