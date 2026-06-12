/**
 * Workaround for TanStack/router#4959: the SSR bundle can reference a hashed
 * stylesheet name that the client build never emitted (the two passes hash
 * different bytes). After the build, alias the real client CSS to every
 * styles-*.css name referenced by the server function so the <link> resolves.
 *
 * Runs as part of `bun run build`.
 */
import {
	copyFileSync,
	existsSync,
	readFileSync,
	readdirSync,
	statSync,
} from 'node:fs'
import { join } from 'node:path'

const FUNCTIONS_DIR = '.vercel/output/functions'
const ASSETS_DIR = '.vercel/output/static/assets'

// TanStack Start ≥1.168 fixed router#4959 upstream and Vercel's builder
// lays output out differently — treat a missing layout as nothing to do.
if (!existsSync(ASSETS_DIR) || !existsSync(FUNCTIONS_DIR)) {
	console.log('fix-css-hash: output layout not present, skipping (fixed upstream)')
	process.exit(0)
}

function walk(dir: string, files: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) walk(full, files)
		else files.push(full)
	}
	return files
}

const emitted = readdirSync(ASSETS_DIR).filter(
	(f) => f.startsWith('styles-') && f.endsWith('.css'),
)
if (emitted.length === 0) {
	console.error('fix-css-hash: no styles-*.css found in client assets')
	process.exit(1)
}
const realCss = join(ASSETS_DIR, emitted[0])

const referenced = new Set<string>()
for (const file of walk(FUNCTIONS_DIR)) {
	if (!/\.(mjs|js|json)$/.test(file)) continue
	const content = readFileSync(file, 'utf8')
	for (const m of content.matchAll(/styles-[\w-]+\.css/g)) {
		referenced.add(m[0])
	}
}

let aliased = 0
for (const name of referenced) {
	if (!emitted.includes(name)) {
		copyFileSync(realCss, join(ASSETS_DIR, name))
		aliased++
		console.log(`fix-css-hash: aliased ${emitted[0]} -> ${name}`)
	}
}
console.log(
	`fix-css-hash: ${referenced.size} referenced, ${aliased} aliased, ok`,
)
