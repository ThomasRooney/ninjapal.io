/**
 * SES inbound → gmail forwarder for pitminder.com (node20 rewrite of the
 * aws-lambda-ses-forwarder pattern already used for the other Resilient
 * Software domains; same env contract: EMAIL_MAPPING_SSM_KEY, BUCKET_NAME,
 * BUCKET_PREFIX, FROM_EMAIL).
 *
 * Receipt rule stores the raw message in S3, then invokes this function,
 * which rewrites the headers (SES only lets us send from verified
 * identities) and re-sends to the mapped destination(s).
 */
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'

const s3 = new S3Client({})
const ses = new SESClient({})
const ssm = new SSMClient({})

let mappingCache = null

async function getMapping() {
	if (!mappingCache) {
		const res = await ssm.send(
			new GetParameterCommand({ Name: process.env.EMAIL_MAPPING_SSM_KEY }),
		)
		mappingCache = JSON.parse(res.Parameter.Value)
	}
	return mappingCache
}

function destinationsFor(recipient, mapping) {
	const lower = recipient.toLowerCase()
	if (mapping[lower]) return mapping[lower]
	const domainKey = lower.slice(lower.indexOf('@'))
	if (mapping[domainKey]) return mapping[domainKey]
	return []
}

function rewriteHeaders(raw, originalRecipient) {
	const sep = raw.indexOf('\r\n\r\n')
	let header = sep === -1 ? raw : raw.slice(0, sep)
	const body = sep === -1 ? '' : raw.slice(sep)

	const fromMatch = header.match(/^from:[\t ]?(.*(?:\r?\n\s+.*)*)/im)
	const originalFrom = fromMatch ? fromMatch[1].replace(/\r?\n\s+/g, ' ') : ''

	// Reply-To preserves the real sender (unless one already exists)
	if (!/^reply-to:/im.test(header) && originalFrom) {
		header = `Reply-To: ${originalFrom}\r\n${header}`
	}

	// From must be a verified identity; keep the original visible in the name
	const fromName = originalFrom.replace(/"/g, '').replace(/</g, 'at ').replace(/>/g, '')
	header = header.replace(
		/^from:[\t ]?.*(?:\r?\n\s+.*)*/im,
		`From: "${fromName}" <${process.env.FROM_EMAIL}>`,
	)

	// Headers that would fail validation or leak the old path
	header = header
		.replace(/^return-path:[\t ]?.*(?:\r?\n\s+.*)*\r?\n/gim, '')
		.replace(/^sender:[\t ]?.*(?:\r?\n\s+.*)*\r?\n/gim, '')
		.replace(/^dkim-signature:[\t ]?.*(?:\r?\n\s+.*)*\r?\n/gim, '')

	header = `X-Original-To: ${originalRecipient}\r\n${header}`
	return header + body
}

export const handler = async (event) => {
	const record = event.Records?.[0]
	if (!record || record.eventSource !== 'aws:ses') {
		throw new Error('Unexpected event source')
	}

	const mail = record.ses.mail
	const recipients = record.ses.receipt.recipients
	const mapping = await getMapping()

	const obj = await s3.send(
		new GetObjectCommand({
			Bucket: process.env.BUCKET_NAME,
			Key: `${process.env.BUCKET_PREFIX || ''}${mail.messageId}`,
		}),
	)
	const raw = await obj.Body.transformToString()

	for (const recipient of recipients) {
		const destinations = destinationsFor(recipient, mapping)
		if (destinations.length === 0) {
			console.log(`no mapping for ${recipient}, dropping`)
			continue
		}
		const rewritten = rewriteHeaders(raw, recipient)
		// One send per destination: in SES sandbox a single unverified
		// recipient rejects the whole call, which must not block the rest.
		for (const destination of destinations) {
			try {
				await ses.send(
					new SendRawEmailCommand({
						Source: process.env.FROM_EMAIL,
						Destinations: [destination],
						RawMessage: { Data: Buffer.from(rewritten) },
					}),
				)
				console.log(`forwarded ${mail.messageId} ${recipient} -> ${destination}`)
			} catch (error) {
				console.error(
					`forward failed ${mail.messageId} ${recipient} -> ${destination}:`,
					error.message,
				)
			}
		}
	}
	return { disposition: 'STOP_RULE' }
}
