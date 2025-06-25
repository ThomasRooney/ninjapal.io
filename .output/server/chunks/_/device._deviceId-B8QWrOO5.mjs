import { jsx, jsxs } from 'react/jsx-runtime';
import { A as Alert, b as AlertTitle, a as AlertDescription } from './alert--6Dcgp-S.mjs';
import { E as Route, A as Badge, C as Card, a as CardHeader, b as CardTitle, e as CardContent, d as CardDescription, c as cn } from './ssr.mjs';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { notFound } from '@tanstack/react-router';
import { Loader2, Wifi, WifiOff, Thermometer, Activity, Clock, AlertCircle } from 'lucide-react';
import 'class-variance-authority';
import '@radix-ui/react-slot';
import 'clsx';
import 'tailwind-merge';
import '@supabase/ssr';
import 'node:async_hooks';
import '@tanstack/react-router-devtools';
import 'tiny-invariant';
import 'tiny-warning';
import '@tanstack/router-core';
import '@radix-ui/react-select';
import 'react';
import '@radix-ui/react-label';
import '@radix-ui/react-switch';
import 'recharts';
import '@radix-ui/react-slider';
import 'react-hook-form';
import 'better-auth/client/plugins';
import 'better-auth/react';
import 'zod';
import 'node:fs';
import '@tanstack/history';
import 'jsesc';
import 'node:stream';
import 'isbot';
import 'react-dom/server';
import 'node:stream/web';

