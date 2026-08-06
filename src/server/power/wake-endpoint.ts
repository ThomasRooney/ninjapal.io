/**
 * /api/wake handler body, extracted so the power-row-first auth ordering
 * is integration-testable (configured power + failing DB) without a route
 * harness. See src/routes/api/wake.ts for the contract.
 */
import { powerConfig, readPowerRow, requestWake } from './power-row'
import { verifyWakeGrantCookie } from './wake-grant'

const NO_STORE = { 'Cache-Control': 'no-store' }

async function sessionUserId(request: Request): Promise<string | null> {
	const { auth } = await import('@/lib/auth')
	const session = await auth.api.getSession({ headers: request.headers })
	return session?.user?.id ?? null
}

export async function handleWakeRequest(request: Request): Promise<Response> {
	const cookieHeader = request.headers.get('cookie')

	if (!powerConfig()) {
		// Unconfigured: DB is the only truth — normal session auth.
		let userId: string | null = null
		try {
			userId = await sessionUserId(request)
		} catch {
			userId = null
		}
		if (!userId) {
			return new Response('Unauthorized', { status: 401, headers: NO_STORE })
		}
		return Response.json({ ok: true, configured: false }, { headers: NO_STORE })
	}

	const row = await readPowerRow()
	const state = row?.state ?? null
	let subject: string | null = null

	if (state !== null && state !== 'AWAKE') {
		// Stack not awake — never touch the DB; offline grant auth only.
		subject = verifyWakeGrantCookie(cookieHeader)?.sub ?? null
	} else {
		// Row claims AWAKE (or absent): one bounded session lookup, with the
		// offline grant as fallback if the DB died mid-claim.
		try {
			subject = await sessionUserId(request)
		} catch {
			subject = verifyWakeGrantCookie(cookieHeader)?.sub ?? null
		}
	}

	if (!subject) {
		return new Response('Unauthorized', { status: 401, headers: NO_STORE })
	}
	const ok = await requestWake(subject)
	return Response.json({ ok, configured: true }, { headers: NO_STORE })
}
