// Placeholder SSR artifact: lets `cdk synth`/tests run without a real
// NITRO_PRESET=aws-lambda build (infra/aws/scripts/build-ssr.sh writes the
// real one to infra/aws/dist/ssr). Streams a 503 through the same
// HttpResponseStream prelude the gateway's STREAM integration expects.
export const handler = awslambda.streamifyResponse(
	async (_event, responseStream) => {
		const writer = awslambda.HttpResponseStream.from(responseStream, {
			statusCode: 503,
			headers: { 'content-type': 'text/plain', 'retry-after': '60' },
		})
		writer.write('pitminder SSR build not deployed — run infra/aws/scripts/build-ssr.sh and redeploy pitminder-compute\n')
		writer.end()
	},
)
