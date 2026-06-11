import { magicLinkClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
	plugins: [magicLinkClient()],
})

export const signInWithGoogle = async () => {
	return await authClient.signIn.social({
		provider: 'google',
		callbackURL: '/app',
	})
}

export const signInWithMagicLink = async (email: string) => {
	return await authClient.signIn.magicLink({
		email,
		callbackURL: '/app',
	})
}

export const { signIn, signUp, signOut, getSession, useSession } = authClient
