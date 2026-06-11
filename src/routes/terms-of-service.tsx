import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms-of-service')({
	component: TermsOfServicePage,
	head: () => ({
		meta: [{ title: 'Terms of Service — PitMinder' }],
	}),
})

function TermsOfServicePage() {
	return (
		<div className='min-h-screen bg-background'>
			<main className='max-w-3xl mx-auto px-6 py-12'>
				<h1 className='text-3xl font-bold mb-2'>Terms of Service</h1>
				<p className='text-muted-foreground mb-10'>
					Effective date: 11 June 2026
				</p>

				<div className='space-y-8 text-sm leading-6'>
					<section>
						<h2 className='text-lg font-semibold mb-2'>1. The service</h2>
						<p>
							PitMinder (<strong>pitminder.com</strong>) monitors, records, and
							graphs data from Ninja Woodfire grills and smokers by connecting
							to your SharkNinja account. The service is operated by{' '}
							<strong>Resilient Software Ltd</strong>, a company incorporated in
							the United Kingdom (registered office: 71–75 Shelton Street,
							London WC2H 9JQ) — "we" in these terms. By creating an account you
							agree to these terms. PitMinder is{' '}
							<strong>
								not affiliated with, endorsed by, or connected to SharkNinja or
								Ayla Networks
							</strong>
							. "Ninja" and "Woodfire" are trademarks of their respective
							owners.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>2. Your account</h2>
						<p>
							You're responsible for the accuracy of your account details, the
							security of your password, and everything that happens under your
							account. One person per account. You must be legally able to enter
							into these terms.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							3. Connecting your Ninja account
						</h2>
						<p>
							When you provide your SharkNinja credentials, you authorize
							PitMinder to sign in to your SharkNinja account on your behalf and
							read device data through the SharkNinja/Ayla cloud. You confirm
							the account is yours and that this delegation does not breach any
							agreement you have with SharkNinja — checking that is your
							responsibility, and you do it at your own risk. SharkNinja may
							change or restrict their service at any time, which can break
							PitMinder without notice.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							4. Food safety — read this one
						</h2>
						<p>
							PitMinder displays readings relayed from your grill, with delays,
							gaps, and errors possible at every step.{' '}
							<strong>
								Never rely on PitMinder to judge whether food is safely cooked.
							</strong>{' '}
							Use a trusted physical thermometer and official food-safety
							guidance. PitMinder accepts no responsibility for undercooked,
							overcooked, spoiled, or unsafe food, ruined briskets, upset
							guests, damage to your grill or property, or any decision you make
							based on what the app shows.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>5. Acceptable use</h2>
						<p>
							Don't attempt to break, overload, reverse-engineer, or gain
							unauthorized access to the service or to other people's data;
							don't use it for anything unlawful; don't connect SharkNinja
							accounts that aren't yours.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							6. No warranty, no SLA
						</h2>
						<p>
							The service is provided{' '}
							<strong>"as is" and "as available"</strong>, without warranties of
							any kind, express or implied. It is a hobby project: it may be
							slow, wrong, down, or discontinued entirely at any time, without
							notice. Data (including your cook history) may be lost. Export
							anything you can't bear to lose.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>
							7. Limitation of liability
						</h2>
						<p>
							To the maximum extent permitted by law, Resilient Software Ltd is
							not liable for any indirect, incidental, special, consequential,
							or exemplary damages, or any loss of data, food, profits, or
							goodwill, arising from your use of the service. Our total
							aggregate liability for any claim is limited to the amount you
							paid us in the twelve months before the claim — which, for this
							free service, is zero. Nothing in these terms excludes liability
							that cannot be excluded under applicable law.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>8. Termination</h2>
						<p>
							You can delete your account at any time from the Account page,
							which permanently removes your data. We may suspend or terminate
							accounts that breach these terms, or discontinue the service
							altogether.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>9. Changes</h2>
						<p>
							We may update these terms; material changes will be reflected in
							the effective date above. Continuing to use the service after a
							change means you accept the updated terms.
						</p>
					</section>

					<section>
						<h2 className='text-lg font-semibold mb-2'>10. Governing law</h2>
						<p>
							These terms are governed by the laws of England and Wales, and
							disputes belong to the courts of England and Wales. Contact:{' '}
							<a
								href='mailto:thomas.c.rooney@gmail.com'
								className='underline underline-offset-4'
							>
								thomas.c.rooney@gmail.com
							</a>
							.
						</p>
					</section>
				</div>
			</main>
		</div>
	)
}
