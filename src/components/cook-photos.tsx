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
import { useRef, useState } from 'react'

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
				{!photos?.length ? (
					<p className='text-sm text-muted-foreground'>
						No photos yet — snap the meat when you spritz or wrap.
					</p>
				) : (
					<div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
						{photos
							.filter((p): p is typeof p & { url: string } => p.url != null)
							.map((photo) => (
								<div
									key={photo.id}
									className='relative group'
									data-testid='cook-photo'
								>
									<a href={photo.url} target='_blank' rel='noreferrer'>
										<img
											src={photo.url}
											alt='Cook progress'
											loading='lazy'
											className='aspect-square w-full rounded-md object-cover border'
										/>
									</a>
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
							))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
