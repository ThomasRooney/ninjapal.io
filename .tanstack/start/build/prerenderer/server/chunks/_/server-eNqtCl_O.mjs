export { H3Error, H3Event, MIMES, callNodeListener, createApp, createAppEventHandler, createError, createEvent, createRouter, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, dynamicEventHandler, fromNodeMiddleware, fromPlainHandler, fromWebHandler, isCorsOriginAllowed, isError, isEventHandler, isStream, isWebResponse, lazyEventHandler, promisifyNodeListener, sanitizeStatusCode, sanitizeStatusMessage, serveStatic, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, useBase } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/h3/dist/index.mjs';
import { b as defineHandlerCallback, a as attachRouterServerSsrUtils, d as dehydrateRouter, S as StartServer, m as mergeHeaders } from './ssr.mjs';
export { H as HTTPEventSymbol, V as VIRTUAL_MODULES, e as appendCorsHeaders, f as appendCorsPreflightHeaders, g as appendHeader, h as appendHeaders, i as appendResponseHeader, j as appendResponseHeaders, k as assertMethod, l as clearResponseHeaders, n as clearSession, o as createServerFileRoute, p as createServerRootRoute, q as createServerRoute, r as createStartHandler, s as defaultContentType, c as defaultStreamHandler, t as defineEventHandler, u as defineMiddleware, v as deleteCookie, w as eventHandler, x as fetchWithEvent, y as getContext, z as getCookie, A as getEvent, B as getHeader, C as getHeaders, D as getProxyRequestHeaders, E as getQuery, F as getRequestFingerprint, G as getRequestHeader, I as getRequestHeaders, J as getRequestHost, K as getRequestIP, L as getRequestProtocol, M as getRequestURL, N as getRequestWebStream, O as getResponseHeader, P as getResponseHeaders, Q as getResponseStatus, R as getResponseStatusText, T as getRouterParam, U as getRouterParams, W as getSession, X as getValidatedQuery, Y as getValidatedRouterParams, Z as getWebRequest, _ as handleCacheHeaders, $ as handleCors, a0 as handleServerAction, a1 as isEvent, a2 as isMethod, a3 as isPreflightRequest, a4 as parseCookies, a5 as proxyRequest, a6 as readBody, a7 as readFormData, a8 as readMultipartFormData, a9 as readRawBody, aa as readValidatedBody, ab as removeResponseHeader, ac as requestHandler, ad as runWithEvent, ae as sealSession, af as send, ag as sendError, ah as sendNoContent, ai as sendProxy, aj as sendRedirect, ak as sendStream, al as sendWebResponse, am as setContext, an as setCookie, ao as setHeader, ap as setHeaders, aq as setResponseHeader, ar as setResponseHeaders, as as setResponseStatus, at as transformPipeableStreamWithRouter, au as transformReadableStreamWithRouter, av as unsealSession, aw as updateSession, ax as useSession, ay as writeEarlyHints } from './ssr.mjs';
import { createMemoryHistory } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/history/dist/esm/index.js';
import { jsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import ReactDOMServer from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-dom/server.node.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/adapters/drizzle-adapter/index.mjs';
import 'node:async_hooks';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/jsesc/jsesc.js';
import 'node:stream';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/isbot/index.mjs';
import 'node:stream/web';

function createRequestHandler({
  createRouter: createRouter2,
  request,
  getRouterManifest
}) {
  return async (cb) => {
    const router = createRouter2();
    attachRouterServerSsrUtils(router, await (getRouterManifest == null ? void 0 : getRouterManifest()));
    const url = new URL(request.url, "http://localhost");
    const href = url.href.replace(url.origin, "");
    const history = createMemoryHistory({
      initialEntries: [href]
    });
    router.update({
      history
    });
    await router.load();
    dehydrateRouter(router);
    const responseHeaders = getRequestHeaders({
      router
    });
    return cb({
      request,
      router,
      responseHeaders
    });
  };
}
function getRequestHeaders(opts) {
  let headers = mergeHeaders(
    {
      "Content-Type": "text/html; charset=UTF-8"
    },
    ...opts.router.state.matches.map((match) => {
      return match.headers;
    })
  );
  const { redirect } = opts.router.state;
  if (redirect) {
    headers = mergeHeaders(headers, redirect.headers);
  }
  return headers;
}
const defaultRenderHandler = defineHandlerCallback(
  async ({ router, responseHeaders }) => {
    try {
      let html = ReactDOMServer.renderToString(/* @__PURE__ */ jsx(StartServer, { router }));
      const injectedHtml = await Promise.all(
        router.serverSsr.injectedHtml
      ).then((htmls) => htmls.join(""));
      html = html.replace(`</body>`, `${injectedHtml}</body>`);
      return new Response(`<!DOCTYPE html>${html}`, {
        status: router.state.statusCode,
        headers: responseHeaders
      });
    } catch (error) {
      console.error("Render to string error:", error);
      return new Response("Internal Server Error", {
        status: 500,
        headers: responseHeaders
      });
    }
  }
);

export { StartServer, attachRouterServerSsrUtils, createRequestHandler, defaultRenderHandler, defineHandlerCallback, dehydrateRouter };
//# sourceMappingURL=server-eNqtCl_O.mjs.map
