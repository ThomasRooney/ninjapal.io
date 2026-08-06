import * as cdk from 'aws-cdk-lib'
import { DataStack } from '../lib/data-stack'

const account = process.env.CDK_DEFAULT_ACCOUNT
if (!account) {
	throw new Error(
		'CDK_DEFAULT_ACCOUNT is required — assume the prod-pitminder OrganizationAccountAccessRole first (see infra/aws/scripts/assume-role.sh)',
	)
}

const app = new cdk.App()
cdk.Tags.of(app).add('Project', 'pitminder')

new DataStack(app, 'pitminder-data', {
	env: { account, region: 'eu-west-2' },
})
// pitminder-compute (SSR Lambda, API Gateway, ECS services, CloudFront) is
// added here later; it consumes pitminder-data via /pitminder/prod/data/* SSM
// parameters only.
