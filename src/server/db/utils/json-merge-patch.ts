/**
 * Creates an RFC 7396 JSON Merge Patch from old and new objects
 * @param oldObj The original object
 * @param newObj The updated object
 * @returns A patch object containing only the changes
 */
export function createJsonMergePatch(
	oldObj: Record<string, unknown>,
	newObj: Record<string, unknown>,
): Record<string, unknown> {
	const patch: Record<string, unknown> = {}

	// Add all keys that are in newObj
	for (const key in newObj) {
		if (Object.prototype.hasOwnProperty.call(newObj, key)) {
			const oldValue = oldObj[key]
			const newValue = newObj[key]

			// Include if values are different
			if (!deepEqual(oldValue, newValue)) {
				patch[key] = newValue
			}
		}
	}

	// Mark deleted keys as null
	for (const key in oldObj) {
		if (
			Object.prototype.hasOwnProperty.call(oldObj, key) &&
			!Object.prototype.hasOwnProperty.call(newObj, key)
		) {
			patch[key] = null
		}
	}

	return patch
}

/**
 * Deep equality check for values
 */
function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (a == null || b == null) return false
	if (typeof a !== typeof b) return false

	if (typeof a === 'object' && typeof b === 'object') {
		const aObj = a as Record<string, unknown>
		const bObj = b as Record<string, unknown>

		const aKeys = Object.keys(aObj)
		const bKeys = Object.keys(bObj)

		if (aKeys.length !== bKeys.length) return false

		for (const key of aKeys) {
			if (!bKeys.includes(key)) return false
			if (!deepEqual(aObj[key], bObj[key])) return false
		}

		return true
	}

	return false
}
