import Ajv from 'ajv/dist/2020';
import {generateText,jsonSchema,Output,type LanguageModel} from 'ai';
export type InferenceContext={signal?:AbortSignal;calls:number;completed?:number;model?:LanguageModel;fault?:'timeout'|'invalid';timeoutInjected?:boolean;contexts?:string[];onValidatedOutput?:(value:unknown)=>void};
const validator=new Ajv({strict:true,allowUnionTypes:true});
export async function structured<T>(schema:Record<string,unknown>,system:string,prompt:object,ctx:InferenceContext,model?:LanguageModel):Promise<T>{
  ctx.calls++;
  const check=validator.compile(schema);ctx.contexts?.push(JSON.stringify({system,prompt}));
  const injected:LanguageModel={specificationVersion:'v4',provider:'authenticated-preview-fixture',modelId:'provider-boundary-fault',supportedUrls:{},doGenerate:async()=>{if(ctx.fault==='timeout'){ctx.timeoutInjected=true;await new Promise((_,reject)=>setTimeout(()=>reject(new DOMException('Synthetic provider timeout','TimeoutError')),20));}return{content:[{type:'text',text:'{"unapproved":"PRIVATE_OUTPUT_CANARY"}'}],finishReason:{unified:'stop',raw:undefined},usage:{inputTokens:{total:0,noCache:0,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:0,text:0,reasoning:undefined}},warnings:[]}},doStream:async()=>{throw Error('Streaming disabled')}};
  const {output}=await generateText({model:ctx.fault?injected:model??ctx.model??process.env.AI_GATEWAY_MODEL!,output:Output.object({schema:jsonSchema<T>(schema,{validate:v=>check(v)?{success:true,value:v as T}:{success:false,error:new Error('Invalid model contract')}})}),system,prompt:JSON.stringify(prompt),maxOutputTokens:1800,maxRetries:0,abortSignal:ctx.signal,providerOptions:{gateway:{disallowPromptTraining:true,zeroDataRetention:true}}});
  if(!check(output))throw Error('Invalid model contract');ctx.completed=(ctx.completed??0)+1;ctx.onValidatedOutput?.(output);return output as T;
}
export const objectSchema=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const nullableString={type:['string','null'],maxLength:180};
