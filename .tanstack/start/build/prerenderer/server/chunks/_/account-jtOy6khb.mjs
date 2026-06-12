import { jsxs, jsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { aB as Button, aA as cn, aG as createServerFn, aH as createServerRpc } from './ssr.mjs';
import { D as Dialog, d as DialogTrigger, a as DialogContent, b as DialogHeader, c as DialogTitle, e as DialogDescription } from './dialog-Bh1CI11V.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { a as authClient } from './auth-client-DwKswVNB.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { BugIcon, LogOutIcon, Thermometer, Loader2 } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { useNavigate } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { useState } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { L as Label } from './label-DgvpRhnp.mjs';
import * as SwitchPrimitive from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-switch/dist/index.mjs';
import { N as NavApp } from './nav-app-BB_Rsu4o.mjs';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/client/react/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-label/dist/index.mjs';
import './sidebar-BbScpU58.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-tooltip/dist/index.mjs';

function AccountDebug() {
  var _a2;
  var _a;
  const { data: session, isPending } = authClient.useSession();
  const z = useZero();
  const [zeroUser] = useQuery(
    z.query.users.where("id", (_a2 = (_a = session == null ? void 0 : session.user) == null ? void 0 : _a.id) != null ? _a2 : "").one()
  );
  return /* @__PURE__ */ jsxs(Dialog, { children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "xs", className: "px-2", children: [
      /* @__PURE__ */ jsx(BugIcon, { className: "h-4 w-4" }),
      "Debug"
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Auth Debug" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "better-auth session vs Zero-synced user row" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 text-xs font-mono", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold mb-1", children: "Session" }),
          /* @__PURE__ */ jsx("pre", { className: "bg-muted p-2 rounded overflow-auto max-h-48", children: isPending ? "Loading\u2026" : JSON.stringify(session, null, 2) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold mb-1", children: "Zero users row" }),
          /* @__PURE__ */ jsx("pre", { className: "bg-muted p-2 rounded overflow-auto max-h-48", children: JSON.stringify(zeroUser != null ? zeroUser : null, null, 2) })
        ] })
      ] })
    ] })
  ] });
}
function AccountLogout() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };
  return /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: handleLogout, size: "xs", className: "px-2", children: [
    /* @__PURE__ */ jsx(LogOutIcon, { className: "h-4 w-4" }),
    "Log Out"
  ] });
}
const deleteUserFn_createServerFn_handler = createServerRpc("src_components_account-delete_tsx--deleteUserFn_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return deleteUserFn.__executeServer(opts, signal);
});
const deleteUserFn = createServerFn({
  method: "POST"
}).handler(deleteUserFn_createServerFn_handler, async () => {
  var _a;
  const [{
    auth
  }, {
    getSql
  }, {
    getWebRequest
  }] = await Promise.all([import('./ssr.mjs').then((n) => n.aR), import('./ssr.mjs').then((n) => n.aQ), import('./server-eNqtCl_O.mjs')]);
  try {
    const request = getWebRequest();
    const session = request ? await auth.api.getSession({
      headers: request.headers
    }) : null;
    if (!(session == null ? void 0 : session.user)) {
      return {
        error: true,
        message: "No authenticated user found"
      };
    }
    const sql = getSql();
    await sql`DELETE FROM public.users WHERE id = ${session.user.id}`;
    await auth.api.deleteUser({
      headers: (_a = request == null ? void 0 : request.headers) != null ? _a : new Headers(),
      body: {}
    });
    return {
      error: false
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to delete user"
    };
  }
});
function AccountDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const deleteUser = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      return;
    }
    try {
      setIsDeleting(true);
      console.log("Deleting user account...");
      const result = await deleteUserFn();
      if (result.error) {
        throw new Error(result.message || "Failed to delete account");
      }
      await authClient.signOut();
      navigate({
        to: "/"
      });
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert(`Failed to delete your account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };
  return /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: deleteUser, size: "sm", disabled: isDeleting, children: isDeleting ? "Deleting..." : "Delete Account" });
}
function Switch({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    SwitchPrimitive.Root,
    {
      "data-slot": "switch",
      className: cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(
        SwitchPrimitive.Thumb,
        {
          "data-slot": "switch-thumb",
          className: cn(
            "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
          )
        }
      )
    }
  );
}
const AccountOverview = () => {
  var _a2;
  var _a;
  const { data: session, isPending: loading } = authClient.useSession();
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const z = useZero();
  const userId = ((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.id) || "";
  const [zeroUser] = useQuery(z.query.users.where("id", userId).one());
  const handleTemperatureToggle = async (checked) => {
    setSavingPreference(true);
    try {
      await z.mutate.users.update({
        id: userId,
        prefers_celsius: checked
      });
    } catch (error) {
      console.error("Error updating temperature preference:", error);
    } finally {
      setSavingPreference(false);
    }
  };
  const refetchSubscription = () => {
    console.log("Refetching subscription...");
    setIsSubscriptionLoading(true);
    setTimeout(() => setIsSubscriptionLoading(false), 1e3);
  };
  return /* @__PURE__ */ jsxs("div", { className: "m-4", children: [
    loading && /* @__PURE__ */ jsx("p", { children: "Loading account data..." }),
    session ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Profile Information" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Name" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm", children: session.user.name || (zeroUser == null ? void 0 : zeroUser.name) || "Not available" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Email" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm", children: session.user.email || (zeroUser == null ? void 0 : zeroUser.email) || "Not available" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Preferences" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Thermometer, { className: "h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsx(Label, { htmlFor: "temperature-unit", className: "text-sm", children: "Temperature Units" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "\xB0F" }),
            /* @__PURE__ */ jsx(
              Switch,
              {
                id: "temperature-unit",
                checked: (_a2 = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _a2 : false,
                onCheckedChange: handleTemperatureToggle,
                disabled: savingPreference || !zeroUser
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "\xB0C" })
          ] })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Billing" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Current Plan" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Free (Placeholder)" })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "Upgrade to Pro (Placeholder)" }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "Test Pro Feature (Placeholder)" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "ghost",
                size: "sm",
                onClick: refetchSubscription,
                disabled: isSubscriptionLoading,
                children: isSubscriptionLoading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Refresh"
              }
            )
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Danger Zone" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Deleting your account will permanently remove all your data from PitMinder. This action cannot be undone." }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(AccountDelete, {}) })
        ] }) })
      ] })
    ] }) : !loading && /* @__PURE__ */ jsx("p", { children: "Please log in to view account details." })
  ] });
};
const SplitComponent = function RouteComponent() {
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col min-h-screen", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Account", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(AccountDebug, {}),
      /* @__PURE__ */ jsx(AccountLogout, {})
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col", children: /* @__PURE__ */ jsx(AccountOverview, {}) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=account-jtOy6khb.mjs.map
