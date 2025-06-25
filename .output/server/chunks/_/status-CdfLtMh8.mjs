import { jsxs, jsx } from 'react/jsx-runtime';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
import { B as Button, u as Table, v as TableHeader, w as TableRow, x as TableHead, y as TableBody, z as TableCell } from './ssr.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle } from './dialog-DMacpTK8.mjs';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';
import '@radix-ui/react-slot';
import './sidebar-Cc3VdR9k.mjs';
import 'class-variance-authority';
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';
import '@tanstack/react-router';
import 'clsx';
import 'tailwind-merge';
import '@supabase/ssr';
import 'node:async_hooks';
import '@tanstack/react-router-devtools';
import 'tiny-invariant';
import 'tiny-warning';
import '@tanstack/router-core';
import '@radix-ui/react-select';
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

const SplitComponent = function RouteComponent() {
  const z = useZero();
  const [devices] = useQuery(z.query.devices);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await z.mutate.devices.syncRealDevices();
    } catch (error) {
      console.error("Failed to sync devices:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [z.mutate.devices]);
  const handleRowClick = useCallback((device) => {
    const mergedData = {
      ...device,
      ...device.additionalDeviceProperties || {}
    };
    mergedData.additionalDeviceProperties = void 0;
    setSelectedDevice(mergedData);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full overflow-y-auto w-full", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Device Status", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "xs", onClick: handleRefresh, disabled: isRefreshing, children: [
      /* @__PURE__ */ jsx(RefreshCw, { className: `w-4 h-4 ${isRefreshing ? "animate-spin" : ""}` }),
      "Refresh Status"
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: "px-4 py-4", children: [
      /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "DSN" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Product Name" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Model" }),
          /* @__PURE__ */ jsx(TableHead, { children: "MAC Address" }),
          /* @__PURE__ */ jsx(TableHead, { children: "LAN IP" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: devices == null ? void 0 : devices.map((device) => /* @__PURE__ */ jsxs(TableRow, { onClick: () => handleRowClick(device), className: "cursor-pointer hover:bg-secondary/40", children: [
          /* @__PURE__ */ jsx(TableCell, { className: "font-mono text-sm", children: device.dsn }),
          /* @__PURE__ */ jsx(TableCell, { children: device.productName || "-" }),
          /* @__PURE__ */ jsx(TableCell, { children: device.model || "-" }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-mono text-sm", children: device.mac || "-" }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-mono text-sm", children: device.lanIp || "-" }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${device.connectionStatus === "online" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`, children: device.connectionStatus || "unknown" }) })
        ] }, device.id)) })
      ] }),
      (!devices || devices.length === 0) && /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-32", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: 'No devices found. Click "Refresh Status" to sync devices from your Ninja account.' }) })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: !!selectedDevice, onOpenChange: (open) => !open && setSelectedDevice(null), children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
        "Device Details: ",
        selectedDevice == null ? void 0 : selectedDevice.dsn
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsx("pre", { className: "bg-muted p-4 rounded-lg overflow-x-auto text-xs", children: JSON.stringify(selectedDevice, null, 2) }) })
    ] }) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=status-CdfLtMh8.mjs.map
