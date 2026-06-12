import { jsxs, jsx, Fragment } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { N as NavApp } from './nav-app-BB_Rsu4o.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardDescription, d as CardContent } from './card-Dfo2Z8fy.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { formatDistanceToNow } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/date-fns/index.js';
import { A as Alert, a as AlertDescription } from './alert-CUu2PQ8M.mjs';
import { aB as Button } from './ssr.mjs';
import { I as Input } from './input-DNyvLqac.mjs';
import { L as Label } from './label-DgvpRhnp.mjs';
import { zodResolver } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@hookform/resolvers/zod/dist/zod.mjs';
import { useMutation } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-query/build/modern/index.js';
import { useRouterState, useNavigate, useSearch } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { Loader2 } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { useEffect } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { useForm } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-hook-form/dist/index.esm.mjs';
import { z } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/zod/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import './sidebar-BbScpU58.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-dialog/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-tooltip/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/clsx/dist/clsx.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tailwind-merge/dist/bundle-mjs.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router-devtools/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-invariant/dist/esm/tiny-invariant.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-warning/dist/tiny-warning.cjs.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/router-core/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/cookie-es/dist/index.mjs';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-label/dist/index.mjs';

function NinjaConnectionDebug() {
  const z2 = useZero();
  const [connections] = useQuery(z2.query.ninjaConnections);
  const connection = connections == null ? void 0 : connections[0];
  if (!connection) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { "data-testid": "ninja-connection-debug--card-title", children: "Debug Information" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "No connection data available" })
    ] }) });
  }
  const formatDate = (date) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleString();
  };
  const TokenDisplay = ({
    label,
    value
  }) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
      label,
      ":"
    ] }),
    value ? /* @__PURE__ */ jsx("div", { className: "text-xs bg-muted p-2 rounded overflow-x-auto max-w-full", children: /* @__PURE__ */ jsx("code", { className: "break-all", children: value }) }) : /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Not available" })
  ] });
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { "data-testid": "ninja-connection-debug--card-title", children: "Debug Information" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Token data from Zero sync (for debugging purposes)" })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4", children: [
      /* @__PURE__ */ jsx(
        TokenDisplay,
        {
          label: "OAuth Access Token",
          value: connection.oauthAccessToken
        }
      ),
      /* @__PURE__ */ jsx(
        TokenDisplay,
        {
          label: "OAuth Refresh Token",
          value: connection.oauthRefreshToken
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "OAuth Expires At:" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: formatDate(connection.oauthExpiresAt) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "border-t pt-4" }),
      /* @__PURE__ */ jsx(
        TokenDisplay,
        {
          label: "Ayla Access Token",
          value: connection.aylaAccessToken
        }
      ),
      /* @__PURE__ */ jsx(
        TokenDisplay,
        {
          label: "Ayla Refresh Token",
          value: connection.aylaRefreshToken
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Ayla Expires At:" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: formatDate(connection.aylaExpiresAt) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "border-t pt-4" }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Last Updated:" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs", children: connection.updatedAt ? `${formatDistanceToNow(new Date(connection.updatedAt))} ago` : "Not set" })
      ] })
    ] }) })
  ] });
}
const ninjaConnectionSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});
function NinjaConnectionForm() {
  var _a, _b;
  const routerState = useRouterState();
  const user = (_b = (_a = routerState.matches[0]) == null ? void 0 : _a.context) == null ? void 0 : _b.user;
  const navigate = useNavigate({
    from: "/app/ninja-connection"
  });
  const search = useSearch({
    from: "/_authed/app/_layout/ninja-connection"
  });
  const z2 = useZero();
  const [connections] = useQuery(z2.query.ninjaConnections);
  const connection = connections == null ? void 0 : connections[0];
  const hasConnection = !!(connection == null ? void 0 : connection.username);
  const isEditing = !hasConnection || (search == null ? void 0 : search.mode) === "edit";
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(ninjaConnectionSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });
  useEffect(() => {
    if (connection) {
      reset({
        username: connection.username,
        password: connection.password
      });
    }
  }, [connection, reset]);
  const upsertMutation = useMutation({
    mutationFn: async (data) => {
      await z2.mutate.ninjaConnections.upsert({
        userId: (user == null ? void 0 : user.id) || "",
        ...data
      });
    },
    onSuccess: () => {
      navigate({ search: () => ({}) });
    }
  });
  const testCredentialsMutation = useMutation({
    mutationFn: async () => {
      await z2.mutate.ninjaConnections.validateAndRefreshCredentials({
        userId: (user == null ? void 0 : user.id) || ""
      }).server;
    },
    onSuccess: () => {
    },
    onError: (error) => {
      console.error("Failed to test credentials:", error);
    }
  });
  const onSubmit = (data) => {
    upsertMutation.mutate(data);
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { "data-testid": "ninja-connection-form--card-title", children: "Ninja Account Connection" }),
      /* @__PURE__ */ jsx(CardDescription, { children: hasConnection ? "Your Ninja account is connected. You can update your credentials below." : "Connect your Ninja account to enable device control." })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "username", children: "Username" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "username",
            type: "text",
            placeholder: "Enter your Ninja username",
            disabled: hasConnection && !isEditing,
            "data-testid": "ninja-connection-form--username-input",
            ...register("username")
          }
        ),
        errors.username && /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive", children: errors.username.message })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password",
            type: "password",
            placeholder: "Enter your Ninja password",
            disabled: hasConnection && !isEditing,
            "data-testid": "ninja-connection-form--password-input",
            ...register("password")
          }
        ),
        errors.password && /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive", children: errors.password.message })
      ] }),
      upsertMutation.error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: upsertMutation.error.message }) }),
      upsertMutation.isSuccess && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: "Ninja account credentials saved successfully!" }) }),
      testCredentialsMutation.isSuccess && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: "Login credentials verified! Your Ninja account is connected and working." }) }),
      testCredentialsMutation.error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsxs(AlertDescription, { children: [
        "Connection test failed: ",
        testCredentialsMutation.error.message
      ] }) }),
      (connection == null ? void 0 : connection.updatedAt) && /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        "Last updated:",
        " ",
        formatDistanceToNow(new Date(connection.updatedAt)),
        " ago"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: hasConnection && !isEditing ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            onClick: () => navigate({ search: (prev) => ({ ...prev, mode: "edit" }) }),
            variant: "outline",
            "data-testid": "ninja-connection-form--edit-button",
            children: "Edit Credentials"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            onClick: () => testCredentialsMutation.mutate(),
            disabled: testCredentialsMutation.isPending,
            variant: "secondary",
            "data-testid": "ninja-connection-form--test-button",
            children: testCredentialsMutation.isPending ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
              "Testing..."
            ] }) : "Test Credentials"
          }
        )
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(
          Button,
          {
            type: "submit",
            disabled: upsertMutation.isPending,
            "data-testid": "ninja-connection-form--submit-button",
            children: [
              upsertMutation.isPending && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
              hasConnection ? "Update" : "Connect",
              " Account"
            ]
          }
        ),
        hasConnection && /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => {
              navigate({ search: () => ({}) });
              reset({
                username: connection.username,
                password: connection.password
              });
            },
            "data-testid": "ninja-connection-form--cancel-button",
            children: "Cancel"
          }
        )
      ] }) })
    ] }) })
  ] });
}
const SplitComponent = function RouteComponent() {
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col min-h-screen", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Ninja Connection" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col space-y-6 p-6", children: [
      /* @__PURE__ */ jsx(NinjaConnectionForm, {}),
      /* @__PURE__ */ jsx(NinjaConnectionDebug, {})
    ] })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=ninja-connection-DYF0MuaZ.mjs.map
