import { jsx, jsxs } from 'react/jsx-runtime';
import { o as Route$c, L as Logo, n as Route$k, B as Button, c as cn } from './ssr.mjs';
import { Outlet, Link, useMatches, useNavigate } from '@tanstack/react-router';
import { DatabaseZap, Users, TreePalm, Mail, UserIcon, Unplug, Activity, Cpu, MoreVerticalIcon, UserCircleIcon, CreditCardIcon, BugIcon, LogOutIcon } from 'lucide-react';
import { S as SidebarProvider, a as Sidebar, b as SidebarHeader, c as SidebarMenu, d as SidebarMenuItem, e as SidebarMenuButton, f as SidebarContent, g as SidebarFooter, h as SidebarGroup, i as SidebarGroupLabel, j as SidebarGroupContent } from './sidebar-Cc3VdR9k.mjs';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { g as getSupabaseBrowserClient } from './supabase-client-V5KmjbJ_.mjs';
import { ZeroProvider, useZero } from '@rocicorp/zero/react';
import { faker } from '@faker-js/faker';
import { Zero } from '@rocicorp/zero';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore, useMemo, useEffect, Suspense } from 'react';
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
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';

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
const items = [
  {
    title: "Zero Mutations",
    url: "/app/zero-mutations",
    icon: DatabaseZap
  },
  {
    title: "Zero Users",
    url: "/app/users",
    icon: Users
  },
  {
    title: "Tanstack Examples",
    url: "/app/tanstack-examples",
    icon: TreePalm
  },
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
  return /* @__PURE__ */ jsxs(SidebarGroup, { children: [
    /* @__PURE__ */ jsx(SidebarGroupLabel, { children: "Examples" }),
    /* @__PURE__ */ jsx(SidebarGroupContent, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: items.map((item) => /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsx(
      SidebarMenuButton,
      {
        asChild: true,
        tooltip: item.title,
        isActive: currentPath === item.url,
        children: /* @__PURE__ */ jsxs(Link, { to: item.url, children: [
          item.icon && /* @__PURE__ */ jsx(item.icon, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { children: item.title })
        ] })
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
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
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
    /* @__PURE__ */ jsx(SidebarHeader, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsx(
      SidebarMenuButton,
      {
        asChild: true,
        className: "data-[slot=sidebar-menu-button]:!p-1.5 mt-0.5",
        children: /* @__PURE__ */ jsxs(Link, { to: "/", children: [
          /* @__PURE__ */ jsx(Logo, {}),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: "Ninja Pal" })
        ] })
      }
    ) }) }) }),
    /* @__PURE__ */ jsx(SidebarContent, { children: /* @__PURE__ */ jsx(NavExamples, {}) }),
    /* @__PURE__ */ jsx(SidebarFooter, { children: /* @__PURE__ */ jsx(NavUser, {}) })
  ] });
}
function useSyncUserZero() {
  const z = useZero();
  const syncUser = async () => {
    var _a2, _b, _c;
    var _a;
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      await z.mutate.users.upsert({
        id: user.id,
        email: (_a2 = user.email) != null ? _a2 : "",
        name: (_c = (_b = (_a = user.user_metadata) == null ? void 0 : _a.name) != null ? _b : user.email) != null ? _c : "Unknown User"
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
function createSharedMutators(authData) {
  return {
    persons: {
      async insert(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        await tx.mutate.persons.insert(args);
      },
      async delete(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        await tx.mutate.persons.delete(args);
      },
      async deleteMany(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        for (const id of args.ids) {
          await tx.mutate.persons.delete({ id });
        }
      }
    },
    users: {
      async create(tx, u) {
        if (!authData.sub) throw new Error("Not authenticated");
        if (await tx.query.users.where("id", u.id).one().run()) return;
        await tx.mutate.users.insert(u);
      },
      async delete(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.id !== authData.sub)
          throw new Error("Cannot delete another user's account");
        await tx.mutate.users.delete(args);
      },
      async upsert(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        await tx.mutate.users.upsert(args);
      }
    },
    ninjaConnections: {
      async upsert(tx, args) {
        var _a;
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.userId !== authData.sub) {
          throw new Error("Cannot modify another user's connection.");
        }
        await tx.mutate.ninjaConnections.upsert({
          ...args,
          attempts: (_a = args.attempts) != null ? _a : 0,
          updatedAt: Date.now()
        });
      },
      async updateTokens(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.userId !== authData.sub)
          throw new Error("Cannot modify another user's tokens");
        const updates = {
          updatedAt: Date.now()
        };
        if (args.oauthAccessToken !== void 0)
          updates.oauthAccessToken = args.oauthAccessToken;
        if (args.oauthRefreshToken !== void 0)
          updates.oauthRefreshToken = args.oauthRefreshToken;
        if (args.oauthExpiresAt !== void 0)
          updates.oauthExpiresAt = args.oauthExpiresAt;
        if (args.aylaAccessToken !== void 0)
          updates.aylaAccessToken = args.aylaAccessToken;
        if (args.aylaRefreshToken !== void 0)
          updates.aylaRefreshToken = args.aylaRefreshToken;
        if (args.aylaExpiresAt !== void 0)
          updates.aylaExpiresAt = args.aylaExpiresAt;
        await tx.mutate.ninjaConnections.update({
          userId: args.userId,
          ...updates
        });
      },
      async incrementAttempts(tx, args) {
        var _a;
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.userId !== authData.sub)
          throw new Error("Cannot modify another user's attempts");
        const connection = await tx.query.ninjaConnections.where("userId", args.userId).one().run();
        if (!connection) throw new Error("Connection not found");
        await tx.mutate.ninjaConnections.update({
          userId: args.userId,
          attempts: ((_a = connection.attempts) != null ? _a : 0) + 1,
          updatedAt: Date.now()
        });
      },
      async validateAndRefreshCredentials(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.userId !== authData.sub)
          throw new Error("Cannot test another user's connection");
      }
    },
    devices: {
      async refreshFakeData(tx) {
        if (!authData.sub) throw new Error("Not authenticated");
        const existingDevices = await tx.query.devices.where("userId", authData.sub).run();
        for (const device of existingDevices) {
          await tx.mutate.devices.delete({ id: device.id });
        }
        for (let i = 0; i < 3; i++) {
          const deviceId = crypto.randomUUID();
          const randomNum = Math.floor(Math.random() * 1e3);
          await tx.mutate.devices.insert({
            id: deviceId,
            userId: authData.sub,
            dsn: `FAKE-DSN-${randomNum}`,
            productName: faker.commerce.productName(),
            model: `Model-${faker.vehicle.model()}`,
            mac: faker.internet.mac(),
            lanIp: faker.internet.ipv4(),
            connectionStatus: Math.random() > 0.5 ? "online" : "offline",
            additionalDeviceProperties: {
              firmwareVersion: `v${faker.system.semver()}`,
              signalStrength: -Math.floor(Math.random() * 50 + 30),
              temperature: Math.floor(Math.random() * 20 + 20),
              humidity: Math.floor(Math.random() * 40 + 30),
              lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
              features: faker.helpers.arrayElements(
                ["wifi", "bluetooth", "zigbee", "zwave"],
                { min: 1, max: 3 }
              )
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      },
      async syncRealDevices(tx) {
        if (!authData.sub) throw new Error("Not authenticated");
      }
    }
  };
}
function createClientMutators(authData) {
  return createSharedMutators(authData);
}
const schema = {
  tables: {
    devices: {
      name: "devices",
      columns: {
        id: {
          type: "string",
          optional: true,
          customType: null
        },
        userId: {
          type: "string",
          optional: false,
          customType: null,
          serverName: "user_id"
        },
        dsn: {
          type: "string",
          optional: false,
          customType: null
        },
        productName: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "product_name"
        },
        model: {
          type: "string",
          optional: true,
          customType: null
        },
        mac: {
          type: "string",
          optional: true,
          customType: null
        },
        lanIp: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "lan_ip"
        },
        connectionStatus: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "connection_status"
        },
        rssi: {
          type: "number",
          optional: true,
          customType: null
        },
        bt_rssi: {
          type: "number",
          optional: true,
          customType: null
        },
        is_lid_open: {
          type: "boolean",
          optional: true,
          customType: null
        },
        temp_air: {
          type: "number",
          optional: true,
          customType: null
        },
        temp_grill: {
          type: "number",
          optional: true,
          customType: null
        },
        temp_uipcb: {
          type: "number",
          optional: true,
          customType: null
        },
        temp_mainpcb: {
          type: "number",
          optional: true,
          customType: null
        },
        probe1_temp: {
          type: "number",
          optional: true,
          customType: null
        },
        probe2_temp: {
          type: "number",
          optional: true,
          customType: null
        },
        cook_state_raw: {
          type: "string",
          optional: true,
          customType: null
        },
        cook_mode: {
          type: "string",
          optional: true,
          customType: null
        },
        cook_state: {
          type: "string",
          optional: true,
          customType: null
        },
        cook_smoke_level: {
          type: "number",
          optional: true,
          customType: null
        },
        cook_notifications: {
          type: "number",
          optional: true,
          customType: null
        },
        cook_defaults: {
          type: "string",
          optional: true,
          customType: null
        },
        power_state: {
          type: "string",
          optional: true,
          customType: null
        },
        error_code: {
          type: "number",
          optional: true,
          customType: null
        },
        grill_state_raw: {
          type: "string",
          optional: true,
          customType: null
        },
        probe_state_raw: {
          type: "string",
          optional: true,
          customType: null
        },
        combined_state_raw: {
          type: "string",
          optional: true,
          customType: null
        },
        seconds_until_auto_off: {
          type: "number",
          optional: true,
          customType: null
        },
        seconds_left_on_timer: {
          type: "number",
          optional: true,
          customType: null
        },
        estimated_end_at: {
          type: "number",
          optional: true,
          customType: null
        },
        ota_fw_version: {
          type: "string",
          optional: true,
          customType: null
        },
        wifi_fw_version: {
          type: "string",
          optional: true,
          customType: null
        },
        wifi_hw_version: {
          type: "string",
          optional: true,
          customType: null
        },
        main_pcb_fw_version: {
          type: "string",
          optional: true,
          customType: null
        },
        main_pcb_hw_version: {
          type: "string",
          optional: true,
          customType: null
        },
        ubd_version: {
          type: "string",
          optional: true,
          customType: null
        },
        device_serial_num: {
          type: "string",
          optional: true,
          customType: null
        },
        device_model_number: {
          type: "string",
          optional: true,
          customType: null
        },
        wifi_module_serial_number: {
          type: "string",
          optional: true,
          customType: null
        },
        build_factory: {
          type: "string",
          optional: true,
          customType: null
        },
        ota_progress: {
          type: "string",
          optional: true,
          customType: null
        },
        is_probe1_installed: {
          type: "boolean",
          optional: true,
          customType: null
        },
        is_probe2_installed: {
          type: "boolean",
          optional: true,
          customType: null
        },
        is_module_debug: {
          type: "boolean",
          optional: true,
          customType: null
        },
        last_cook_response: {
          type: "string",
          optional: true,
          customType: null
        },
        last_exec_response: {
          type: "string",
          optional: true,
          customType: null
        },
        grill_power_setpoint: {
          type: "string",
          optional: true,
          customType: null
        },
        reset_wifi_commanded_at: {
          type: "number",
          optional: true,
          customType: null
        },
        reset_factory_commanded_at: {
          type: "number",
          optional: true,
          customType: null
        },
        cook_command: {
          type: "string",
          optional: true,
          customType: null
        },
        exec_command: {
          type: "string",
          optional: true,
          customType: null
        },
        module_debug_setpoint: {
          type: "boolean",
          optional: true,
          customType: null
        },
        rt_log_enabled_setpoint: {
          type: "boolean",
          optional: true,
          customType: null
        },
        rssi_report_period_setpoint: {
          type: "number",
          optional: true,
          customType: null
        },
        cook_skip_directive: {
          type: "string",
          optional: true,
          customType: null
        },
        additionalDeviceProperties: {
          type: "json",
          optional: true,
          customType: null,
          serverName: "additional_device_properties"
        },
        createdAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "created_at"
        },
        updatedAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "updated_at"
        }
      },
      primaryKey: ["id"]
    },
    ninjaConnections: {
      name: "ninjaConnections",
      columns: {
        userId: {
          type: "string",
          optional: false,
          customType: null,
          serverName: "user_id"
        },
        username: {
          type: "string",
          optional: false,
          customType: null
        },
        password: {
          type: "string",
          optional: false,
          customType: null
        },
        attempts: {
          type: "number",
          optional: true,
          customType: null
        },
        oauthAccessToken: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "oauth_access_token"
        },
        oauthRefreshToken: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "oauth_refresh_token"
        },
        oauthExpiresAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "oauth_expires_at"
        },
        aylaAccessToken: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "ayla_access_token"
        },
        aylaRefreshToken: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "ayla_refresh_token"
        },
        aylaExpiresAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "ayla_expires_at"
        },
        createdAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "created_at"
        },
        updatedAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "updated_at"
        }
      },
      primaryKey: ["userId"],
      serverName: "ninja_connections"
    },
    persons: {
      name: "persons",
      columns: {
        id: {
          type: "string",
          optional: false,
          customType: null
        },
        name: {
          type: "string",
          optional: false,
          customType: null
        },
        email: {
          type: "string",
          optional: true,
          customType: null
        }
      },
      primaryKey: ["id"]
    },
    users: {
      name: "users",
      columns: {
        id: {
          type: "string",
          optional: false,
          customType: null
        },
        email: {
          type: "string",
          optional: false,
          customType: null
        },
        name: {
          type: "string",
          optional: false,
          customType: null
        }
      },
      primaryKey: ["id"]
    }
  },
  relationships: {}
};
const CACHE_FOREVER = { ttl: "forever" };
const zeroAtom = new Atom();
let didPreload = false;
function preload(z) {
  if (didPreload) {
    return;
  }
  didPreload = true;
  z.query.users.preload(CACHE_FOREVER);
  z.query.persons.preload(CACHE_FOREVER);
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
  return /* @__PURE__ */ jsxs(SidebarProvider, { className: "flex h-screen", children: [
    /* @__PURE__ */ jsx(AppSidebar, { variant: "inset" }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 p-2", children: /* @__PURE__ */ jsx("main", { className: "h-full border border-border bg-background rounded flex flex-col overflow-hidden", children: /* @__PURE__ */ jsx(Outlet, {}) }) })
  ] });
}
const SplitComponent = function RouteComponent() {
  const zero = useSyncExternalStore(zeroAtom.onChange, () => zeroAtom.value);
  const {
    user
  } = Route$c.useRouteContext();
  console.log("\u{1F510} App route context:", {
    user
  });
  const userId = useMemo(() => user == null ? void 0 : user.id, [user == null ? void 0 : user.id]);
  useEffect(() => {
    if (!userId) return;
    initializeZero(user);
  }, [userId, user]);
  if (!zero) return null;
  return /* @__PURE__ */ jsx(Suspense, { fallback: null, children: /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsx(ZeroProvider, { zero, children: /* @__PURE__ */ jsx(AppContent, {}) }) }) });
};

export { SplitComponent as component };
//# sourceMappingURL=route-qItUwtMa.mjs.map
