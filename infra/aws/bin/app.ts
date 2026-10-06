import * as cdk from 'aws-cdk-lib'
import { ComputeStack, DEFAULT_NAT_AMI_EU_WEST_2 } from '../lib/compute-stack'
import { DataStack } from '../lib/data-stack'

/** The ONLY account/region this app may target. Synth refuses anything else
 * so a stray shell with the wrong credentials can never deploy the stacks
 * somewhere surprising. Tests may bypass with PITMINDER_ALLOW_ANY_ACCOUNT=1. */
const EXPECTED_ACCOUNT = '836003244283'
const REGION = 'eu-west-2'

const account = process.env.CDK_DEFAULT_ACCOUNT
if (!account) {
	throw new Error(
		'CDK_DEFAULT_ACCOUNT is required — assume the prod-pitminder OrganizationAccountAccessRole first (see infra/aws/scripts/assume-role.sh)',
	)
}
if (
	account !== EXPECTED_ACCOUNT &&
	process.env.PITMINDER_ALLOW_ANY_ACCOUNT !== '1'
) {
	throw new Error(
		`refusing to synth against account ${account} — pitminder deploys only to ${EXPECTED_ACCOUNT} (prod-pitminder). Assume the right role, or set PITMINDER_ALLOW_ANY_ACCOUNT=1 for offline tests.`,
	)
}

const app = new cdk.App()
cdk.Tags.of(app).add('Project', 'pitminder')

new DataStack(app, 'pitminder-data', {
	env: { account, region: REGION },
})

// pitminder-compute consumes pitminder-data via /pitminder/prod/data/* SSM
// parameters only. Context knobs (see infra/aws/README.md):
//  -c imageTag=sha-<git sha>   ECR tag for zero-cache + sync-worker
//  -c publicOrigin=https://... two-pass: placeholder first, then the
//                              CloudFront domain (or app.pitminder.com)
//  -c postCutover=true         after the owner-approved nameserver switch
//  -c natAmiId=ami-...         refreshed fck-nat arm64 AMI
new ComputeStack(app, 'pitminder-compute', {
	env: { account, region: REGION },
	imageTag: app.node.tryGetContext('imageTag') ?? 'latest',
	publicOrigin:
		app.node.tryGetContext('publicOrigin') ?? 'https://pending.invalid',
	postCutover:
		app.node.tryGetContext('postCutover') === 'true' ||
		app.node.tryGetContext('postCutover') === true,
	natAmiId: app.node.tryGetContext('natAmiId') ?? DEFAULT_NAT_AMI_EU_WEST_2,
	// Bump alongside every /pitminder/prod/app/env rotation so the resolved
	// values actually replace (see ComputeStackProps docs + README ordering).
	appSecretVersion: app.node.tryGetContext('appSecretVersion') ?? 'v1',
	ssrSecretVersion: app.node.tryGetContext('ssrSecretVersion'),
	// Only after a Service Quotas raise — the account's 10-concurrency
	// default makes any reservation invalid AND is itself the cap.
	ssrReservedConcurrency: Number(
		app.node.tryGetContext('ssrReservedConcurrency') ?? 0,
	),
	// -c rehearsalZeroOrigin=<ip-dashes>.sslip.io — pre-cutover /sync/*
	// behavior to the CURRENT task IP (see ComputeStackProps docs).
	rehearsalZeroOrigin: app.node.tryGetContext('rehearsalZeroOrigin'),
})
