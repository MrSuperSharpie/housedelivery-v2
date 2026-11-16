import {createHash} from 'node:crypto';
import release from '@/data/concierge/public-commercial-20261116.json';
import {homePricing} from '@/data/home-pricing';
// A sealed, explicit public-source correction; the original audited snapshot
// remains immutable. No maintainer documents or private source is loaded.
export function validateCommercialRelease(value:unknown){
 if(createHash('sha256').update(JSON.stringify(value)).digest('hex')!=='4439d02034f17076bfde67af4712df75953b5a7f12f136736b3a3bf02094ba95')throw Error('Public commercial release mismatch');
}
validateCommercialRelease(release);
export const commercialRelease=release;
export const publicPackageRates={Premium:homePricing.premium.rate,Signature:homePricing.signature.rate};
export const commercialSourceIds=release.sources.map(s=>'PUBLIC-20261116:'+s.slug);
export function currentCommercialText(id:string){
 const text=release.facts[id as keyof typeof release.facts];
 return text?(id==='F-PRICE'?`Premium ${publicPackageRates.Premium} per sq. ft.; Signature ${publicPackageRates.Signature} per sq. ft. `:'')+text:undefined;
}
