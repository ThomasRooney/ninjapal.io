import { jsx, jsxs } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { aH as createServerRpc, aG as createServerFn, aN as appCss, aO as NotFound, aP as DefaultCatchBoundary } from './ssr.mjs';
import { createRootRoute, HeadContent, Scripts, Outlet } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { TanStackRouterDevtools } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router-devtools/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/clsx/dist/clsx.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tailwind-merge/dist/bundle-mjs.mjs';
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

const fetchUser_createServerFn_handler = createServerRpc("src_routes_root_tsx--fetchUser_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return fetchUser.__executeServer(opts, signal);
});
const fetchUser = createServerFn({
  method: "GET"
}).handler(fetchUser_createServerFn_handler, async () => {
  var _a;
  const [{
    auth
  }, {
    signZeroToken
  }, {
    getWebRequest
  }] = await Promise.all([import('./ssr.mjs').then((n) => n.aR), import('./zero-jwt-Cxo4ZZOj.mjs'), import('./server-eNqtCl_O.mjs')]);
  const request = getWebRequest();
  if (!request) return null;
  const session = await auth.api.getSession({
    headers: request.headers
  });
  if (!((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email)) {
    return null;
  }
  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || session.user.email.split("@")[0]
  };
  return {
    ...user,
    accessToken: await signZeroToken(user)
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
      title: "PitMinder"
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
//# sourceMappingURL=__root-CkP8nZ0L.mjs.map
