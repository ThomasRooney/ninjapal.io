import { jsxs, jsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { A as Alert, b as AlertTitle, a as AlertDescription } from './alert-CUu2PQ8M.mjs';
import { C as Card, a as CardHeader, b as CardTitle, d as CardContent } from './card-Dfo2Z8fy.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { f as formatTemperature } from './temperature-utils-BbJLKh3r.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { AlertCircle } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { aK as Route$2 } from './ssr.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
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

const SplitComponent = function DeviceStatusPage() {
  var _a2;
  var _a, _b;
  const {
    deviceId
  } = Route$2.useParams();
  const z = useZero();
  const {
    user
  } = Route$2.useRouteContext();
  const [zeroUser] = useQuery(z.query.users.where("id", (user == null ? void 0 : user.id) || "").one());
  const [devices] = useQuery(z.query.devices.where("id", deviceId));
  const device = devices == null ? void 0 : devices[0];
  const parseJsonSafely = (jsonString) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };
  const grillState = device ? parseJsonSafely(device.grill_state_raw) : null;
  if (!device) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Connection Status" }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "space-y-3", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "LAN IP" }),
          /* @__PURE__ */ jsx("p", { className: "font-mono", children: device.lanIp || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "MAC Address" }),
          /* @__PURE__ */ jsx("p", { className: "font-mono", children: device.mac || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "WiFi Signal" }),
          /* @__PURE__ */ jsx("p", { children: device.rssi ? `${device.rssi} dBm` : "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Bluetooth Signal" }),
          /* @__PURE__ */ jsx("p", { children: device.bt_rssi ? `${device.bt_rssi} dBm` : "\u2014" })
        ] })
      ] }) })
    ] }),
    grillState && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Grill Status" }) }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "State" }),
            /* @__PURE__ */ jsx("p", { className: "capitalize", children: grillState.state || "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Mode" }),
            /* @__PURE__ */ jsx("p", { className: "capitalize", children: grillState.mode || "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Setpoint" }),
            /* @__PURE__ */ jsx("p", { children: grillState.setpoint ? formatTemperature(grillState.setpoint, (_a2 = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _a2 : false) : "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Smoke" }),
            /* @__PURE__ */ jsx("p", { children: grillState.smoke ? "On" : "Off" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Lid" }),
            /* @__PURE__ */ jsx("p", { children: ((_b = (_a = grillState.inputs) == null ? void 0 : _a.io) == null ? void 0 : _b["lid open"]) ? "Open" : "Closed" })
          ] })
        ] }),
        grillState.message && /* @__PURE__ */ jsxs(Alert, { children: [
          /* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx(AlertTitle, { children: "Message" }),
          /* @__PURE__ */ jsx(AlertDescription, { children: grillState.message })
        ] })
      ] })
    ] })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=device._deviceId.status-m2mwomHW.mjs.map
