import http from 'node:http';
import {readFile} from 'node:fs/promises';
const fixtures=JSON.parse(await readFile('scripts/fixtures/ed69bf3-saved-books.json','utf8'));
const rows=new Map(fixtures.map(row=>[row.id,row]));
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:3132');
 res.setHeader('Content-Type','application/json');
 if(url.pathname==='/qa/records'){res.end(JSON.stringify([...rows.values()]));return;}
 if(url.pathname!=='/rest/v1/lookbook_configurations'){res.writeHead(404);res.end('{}');return;}
 if(req.method==='GET'){
  const id=url.searchParams.get('id')?.replace(/^eq\./,'');
  res.end(JSON.stringify(id?(rows.has(id)?[rows.get(id)]:[]):[...rows.values()]));return;
 }
 if(req.method==='POST'){
  let body='';for await(const chunk of req)body+=chunk;
  const row=JSON.parse(body);rows.set(row.id,row);res.end(JSON.stringify([row]));return;
 }
 res.writeHead(405);res.end('{}');
});
server.listen(3132,'127.0.0.1',()=>console.log(`Local-only synthetic store ready; ${fixtures.length} existing fixture records, no external connections.`));
