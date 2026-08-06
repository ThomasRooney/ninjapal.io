import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { createServerFn } from '@tanstack/react-start'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const uploadPhoto = createServerFn({ method: 'POST' })
	.validator((d: FormData) => {
		if (!(d instanceof FormData)) throw new Error('Expected FormData')
		return d
	})
	.handler(async ({ data }) => {
		const file = data.get('file')
		if (!(file instanceof File)) throw new Error('No file in upload')
		const deviceId = data.get('deviceId')
		const { uploadCookPhoto } = await import('@/server/photos')
		return uploadCookPhoto({
			bytes: await file.arrayBuffer(),
			contentType: file.type,
			deviceId: typeof deviceId === 'string' ? deviceId : undefined,
		})
	})

const deletePhoto = createServerFn({ method: 'POST' })
	.validator((d: { photoId: string }) => d)
	.handler(async ({ data }) => {
		const { deleteCookPhoto } = await import('@/server/photos')
		await deleteCookPhoto(data.photoId)
		return { ok: true }
	})

const resolvePhotoUrls = createServerFn({ method: 'POST' })
	.validator((d: { photoIds: string[] }) => d)
	.handler(async ({ data }) => {
		const { resolveCookPhotoUrls } = await import('@/server/photos')
		return resolveCookPhotoUrls(data.photoIds)
	})

/**
 * Cook photo strip: upload bark/smoke-ring shots for the AI pitmaster to
 * see; stored 60 days, then reaped.
 */
export function CookPhotos({ deviceId }: { deviceId: string }) {
	const z = useZero()
	const [photos] = useQuery(
		z.query.cookPhotos
			.where('deviceId', deviceId)
			.orderBy('createdAt', 'desc')
			.limit(12),
	)
	const fileRef = useRef<HTMLInputElement>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	// S3-backed rows sync an s3:// marker; the display URL is a short-lived
	// presigned GET minted server-side on demand.
	const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
	const [resolveFailed, setResolveFailed] = useState(false)

	useEffect(() => {
		const pending = (photos ?? [])
			.filter(
				(p): p is typeof p & { id: string; url: string } =>
					p.id != null && p.url != null && p.url.startsWith('s3://'),
			)
			.map((p) => p.id)
			.filter((id) => !(id in resolvedUrls))
		if (pending.length === 0) return
		let cancelled = false
		resolvePhotoUrls({ data: { photoIds: pending } })
			.then((urls) => {
				if (cancelled) return
				setResolveFailed(false)
				setResolvedUrls((prev) => {
					// Only produce a new object when something actually resolved —
					// an identical state re-set would re-run this effect forever.
					let changed = false
					const next = { ...prev }
					for (const [id, url] of Object.entries(urls)) {
						if (next[id] !== url) {
							next[id] = url
							changed = true
						}
					}
					return changed ? next : prev
				})
			})
			.catch(() => {
				if (!cancelled) setResolveFailed(true)
			})
		return () => {
			cancelled = true
		}
	}, [photos, resolvedUrls])

	async function onPick(files: FileList | null) {
		const file = files?.[0]
		if (!file) return
		setBusy(true)
		setError(null)
		try {
			const form = new FormData()
			form.set('file', file)
			form.set('deviceId', deviceId)
			await uploadPhoto({ data: form })
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Upload failed')
		} finally {
			setBusy(false)
			if (fileRef.current) fileRef.current.value = ''
		}
	}

	return (
		<Card data-testid='cook-photos'>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle>Cook photos</CardTitle>
						<CardDescription>
							Show the AI pitmaster your bark — photos keep for 60 days
						</CardDescription>
					</div>
					<Button
						size='sm'
						variant='outline'
						disabled={busy}
						onClick={() => fileRef.current?.click()}
						data-testid='photo-upload-button'
					>
						{busy ? (
							<Loader2 className='h-4 w-4 mr-1.5 animate-spin' />
						) : (
							<Camera className='h-4 w-4 mr-1.5' />
						)}
						Add photo
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<input
					ref={fileRef}
					type='file'
					accept='image/jpeg,image/png,image/webp,image/heic'
					className='hidden'
					onChange={(e) => onPick(e.target.files)}
					data-testid='photo-file-input'
				/>
				{error && (
					<p
						className='text-sm text-destructive mb-3'
						data-testid='photo-error'
					>
						{error}
					</p>
				)}
				{resolveFailed && (
					<p
						className='text-sm text-destructive mb-3'
						data-testid='photo-resolve-error'
					>
						Couldn&apos;t load some photos — try refreshing.
					</p>
				)}
				{!photos?.length ? (
					<p className='text-sm text-muted-foreground'>
						No photos yet — snap the meat when you spritz or wrap.
					</p>
				) : (
					<div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
						{photos
							.filter((p): p is typeof p & { url: string } => p.url != null)
							.map((photo) => {
								// s3:// markers need a presigned URL; https is direct Blob.
								const displayUrl = photo.url.startsWith('s3://')
									? (photo.id && resolvedUrls[photo.id]) || null
									: photo.url
								return (
									<div
										key={photo.id}
										className='relative group'
										data-testid='cook-photo'
									>
										{displayUrl ? (
											<a href={displayUrl} target='_blank' rel='noreferrer'>
												<img
													src={displayUrl}
													alt='Cook progress'
													loading='lazy'
													className='aspect-square w-full rounded-md object-cover border'
												/>
											</a>
										) : (
											<div
												className='aspect-square w-full rounded-md border bg-muted animate-pulse'
												data-testid='cook-photo-loading'
											/>
										)}
										<Button
											size='icon'
											variant='destructive'
											className='absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'
											onClick={() =>
												photo.id && deletePhoto({ data: { photoId: photo.id } })
											}
											data-testid={`photo-delete-${photo.id}`}
										>
											<Trash2 className='h-3 w-3' />
										</Button>
									</div>
								)
							})}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
