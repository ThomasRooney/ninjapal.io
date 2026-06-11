import LoginCodeEmail from '@/emails/templates/login-code'
import WelcomeEmail from '@/emails/templates/welcome'
import { sendEmail } from '@/server/email/send'
import React from 'react'

/**
 * Auth-flow emails (signup verification, magic links). Failures here must
 * never fail the auth request itself, and test-domain recipients are skipped
 * so e2e signups don't burn Resend sends or bounce-rate reputation.
 */
function shouldSkip(to: string): boolean {
	if (to.endsWith('@example.com') || to.endsWith('.test')) return true
	if (!process.env.RESEND_API_KEY) return true
	return false
}

export async function sendVerificationEmail(
	user: {
		email: string
		name?: string | null
	},
	url: string,
): Promise<void> {
	if (shouldSkip(user.email)) {
		console.log(`[auth-email] skipping verification email to ${user.email}`)
		return
	}
	try {
		await sendEmail({
			to: user.email,
			subject: 'Welcome to PitMinder — verify your email',
			react: React.createElement(WelcomeEmail, {
				username: user.name || user.email.split('@')[0],
				verifyUrl: url,
			}),
		})
	} catch (error) {
		console.error('[auth-email] verification email failed:', error)
	}
}

export async function sendMagicLinkEmail(
	email: string,
	url: string,
): Promise<void> {
	if (shouldSkip(email)) {
		console.log(`[auth-email] skipping magic link email to ${email}`)
		return
	}
	try {
		await sendEmail({
			to: email,
			subject: 'Your PitMinder login link',
			react: React.createElement(LoginCodeEmail, {
				validationCode: undefined,
				magicLink: url,
			}),
		})
	} catch (error) {
		console.error('[auth-email] magic link email failed:', error)
	}
}
