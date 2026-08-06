import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { send, getSignedUrl } = vi.hoisted(() => ({
	send: vi.fn(async (_command: unknown) => ({})),
	getSignedUrl: vi.fn(
		async (_client: unknown, _command: unknown, _opts: unknown) =>
			'https://signed.example/photo?X-Amz-Signature=abc',
	),
}))

vi.mock('@aws-sdk/client-s3', () => {
	class FakeCommand {
		constructor(public input: Record<string, unknown>) {}
	}
	return {
		S3Client: vi.fn(() => ({ send })),
		GetObjectCommand: class GetObjectCommand extends FakeCommand {},
		PutObjectCommand: class PutObjectCommand extends FakeCommand {},
		DeleteObjectCommand: class DeleteObjectCommand extends FakeCommand {},
	}
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }))

import {
	PHOTO_URL_EXPIRY_SECONDS,
	__resetPhotoClientForTests,
	deleteStoredPhotoObject,
	makePhotoKey,
	parseS3PhotoUrl,
	photoExtension,
	photosBucket,
	presignPhotoGet,
	putPhotoObject,
	resolveStoredPhotoUrl,
	s3PhotoUrl,
} from './photo-storage'

beforeEach(() => {
	__resetPhotoClientForTests()
	send.mockClear()
	getSignedUrl.mockClear()
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('photosBucket', () => {
	it('is null when PHOTOS_BUCKET is unset or blank', () => {
		expect(photosBucket({})).toBeNull()
		expect(photosBucket({ PHOTOS_BUCKET: '  ' })).toBeNull()
	})

	it('returns the configured bucket', () => {
		expect(photosBucket({ PHOTOS_BUCKET: 'pitminder-photos' })).toBe(
			'pitminder-photos',
		)
	})
})

describe('photoExtension', () => {
	it('maps jpeg to jpg like the Blob path', () => {
		expect(photoExtension('image/jpeg')).toBe('jpg')
	})

	it('keeps png/webp/heic extensions', () => {
		expect(photoExtension('image/png')).toBe('png')
		expect(photoExtension('image/webp')).toBe('webp')
		expect(photoExtension('image/heic')).toBe('heic')
	})
})

describe('makePhotoKey', () => {
	it('namespaces per user with a photo- prefix and mapped extension', () => {
		const key = makePhotoKey('user-abc', 'image/jpeg')
		expect(key).toMatch(/^cook-photos\/user-abc\/photo-[A-Za-z0-9_-]+\.jpg$/)
	})

	it('uses an unguessable suffix that differs per call', () => {
		const a = makePhotoKey('u', 'image/png')
		const b = makePhotoKey('u', 'image/png')
		expect(a).not.toBe(b)
		const suffix = a.slice('cook-photos/u/photo-'.length, -'.png'.length)
		// 16 random bytes → 22 base64url chars
		expect(suffix.length).toBeGreaterThanOrEqual(21)
	})
})

describe('s3PhotoUrl / parseS3PhotoUrl', () => {
	it('round-trips bucket and key', () => {
		const url = s3PhotoUrl('pitminder-photos', 'cook-photos/u/photo-x.jpg')
		expect(url).toBe('s3://pitminder-photos/cook-photos/u/photo-x.jpg')
		expect(parseS3PhotoUrl(url)).toEqual({
			bucket: 'pitminder-photos',
			key: 'cook-photos/u/photo-x.jpg',
		})
	})

	it('rejects non-s3 and malformed urls', () => {
		expect(parseS3PhotoUrl('https://blob.vercel.com/x.jpg')).toBeNull()
		expect(parseS3PhotoUrl('s3://bucket-only')).toBeNull()
		expect(parseS3PhotoUrl('s3://bucket/')).toBeNull()
	})
})

describe('presignPhotoGet', () => {
	it('mints a 60-minute presigned GET for the bucket/key', async () => {
		const url = await presignPhotoGet('pitminder-photos', 'cook-photos/u/p.jpg')
		expect(url).toContain('https://signed.example/photo')
		expect(getSignedUrl).toHaveBeenCalledTimes(1)
		const [, command, opts] = getSignedUrl.mock.calls[0] as [
			unknown,
			{ input: Record<string, unknown> },
			{ expiresIn: number },
		]
		expect(command.input).toEqual({
			Bucket: 'pitminder-photos',
			Key: 'cook-photos/u/p.jpg',
		})
		expect(opts.expiresIn).toBe(PHOTO_URL_EXPIRY_SECONDS)
	})
})

describe('resolveStoredPhotoUrl', () => {
	it('passes non-S3 urls through without touching the SDK', async () => {
		const url = 'https://blob.vercel-storage.com/photo-abc.jpg'
		await expect(resolveStoredPhotoUrl(url)).resolves.toBe(url)
		expect(getSignedUrl).not.toHaveBeenCalled()
	})

	it('presigns s3:// markers', async () => {
		const url = await resolveStoredPhotoUrl('s3://b/cook-photos/u/p.jpg')
		expect(url).toContain('https://signed.example/photo')
	})
})

describe('putPhotoObject', () => {
	it('refuses when PHOTOS_BUCKET is unset', async () => {
		vi.stubEnv('PHOTOS_BUCKET', '')
		await expect(
			putPhotoObject({
				key: 'k',
				bytes: new ArrayBuffer(4),
				contentType: 'image/png',
			}),
		).rejects.toThrow('PHOTOS_BUCKET')
	})

	it('uploads with bucket, key, body and content type', async () => {
		vi.stubEnv('PHOTOS_BUCKET', 'pitminder-photos')
		await putPhotoObject({
			key: 'cook-photos/u/p.png',
			bytes: new Uint8Array([1, 2, 3]).buffer,
			contentType: 'image/png',
		})
		expect(send).toHaveBeenCalledTimes(1)
		const command = send.mock.calls[0][0] as {
			input: Record<string, unknown>
		}
		expect(command.input.Bucket).toBe('pitminder-photos')
		expect(command.input.Key).toBe('cook-photos/u/p.png')
		expect(command.input.ContentType).toBe('image/png')
		expect(command.input.Body).toBeInstanceOf(Uint8Array)
	})
})

describe('deleteStoredPhotoObject', () => {
	it('returns false (no delete) for Blob urls', async () => {
		await expect(
			deleteStoredPhotoObject('https://blob.vercel.com/x.jpg'),
		).resolves.toBe(false)
		expect(send).not.toHaveBeenCalled()
	})

	it('deletes the object behind an s3:// marker', async () => {
		await expect(
			deleteStoredPhotoObject('s3://pitminder-photos/cook-photos/u/p.jpg'),
		).resolves.toBe(true)
		const command = send.mock.calls[0][0] as {
			input: Record<string, unknown>
		}
		expect(command.input).toEqual({
			Bucket: 'pitminder-photos',
			Key: 'cook-photos/u/p.jpg',
		})
	})
})
