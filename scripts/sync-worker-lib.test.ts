import { describe, expect, it } from 'vitest'
import { assertSafeUpstream } from './sync-worker-lib'

describe('assertSafeUpstream', () => {
	it('allows localhost hosts without any override', () => {
		expect(() =>
			assertSafeUpstream('postgres://user:pass@localhost:54332/postgres', {}),
		).not.toThrow()
		expect(() =>
			assertSafeUpstream('postgres://user:pass@127.0.0.1:5432/db', {}),
		).not.toThrow()
		expect(() =>
			assertSafeUpstream('postgres://user@[::1]:5432/db', {}),
		).not.toThrow()
		expect(() =>
			assertSafeUpstream('postgresql://user@LOCALHOST/db', {}),
		).not.toThrow()
	})

	it('rejects remote hosts, naming the host in the error', () => {
		expect(() =>
			assertSafeUpstream('postgres://fake@evil.example.com/db', {}),
		).toThrow(/evil\.example\.com/)
		expect(() =>
			assertSafeUpstream(
				'postgres://u:p@ep-cool-cloud-123.eu-west-2.aws.neon.tech/neondb',
				{},
			),
		).toThrow(/neon\.tech/)
	})

	it('allows remote hosts when PITMINDER_ALLOW_REMOTE_DB=true', () => {
		expect(() =>
			assertSafeUpstream('postgres://u:p@db.neon.tech/neondb', {
				PITMINDER_ALLOW_REMOTE_DB: 'true',
			}),
		).not.toThrow()
	})

	it('does not accept non-"true" override values', () => {
		expect(() =>
			assertSafeUpstream('postgres://u:p@db.neon.tech/neondb', {
				PITMINDER_ALLOW_REMOTE_DB: '1',
			}),
		).toThrow(/neon\.tech/)
	})

	it('rejects unparseable URLs', () => {
		expect(() => assertSafeUpstream('not a url', {})).toThrow(/parseable/)
	})
})
