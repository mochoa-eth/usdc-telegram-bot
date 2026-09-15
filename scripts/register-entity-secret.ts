/**
 * One-time entity secret registration script.
 * Run with: bun run scripts/register-entity-secret.ts
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets'
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

// Load .env manually (dotenv may not be available as ESM in this context)
const envPath = path.join(process.cwd(), '.env')
const envLines = fs.readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq < 0) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

const apiKey = process.env.CIRCLE_API_KEY
if (!apiKey || apiKey === 'your_circle_api_key_here') {
  console.error('ERROR: CIRCLE_API_KEY is not set in .env')
  process.exit(1)
}

// Generate a fresh 32-byte entity secret (never printed to stdout)
const entitySecret = crypto.randomBytes(32).toString('hex')

// Ensure recovery directory exists under /home/user/app
const recoveryDir = path.join(process.cwd(), '.circle')
fs.mkdirSync(recoveryDir, { recursive: true })

console.log('Registering entity secret with Circle...')

let response
try {
  response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryDir,
  })
} catch (err) {
  console.error('Registration failed:', err)
  process.exit(1)
}

// Persist recovery file
const recoveryPath = path.join(recoveryDir, 'recovery_file.dat')
if (response.data?.recoveryFile) {
  fs.writeFileSync(recoveryPath, response.data.recoveryFile)
}

// Write ENTITY_SECRET to .env
const envContent = fs.readFileSync(envPath, 'utf8')
const updated = envContent.replace(
  /^ENTITY_SECRET=.*$/m,
  `ENTITY_SECRET=${entitySecret}`
)
fs.writeFileSync(envPath, updated, 'utf8')

// Verify registration with a read-only call
console.log('Verifying registration...')
try {
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret })
  await client.listWalletSets({ pageSize: 1 })
  console.log('Verification: OK')
} catch (err) {
  console.error('Verification failed — the secret may not have registered correctly:', err)
  process.exit(1)
}

console.log('SUCCESS: Entity secret registered and written to .env')
console.log(`Recovery file saved to: ${recoveryPath}`)
console.log('IMPORTANT: Back up BOTH the ENTITY_SECRET value from .env AND the recovery file.')
