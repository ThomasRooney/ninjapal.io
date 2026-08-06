import {
	MCP_SCOPE_CONTROL,
	MCP_SCOPE_READ,
	createPitMinderMcpServer,
} from '@/server/mcp/pitminder-server'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'

const READ_TOOLS = [
	'get_telemetry',
	'get_cook_history',
	'list_past_sessions',
	'get_recent_messages',
	'get_pellet_status',
	'list_photos',
]
const CONTROL_TOOLS = ['set_pit_temp', 'respond_to_message']

async function listToolNames(scopes?: Set<string>): Promise<string[]> {
	const server = createPitMinderMcpServer(
		'00000000-0000-0000-0000-000000000000',
		scopes ? { scopes } : undefined,
	)
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair()
	await server.connect(serverTransport)
	const client = new Client({ name: 'test', version: '1.0.0' })
	await client.connect(clientTransport)
	const { tools } = await client.listTools()
	await client.close()
	await server.close()
	return tools.map((t) => t.name).sort()
}

describe('createPitMinderMcpServer scope gating', () => {
	it('registers everything by default (both scopes)', async () => {
		const names = await listToolNames()
		expect(names).toEqual([...READ_TOOLS, ...CONTROL_TOOLS].sort())
	})

	it('read-only grant lists read tools but no control tools', async () => {
		const names = await listToolNames(new Set([MCP_SCOPE_READ]))
		expect(names).toEqual([...READ_TOOLS].sort())
	})

	it('control-only grant lists only control tools', async () => {
		const names = await listToolNames(new Set([MCP_SCOPE_CONTROL]))
		expect(names).toEqual([...CONTROL_TOOLS].sort())
	})

	it('empty grant exposes no tools capability at all', async () => {
		// With zero registered tools the server never advertises the tools
		// capability, so tools/list is Method-not-found.
		await expect(listToolNames(new Set())).rejects.toThrow(/method not found/i)
	})

	it('calling an unregistered control tool fails for a read-only grant', async () => {
		const server = createPitMinderMcpServer(
			'00000000-0000-0000-0000-000000000000',
			{ scopes: new Set([MCP_SCOPE_READ]) },
		)
		const [clientTransport, serverTransport] =
			InMemoryTransport.createLinkedPair()
		await server.connect(serverTransport)
		const client = new Client({ name: 'test', version: '1.0.0' })
		await client.connect(clientTransport)
		const result = await client.callTool({
			name: 'set_pit_temp',
			arguments: { deviceId: 'x', setpointC: 100, reason: 'test' },
		})
		expect(result.isError).toBe(true)
		const content = result.content as Array<{ type: string; text: string }>
		expect(content[0]?.text).toMatch(/not found/i)
		await client.close()
		await server.close()
	})

	it('control handler re-checks the grant at invocation time', async () => {
		// Registration happened with control scope; the grant set then mutates
		// (defense in depth) — the wrapped handler must reject by name.
		const scopes = new Set([MCP_SCOPE_READ, MCP_SCOPE_CONTROL])
		const server = createPitMinderMcpServer(
			'00000000-0000-0000-0000-000000000000',
			{ scopes },
		)
		const [clientTransport, serverTransport] =
			InMemoryTransport.createLinkedPair()
		await server.connect(serverTransport)
		const client = new Client({ name: 'test', version: '1.0.0' })
		await client.connect(clientTransport)

		scopes.delete(MCP_SCOPE_CONTROL)
		const result = await client.callTool({
			name: 'set_pit_temp',
			arguments: { deviceId: 'x', setpointC: 100, reason: 'test' },
		})
		const content = result.content as Array<{ type: string; text: string }>
		expect(content[0]?.text).toContain('missing scope: pitminder:control')

		await client.close()
		await server.close()
	})
})
