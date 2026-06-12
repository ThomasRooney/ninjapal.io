import { jsxs, jsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { N as NavApp } from './nav-app-BB_Rsu4o.mjs';
import { aB as Button, aA as cn } from './ssr.mjs';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle } from './dialog-Bh1CI11V.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { RefreshCw } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { useState, useCallback } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { toast } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/sonner/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import './sidebar-BbScpU58.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-dialog/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-tooltip/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
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

function Table({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "table-container",
      className: "relative w-full overflow-x-auto",
      children: /* @__PURE__ */ jsx(
        "table",
        {
          "data-slot": "table",
          className: cn("w-full caption-bottom text-sm", className),
          ...props
        }
      )
    }
  );
}
function TableHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "thead",
    {
      "data-slot": "table-header",
      className: cn("[&_tr]:border-b", className),
      ...props
    }
  );
}
function TableBody({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "tbody",
    {
      "data-slot": "table-body",
      className: cn("[&_tr:last-child]:border-0", className),
      ...props
    }
  );
}
function TableRow({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "tr",
    {
      "data-slot": "table-row",
      className: cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      ),
      ...props
    }
  );
}
function TableHead({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "th",
    {
      "data-slot": "table-head",
      className: cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      ),
      ...props
    }
  );
}
function TableCell({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "td",
    {
      "data-slot": "table-cell",
      className: cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      ),
      ...props
    }
  );
}
const SplitComponent = function RouteComponent() {
  const z = useZero();
  const [devices] = useQuery(z.query.devices);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await z.mutate.devices.syncRealDevices().server;
      toast.success("Devices synced successfully");
    } catch (error) {
      console.error("Failed to sync devices:", error);
      if (error instanceof Error) {
        if (error.message === "No connection found for user") {
          toast.error("Please set up your Ninja account credentials first", {
            action: {
              label: "Set up now",
              onClick: () => {
                window.location.href = "/app/ninja-connection";
              }
            }
          });
        } else if (error.message === "Credentials not set") {
          toast.error("Please complete your Ninja account setup", {
            action: {
              label: "Complete setup",
              onClick: () => {
                window.location.href = "/app/ninja-connection";
              }
            }
          });
        } else {
          toast.error(`Failed to sync devices: ${error.message}`);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [z.mutate]);
  const handleRowClick = useCallback((device) => {
    const mergedData = {
      ...device,
      ...device.additionalDeviceProperties || {}
    };
    mergedData.additionalDeviceProperties = void 0;
    setSelectedDevice(mergedData);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col w-full", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Device Status", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "xs", onClick: handleRefresh, disabled: isRefreshing, children: [
      /* @__PURE__ */ jsx(RefreshCw, { className: `w-4 h-4 ${isRefreshing ? "animate-spin" : ""}` }),
      "Refresh Status"
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow", children: /* @__PURE__ */ jsxs("div", { className: "px-4 py-4", children: [
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
//# sourceMappingURL=status-H72S8fGS.mjs.map
