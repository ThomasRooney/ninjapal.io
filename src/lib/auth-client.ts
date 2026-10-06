import { magicLinkClient } from 'better-auth/client/plugins'
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
	plugins: [magicLinkClient(), adminClient()],
})

export const signInWithGoogle = async (
	callbackURL = '/app',
	errorCallbackURL = '/auth/login',
) => {
	return await authClient.signIn.social({
		provider: 'google',
		callbackURL,
		errorCallbackURL,
	})
}

export const signInWithMagicLink = async (email: string) => {
	return await authClient.signIn.magicLink({
		email,
		callbackURL: '/app',
	})
}

export const { signIn, signUp, signOut, getSession, useSession } = authClient
