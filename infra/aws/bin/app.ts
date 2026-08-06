import * as cdk from 'aws-cdk-lib'
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
// pitminder-compute (SSR Lambda, API Gateway, ECS services, CloudFront) is
// added here later; it consumes pitminder-data via /pitminder/prod/data/* SSM
// parameters only.
