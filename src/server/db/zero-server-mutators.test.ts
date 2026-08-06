import type { Schema } from '@/server/db/zero-schema.gen'
import {
	readNinjaCredentials,
	writeNinjaTokens,
} from '@/server/db/zero-server-mutators'
import type { Transaction } from '@rocicorp/zero'
import { describe, expect, it, vi } from 'vitest'

/** Minimal fake server transaction exposing only what the helpers use. */
function fakeServerTx(rows: Record<string, unknown>[] = []) {
	const query = vi.fn(
		async (): Promise<Iterable<Record<string, unknown>>> => rows,
	)
	const tx = {
		location: 'server',
		dbTransaction: { query, wrappedTransaction: null },
	} as unknown as Transaction<Schema>
	return { tx, query }
}

describe('readNinjaCredentials', () => {
	it('throws when run outside a server transaction', async () => {
		const tx = { location: 'client' } as unknown as Transaction<Schema>
		await expect(readNinjaCredentials(tx, 'user-1')).rejects.toThrow(
			'This mutator only runs on the server',
		)
	})

	it('returns null when no connection row exists', async () => {
		const { tx, query } = fakeServerTx([])
		await expect(readNinjaCredentials(tx, 'user-1')).resolves.toBeNull()
		expect(query).toHaveBeenCalledWith(expect.stringContaining('password'), [
			'user-1',
		])
	})

	it('maps snake_case columns and converts timestamptz to epoch millis', async () => {
		const expires = new Date('2026-08-06T12:00:00.000Z')
		const { tx } = fakeServerTx([
			{
				username: 'pit@example.com',
				password: 'hunter2',
				attempts: null,
				oauth_access_token: 'oat',
				oauth_refresh_token: null,
				oauth_expires_at: expires,
				ayla_access_token: null,
				ayla_refresh_token: null,
				ayla_expires_at: null,
			},
		])
		await expect(readNinjaCredentials(tx, 'user-1')).resolves.toEqual({
			username: 'pit@example.com',
			password: 'hunter2',
			attempts: 0,
			oauthAccessToken: 'oat',
			oauthRefreshToken: null,
			oauthExpiresAt: expires.getTime(),
			aylaAccessToken: null,
			aylaRefreshToken: null,
			aylaExpiresAt: null,
		})
	})
})

describe('writeNinjaTokens', () => {
	it('throws when run outside a server transaction', async () => {
		const tx = { location: 'client' } as unknown as Transaction<Schema>
		await expect(
			writeNinjaTokens(tx, 'user-1', { oauthAccessToken: 'x' }),
		).rejects.toThrow('This mutator only runs on the server')
	})

	it('writes only the provided keys, binding values as parameters', async () => {
		const { tx, query } = fakeServerTx()
		await writeNinjaTokens(tx, 'user-1', {
			oauthAccessToken: 'oat',
			oauthRefreshToken: null,
		})
		expect(query).toHaveBeenCalledTimes(1)
		const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]]
		expect(sql).toContain('updated_at = now()')
		expect(sql).toContain('oauth_access_token = $2')
		expect(sql).toContain('oauth_refresh_token = $3')
		expect(sql).not.toContain('ayla_access_token')
		expect(sql).not.toContain('oauth_expires_at')
		expect(params).toEqual(['user-1', 'oat', null])
	})

	it('wraps expiry columns in to_timestamp with epoch millis params', async () => {
		const { tx, query } = fakeServerTx()
		await writeNinjaTokens(tx, 'user-1', {
			aylaAccessToken: 'aat',
			aylaExpiresAt: 1_754_486_400_000,
		})
		const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]]
		expect(sql).toContain('ayla_access_token = $2')
		expect(sql).toContain('ayla_expires_at = to_timestamp($3 / 1000.0)')
		expect(params).toEqual(['user-1', 'aat', 1_754_486_400_000])
	})

	it('clears tokens when nulls are passed for every column', async () => {
		const { tx, query } = fakeServerTx()
		await writeNinjaTokens(tx, 'user-1', {
			oauthAccessToken: null,
			oauthRefreshToken: null,
			oauthExpiresAt: null,
			aylaAccessToken: null,
			aylaRefreshToken: null,
			aylaExpiresAt: null,
		})
		const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]]
		expect(sql).toContain('oauth_expires_at = to_timestamp($4 / 1000.0)')
		expect(params).toEqual(['user-1', null, null, null, null, null, null])
	})
})
