/**
 * Operator tooling for the power-state machine. Run after assume-role.
 *
 *   bun scripts/power-tool.ts status            # row + RDS status
 *   bun scripts/power-tool.ts seed [STATE]      # create the row (default SLEEPING)
 *   bun scripts/power-tool.ts wake              # desiredState=AWAKE (stream drives the orchestrator)
 *   bun scripts/power-tool.ts force-idle        # backdate activity >8h, then invoke the idle cron
 *   bun scripts/power-tool.ts invoke-reconciler
 *   bun scripts/power-tool.ts watch             # poll row + RDS every 5s, log every change with timings
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { DescribeDBInstancesCommand, RDSClient } from '@aws-sdk/client-rds'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
	POWER_PK,
	type PowerState,
	STATES,
	getRow,
	requestWake,
	seedRow,
} from '../lambda/power/lib'

const TABLE = process.env.POWER_TABLE ?? 'pitminder-power'
const DB_INSTANCE_ID = process.env.DB_INSTANCE_ID ?? 'pitminder-prod'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const rds = new RDSClient({})
const lambda = new LambdaClient({})

async function rdsStatus(): Promise<string> {
	try {
		const res = await rds.send(
			new DescribeDBInstancesCommand({ DBInstanceIdentifier: DB_INSTANCE_ID }),
		)
		return res.DBInstances?.[0]?.DBInstanceStatus ?? 'unknown'
	} catch {
		return 'describe-failed'
	}
}

async function status(): Promise<void> {
	const [row, db] = await Promise.all([getRow(ddb, TABLE), rdsStatus()])
	console.log(JSON.stringify({ rds: db, row }, null, 2))
}

async function seed(state: string | undefined): Promise<void> {
	const now = Date.now()
	const target = (state ?? 'SLEEPING') as PowerState
	if (!STATES.includes(target)) throw new Error(`bad state ${state}`)
	const res = await seedRow(ddb, TABLE, now, {
		state: target,
		desiredState: target === 'AWAKE' ? 'AWAKE' : 'SLEEPING',
		lastWebAt: target === 'AWAKE' ? now : undefined,
	})
	console.log(
		res.applied ? `seeded ${target}` : `row already exists (${res.reason})`,
	)
}

async function wake(): Promise<void> {
	const res = await requestWake(ddb, TABLE, Date.now())
	console.log(res.applied ? 'wake requested' : `not applied: ${res.reason}`)
}

/** Backdate both activity signals past the 8h idle horizon, then run the
 * idle cron exactly as EventBridge would. */
async function forceIdle(): Promise<void> {
	const backdated = Date.now() - 9 * 60 * 60 * 1000
	await ddb.send(
		new UpdateCommand({
			TableName: TABLE,
			Key: { pk: POWER_PK },
			UpdateExpression: 'SET #web = :t, #device = :t',
			ConditionExpression: 'attribute_exists(#pk)',
			ExpressionAttributeNames: {
				'#pk': 'pk',
				'#web': 'lastWebAt',
				'#device': 'lastRealDeviceOnlineAt',
			},
			ExpressionAttributeValues: { ':t': backdated },
		}),
	)
	const res = await lambda.send(
		new InvokeCommand({ FunctionName: 'pitminder-power-idle-cron' }),
	)
	console.log(
		`idle cron: ${Buffer.from(res.Payload ?? new Uint8Array()).toString()}`,
	)
}

async function invokeReconciler(): Promise<void> {
	const res = await lambda.send(
		new InvokeCommand({ FunctionName: 'pitminder-power-reconciler' }),
	)
	console.log(Buffer.from(res.Payload ?? new Uint8Array()).toString())
}

async function watch(): Promise<void> {
	let last = ''
	const startedAt = Date.now()
	for (;;) {
		const [row, db] = await Promise.all([getRow(ddb, TABLE), rdsStatus()])
		const summary = JSON.stringify({
			rds: db,
			state: row?.state,
			desired: row?.desiredState,
			generation: row?.generation,
			version: row?.version,
		})
		if (summary !== last) {
			const t = ((Date.now() - startedAt) / 1000).toFixed(1)
			console.log(`[+${t}s] ${summary}`)
			last = summary
		}
		await new Promise((r) => setTimeout(r, 5_000))
	}
}

const command = process.argv[2]
switch (command) {
	case 'status':
		await status()
		break
	case 'seed':
		await seed(process.argv[3])
		break
	case 'wake':
		await wake()
		break
	case 'force-idle':
		await forceIdle()
		break
	case 'invoke-reconciler':
		await invokeReconciler()
		break
	case 'watch':
		await watch()
		break
	default:
		console.error(
			'usage: power-tool.ts <status|seed [STATE]|wake|force-idle|invoke-reconciler|watch>',
		)
		process.exit(1)
}
