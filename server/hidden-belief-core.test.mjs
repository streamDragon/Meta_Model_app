import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configured, checkInput, verifyOutput, sameOrigin, allowRequest,
  analyseSemantic, handleRequest
} from './hidden-belief-core.mjs';

const env={
  XRAY_SEMANTIC_ENABLED:'true',
  XRAY_WAF_CONFIRMED:'true',
  AI_GATEWAY_MODEL:'openai/gpt-4.1-mini',
  AI_GATEWAY_API_KEY:'fake-test-token'
};
const transcript='I think I am an okay father. After he calls I shout at my children.';
const candidate={
  hidden_belief:'Perhaps his criticism is evidence that I am not good enough.',
  missing_link_sentence:'Because his criticism might mean I am a bad father, I get upset.',
  type:'hidden_equation',
  evidence:[{quote:'I think I am an okay father.',role:'stated_belief'}],
  mismatch:'stated_belief_vs_reaction_intensity',
  breen_row:null,
  question_to_surface_it:'What would his criticism mean about you?',
  alternative_questions:[],
  body_check_prompt:'Ask whether this fits.',
  confidence:'medium',
  confidence_reason:'There is a tension in what was reported.',
  status:'hypothesis'
};
function reply() {
  const record={headers:{},statusCode:200};
  return {
    record,
    response:{
      setHeader(k,v){record.headers[k]=v;return this;},
      status(n){record.statusCode=n;return this;},
      json(v){record.json=v;return this;}
    }
  };
}
test('fails closed when not configured, without credentials being exposed',()=>{
  assert.equal(configured({}),false);
  assert.equal(configured({...env,XRAY_WAF_CONFIRMED:'false'}),false);
});
test('requires consent, rejects patient identifiers and risk statements',()=>{
  assert.equal(checkInput({text:transcript}).code,'INVALID_INPUT');
  assert.equal(checkInput({text:'Call me on 050-1234567',consent:true}).code,'REMOVE_IDENTIFIERS');
  assert.equal(checkInput({text:'I plan to kill myself',consent:true}).code,'SAFETY_STOP');
  assert.equal(checkInput({text:transcript,consent:true}).ok,true);
});
test('rejects hallucinated quotes and diagnosis and forces provisional findings',()=>{
  assert.equal(verifyOutput({findings:[{...candidate,evidence:[{quote:'NEVER SPOKEN',role:'reaction'}]}]},transcript),null);
  assert.equal(verifyOutput({findings:[{...candidate,hidden_belief:'Borderline personality disorder'}]},transcript),null);
  assert.equal(verifyOutput({findings:Array(4).fill(candidate)},transcript),null);
  const good=verifyOutput({findings:[{...candidate,breen_row:3,confidence:'high'}]},transcript);
  assert.equal(good.length,1);
  assert.equal(good[0].breen_row,null);
  assert.equal(good[0].confidence,'medium');
  assert.match(good[0].body_check_prompt,/האדם/);
});
test('never permits cross-origin requests or requests with missing origin',()=>{
  assert.equal(sameOrigin({host:'example.test',origin:'https://example.test'}),true);
  assert.equal(sameOrigin({host:'example.test',origin:'https://evil.test'}),false);
  assert.equal(sameOrigin({host:'example.test'}),false);
});
test('uses request caps per anonymous fingerprint',()=>{
  const ip='test-ip-'+Math.random();
  const now=Date.now();
  assert.equal(allowRequest(ip,now),true);
  assert.equal(allowRequest(ip,now),true);
  assert.equal(allowRequest(ip,now),true);
  assert.equal(allowRequest(ip,now),false);
  assert.equal(allowRequest(ip,now+600001),true);
});
test('configured endpoint does not analyse unsafe requests',async()=>{
  const {response,record}=reply();
  await handleRequest({method:'POST',headers:{origin:'https://example.test',host:'example.test','content-type':'application/json'},body:{consent:true,text:'I plan to kill myself'}},response,{env,fetchImpl:()=>{throw new Error('should not call model');}});
  assert.equal(record.statusCode,422);
  assert.equal(record.json.code,'SAFETY_STOP');
  assert.equal(record.headers['Cache-Control'],'private, no-store');
});
test('disabled endpoint advertises no model and refuses POST',async()=>{
  const a=reply();
  await handleRequest({method:'GET',headers:{}},a.response,{env:{}});
  assert.equal(a.record.json.enabled,false);
  const b=reply();
  await handleRequest({method:'POST',headers:{}},b.response,{env:{}});
  assert.equal(b.record.statusCode,503);
});
test('semantic model output is validated on a mock request without network calls',async()=>{
  const mock=async (_url,req)=>{
    assert.match(req.headers.Authorization,/fake-test-token/);
    assert.equal(req.body.includes(transcript),true);
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({findings:[candidate]})}}]})};
  };
  const result=await analyseSemantic({text:transcript},{env,fetchImpl:mock});
  assert.equal(result.length,1);
  assert.equal(result[0].status,'hypothesis');
});
