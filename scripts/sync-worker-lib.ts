/**
 * Pure helpers for the sync worker, extracted from scripts/sync-worker.ts so
 * safety and backoff behaviour are unit-testable without a DB or the Ayla
 * cloud.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/**
 * Guards the worker against a mistakenly remote ZERO_UPSTREAM_DB: the worker
 * executes device controls, runs the director LLM, pushes notifications and
 * reaps rows, so pointing a local instance at prod would duplicate every prod
 * side effect. Throws (with the offending host in the message) unless the
 * upstream host is local or PITMINDER_ALLOW_REMOTE_DB=true is set — prod
 * deployments must set that env var.
 */
export function assertSafeUpstream(
	url: string,
	env: Record<string, string | undefined> = process.env,
): void {
	if (env.PITMINDER_ALLOW_REMOTE_DB === 'true') return
	let host: string
	try {
		// WHATWG URL keeps IPv6 hosts bracketed ("[::1]") — strip for comparison.
		host = new URL(url).hostname.replace(/^\[|\]$/g, '')
	} catch {
		throw new Error(
			'ZERO_UPSTREAM_DB is not a parseable URL — refusing to start ' +
				'(set PITMINDER_ALLOW_REMOTE_DB=true to override)',
		)
	}
	if (LOCAL_HOSTS.has(host.toLowerCase())) return
	throw new Error(
		`ZERO_UPSTREAM_DB points at remote host "${host}" — the worker executes ` +
			'device controls, director runs and row reaping, so a local instance ' +
			'must not target a remote database. Set PITMINDER_ALLOW_REMOTE_DB=true ' +
			'if this is intentional (prod does).',
	)
}
