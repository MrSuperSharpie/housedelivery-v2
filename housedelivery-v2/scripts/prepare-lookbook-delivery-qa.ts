import {mkdirSync,writeFileSync} from 'node:fs';
import {completeEmailFixture} from '../src/lib/lookbook/email.fixture';
import {renderCustomerLookBookEmail} from '../src/lib/lookbook/email-template';
const root='/private/tmp/hd-personalized-lookbook-review-20261116';mkdirSync(root,{recursive:true});
const fixtures=[['aurora','signature'],['profile','premium']] as const;
const records=fixtures.map(([slug,tier])=>completeEmailFixture(slug,tier));
for(const record of records){const email=renderCustomerLookBookEmail(record,'http://localhost:3152');writeFileSync(`${root}/${record.homeSlug}-email.html`,email.html);writeFileSync(`${root}/${record.homeSlug}-email.txt`,email.text);writeFileSync(`${root}/${record.homeSlug}-personalization.json`,JSON.stringify({choices:email.choices,appreciation:email.text.split('\n\n').find(p=>p.includes('Signature ')||p.includes('Premium '))},null,2));}
writeFileSync(root+'/fixtures.json',JSON.stringify(records,null,2));
console.log(JSON.stringify(records.map(r=>({home:r.homeSlug,selections:r.selections.length,choices:renderCustomerLookBookEmail(r,'http://localhost:3152').choices})),null,2));
