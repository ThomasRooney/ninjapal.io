import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy-policy')({
	component: PrivacyPolicyPage,
	head: () => ({
		meta: [{ title: 'Privacy Policy — PitMinder' }],
	}),
})

function PrivacyPolicyPage() {
	return (
		<div className='min-h-screen bg-background'>
			<main className='max-w-3xl mx-auto px-6 py-12'>
				<h1 className='text-3xl font-bold mb-2'>Privacy Policy</h1>
				<p className='text-muted-foreground mb-10'>
					Effective date: 11 June 2026
				</p>

				<div className='space-y-8 text-sm leading-6'>
					<section>
						<h2 className='text-lg font-semibold mb-2'>Who we are</h2>
						<p>
							PitMinder (<strong>pitminder.com</strong>) is a service that
							monitors and graphs data from Ninja Woodfire grills and smokers,
							operated by <strong>Resilient Software Ltd</strong>, a company
							incorporated in the United Kingdom (registered office: 71–75
							Shelton Street, London WC2H 9JQ). Resilient Software Ltd is the
							data controller for the personal data described below. PitMinder
							is{' '}
							<strong>
								not affiliated with, endorsed by, or connected to SharkNinja
							</strong>{' '}
							or Ayla Networks in any way. Questions about this policy:{' '}
							<a
								href='mailto:thomas.c.rooney@gmail.com'
								className='underline underline-offset-4'
							>
								thomas.c.rooney@gmail.com
							</a>
							.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>What we collect</h2>
						<ul className='list-disc pl-5 space-y-2'>
							<li>
								<strong>Account data.</strong> Your email address, a display
								name, and a password. Passwords are stored only as salted hashes
								— we never see or store them in plain text.
							</li>
							<li>
								<strong>Your Ninja account credentials.</strong> To read data
								from your grill, PitMinder signs in to your SharkNinja account
								on your behalf. This means we store the{' '}
								<strong>email and password of your Ninja account</strong>, plus
								the resulting OAuth and Ayla API tokens, in our database. This
								is the most sensitive thing we hold, and you should only connect
								an account you are comfortable delegating this way. You can
								delete the stored credentials at any time from the Ninja
								Connection page, or by deleting your PitMinder account.
							</li>
							<li>
								<strong>Device data.</strong> Identifiers and state reported by
								your grill via the Ayla cloud: serial numbers (DSN), model, MAC
								address, local IP, connection status, firmware versions,
								temperatures (grill, chamber, probes), cook mode and timers, and
								similar telemetry.
							</li>
							<li>
								<strong>Device history.</strong> We keep a time-series record of
								state changes (the data behind the temperature graphs). History
								is retained until you delete the device or your account.
							</li>
							<li>
								<strong>Preferences.</strong> Settings such as your temperature
								unit (°C/°F).
							</li>
						</ul>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							What we don't collect
						</h2>
						<p>
							No analytics trackers, no advertising identifiers, no sale or
							sharing of personal data for marketing — to anyone, ever. The only
							cookies used are strictly necessary session cookies that keep you
							signed in.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>How data is used</h2>
						<p>
							Exclusively to provide the service: authenticating you, fetching
							your devices' state from the SharkNinja/Ayla cloud, storing and
							graphing telemetry, syncing it to your browser in real time, and
							sending transactional email (such as login-related messages). We
							use your data for nothing else.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							Where data lives (subprocessors)
						</h2>
						<ul className='list-disc pl-5 space-y-1'>
							<li>
								<strong>Neon</strong> — primary database (hosted on AWS, London,
								UK)
							</li>
							<li>
								<strong>Vercel</strong> — application hosting and serverless
								functions
							</li>
							<li>
								<strong>Railway</strong> — real-time sync server (holds a read
								replica of application data)
							</li>
							<li>
								<strong>Resend</strong> — transactional email delivery
							</li>
							<li>
								<strong>SharkNinja / Ayla Networks</strong> — your grill's own
								cloud, which we access on your behalf (EU endpoints)
							</li>
						</ul>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>Security</h2>
						<p>
							All traffic is encrypted in transit (TLS). Passwords are hashed.
							Databases are encrypted at rest by our hosting providers. Stored
							Ninja credentials are accessible only to the sync process acting
							on your behalf. No system is perfectly secure, and you connect
							third-party credentials at your own risk.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							Your rights and deletion
						</h2>
						<p>
							You can delete your account at any time from the Account page —
							this permanently removes your account, stored Ninja credentials
							and tokens, devices, and all telemetry history. If you are in the
							UK/EU, you also have GDPR rights to access, rectify, port, or
							erase your data and to complain to a supervisory authority (in the
							UK, the ICO). Email us to exercise any right we haven't built a
							button for yet.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>Changes</h2>
						<p>
							If this policy changes materially, the effective date above will
							change and significant changes will be flagged on this page.
						</p>
					</section>
				</div>
			</main>
		</div>
	)
}
