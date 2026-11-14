import {getVercelOidcTokenSync} from '@vercel/oidc';
export function hasGatewayAuthentication(){if(process.env.AI_GATEWAY_API_KEY?.trim())return true;try{return Boolean(getVercelOidcTokenSync())}catch{return false}}
