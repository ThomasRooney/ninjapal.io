/** Preserve the signed MCP authorization query when returning from Google. */
export function loginContext(search: string) {
	const params = new URLSearchParams(search)
	const googleError = params.get('error')
	// Provider failures append these fields; they are not part of the signed
	// MCP query and must not be included when retrying authorization.
	params.delete('error')
	params.delete('error_description')
	const query = params.toString()
	const hasContinuation = params.has('client_id') && params.has('sig')
	return {
		redirectTo: hasContinuation
			? `/api/auth/oauth2/authorize?${query}`
			: undefined,
		errorCallbackURL: hasContinuation ? `/auth/login?${query}` : '/auth/login',
		googleError,
	}
}
