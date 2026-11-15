// Public general principles, never evidence of a House Delivery assembly.
// This deliberately contains no proprietary specifications or numeric design targets.
export const thermalEnvelopeRecord={
 id:'thermal_envelope',
 subject:'General thermal bridging, whole-wall effective R-value and condensation principles; actual House Delivery wall assembly requires confirmation',
 status:'team_confirmation' as const,
 authority:'verified_general_building_science' as const,
 sourceUrls:[
  'https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/keeping-heat.html',
  'https://www.cfsei.org/assets/docs/designguides/thermal_design_guide_2015_edition.pdf'
 ],
 factIds:[],
 text:'Steel studs can bridge an insulation layer, so the whole-wall effective R-value matters, not just the insulation’s labelled R-value. In general, continuous exterior insulation reduces that heat-flow path and helps keep wall components warmer; cladding attachments and junctions also need thermal-bridge detailing. Condensation control additionally depends on continuous airtightness, suitable vapour control, indoor humidity and the local climate. House Delivery’s selected wall build-up, insulation type and thickness, attachment details and verified effective R-value need project-specific confirmation.'
};
export function thermalEnvelopeAsked(question:string){
 return /thermal bridg|condens|dew point|continuous (?:exterior )?insulat|whole.wall|effective[^?;.]{0,20}R.value|(?:steel|metal)[^?;.]{0,45}(?:conduct|heat loss)|(?:wall|framing)[^?;.]{0,45}(?:air barrier|vapou?r|cold spot|insulat)/i.test(question);
}
// Physical heat-transfer speed is not construction/delivery speed. A genuine
// project-speed or commercial claim in the same question still needs evidence.
export function heatTransferSpeedOnly(question:string){
 if(!thermalEnvelopeAsked(question))return false;
 const nonPhysical=question
  .replace(/\b(?:conduct\w*|transfer\w*|transmit\w*|flows?|travels?)[^?;.!]{0,40}\b(?:faster|fast|quickly|quicker|slower|slowly)\b/gi,'')
  .replace(/\b(?:faster|slower|quicker)\s+(?:heat|thermal)\s+(?:transfer|flow|conduction)\b/gi,'');
 return !/speed|fast|quick|slow|time advantage|sooner|schedule advantage/i.test(nonPhysical);
}