function Tabs({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Root,
    {
      "data-slot": "tabs",
      className: cn("flex flex-col gap-2", className),
      ...props
    }
  );
}
function TabsList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.List,
    {
      "data-slot": "tabs-list",
      className: cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      ),
      ...props
    }
  );
}
function TabsTrigger({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Trigger,
    {
      "data-slot": "tabs-trigger",
      className: cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function TabsContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TabsPrimitive.Content,
    {
      "data-slot": "tabs-content",
      className: cn("flex-1 outline-none", className),
      ...props
    }
  );
}
const SplitComponent = function DeviceDetailPage() {
  var _a, _b;
  const {
    deviceId
  } = Route.useParams();
  const z = useZero();
  const [devices] = useQuery(z.query.devices.where("id", deviceId));
  const device = devices == null ? void 0 : devices[0];
  if (devices && !device) {
    throw notFound();
  }
  if (!devices) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center min-h-screen", children: /* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin" }) });
  }
  const parseJsonSafely = (jsonString) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };
  const grillState = parseJsonSafely(device.grill_state_raw);
  parseJsonSafely(device.cook_state_raw);
  const probeState = parseJsonSafely(device.probe_state_raw);
  return /* @__PURE__ */ jsxs("div", { className: "container mx-auto p-6 max-w-6xl", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: device.productName || "Unnamed Device" }),
        /* @__PURE__ */ jsxs(Badge, { variant: device.connectionStatus === "Online" ? "default" : "secondary", className: "text-base px-3 py-1", children: [
          device.connectionStatus === "Online" ? /* @__PURE__ */ jsx(Wifi, { className: "h-4 w-4 mr-1" }) : /* @__PURE__ */ jsx(WifiOff, { className: "h-4 w-4 mr-1" }),
          device.connectionStatus || "Unknown"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        "Model: ",
        device.model || "Unknown",
        " \u2022 DSN: ",
        device.dsn
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Tabs, { defaultValue: "overview", className: "space-y-4", children: [
      /* @__PURE__ */ jsxs(TabsList, { children: [
        /* @__PURE__ */ jsx(TabsTrigger, { value: "overview", children: "Overview" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "status", children: "Status" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "technical", children: "Technical" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "raw", children: "Raw Data" })
      ] }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "overview", className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3", children: [
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-medium", children: "Temperature" }) }),
            /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(Thermometer, { className: "h-5 w-5 text-muted-foreground" }),
              /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: ((_b = (_a = grillState == null ? void 0 : grillState.inputs) == null ? void 0 : _a.temps) == null ? void 0 : _b.grill) ? `${grillState.inputs.temps.grill}\xB0F` : "\u2014" }),
                device.temperature_setpoint && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
                  "Target: ",
                  device.temperature_setpoint,
                  "\xB0F"
                ] })
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-medium", children: "Cook Mode" }) }),
            /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(Activity, { className: "h-5 w-5 text-muted-foreground" }),
              /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold capitalize", children: (grillState == null ? void 0 : grillState.mode) || device.cooking_mode || "\u2014" }),
                /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground capitalize", children: (grillState == null ? void 0 : grillState.state) || device.cooking_state || "Idle" })
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-medium", children: "Cook Time" }) }),
            /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(Clock, { className: "h-5 w-5 text-muted-foreground" }),
              /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: (grillState == null ? void 0 : grillState["seconds left"]) ? `${Math.floor(grillState["seconds left"] / 60)}m` : "\u2014" }),
                (grillState == null ? void 0 : grillState["seconds set"]) && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
                  "of ",
                  Math.floor(grillState["seconds set"] / 60),
                  "m"
                ] })
              ] })
            ] }) })
          ] })
        ] }),
        (probeState == null ? void 0 : probeState.probes) && probeState.probes.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { children: [
            /* @__PURE__ */ jsx(CardTitle, { children: "Probes" }),
            /* @__PURE__ */ jsx(CardDescription, { children: "Temperature probe readings" })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: probeState.probes.map((probe, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg bg-muted/50", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium capitalize", children: probe.name.replace("probe", "Probe ") }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: probe["plugged in"] ? "Connected" : "Not connected" })
            ] }),
            probe["plugged in"] && /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
              /* @__PURE__ */ jsxs("p", { className: "text-xl font-semibold", children: [
                probe.temp,
                "\xB0F"
              ] }),
              probe.progress < 100 && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
                probe.progress,
                "% done"
              ] })
            ] })
          ] }, probe.name)) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "status", className: "space-y-4", children: [
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
                /* @__PURE__ */ jsx("p", { children: grillState.setpoint ? `${grillState.setpoint}\xB0F` : "\u2014" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Smoke Level" }),
                /* @__PURE__ */ jsx("p", { children: grillState.smoke || device.cook_smoke_level || "\u2014" })
              ] })
            ] }),
            grillState.message && /* @__PURE__ */ jsxs(Alert, { children: [
              /* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsx(AlertTitle, { children: "Message" }),
              /* @__PURE__ */ jsx(AlertDescription, { children: grillState.message })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "technical", className: "space-y-4", children: [
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
              /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: device.oem_model || "\u2014" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Build Factory" }),
              /* @__PURE__ */ jsx("dd", { className: "font-mono text-sm", children: device.build_factory || "\u2014" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Device Type" }),
              /* @__PURE__ */ jsx("dd", { children: device.device_type || "\u2014" })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Location & Sync" }) }),
          /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("dl", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Location" }),
              /* @__PURE__ */ jsxs("dd", { children: [
                device.lat && device.lng ? `${device.lat}, ${device.lng}` : "\u2014",
                device.locality && ` (${device.locality})`
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Last Connected" }),
              /* @__PURE__ */ jsx("dd", { children: device.connected_at ? new Date(device.connected_at).toLocaleString() : "\u2014" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "text-sm text-muted-foreground", children: "Last Synced" }),
              /* @__PURE__ */ jsx("dd", { children: device.lastSyncedAt ? new Date(device.lastSyncedAt).toLocaleString() : "\u2014" })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(TabsContent, { value: "raw", className: "space-y-4", children: /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "Raw Device Data" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Complete device record from the database" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("pre", { className: "text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[600px]", children: JSON.stringify(device, null, 2) }) })
      ] }) })
    ] })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=device._deviceId-B8QWrOO5.mjs.map
