import * as crypto from 'node:crypto'
import { chromium } from 'playwright'
import type { Browser, BrowserContext } from 'playwright'
import { config } from './config.ts'
import type { Credentials } from './types.ts'

import type { Cookie } from './types'

export interface IdentityArtifacts {
	cookies: Cookie[]
	authorizationCode: string
	pkceVerifier: string
	state: string
}

export interface IBrowserAutomator {
	performLogin(credentials: Credentials): Promise<IdentityArtifacts>
}

export class PlaywrightBrowserAutomator implements IBrowserAutomator {
	private generatePkceChallenge() {
		const verifier = crypto.randomBytes(32).toString('base64url')
		const challenge = crypto
			.createHash('sha256')
			.update(verifier)
			.digest('base64url')
		return { verifier, challenge }
	}

	private generateState() {
		return crypto.randomBytes(32).toString('base64url')
	}

	async performLogin(credentials: Credentials): Promise<IdentityArtifacts> {
		console.log('Starting browser-based authentication flow...')

		let browser: Browser | null = null
		let context: BrowserContext | null = null

		try {
			// Create a new browser context for isolation
			browser = await chromium.launch({ headless: true })
			context = await browser.newContext()
			const page = await context.newPage()

			// Generate PKCE parameters
			const { verifier, challenge } = this.generatePkceChallenge()
			const state = this.generateState()

			console.log('Generated PKCE challenge and state parameters')

			// Step 1: Initiate OAuth authorization request
			const authorizeUrl = new URL('/authorize', config.oauth.authBaseUrl)
			authorizeUrl.searchParams.set('client_id', config.oauth.clientId)
			authorizeUrl.searchParams.set('response_type', 'code')
			authorizeUrl.searchParams.set('redirect_uri', config.oauth.redirectUri)
			authorizeUrl.searchParams.set('scope', config.oauth.scope)
			authorizeUrl.searchParams.set('state', state)
			authorizeUrl.searchParams.set('code_challenge', challenge)
			authorizeUrl.searchParams.set('code_challenge_method', 'S256')

			console.log('Navigating to authorization URL...')

			// Navigate to authorization URL
			await page.goto(authorizeUrl.toString())

			// Wait for login form to load
			await page.waitForSelector('input[name="username"]', { timeout: 10000 })
			console.log('Login form loaded successfully')

			// Step 2: Fill and submit login form
			await page.fill('input[name="username"]', credentials.email)
			await page.fill('input[name="password"]', credentials.password)

			console.log('Filled login form with credentials')

			// Set up request interception to capture the authorization code
			let authorizationCode: string | null = null

			// Listen for navigation to the redirect URI
			page.on('request', (request) => {
				const url = request.url()
				if (url.startsWith(config.oauth.redirectUri)) {
					const redirectUrl = new URL(url)
					authorizationCode = redirectUrl.searchParams.get('code')
					console.log('Captured authorization code from redirect')
				}
			})

			// Submit the form and handle potential redirect
			await Promise.race([
				page.click(
					'button[type="submit"], input[type="submit"], [data-action-button-primary]',
				),
				page.waitForTimeout(5000),
			])

			// Wait for authorization code or handle resume flow
			let retryCount = 0
			const maxRetries = 10

			while (!authorizationCode && retryCount < maxRetries) {
				retryCount++
				console.log(
					`Waiting for authorization code... (attempt ${retryCount}/${maxRetries})`,
				)

				// Check if we're on the resume page
				if (page.url().includes('/authorize/resume')) {
					console.log('On resume page, waiting for redirect...')
					await page.waitForTimeout(2000)
				} else {
					await page.waitForTimeout(1000)
				}
			}

			// If we still don't have the code, take screenshot and throw error
			if (!authorizationCode) {
				console.error('Current URL:', page.url())
				console.error('Page title:', await page.title())

				// Take a screenshot for debugging
				await page.screenshot({ path: 'login-debug.png', fullPage: true })

				throw new Error(
					'Failed to obtain authorization code after login. Check login-debug.png for details.',
				)
			}

			console.log('Successfully obtained authorization code')

			// Step 3: Extract cookies for session management
			const pageCookies = await context.cookies()
			const relevantCookies: Cookie[] = []

			for (const cookie of pageCookies) {
				if (
					['did', 'auth0', 'auth0_compat', 'did_compat'].includes(cookie.name)
				) {
					relevantCookies.push(cookie)
					console.log(`Captured cookie: ${cookie.name}`)
				}
			}

			console.log(
				`Browser authentication completed successfully. Captured ${relevantCookies.length} cookies.`,
			)

			return {
				cookies: relevantCookies,
				authorizationCode,
				pkceVerifier: verifier,
				state,
			}
		} catch (error) {
			console.error('Browser authentication failed:', error)
			throw new Error(
				`Browser authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		} finally {
			// Clean up browser resources
			if (context) {
				await context.close()
			}
			if (browser) {
				await browser.close()
			}
		}
	}
}
