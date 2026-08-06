import { auth } from '@/lib/auth'
import { getSql } from '@/server/db/client'
import {
	deleteStoredPhotoObject,
	makePhotoKey,
	photosBucket,
	putPhotoObject,
	resolveStoredPhotoUrl,
	s3PhotoUrl,
} from '@/server/photo-storage'
import { getRequest } from '@tanstack/react-start/server'
import { del, put } from '@vercel/blob'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
])
const MAX_PHOTOS_PER_USER = 200

async function requireSession(): Promise<{ id: string }> {
	const request = getRequest()
	if (!request) throw new Error('No request')
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user) throw new Error('Not authenticated')
	return { id: session.user.id }
}

export interface UploadedPhoto {
	id: string
	url: string
}

/**
 * Stores a cook photo and records it in cook_photos. Photos older than 60
 * days are reaped by the worker (S3 additionally has a lifecycle rule).
 *
 * Backend selection (env-gated, per infra/aws/ARCHITECTURE.md):
 *  - PHOTOS_BUCKET set → private S3 object (per-user namespace + random
 *    suffix key in `pathname`, `s3://bucket/key` marker in `url`), served
 *    via presigned GETs minted on demand.
 *  - unset (Vercel/local today) → Vercel Blob, public unguessable URL,
 *    exactly as before.
 */
export async function uploadCookPhoto(args: {
	bytes: ArrayBuffer
	contentType: string
	deviceId?: string
	sessionId?: string
}): Promise<UploadedPhoto> {
	const user = await requireSession()
	if (!ALLOWED_TYPES.has(args.contentType)) {
		throw new Error(`Unsupported image type: ${args.contentType}`)
	}
	if (args.bytes.byteLength === 0) throw new Error('Empty upload')
	if (args.bytes.byteLength > MAX_PHOTO_BYTES) {
		throw new Error('Photo too large (max 8 MB)')
	}

	const sql = getSql()
	const [{ count }] = await sql`
		select count(*)::int as count from cook_photos
		where user_id = ${user.id}::uuid
	`
	if (Number(count) >= MAX_PHOTOS_PER_USER) {
		throw new Error('Photo limit reached — delete some older photos first')
	}

	const bucket = photosBucket()
	let storedUrl: string
	let pathname: string
	let displayUrl: string
	if (bucket) {
		const key = makePhotoKey(user.id, args.contentType)
		await putPhotoObject({
			key,
			bytes: args.bytes,
			contentType: args.contentType,
		})
		storedUrl = s3PhotoUrl(bucket, key)
		pathname = key
		displayUrl = await resolveStoredPhotoUrl(storedUrl)
	} else {
		const ext = args.contentType.split('/')[1].replace('jpeg', 'jpg')
		const blob = await put(`cook-photos/${user.id}/photo.${ext}`, args.bytes, {
			access: 'public',
			contentType: args.contentType,
			addRandomSuffix: true,
		})
		storedUrl = blob.url
		pathname = blob.pathname
		displayUrl = blob.url
	}

	const [row] = await sql`
		insert into cook_photos (user_id, device_id, session_id, url, pathname, content_type, size_bytes)
		values (
			${user.id}::uuid,
			${args.deviceId ?? null},
			${args.sessionId ?? null},
			${storedUrl},
			${pathname},
			${args.contentType},
			${args.bytes.byteLength}
		)
		returning id
	`
	return { id: row.id as string, url: displayUrl }
}

/** Deletes a photo the user owns: stored object first, then the row. */
export async function deleteCookPhoto(photoId: string): Promise<void> {
	const user = await requireSession()
	const sql = getSql()
	const [photo] = await sql`
		select url from cook_photos
		where id = ${photoId} and user_id = ${user.id}::uuid
	`
	if (!photo) throw new Error('Photo not found')
	const url = photo.url as string
	// S3 rows carry an s3:// marker; anything else is a Vercel Blob URL.
	const wasS3 = await deleteStoredPhotoObject(url)
	if (!wasS3) await del(url)
	await sql`delete from cook_photos where id = ${photoId}`
}

/**
 * Resolves stored photo URLs (only the caller's own rows) to fetchable
 * ones: s3:// markers become 60-min presigned GETs; Blob https URLs pass
 * through. The client calls this for rows whose synced `url` is an s3://
 * marker.
 */
export async function resolveCookPhotoUrls(
	photoIds: string[],
): Promise<Record<string, string>> {
	const user = await requireSession()
	if (photoIds.length === 0) return {}
	const sql = getSql()
	const rows = await sql`
		select id, url from cook_photos
		where user_id = ${user.id}::uuid and id = any(${photoIds}::uuid[])
	`
	const resolved: Record<string, string> = {}
	for (const row of rows) {
		try {
			resolved[row.id as string] = await resolveStoredPhotoUrl(
				row.url as string,
			)
		} catch {
			// Presign failure for one photo must not sink the batch.
		}
	}
	return resolved
}
