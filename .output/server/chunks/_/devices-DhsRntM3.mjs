import { jsx, jsxs } from 'react/jsx-runtime';
import { C as Card, e as CardContent, a as CardHeader, b as CardTitle, d as CardDescription, A as Badge } from './ssr.mjs';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { Link } from '@tanstack/react-router';
import { Loader2, Cpu } from 'lucide-react';
import '@radix-ui/react-slot';
import 'class-variance-authority';
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

const SplitComponent = function DevicesPage() {
  const z = useZero();
  const [devices] = useQuery(z.query.devices);
  if (!devices) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center min-h-screen", children: /* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "container mx-auto p-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: "Devices" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-2", children: "Manage and monitor your connected devices" })
    ] }),
    devices.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col items-center justify-center py-12", children: [
      /* @__PURE__ */ jsx(Cpu, { className: "h-12 w-12 text-muted-foreground mb-4" }),
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold mb-2", children: "No devices found" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-center", children: "Connect your first device to get started" })
    ] }) }) : /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3", children: devices.map((device) => /* @__PURE__ */ jsx(Link, { to: "/app/device/$deviceId", params: {
      deviceId: device.id
    }, className: "block transition-transform hover:scale-[1.02]", "data-testid": `device-card-${device.id}`, children: /* @__PURE__ */ jsxs(Card, { className: "h-full hover:shadow-lg transition-shadow cursor-pointer", children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: device.productName || "Unnamed Device" }),
          /* @__PURE__ */ jsx(CardDescription, { className: "mt-1", children: device.model || "Unknown Model" })
        ] }),
        /* @__PURE__ */ jsx(Badge, { variant: device.connectionStatus === "Online" ? "default" : "secondary", className: "ml-2", children: device.connectionStatus || "Unknown" })
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "DSN:" }),
          /* @__PURE__ */ jsx("span", { className: "font-mono", children: device.dsn })
        ] }),
        device.lanIp && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "IP:" }),
          /* @__PURE__ */ jsx("span", { className: "font-mono", children: device.lanIp })
        ] }),
        device.rssi !== null && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Signal:" }),
          /* @__PURE__ */ jsxs("span", { children: [
            device.rssi,
            " dBm"
          ] })
        ] }),
        device.temperature_grill !== null && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Temp:" }),
          /* @__PURE__ */ jsxs("span", { children: [
            device.temperature_grill,
            "\xB0F"
          ] })
        ] })
      ] }) })
    ] }) }, device.id)) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=devices-DhsRntM3.mjs.map
