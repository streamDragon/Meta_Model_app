import {handleRequest} from '../server/hidden-belief-core.mjs';

export default async function handler(request,response){
  return handleRequest(request,response);
}
