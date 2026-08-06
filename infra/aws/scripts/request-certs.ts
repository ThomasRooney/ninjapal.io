/**
 * Request the app/sync ACM certificates in eu-west-2 (API Gateway) and
 * us-east-1 (CloudFront), create their DNS-validation CNAMEs in the
 * pitminder.com hosted zone, and publish the ARNs to SSM.
 *
 * Imperative on purpose: a CloudFormation-managed DNS-validated certificate
 * blocks the deploy until validation succeeds, and validation cannot succeed
 * until the nameserver cutover — which is a later, owner-approved step. The
 * certs stay PENDING_VALIDATION until then; that's expected.
 *
 * Idempotent: re-running reuses existing certificates and re-upserts records.
 *
 * Usage (after assume-role): bun scripts/request-certs.ts
 */
import {
	ACMClient,
	DescribeCertificateCommand,
	ListCertificatesCommand,
	RequestCertificateCommand,
} from '@aws-sdk/client-acm'
import {
	ChangeResourceRecordSetsCommand,
	Route53Client,
} from '@aws-sdk/client-route-53'
import {
	GetParameterCommand,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm'

const DOMAIN = 'app.pitminder.com'
const SANS = ['sync.pitminder.com']
const REGIONS = ['eu-west-2', 'us-east-1'] as const

const ssm = new SSMClient({ region: 'eu-west-2' })
const route53 = new Route53Client({})

/** The full SAN set a matching certificate must carry — exactly. */
const EXPECTED_SANS = new Set([DOMAIN, ...SANS])

function sanSetMatches(sans: string[] | undefined): boolean {
	if (!sans) return false
	const set = new Set(sans)
	return (
		set.size === EXPECTED_SANS.size &&
		[...EXPECTED_SANS].every((d) => set.has(d))
	)
}

/** Does this ARN point at a live cert with exactly our domain + SAN set? */
async function verifyCert(acm: ACMClient, arn: string): Promise<boolean> {
	try {
		const res = await acm.send(
			new DescribeCertificateCommand({ CertificateArn: arn }),
		)
		const cert = res.Certificate
		return (
			cert?.DomainName === DOMAIN &&
			sanSetMatches(cert?.SubjectAlternativeNames) &&
			(cert?.Status === 'PENDING_VALIDATION' || cert?.Status === 'ISSUED')
		)
	} catch {
		return false
	}
}

async function findOrRequest(region: string): Promise<string> {
	const acm = new ACMClient({ region })

	// The SSM-stored ARN is authoritative: reuse it as long as it still
	// points at a live cert with the exact domain + SAN set.
	const paramName = `/pitminder/prod/data/acm-cert-arn-${region}`
	try {
		const stored = await ssm.send(new GetParameterCommand({ Name: paramName }))
		const arn = stored.Parameter?.Value
		if (arn && (await verifyCert(acm, arn))) {
			console.log(`${region}: reusing SSM-stored ${arn}`)
			return arn
		}
	} catch {
		// parameter absent — first run
	}

	// Otherwise scan the account (paginated) for an exact-match certificate.
	let nextToken: string | undefined
	do {
		const list = await acm.send(
			new ListCertificatesCommand({
				CertificateStatuses: ['PENDING_VALIDATION', 'ISSUED'],
				NextToken: nextToken,
			}),
		)
		for (const summary of list.CertificateSummaryList ?? []) {
			if (
				summary.DomainName === DOMAIN &&
				summary.CertificateArn &&
				(await verifyCert(acm, summary.CertificateArn))
			) {
				console.log(`${region}: reusing ${summary.CertificateArn}`)
				return summary.CertificateArn
			}
		}
		nextToken = list.NextToken
	} while (nextToken)

	const requested = await acm.send(
		new RequestCertificateCommand({
			DomainName: DOMAIN,
			SubjectAlternativeNames: SANS,
			ValidationMethod: 'DNS',
			IdempotencyToken: 'pitminder',
			Tags: [{ Key: 'Project', Value: 'pitminder' }],
		}),
	)
	if (!requested.CertificateArn) throw new Error(`${region}: request failed`)
	console.log(`${region}: requested ${requested.CertificateArn}`)
	return requested.CertificateArn
}

async function validationRecords(
	region: string,
	arn: string,
): Promise<Map<string, string>> {
	const acm = new ACMClient({ region })
	// The validation CNAMEs appear asynchronously shortly after the request.
	for (let attempt = 0; attempt < 30; attempt++) {
		const res = await acm.send(
			new DescribeCertificateCommand({ CertificateArn: arn }),
		)
		const options = res.Certificate?.DomainValidationOptions ?? []
		const records = new Map<string, string>()
		for (const option of options) {
			if (option.ResourceRecord?.Name && option.ResourceRecord.Value) {
				records.set(option.ResourceRecord.Name, option.ResourceRecord.Value)
			}
		}
		if (records.size >= 1 + SANS.length) return records
		await new Promise((r) => setTimeout(r, 2_000))
	}
	throw new Error(`${region}: validation records never appeared for ${arn}`)
}

async function main() {
	const zoneParam = await ssm.send(
		new GetParameterCommand({ Name: '/pitminder/prod/data/hosted-zone-id' }),
	)
	const zoneId = zoneParam.Parameter?.Value
	if (!zoneId)
		throw new Error(
			'hosted-zone-id parameter missing — deploy pitminder-data first',
		)

	// ACM validation CNAMEs are stable per (domain, account), so both regions
	// produce the same records; dedupe by name before upserting.
	const allRecords = new Map<string, string>()
	for (const region of REGIONS) {
		const arn = await findOrRequest(region)
		const records = await validationRecords(region, arn)
		for (const [name, value] of records) allRecords.set(name, value)
		await ssm.send(
			new PutParameterCommand({
				Name: `/pitminder/prod/data/acm-cert-arn-${region}`,
				Value: arn,
				Type: 'String',
				Overwrite: true,
			}),
		)
	}

	await route53.send(
		new ChangeResourceRecordSetsCommand({
			HostedZoneId: zoneId,
			ChangeBatch: {
				Comment: 'ACM DNS validation (pending until nameserver cutover)',
				Changes: [...allRecords.entries()].map(([name, value]) => ({
					Action: 'UPSERT' as const,
					ResourceRecordSet: {
						Name: name,
						Type: 'CNAME' as const,
						TTL: 300,
						ResourceRecords: [{ Value: value }],
					},
				})),
			},
		}),
	)
	console.log(
		`upserted ${allRecords.size} validation CNAMEs into zone ${zoneId}; certs remain PENDING_VALIDATION until the nameserver cutover`,
	)
}

await main()
