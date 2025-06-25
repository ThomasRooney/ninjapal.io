import { jsx, jsxs } from 'react/jsx-runtime';
import { l as createServerRpc, k as createServerFn, m as getSupabaseServerClient, G as appCss, H as NotFound, J as DefaultCatchBoundary } from './ssr.mjs';
import { createRootRoute, HeadContent, Scripts, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import 'clsx';
import 'tailwind-merge';
import '@supabase/ssr';
import 'node:async_hooks';
import 'tiny-invariant';
import 'tiny-warning';
import '@tanstack/router-core';
import '@radix-ui/react-select';
import 'lucide-react';
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

const fetchUser_createServerFn_handler = createServerRpc("src_routes_root_tsx--fetchUser_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return fetchUser.__executeServer(opts, signal);
});
const fetchUser = createServerFn({
  method: "GET"
}).handler(fetchUser_createServerFn_handler, async () => {
  var _a, _b;
  const supabase = await getSupabaseServerClient();
  const {
    data: {
      session
    },
    error: _error
  } = await supabase.auth.getSession();
  if (!((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email)) {
    return null;
  }
  return {
    email: session.user.email,
    id: session.user.id,
    name: ((_b = session.user.user_metadata) == null ? void 0 : _b.name) || session.user.email.split("@")[0],
    accessToken: session.access_token
  };
});
function RootComponent() {
  return /* @__PURE__ */ jsxs(RootDocument, { children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(TanStackRouterDevtools, { position: "bottom-right" })
  ] });
}
const Route = createRootRoute({
  head: () => ({
    meta: [{
      charSet: "utf-8"
    }, {
      name: "viewport",
      content: "width=device-width, initial-scale=1"
    }, {
      title: "Ninja Pal"
    }],
    links: [{
      rel: "stylesheet",
      href: appCss
    }, {
      rel: "icon",
      href: "/favicon.ico",
      sizes: "32x32"
    }, {
      rel: "icon",
      href: "/icon.svg",
      type: "image/svg+xml"
    }, {
      rel: "apple-touch-icon",
      href: "/apple-touch-icon.png"
    }]
  }),
  beforeLoad: async () => {
    const user = await fetchUser();
    return {
      user
    };
  },
  errorComponent: (props) => {
    return /* @__PURE__ */ jsx(RootDocument, { children: /* @__PURE__ */ jsx(DefaultCatchBoundary, { ...props }) });
  },
  notFoundComponent: () => /* @__PURE__ */ jsx(NotFound, {}),
  component: RootComponent
});
function RootDocument({
  children
}) {
  const ctx = Route.useRouteContext();
  const user = ctx.user;
  console.log("Server-side route context:", {
    user
  });
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { className: "overscroll-none", children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}

export { fetchUser_createServerFn_handler };
//# sourceMappingURL=__root-Bt9IZ2Lx.mjs.map
