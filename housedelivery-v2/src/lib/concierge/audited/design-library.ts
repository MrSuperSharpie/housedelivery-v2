import {createHash} from 'node:crypto';
import data from '@/data/concierge/public-design-library.json';
// Explicit, founder-approved public addition. No docs, maintainer package or
// unpublished design inventory is made accessible to inference.
export function validateDesignLibrary(value:unknown){
 if(createHash('sha256').update(JSON.stringify(value)).digest('hex')!==
 '1a0141b792c676aed1d669e29940717a91457d4d4d147a7d3fcf115a4d90946a')throw Error('Public design-library release mismatch');
}
validateDesignLibrary(data);
export const designLibrary=data;
export const designLibraryEvidence={id:data.id,data:{text:data.text,qualification:data.qualification},sourceIds:[data.source.id]};
export function widerLibraryAsked(question:string){
 const design=/\b(?:designs?|homes?|plans?|library|collection)\b/i.test(question);
 return design&&(/\b(?:wider|broader|hundreds)\b/i.test(question)||/\b(?:beyond|outside|not on|not shown)\b[^?]{0,90}\b(?:website|site|online|published|curated)\b/i.test(question)||/\b(?:website|site|published|curated)\b[^?]{0,60}\b(?:all|only|full|entire)\b/i.test(question));
}
