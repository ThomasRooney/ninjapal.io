import { jsx, jsxs, Fragment } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { L as Logo } from './logo-6qfVLBMy.mjs';
import { aF as Route$c, aE as schema, aB as Button, aD as createSharedMutators, aC as Route$k, aA as cn } from './ssr.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { ZeroProvider, useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { QueryClientProvider, QueryClient, useQuery as useQuery$1, useIsFetching } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-query/build/modern/index.js';
import { Loader2, RefreshCw, Mail, UserIcon, Unplug, Activity, Cpu, MoreVerticalIcon, UserCircleIcon, CreditCardIcon, BugIcon, LogOutIcon } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { toast, Toaster as Toaster$1 } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/sonner/dist/index.mjs';
import { Outlet, Link, useMatches, useNavigate } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { S as SidebarProvider, a as Sidebar, b as SidebarHeader, c as SidebarMenu, d as SidebarMenuItem, e as SidebarMenuButton, f as SidebarContent, g as SidebarFooter, h as SidebarGroup, i as SidebarGroupLabel, j as SidebarGroupContent } from './sidebar-BbScpU58.mjs';
import * as AvatarPrimitive from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-avatar/dist/index.mjs';
import * as DropdownMenuPrimitive from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs';
import { a as authClient } from './auth-client-DwKswVNB.mjs';
import { Zero } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/zero.js';
import { Suspense, useEffect } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-dialog/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-tooltip/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/client/react/index.mjs';

