function reconstructHistorySnapshots(records) {
  if (!records || records.length === 0) {
    return [];
  }
  const chronologicalRecords = [...records].reverse();
  let currentState = {};
  const reconstructed = [];
  for (const record of chronologicalRecords) {
    if (!record.changes) {
      continue;
    }
    let changes = null;
    try {
      changes = typeof record.changes === "string" ? JSON.parse(record.changes) : record.changes;
    } catch (e) {
      console.error(
        "Failed to parse device history changes, skipping record:",
        {
          historyId: record.id,
          error: e
        }
      );
      continue;
    }
    if (!changes) {
      continue;
    }
    if (record.historyType === "snapshot") {
      const { id, userId, createdAt, updatedAt, ...deviceState } = changes;
      currentState = deviceState;
    } else if (record.historyType === "patch") {
      currentState = { ...currentState, ...changes };
    }
    reconstructed.push({
      id: record.id,
      recordedAt: record.recordedAt,
      changedBy: record.changedBy,
      historyType: record.historyType,
      state: { ...currentState }
      // Clone the current state
    });
  }
  return reconstructed.reverse();
}
function flattenObject(obj, parentKey = "", result = {}) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = parentKey ? `${parentKey}.${key}` : key;
      const value = obj[key];
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flattenObject(value, propName, result);
      } else {
        result[propName] = value;
      }
    }
  }
  return result;
}
const isEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!isEqual(
        a[key],
        b[key]
      ))
        return false;
    }
    return true;
  }
  return false;
};
function calculateHistoryDiffs(snapshots) {
  if (!snapshots || snapshots.length === 0) {
    return [];
  }
  const diffs = [];
  for (let i = 0; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i + 1];
    const changedFields = {};
    if (!previous) {
      const flattenedState = flattenObject(current.state);
      for (const key in flattenedState) {
        if (Object.prototype.hasOwnProperty.call(flattenedState, key)) {
          changedFields[key] = {
            status: "added",
            to: flattenedState[key]
          };
        }
      }
    } else {
      const currentState = flattenObject(current.state);
      const previousState = flattenObject(previous.state);
      const allKeys = /* @__PURE__ */ new Set([
        ...Object.keys(currentState),
        ...Object.keys(previousState)
      ]);
      for (const key of allKeys) {
        const valueCurrent = currentState[key];
        const valuePrevious = previousState[key];
        const inCurrent = key in currentState;
        const inPrevious = key in previousState;
        if (inCurrent && !inPrevious) {
          changedFields[key] = { status: "added", to: valueCurrent };
        } else if (!inCurrent && inPrevious) {
          changedFields[key] = { status: "removed", from: valuePrevious };
        } else if (!isEqual(valueCurrent, valuePrevious)) {
          changedFields[key] = {
            status: "changed",
            from: valuePrevious,
            to: valueCurrent
          };
        }
      }
    }
    if (Object.keys(changedFields).length > 0) {
      diffs.push({
        id: current.id,
        recordedAt: current.recordedAt,
        changedBy: current.changedBy,
        historyType: current.historyType,
        fields: changedFields
      });
    }
  }
  return diffs;
}

export { calculateHistoryDiffs as c, reconstructHistorySnapshots as r };
//# sourceMappingURL=historyUtils-Di6Fwh6R.mjs.map
