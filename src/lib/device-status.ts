/**
 * Ayla reports connection status with inconsistent casing: real devices send
 * 'Online' while other paths produce 'online'. Compare case-insensitively so
 * every call site renders online devices the same way.
 */
export function isDeviceOnline(status: string | null | undefined): boolean {
	return status?.toLowerCase() === 'online'
}
