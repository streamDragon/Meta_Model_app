import { generateKeyPairSync, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const home = join(homedir(), '.wisdom-licenses');
const privatePath = join(home, 'issuer-private.pem');
mkdirSync(home, { recursive: true });
if (!existsSync(privatePath)) {
  const pair = generateKeyPairSync('ed25519');
  writeFileSync(privatePath, pair.privateKey.export({type:'pkcs8',format:'pem'}), {mode:0o600});
}
const privateKey = createPrivateKey(readFileSync(privatePath));
const publicDer = createPublicKey(privateKey).export({type:'spki',format:'der'});
const encode = input => Buffer.from(input).toString('base64url');
const args = process.argv.slice(2);
if (args[0] === '--public') { console.log(publicDer.toString('base64')); process.exit(0); }
if (args.length < 3) {
  console.error('Usage: node scripts/wisdom-issue-license.mjs <device-code-or-*> <feature-id-or-all> <days> [buyer-reference]');
  process.exit(1);
}
const [device, feature, daysText, buyer=''] = args;
const days = Number(daysText);
if (!Number.isInteger(days) || days < 1 || days > 3660) throw Error('days must be 1..3660');
if (!/^[A-Za-z0-9_-]{1,80}$/.test(device) && device !== '*') throw Error('invalid device');
if (!/^[a-z0-9-]{2,64}$/.test(feature)) throw Error('invalid feature');
const now = Date.now();
const body = { v:1, id:crypto.randomUUID(), device, features:[feature], issuedAt:now, expiresAt:now+days*86400000, buyer:buyer.slice(0,60) };
const payload = encode(JSON.stringify(body));
const signature = sign(null,Buffer.from(payload),privateKey).toString('base64url');
console.log('WKEY1.'+payload+'.'+signature);
