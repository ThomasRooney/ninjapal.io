import { jsx, jsxs, Fragment } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { C as Card, d as CardContent, a as CardHeader, b as CardTitle } from './card-Dfo2Z8fy.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { r as reconstructHistorySnapshots, c as calculateHistoryDiffs } from './historyUtils-Di6Fwh6R.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { Loader2, History } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { useMemo } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { aM as Route } from './ssr.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/clsx/dist/clsx.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tailwind-merge/dist/bundle-mjs.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router-devtools/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-invariant/dist/esm/tiny-invariant.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-warning/dist/tiny-warning.cjs.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/router-core/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/cookie-es/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/zod/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/drizzle-orm/postgres-js/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/postgres/src/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/drizzle-orm/pg-core/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@faker-js/faker/dist/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/zero/src/pg.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@react-email/render/dist/node/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/resend/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/adapters/drizzle-adapter/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/history/dist/esm/index.js';
import 'node:async_hooks';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/h3/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/jsesc/jsesc.js';
import 'node:stream';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/isbot/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-dom/server.node.js';
import 'node:stream/web';

const FIELD_NAME_MAP = {
  productName: "Product Name",
  connectionStatus: "Connection Status",
  lanIp: "IP Address",
  mac: "MAC Address",
  rssi: "WiFi Signal",
  bt_rssi: "Bluetooth Signal",
  is_lid_open: "Lid Open",
  temp_air: "Air Temperature",
  temp_grill: "Grill Temperature",
  temp_uipcb: "UI PCB Temperature",
  temp_mainpcb: "Main PCB Temperature",
  probe1_temp: "Probe 1 Temperature",
  probe2_temp: "Probe 2 Temperature",
  cook_mode: "Cook Mode",
  cook_state: "Cook State",
  cook_smoke_level: "Smoke Level",
  power_state: "Power State",
  error_code: "Error Code",
  ota_fw_version: "Firmware Version",
  wifi_fw_version: "WiFi Firmware",
  main_pcb_fw_version: "Main PCB Firmware",
  // Mappings for common nested properties
  "additional_device_properties.firmwareVersion": "Additional Firmware Version",
  "additional_device_properties.hardwareVersion": "Hardware Version",
  "grill_state.mode": "Grill Mode",
  "grill_state.state": "Grill State",
  "grill_state.setpoint": "Temperature Setpoint",
  "probe_state.probe1.temp": "Probe 1 Temperature",
  "probe_state.probe2.temp": "Probe 2 Temperature"
};
const SplitComponent = function DeviceHistoryPage() {
  const {
    deviceId
  } = Route.useParams();
  const z = useZero();
  const [historyRecords] = useQuery(z.query.deviceHistory.where("deviceId", deviceId).orderBy("recordedAt", "desc").limit(50));
  const history = useMemo(() => {
    if (!historyRecords) return [];
    const snapshots = reconstructHistorySnapshots(historyRecords);
    return calculateHistoryDiffs(snapshots);
  }, [historyRecords]);
  if (!historyRecords) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center p-8", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin" }) });
  }
  if (history.length === 0) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col items-center justify-center py-12", children: [
      /* @__PURE__ */ jsx(History, { className: "h-12 w-12 text-muted-foreground mb-4" }),
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold mb-2", children: "No history available" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-center", children: "Device changes will appear here once recorded" })
    ] }) });
  }
  const formatFieldValue = (value) => {
    if (value === null || value === void 0) return "\u2014";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toString();
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };
  const getFieldDisplayName = (field) => {
    if (FIELD_NAME_MAP[field]) {
      return FIELD_NAME_MAP[field];
    }
    return field.split(".").map((part) => part.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())).join(" \u2192 ");
  };
  return /* @__PURE__ */ jsx("div", { className: "space-y-4", children: history.map((entry) => /* @__PURE__ */ jsxs(Card, { "data-testid": "history-card", children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(CardTitle, { className: "text-base", children: [
        entry.historyType === "snapshot" && "Hourly Snapshot",
        entry.historyType === "patch" && "Device State Updated"
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : "\u2014" })
    ] }) }),
    Object.keys(entry.fields).length > 0 ? /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Object.entries(entry.fields).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([field, value]) => /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between text-sm", children: [
      /* @__PURE__ */ jsxs("span", { className: "font-medium mr-2", children: [
        getFieldDisplayName(field),
        ":"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-right", children: [
        value.status === "added" && /* @__PURE__ */ jsx("span", { className: "text-green-600", children: formatFieldValue(value.to) }),
        value.status === "removed" && /* @__PURE__ */ jsx("span", { className: "text-red-500 line-through", children: formatFieldValue(value.from) }),
        value.status === "changed" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "text-red-500 line-through", children: formatFieldValue(value.from) }),
          /* @__PURE__ */ jsx("span", { className: "mx-1 text-muted-foreground", children: "\u2192" }),
          /* @__PURE__ */ jsx("span", { className: "text-green-600", children: formatFieldValue(value.to) })
        ] })
      ] })
    ] }, `${entry.id}-${field}`)) }) }) : /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No changes detected in this event." }) })
  ] }, entry.id)) });
};

export { SplitComponent as component };
//# sourceMappingURL=device._deviceId.history-D1syFJNJ.mjs.map
