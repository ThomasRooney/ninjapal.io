/**
 * Create/update the /pitminder/prod/app/env Secrets Manager secret from a
 * local .env file plus the RDS master secret — the single JSON secret the
 * compute stack consumes (Lambda: CFN dynamic references; ECS: native task
 * secrets). NEVER prints a secret value; only key names and outcomes.
 *
 *   AWS_PROFILE=pitminder-deploy bun scripts/create-app-secret.ts [path/to/.env]
 *
 * Composes DATABASE_URL / ZERO_CVR_DB / ZERO_CHANGE_DB from the RDS secret
 * (password URL-encoded) + the data-contract endpoint, pointing at the
 * pitminder / zero_cvr / zero_change databases with sslmode=require.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	CreateSecretCommand,
	GetSecretValueCommand,
	PutSecretValueCommand,
	SecretsManagerClient,
	TagResourceCommand,
} from '@aws-sdk/client-secrets-manager'
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'

const SECRET_NAME = '/pitminder/prod/app/env'

/** Keys copied verbatim from the .env file. */
const COPIED_KEYS = [
	'ZERO_AUTH_SECRET',
	'BETTER_AUTH_SECRET',
	'RESEND_API_KEY',
	'GOOGLE_CLIENT_ID',
	'GOOGLE_CLIENT_SECRET',
	'ANTHROPIC_API_KEY',
	'VAPID_PUBLIC_KEY',
	'VAPID_PRIVATE_KEY',
	'AYLA_APP_SECRET',
	// Bun mirrors process.env into import.meta.env — the worker's ninjaAuth
	// flow reads these at runtime (they are baked into the client bundle
	// anyway, but sourcing them here keeps the stack free of hardcoding).
	'VITE_OAUTH_CLIENT_ID',
	'VITE_OAUTH_REDIRECT_URI',
	'VITE_OAUTH_SCOPE',
	'VITE_OAUTH_AUTH_BASE_URL',
	'VITE_AYLA_BASE_URL',
	'VITE_AYLA_APP_ID',
	'VITE_AYLA_TOKEN_SIGN_IN_ENDPOINT',
] as const

function parseEnvFile(path: string): Record<string, string> {
	const out: Record<string, string> = {}
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
		if (!match) continue
		let value = (match[2] ?? '').trim()
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		}
		out[match[1] as string] = value
	}
	return out
}

async function main() {
	const envPath = resolve(
		process.argv[2] ?? fileURLToPath(new URL('../../../.env', import.meta.url)),
	)
	const env = parseEnvFile(envPath)
	const missing = COPIED_KEYS.filter((key) => !env[key])
	if (missing.length > 0) {
		console.error(`missing keys in ${envPath}: ${missing.join(', ')}`)
		process.exit(1)
	}

	const ssm = new SSMClient({})
	const secrets = new SecretsManagerClient({})
	const param = async (name: string) =>
		(
			await ssm.send(
				new GetParameterCommand({ Name: `/pitminder/prod/data/${name}` }),
			)
		).Parameter?.Value ?? ''

	const [dbSecretArn, host, port] = await Promise.all([
		param('db-secret-arn'),
		param('db-endpoint'),
		param('db-port'),
	])
	const dbSecretRaw = await secrets.send(
		new GetSecretValueCommand({ SecretId: dbSecretArn }),
	)
	const dbSecret = JSON.parse(dbSecretRaw.SecretString ?? '{}') as {
		username?: string
		password?: string
	}
	if (!dbSecret.username || !dbSecret.password) {
		console.error('RDS secret is missing username/password')
		process.exit(1)
	}
	const auth = `${encodeURIComponent(dbSecret.username)}:${encodeURIComponent(dbSecret.password)}`
	const url = (db: string) =>
		`postgresql://${auth}@${host}:${port}/${db}?sslmode=require`

	const payload: Record<string, string> = {
		DATABASE_URL: url('pitminder'),
		ZERO_CVR_DB: url('zero_cvr'),
		ZERO_CHANGE_DB: url('zero_change'),
	}
	for (const key of COPIED_KEYS) payload[key] = env[key] as string

	const secretString = JSON.stringify(payload)
	try {
		await secrets.send(
			new CreateSecretCommand({
				Name: SECRET_NAME,
				SecretString: secretString,
				Description:
					'pitminder app env (compute stack: Lambda dynamic refs + ECS task secrets)',
				Tags: [{ Key: 'Project', Value: 'pitminder' }],
			}),
		)
		console.log(
			`created ${SECRET_NAME} with keys: ${Object.keys(payload).join(', ')}`,
		)
	} catch (error) {
		if (error instanceof Error && error.name === 'ResourceExistsException') {
			await secrets.send(
				new PutSecretValueCommand({
					SecretId: SECRET_NAME,
					SecretString: secretString,
				}),
			)
			await secrets
				.send(
					new TagResourceCommand({
						SecretId: SECRET_NAME,
						Tags: [{ Key: 'Project', Value: 'pitminder' }],
					}),
				)
				.catch(() => {})
			console.log(
				`updated ${SECRET_NAME} with keys: ${Object.keys(payload).join(', ')}`,
			)
		} else {
			throw error
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
