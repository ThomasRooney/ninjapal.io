import { jsxs, jsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { C as Card, a as CardHeader, b as CardTitle, d as CardContent } from './card-Dfo2Z8fy.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { aJ as Route$3 } from './ssr.mjs';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
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

const SplitComponent = function DeviceTechnicalPage() {
  var _a;
  const {
    deviceId
  } = Route$3.useParams();
  const z = useZero();
  const [devices] = useQuery(z.query.devices.where("id", deviceId));
  const device = devices == null ? void 0 : devices[0];
  if (!device) {
    return null;
  }
  const extra = (_a = device.additionalDeviceProperties) != null ? _a : {};
  const extraStr = (key) => typeof extra[key] === "string" || typeof extra[key] === "number" ? String(extra[key]) : null;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Device Information" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("dl", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Firmware Version" }),
          /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: device.ota_fw_version || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "WiFi Firmware" }),
          /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: device.wifi_fw_version || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Main PCB Version" }),
          /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: device.main_pcb_fw_version || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "OEM Model" }),
          /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: extraStr("oem_model") || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Build Factory" }),
          /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: device.build_factory || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Device Type" }),
          /* @__PURE__ */ jsx("dd", { children: extraStr("device_type") || "\u2014" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Location & Sync" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("dl", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Location" }),
          /* @__PURE__ */ jsxs("dd", { children: [
            extraStr("lat") && extraStr("lng") ? `${extraStr("lat")}, ${extraStr("lng")}` : "\u2014",
            extraStr("locality") && ` (${extraStr("locality")})`
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Last Connected" }),
          /* @__PURE__ */ jsx("dd", { children: extraStr("connected_at") ? new Date(extraStr("connected_at")).toLocaleString() : "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Last Synced" }),
          /* @__PURE__ */ jsx("dd", { children: extraStr("lastSyncedAt") ? new Date(extraStr("lastSyncedAt")).toLocaleString() : "\u2014" })
        ] })
      ] }) })
    ] })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=device._deviceId.technical-Bz4rGYSC.mjs.map
