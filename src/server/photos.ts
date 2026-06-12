import { auth } from '@/lib/auth'
import { getSql } from '@/server/db/client'
import { getWebRequest } from '@tanstack/react-start/server'
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
	const request = getWebRequest()
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
 * Stores a cook photo in Vercel Blob (public, unguessable random-suffix
 * URL, namespaced per user) and records it in cook_photos. Photos older
 * than 60 days are reaped by the worker.
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

	const ext = args.contentType.split('/')[1].replace('jpeg', 'jpg')
	const blob = await put(`cook-photos/${user.id}/photo.${ext}`, args.bytes, {
		access: 'public',
		contentType: args.contentType,
		addRandomSuffix: true,
	})

	const [row] = await sql`
		insert into cook_photos (user_id, device_id, session_id, url, pathname, content_type, size_bytes)
		values (
			${user.id}::uuid,
			${args.deviceId ?? null},
			${args.sessionId ?? null},
			${blob.url},
			${blob.pathname},
			${args.contentType},
			${args.bytes.byteLength}
		)
		returning id
	`
	return { id: row.id as string, url: blob.url }
}

/** Deletes a photo the user owns: blob first, then the row. */
export async function deleteCookPhoto(photoId: string): Promise<void> {
	const user = await requireSession()
	const sql = getSql()
	const [photo] = await sql`
		select url from cook_photos
		where id = ${photoId} and user_id = ${user.id}::uuid
	`
	if (!photo) throw new Error('Photo not found')
	await del(photo.url as string)
	await sql`delete from cook_photos where id = ${photoId}`
}
