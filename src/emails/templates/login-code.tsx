import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from '@react-email/components'

interface PitMinderLoginCodeEmailProps {
	validationCode?: string
	magicLink: string
}

// BETTER_AUTH_URL may or may not include the scheme depending on the env
const rawBase = process.env.BETTER_AUTH_URL || 'https://app.pitminder.com'
const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`

/**
 * Magic-link login email. The logo is a styled-text wordmark on purpose:
 * Gmail strips SVG and hides remote images until the user opts in, so
 * text + emoji is the only mark that renders everywhere.
 */
export const PitMinderLoginCodeEmail = ({
	validationCode,
	magicLink,
}: PitMinderLoginCodeEmailProps) => (
	<Html>
		<Head />
		<Body style={main}>
			<Preview>Your login link for PitMinder</Preview>
			<Container style={container}>
				<Text style={wordmark}>
					<span style={wordmarkFlame}>🔥</span> Pit
					<span style={wordmarkAccent}>Minder</span>
				</Text>
				<Heading style={heading}>Your login link for PitMinder</Heading>
				<Section style={buttonContainer}>
					<Button style={button} href={magicLink}>
						Login to PitMinder
					</Button>
				</Section>
				<Text style={paragraph}>
					This link is only valid for the next 5 minutes. If the button does not
					work, copy this address into your browser:
				</Text>
				<Text style={fallbackLink}>
					<Link href={magicLink} style={fallbackLinkAnchor}>
						{magicLink}
					</Link>
				</Text>
				{validationCode && (
					<>
						<Text style={paragraph}>
							Or use the login verification code directly:
						</Text>
						<code style={code}>{validationCode}</code>
					</>
				)}
				<Hr style={hr} />
				<Link href={baseUrl} style={reportLink}>
					PitMinder — by Resilient Software Ltd
				</Link>
			</Container>
		</Body>
	</Html>
)

PitMinderLoginCodeEmail.PreviewProps = {
	validationCode: undefined,
	magicLink: 'https://app.pitminder.com/api/auth/magic-link/verify?token=…',
} as PitMinderLoginCodeEmailProps

export default PitMinderLoginCodeEmail

const wordmark = {
	fontSize: '26px',
	fontWeight: '800' as const,
	letterSpacing: '-0.5px',
	color: '#1c1917',
	margin: '0',
}

const wordmarkFlame = {
	fontSize: '24px',
}

const wordmarkAccent = {
	color: '#ea580c',
}

const main = {
	backgroundColor: '#ffffff',
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
	margin: '0 auto',
	padding: '20px 0 48px',
	maxWidth: '560px',
}

const heading = {
	fontSize: '24px',
	letterSpacing: '-0.5px',
	lineHeight: '1.3',
	fontWeight: '400',
	color: '#484848',
	padding: '17px 0 0',
}

const paragraph = {
	margin: '0 0 15px',
	fontSize: '15px',
	lineHeight: '1.4',
	color: '#3c4149',
}

const buttonContainer = {
	padding: '27px 0 27px',
}

const button = {
	backgroundColor: '#ea580c',
	borderRadius: '6px',
	fontWeight: '600',
	color: '#fff',
	fontSize: '15px',
	textDecoration: 'none',
	textAlign: 'center' as const,
	display: 'block',
	padding: '11px 23px',
}

const fallbackLink = {
	margin: '0 0 15px',
	fontSize: '13px',
	lineHeight: '1.4',
	wordBreak: 'break-all' as const,
}

const fallbackLinkAnchor = {
	color: '#ea580c',
}

const reportLink = {
	fontSize: '14px',
	color: '#b4becc',
}

const hr = {
	borderColor: '#dfe1e4',
	margin: '42px 0 26px',
}

const code = {
	fontFamily: 'monospace',
	fontWeight: '700',
	padding: '1px 4px',
	backgroundColor: '#dfe1e4',
	letterSpacing: '-0.3px',
	fontSize: '21px',
	borderRadius: '4px',
	color: '#3c4149',
}