var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _subs, _val;
function DeviceSyncPoller() {
  const z = useZero();
  const [connections] = useQuery(z.query.ninjaConnections);
  const hasActiveConnection = connections == null ? void 0 : connections.some((c) => !!c.aylaAccessToken);
  const isPollingEnabled = !!connections && hasActiveConnection;
  const { isFetching, refetch } = useQuery$1({
    // This key is unique to the polling action.
    queryKey: ["devices", "syncPoller"],
    // The "query" is actually our mutation. TanStack Query handles it.
    queryFn: async () => {
      try {
        return await z.mutate.devices.syncRealDevices().server;
      } catch (error) {
        if (error instanceof Error) {
          console.error("Device sync failed:", error);
        }
        throw error;
      }
    },
    // --- Critical Configuration ---
    enabled: isPollingEnabled,
    refetchInterval: 60 * 1e3,
    // 1 minute
    refetchIntervalInBackground: false,
    // Don't poll when window is not focused
    // We only want the interval to trigger this.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    // Run once immediately when enabled.
    // A background poll should not have aggressive retries.
    // The self-healing loop is the "retry" mechanism.
    retry: 1,
    // The data from this is a status, not critical state to display.
    // Matching staleTime to the interval is a good practice.
    staleTime: 60 * 1e3
  });
  return /* @__PURE__ */ jsx(
    Button,
    {
      variant: "ghost",
      size: "icon",
      className: "h-6 w-6",
      onClick: async () => {
        try {
          await refetch();
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === "No connection found for user") {
              toast.error(
                "Please set up your Ninja account credentials first",
                {
                  action: {
                    label: "Set up now",
                    onClick: () => {
                      window.location.href = "/app/ninja-connection";
                    }
                  }
                }
              );
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
        }
      },
      disabled: !isPollingEnabled || isFetching,
      title: isFetching ? "Syncing devices..." : isPollingEnabled ? "Sync devices now" : "No active connection",
      children: isFetching ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(RefreshCw, { className: "h-3.5 w-3.5" })
    }
  );
}
const items = [
  {
    title: "Emails",
    url: "/app/email-preview",
    icon: Mail
  },
  {
    title: "Account",
    url: "/app/account",
    icon: UserIcon
  },
  {
    title: "Ninja Connection",
    url: "/app/ninja-connection",
    icon: Unplug
  },
  {
    title: "Device Status",
    url: "/app/status",
    icon: Activity
  },
  {
    title: "Devices",
    url: "/app/devices",
    icon: Cpu
  }
];
function NavExamples() {
  var _a;
  const matches = useMatches();
  const currentPath = (_a = matches[matches.length - 1]) == null ? void 0 : _a.pathname;
  const isSyncing = useIsFetching({ queryKey: ["devices", "syncPoller"] });
  const isDeviceSyncLoading = isSyncing > 0;
  return /* @__PURE__ */ jsxs(SidebarGroup, { children: [
    /* @__PURE__ */ jsx(SidebarGroupLabel, { children: "Examples" }),
    /* @__PURE__ */ jsx(SidebarGroupContent, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: items.map((item) => /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsx(
      SidebarMenuButton,
      {
        asChild: true,
        tooltip: item.title,
        isActive: currentPath === item.url,
        children: /* @__PURE__ */ jsxs(
          Link,
          {
            to: item.url,
            "data-testid": `nav-${item.title.toLowerCase().replace(/\s+/g, "-")}-link`,
            children: [
              item.icon && /* @__PURE__ */ jsx(item.icon, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsx("span", { children: item.title }),
              item.title === "Devices" && isDeviceSyncLoading && /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin ml-auto" })
            ]
          }
        )
      }
    ) }, item.title)) }) })
  ] });
}
function Avatar({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AvatarPrimitive.Root,
    {
      "data-slot": "avatar",
      className: cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      ),
      ...props
    }
  );
}
function AvatarImage({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AvatarPrimitive.Image,
    {
      "data-slot": "avatar-image",
      className: cn("aspect-square size-full", className),
      ...props
    }
  );
}
function AvatarFallback({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AvatarPrimitive.Fallback,
    {
      "data-slot": "avatar-fallback",
      className: cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      ),
      ...props
    }
  );
}
function DropdownMenu({
  ...props
}) {
  return /* @__PURE__ */ jsx(DropdownMenuPrimitive.Root, { "data-slot": "dropdown-menu", ...props });
}
function DropdownMenuTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DropdownMenuPrimitive.Trigger,
    {
      "data-slot": "dropdown-menu-trigger",
      ...props
    }
  );
}
function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}) {
  return /* @__PURE__ */ jsx(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsx(
    DropdownMenuPrimitive.Content,
    {
      "data-slot": "dropdown-menu-content",
      sideOffset,
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
        className
      ),
      ...props
    }
  ) });
}
function DropdownMenuGroup({
  ...props
}) {
  return /* @__PURE__ */ jsx(DropdownMenuPrimitive.Group, { "data-slot": "dropdown-menu-group", ...props });
}
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DropdownMenuPrimitive.Item,
    {
      "data-slot": "dropdown-menu-item",
      "data-inset": inset,
      "data-variant": variant,
      className: cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props
    }
  );
}
function DropdownMenuLabel({
  className,
  inset,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DropdownMenuPrimitive.Label,
    {
      "data-slot": "dropdown-menu-label",
      "data-inset": inset,
      className: cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      ),
      ...props
    }
  );
}
function DropdownMenuSeparator({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DropdownMenuPrimitive.Separator,
    {
      "data-slot": "dropdown-menu-separator",
      className: cn("bg-border -mx-1 my-1 h-px", className),
      ...props
    }
  );
}
function NavUser() {
  var _a, _b, _c, _d;
  const { user } = Route$k.useRouteContext();
  const navigate = useNavigate();
  if (!user) return null;
  const handleSignout = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };
  const handleAccount = async () => {
    navigate({ to: "/app/account" });
  };
  return /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
      Button,
      {
        variant: "outline",
        className: "rounded-md px-2 py-2 w-full h-auto",
        children: [
          /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 rounded-sm text-sm mr-2", children: [
            /* @__PURE__ */ jsx(AvatarImage, { src: "", alt: user.name }),
            /* @__PURE__ */ jsx(AvatarFallback, { className: "rounded-md", children: ((_b = (_a = user.name) == null ? void 0 : _a.slice(0, 2)) == null ? void 0 : _b.toUpperCase()) || "UN" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
            /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: user.name || "Unknown" }),
            /* @__PURE__ */ jsx("span", { className: "truncate text-xs text-muted-foreground", children: user.email })
          ] }),
          /* @__PURE__ */ jsx(MoreVerticalIcon, { className: "ml-auto size-4" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs(
      DropdownMenuContent,
      {
        className: "w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg",
        align: "end",
        sideOffset: 4,
        children: [
          /* @__PURE__ */ jsx(DropdownMenuLabel, { className: "p-0 font-normal", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-1 py-1.5 text-left text-sm", children: [
            /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 rounded-lg", children: [
              /* @__PURE__ */ jsx(AvatarImage, { src: "", alt: user.name }),
              /* @__PURE__ */ jsx(AvatarFallback, { className: "rounded-lg", children: ((_d = (_c = user.name) == null ? void 0 : _c.slice(0, 2)) == null ? void 0 : _d.toUpperCase()) || "UN" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
              /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: user.name || "Unknown" }),
              /* @__PURE__ */ jsx("span", { className: "truncate text-xs text-muted-foreground", children: user.email })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsxs(DropdownMenuGroup, { children: [
            /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: handleAccount, children: [
              /* @__PURE__ */ jsx(UserCircleIcon, { className: "mr-2 h-4 w-4" }),
              "Account"
            ] }),
            /* @__PURE__ */ jsxs(DropdownMenuItem, { children: [
              /* @__PURE__ */ jsx(CreditCardIcon, { className: "mr-2 h-4 w-4" }),
              "Billing"
            ] }),
            /* @__PURE__ */ jsx(Link, { to: "/app/account-debug", children: /* @__PURE__ */ jsxs(DropdownMenuItem, { children: [
              /* @__PURE__ */ jsx(BugIcon, { className: "mr-2 h-4 w-4" }),
              "Debug"
            ] }) })
          ] }),
          /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: handleSignout, children: [
            /* @__PURE__ */ jsx(LogOutIcon, { className: "mr-2 h-4 w-4" }),
            "Log out"
          ] })
        ]
      }
    )
  ] });
}
function AppSidebar({ ...props }) {
  return /* @__PURE__ */ jsxs(Sidebar, { collapsible: "offcanvas", ...props, children: [
    /* @__PURE__ */ jsx(SidebarHeader, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsx(SidebarMenuButton, { className: "data-[slot=sidebar-menu-button]:!p-1.5 mt-0.5", children: /* @__PURE__ */ jsxs("div", { className: "flex w-full items-center justify-between", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Logo, {}),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: "PitMinder" })
      ] }),
      /* @__PURE__ */ jsx(DeviceSyncPoller, {})
    ] }) }) }) }) }),
    /* @__PURE__ */ jsx(SidebarContent, { children: /* @__PURE__ */ jsx(NavExamples, {}) }),
    /* @__PURE__ */ jsx(SidebarFooter, { children: /* @__PURE__ */ jsx(NavUser, {}) })
  ] });
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      theme: "light",
      className: "toaster group",
      style: {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)"
      },
      ...props
    }
  );
};
function useSyncUserZero() {
  const z = useZero();
  const syncUser = async () => {
    var _a, _b, _c;
    const { data: session } = await authClient.getSession();
    const user = session == null ? void 0 : session.user;
    if (user) {
      await z.mutate.users.upsert({
        email: (_a = user.email) != null ? _a : "",
        name: (_c = (_b = user.name) != null ? _b : user.email) != null ? _c : "Unknown User"
      });
    }
  };
  return { syncUser };
}
class Atom {
  constructor() {
    __privateAdd(this, _subs, /* @__PURE__ */ new Set());
    __privateAdd(this, _val);
    __publicField(this, "onChange", (cb) => {
      __privateGet(this, _subs).add(cb);
      cb(__privateGet(this, _val));
      return () => {
        __privateGet(this, _subs).delete(cb);
      };
    });
  }
  set value(value) {
    __privateSet(this, _val, value);
    for (const listener of __privateGet(this, _subs)) {
      listener(value);
    }
  }
  get value() {
    return __privateGet(this, _val);
  }
}
_subs = /* @__PURE__ */ new WeakMap();
_val = /* @__PURE__ */ new WeakMap();
function createClientMutators(authData) {
  return createSharedMutators(authData);
}
const CACHE_FOREVER = { ttl: "forever" };
const zeroAtom = new Atom();
let didPreload = false;
function preload(z) {
  if (didPreload) {
    return;
  }
  didPreload = true;
  z.query.users.preload(CACHE_FOREVER);
}
let currentUserId = null;
function initializeZero(user) {
  var _a;
  if (currentUserId === user.id && zeroAtom.value) {
    console.log("\u{1F7EA} Zero instance already exists for user", user.id);
    return zeroAtom.value;
  }
  (_a = zeroAtom.value) == null ? void 0 : _a.close();
  const serverURL = "http://localhost:4848";
  const authData = {
    sub: user.id,
    email: user.email,
    name: user.name
  };
  const zero = new Zero({
    schema,
    server: serverURL,
    logLevel: "error",
    userID: user.id,
    mutators: createClientMutators(authData),
    auth: () => user.accessToken
  });
  zeroAtom.value = zero;
  currentUserId = user.id;
  preload(zero);
  console.log("\u{1F7EA} Creating new Zero instance for user", user.id);
  return zero;
}
const queryClient = new QueryClient();
function AppContent() {
  const {
    syncUser
  } = useSyncUserZero();
  useEffect(() => {
    syncUser();
  }, [syncUser]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(AppSidebar, { variant: "inset" }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 p-2", children: /* @__PURE__ */ jsx("main", { className: "h-full border border-border bg-background rounded flex flex-col overflow-y-auto", children: /* @__PURE__ */ jsx(Outlet, {}) }) })
  ] });
}
const SplitComponent = function RouteComponent() {
  var _a;
  const {
    user
  } = Route$c.useLoaderData();
  const zero = (_a = zeroAtom.value) != null ? _a : initializeZero(user);
  return /* @__PURE__ */ jsx(Suspense, { fallback: null, children: /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxs(ZeroProvider, { zero, children: [
    /* @__PURE__ */ jsx(DeviceSyncPoller, {}),
    /* @__PURE__ */ jsx(SidebarProvider, { className: "flex h-screen", children: /* @__PURE__ */ jsx(AppContent, {}) }),
    /* @__PURE__ */ jsx(Toaster, {})
  ] }) }) });
};

export { SplitComponent as component };
//# sourceMappingURL=route-lG2A5g7r.mjs.map
