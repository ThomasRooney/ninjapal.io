# Spike: TanStack Start SSR streaming through Regional API Gateway REST → Lambda

Date: 2026-08-06 · Account: prod-pitminder (836003244283) · Region: eu-west-2
Branch: `spike/lambda-streaming` · Status: **GATE PASSES** — all resources torn down.

## Verdicts

| # | Question | Verdict |
|---|---|---|
| 1 | nitro `aws-lambda` preset + `awsLambda.streaming: true` builds this app? | **YES** — builds clean through `@tanstack/nitro-v2-vite-plugin` (it spreads its arg straight into `createNitro`, so any nitro option passes through). But the stock streaming runtime only parses Function-URL (payload v2.0) events — see gotcha 1. |
| 2 | SSE actually streams through Regional REST API `responseTransferMode=STREAM` from a VPC-private Lambda? | **YES.** Warm `/api/spike-stream` (10 SSE chunks @500ms): **TTFB 0.05–0.09s, total 5.07s**, chunks arrive at exact 500ms cadence (3 runs). Buffered would have been TTFB ≈ total ≈ 5s. |
| 3 | Normal SSR loads through the same path? | **YES.** `/`→307`/app`; `/app`→307`/auth/login?redirect=%2Fapp` (auth guard, no DB needed); `/auth/login` 200 HTML (warm TTFB 0.11–0.31s); unknown path→404 HTML; two `Set-Cookie` headers survive intact; 302+`Location` intact; POST body → `/api/chat` 401 as expected; 445KB JS asset and binary favicon byte-identical (no `binaryMediaTypes` needed in STREAM mode). |
| 4 | Cold start, 1024MB, p50 of 5 | **p50 TTFB 7.56s** (7.35/7.47/7.56/7.59/7.64). Init Duration is only ~250ms; ~7.2s is first-request module evaluation (TanStack `loadEntries` imports the whole route graph, CPU-bound). At 2048MB: 4.2–4.5s. Warm requests: 3–25ms Lambda duration. |
| 5 | Fallback: Function URL streaming outside VPC | **Streams identically** (stock nitro runtime, v2.0 events): warm first-data 0.04s, same 500ms cadence. **BUT anonymous access is 403-blocked account-wide** despite a textbook `AuthType: NONE` + public `lambda:InvokeFunctionUrl` policy — works only with `AWS_IAM` + SigV4. Suspected org RCP or Lambda public-access-block (local aws-cli build lacks `get-public-access-block-config`; verify from the management account). A public Function URL fallback is NOT currently viable in this account without changing org guardrails. |

**Decision input:** the decided design (VPC Lambda → Regional REST `STREAM` → CloudFront) works as architected. The fallback would need an org-policy change, so the primary path is also the only currently-deployable one.

## Exact build config that worked

`vite.config.js` (committed on this branch) env-switches the preset so the Vercel build is untouched:

```js
const nitroSpikeConfig = () => {
  switch (process.env.NITRO_PRESET_SPIKE) {
    case 'aws-stock': // Q1 build-compat check; Function-URL-only event parsing
      return { preset: 'aws-lambda', awsLambda: { streaming: true } }
    case 'aws-apigw': // the artifact deployed behind API GW REST STREAM
      return {
        preset: 'aws-lambda',
        awsLambda: { streaming: false }, // MUST stay false with a custom entry (see gotcha 2)
        entry: resolve(__dirname, 'infra/aws/spike/lambda-entry.mjs'),
        serveStatic: true, // single-Lambda spike serves /assets too; real design = S3+CloudFront
      }
    default:
      return { preset: 'vercel' }
  }
}
// ...
nitroV2Plugin(nitroSpikeConfig())
```

Build: `NITRO_PRESET_SPIKE=aws-apigw bun run build` → `.output/{server,public}`.
Package: zip `server/` + `public/` (maps stripped: 22MB zip), handler `server/index.handler`, runtime nodejs22.x. `scripts/fix-css-hash.ts` skips gracefully (non-Vercel layout).

`infra/aws/spike/lambda-entry.mjs` is the custom nitro entry: the stock
`aws-lambda-streaming` runtime plus payload-v1.0 parsing, so ONE artifact
serves both API GW REST (v1.0) and Function URLs (v2.0).

## API Gateway property names (verified in CFN, eu-west-2, 2026-08-06)

On `AWS::ApiGateway::Method → Integration` (see `stack.yaml`):

- `ResponseTransferMode: STREAM` (allowed: `BUFFERED | STREAM`)
- `Uri: arn:aws:apigateway:{region}:lambda:path/2021-11-15/functions/{fnArn}/response-streaming-invocations`
  (note the `2021-11-15` API version and `/response-streaming-invocations` — API GW then calls `InvokeWithResponseStream`)
- `Type: AWS_PROXY`, `IntegrationHttpMethod: POST` as usual; greedy `{proxy+}` + root `ANY` methods.

