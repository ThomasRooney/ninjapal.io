export interface WaitUntilRegistry {
	register(promise: Promise<unknown>): void
	size(): number
	flush(): Promise<void>
}
export function createWaitUntilRegistry(): WaitUntilRegistry
