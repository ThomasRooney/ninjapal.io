/**
 * S3 photo storage behind the PHOTOS_BUCKET env (infra/aws/ARCHITECTURE.md:
 * private bucket, object keys in the DB, presigned reads on demand, bucket
 * lifecycle rule handles expiry). When PHOTOS_BUCKET is unset every helper
 * here reports unconfigured and the Vercel Blob path stays in charge.
 *
 * Stored-row convention: `cook_photos.pathname` holds the S3 object key and
 * `cook_photos.url` holds the self-describing marker `s3://<bucket>/<key>`
 * (the column is NOT NULL and Zero syncs it to clients, which use the
 * marker to know a presign is needed — a presigned URL must never be
 * persisted, it dies after an hour).
 */
import { randomBytes } from 'node:crypto'
import type { S3Client } from '@aws-sdk/client-s3'

export const PHOTO_URL_EXPIRY_SECONDS = 60 * 60

/** PHOTOS_BUCKET env, or null when the Blob path should stay in charge. */
export function photosBucket(
	env: Record<string, string | undefined> = process.env,
): string | null {
	const bucket = env.PHOTOS_BUCKET?.trim()
	return bucket ? bucket : null
}

function photosRegion(): string | undefined {
	return (
		process.env.PHOTOS_BUCKET_REGION?.trim() ||
		process.env.AWS_REGION?.trim() ||
		process.env.AWS_DEFAULT_REGION?.trim() ||
		undefined
	)
}

let _client: S3Client | null = null
let _clientRegion: string | undefined

async function getClient(): Promise<S3Client> {
	const region = photosRegion()
	if (!_client || _clientRegion !== region) {
		const { S3Client } = await import('@aws-sdk/client-s3')
		_client = new S3Client(region ? { region } : {})
		_clientRegion = region
	}
	return _client
}

/** Test hook: drop the cached client so mocks take effect per-test. */
export function __resetPhotoClientForTests(): void {
	_client = null
	_clientRegion = undefined
}

/** image/jpeg → jpg etc. — mirrors the Vercel Blob path's extension rule. */
export function photoExtension(contentType: string): string {
	return (contentType.split('/')[1] ?? 'bin').replace('jpeg', 'jpg')
}

/**
 * Object key for a new photo: per-user namespace + unguessable random
 * suffix, mirroring the Blob rules (`cook-photos/{userId}/photo-<rand>.<ext>`
 * — Vercel's addRandomSuffix equivalent).
 */
export function makePhotoKey(userId: string, contentType: string): string {
	const suffix = randomBytes(16).toString('base64url')
	return `cook-photos/${userId}/photo-${suffix}.${photoExtension(contentType)}`
}

/** Marker persisted in cook_photos.url for S3-backed rows. */
export function s3PhotoUrl(bucket: string, key: string): string {
	return `s3://${bucket}/${key}`
}

/** Parses an `s3://bucket/key` marker; null for anything else (https, …). */
export function parseS3PhotoUrl(
	url: string,
): { bucket: string; key: string } | null {
	if (!url.startsWith('s3://')) return null
	const rest = url.slice('s3://'.length)
	const slash = rest.indexOf('/')
	if (slash <= 0 || slash === rest.length - 1) return null
	return { bucket: rest.slice(0, slash), key: rest.slice(slash + 1) }
}

/**
 * A stored marker is only actionable (presign/delete) when it points at
 * THE configured bucket and inside the owning user's namespace — a
 * tampered row must not turn the server into a signer/deleter for
 * arbitrary buckets or other users' objects.
 */
export function assertOwnedPhotoMarker(
	url: string,
	ownerUserId: string,
): { bucket: string; key: string } {
	const parsed = parseS3PhotoUrl(url)
	if (!parsed) throw new Error('not an s3 photo marker')
	const bucket = photosBucket()
	if (!bucket || parsed.bucket !== bucket) {
		throw new Error(
			`photo marker bucket "${parsed.bucket}" is not the configured PHOTOS_BUCKET`,
		)
	}
	if (!ownerUserId || !parsed.key.startsWith(`cook-photos/${ownerUserId}/`)) {
		throw new Error('photo marker key is outside the owner namespace')
	}
	return parsed
}

/** Uploads a photo object to the configured bucket. */
export async function putPhotoObject(args: {
	key: string
	bytes: ArrayBuffer
	contentType: string
}): Promise<void> {
	const bucket = photosBucket()
	if (!bucket) throw new Error('PHOTOS_BUCKET is not configured')
	const [client, { PutObjectCommand }] = await Promise.all([
		getClient(),
		import('@aws-sdk/client-s3'),
	])
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: args.key,
			Body: new Uint8Array(args.bytes),
			ContentType: args.contentType,
		}),
	)
}

/** Mints a presigned GET (60-minute expiry) for a stored object key. */
export async function presignPhotoGet(
	bucket: string,
	key: string,
): Promise<string> {
	const [client, { GetObjectCommand }, { getSignedUrl }] = await Promise.all([
		getClient(),
		import('@aws-sdk/client-s3'),
		import('@aws-sdk/s3-request-presigner'),
	])
	return getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: bucket, Key: key }),
		{
			expiresIn: PHOTO_URL_EXPIRY_SECONDS,
		},
	)
}

/**
 * Resolves a stored cook_photos.url to something fetchable: s3:// markers
 * become presigned GETs (only for the configured bucket + the owner's own
 * namespace), anything else (Vercel Blob https URLs) passes through
 * untouched.
 */
export async function resolveStoredPhotoUrl(
	url: string,
	ownerUserId: string,
): Promise<string> {
	if (!parseS3PhotoUrl(url)) return url
	const parsed = assertOwnedPhotoMarker(url, ownerUserId)
	return presignPhotoGet(parsed.bucket, parsed.key)
}

/**
 * Deletes the object behind an s3:// marker (configured bucket + owner
 * namespace enforced); false = not an S3 row (Blob path handles it).
 */
export async function deleteStoredPhotoObject(
	url: string,
	ownerUserId: string,
): Promise<boolean> {
	if (!parseS3PhotoUrl(url)) return false
	const parsed = assertOwnedPhotoMarker(url, ownerUserId)
	const [client, { DeleteObjectCommand }] = await Promise.all([
		getClient(),
		import('@aws-sdk/client-s3'),
	])
	await client.send(
		new DeleteObjectCommand({ Bucket: parsed.bucket, Key: parsed.key }),
	)
	return true
}