Input event is plain REST proxy **payload v1.0** (`event.path`, `event.httpMethod`, `multiValueHeaders`).
Output is the `awslambda.HttpResponseStream` prelude (metadata JSON `{statusCode, headers, multiValueHeaders?, cookies?}` + 8 NUL bytes + raw chunks) — exactly what nitro's streaming runtime emits, so no output shim needed.

## Gotchas (each cost real debugging time)

1. **nitro's stock `aws-lambda-streaming` runtime cannot parse REST-API events.** It reads `event.rawPath` / `event.requestContext.http.method` (v2.0). REST proxy sends v1.0 → `url: undefined`. Hence the custom entry. (Upstreamable to nitropack.)
2. **`awsLambda.streaming: true` + custom `entry` are mutually exclusive**: the preset's `rollup:before` hook appends `-streaming` to the rollup input path, which 404s a custom entry file. Keep `streaming: false` and let the custom entry do the streaming.
3. **Permission is `lambda:InvokeFunction`, NOT `lambda:InvokeWithResponseStream`.** Granting only `InvokeWithResponseStream` (what the docs' transport implies) ⇒ instant 500 `{"message": "Internal server error"}` with the Lambda never invoked and *no log group created*. Granting `lambda:InvokeFunction` with `SourceArn: arn:aws:execute-api:{region}:{acct}:{apiId}/*` alone ⇒ works. Verified by bisection.
4. **`test-invoke-method` is useless for streaming integrations**: it returns only `Execution log is not available for streaming response.`
5. **Never coerce non-stream bodies with `String()`** in the entry: nitro returns static assets as Buffers; `String(buffer)` UTF-8-mangles them (favicon grew 4286→6608 bytes of U+FFFD). Write raw bytes. With that fixed, the STREAM path is binary-clean end-to-end **without** `binaryMediaTypes`.
6. **Module-scope env asserts fire for ALL routes on first request** — TanStack `loadEntries` imports the entire route graph, so `src/server/email/client.ts` (`RESEND_API_KEY`) and `src/lib/auth.ts` (`getDb()` → `ZERO_UPSTREAM_DB`; oauth-provider `new URL(baseURL)` → `BETTER_AUTH_URL`) throw even for `/api/spike-stream`. Dummies sufficed (postgres.js connects lazily; Resend doesn't dial on construction): `RESEND_API_KEY`, `ZERO_UPSTREAM_DB`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ZERO_AUTH_SECRET`. **No code guards needed** — `fetchUser` already degrades to logged-out, and no-cookie requests never touch the DB.
7. **Host header / stage prefix**: SSR HTML contains only root-relative URLs (no Host leakage — good), but the REST stage prefix (`/spike`) is not in them, so assets 404 when browsing execute-api directly. Irrelevant behind CloudFront with an origin path; noted for direct testing.
8. **TanStack's dehydrated HTML legitimately contains `\x00` bytes** (route-ID separators in the seroval payload) — don't let "binary-looking HTML" send you chasing corruption (grep needs `-a`).
9. Env-var/memory config updates recycle all sandboxes — cheap way to force cold starts (`COLDSTART_SALT`), but remember it also colds production-like traffic.

## Numbers (timing log)

| Measurement | Value |
|---|---|
| SSE via API GW STREAM, warm (3 runs) | first-data 0.05/0.09/0.06s; last 5.06–5.10s; 500ms cadence exact |
| curl `-w` on same | `ttfb=0.067s total=5.068s` |
| SSE via Function URL (IAM, warm) | first-data 0.04s, last 5.05s |
| Cold TTFB @1024MB (5 forced) | 7.35 / 7.47 / **7.56 (p50)** / 7.59 / 7.64 s |
| — breakdown | Init ~250ms + first-request route-graph eval ~7.2s (CPU-bound) |
| Cold TTFB @2048MB (3 forced) | 4.54 / 4.18 / 4.23 s |
| Warm SSR `/auth/login` | 0.11–0.31s TTFB (Lambda duration 3–25ms for cached page) |
| Direct `InvokeWithResponseStream` (cold, incl. VPC ENI) | TTFB 6.85s, total 11.8s |
| Bundle | 43MB `.output` → 22MB zip (maps stripped); 294–302MB peak memory |

Implications for the real build: cold ~7.5s at 1024MB is dominated by route-graph
evaluation — consider 2048MB during wake (halves it), route-level code-splitting,
or accepting it inside the already-minutes-long RDS wake path. Warm behavior is
Vercel-like.

## Files

- `infra/aws/spike/lambda-entry.mjs` — custom nitro entry (v1.0+v2.0, streaming)
- `infra/aws/spike/stack.yaml` — the exact CFN that worked (incl. permission fix)
- `vite.config.js` — `NITRO_PRESET_SPIKE` switch
- `src/routes/api/spike-{stream,cookie,redirect}.ts` — spike routes (no DB/auth)

## Teardown

Stack `pitminder-spike-lambda-streaming` deleted (delete confirmed via
`list-stacks`), spike zips removed from the CDK bootstrap bucket, log groups
deleted. Account left with only CDKToolkit. Verification output is recorded in
the commit body.
