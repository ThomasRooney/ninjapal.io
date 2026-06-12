import { createRootRoute, createFileRoute, RouterProvider, lazyRouteComponent, redirect, Link, useRouter, useMatch, rootRouteId, ErrorComponent, Outlet, HeadContent, Scripts, createRouter as createRouter$1 } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { jsx, jsxs } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { Slot } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import { cva } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import { clsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/clsx/dist/clsx.mjs';
import { twMerge } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tailwind-merge/dist/bundle-mjs.mjs';
import { TanStackRouterDevtools } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router-devtools/dist/esm/index.js';
import invariant from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-invariant/dist/esm/tiny-invariant.js';
import warning from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-warning/dist/tiny-warning.cjs.js';
import { isNotFound, isPlainObject, pick, TSR_DEFERRED_PROMISE, createControlledPromise, rootRouteId as rootRouteId$1, trimPathLeft, joinPaths, trimPath, processRouteTree, isRedirect, isResolvedRedirect, getMatchedRoutes, isPlainArray, defer } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/router-core/dist/esm/index.js';
import { splitSetCookieString } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/cookie-es/dist/index.mjs';
import { z } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/zod/dist/esm/index.js';
import { drizzle } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/drizzle-orm/postgres-js/index.js';
import postgres from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/postgres/src/index.js';
import { pgTable, timestamp, text, boolean } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/drizzle-orm/pg-core/index.js';
import { faker } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@faker-js/faker/dist/index.js';
import { PushProcessor, ZQLDatabase, PostgresJSConnection } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/zero/src/pg.js';
import { render } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@react-email/render/dist/node/index.mjs';
import { Resend } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/resend/dist/index.mjs';
import React__default from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { betterAuth } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/index.mjs';
import { drizzleAdapter } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/adapters/drizzle-adapter/index.mjs';
import { createMemoryHistory } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/history/dist/esm/index.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { H3Event, getHeader as getHeader$1, getHeaders as getHeaders$1, getProxyRequestHeaders as getProxyRequestHeaders$1, getQuery as getQuery$1, getRequestFingerprint as getRequestFingerprint$1, getRequestHeader as getRequestHeader$1, getRequestHeaders as getRequestHeaders$1, getRequestHost as getRequestHost$1, getRequestIP as getRequestIP$1, getRequestProtocol as getRequestProtocol$1, getRequestURL as getRequestURL$1, getRequestWebStream as getRequestWebStream$1, getResponseHeader as getResponseHeader$1, getResponseHeaders as getResponseHeaders$1, getResponseStatus as getResponseStatus$1, getResponseStatusText as getResponseStatusText$1, getRouterParam as getRouterParam$1, getRouterParams as getRouterParams$1, getSession as getSession$1, getValidatedQuery as getValidatedQuery$1, getValidatedRouterParams as getValidatedRouterParams$1, toWebRequest, handleCacheHeaders as handleCacheHeaders$1, isMethod as isMethod$1, isPreflightRequest as isPreflightRequest$1, parseCookies as parseCookies$1, proxyRequest as proxyRequest$1, readBody as readBody$1, readFormData as readFormData$1, readMultipartFormData as readMultipartFormData$1, readRawBody as readRawBody$1, readValidatedBody as readValidatedBody$1, removeResponseHeader as removeResponseHeader$1, sealSession as sealSession$1, send as send$1, sendError as sendError$1, sendNoContent as sendNoContent$1, sendProxy as sendProxy$1, sendRedirect as sendRedirect$1, sendStream as sendStream$1, sendWebResponse as sendWebResponse$1, setCookie as setCookie$1, setHeader as setHeader$1, setHeaders as setHeaders$1, setResponseHeader as setResponseHeader$1, setResponseHeaders as setResponseHeaders$1, setResponseStatus as setResponseStatus$1, unsealSession as unsealSession$1, updateSession as updateSession$1, useSession as useSession$1, writeEarlyHints as writeEarlyHints$1, defineEventHandler as defineEventHandler$1, appendCorsHeaders as appendCorsHeaders$1, appendCorsPreflightHeaders as appendCorsPreflightHeaders$1, appendHeader as appendHeader$1, appendHeaders as appendHeaders$1, appendResponseHeader as appendResponseHeader$1, appendResponseHeaders as appendResponseHeaders$1, assertMethod as assertMethod$1, clearResponseHeaders as clearResponseHeaders$1, clearSession as clearSession$1, defaultContentType as defaultContentType$1, deleteCookie as deleteCookie$1, eventHandler as eventHandler$1, fetchWithEvent as fetchWithEvent$1, getCookie as getCookie$1, handleCors as handleCors$1 } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/h3/dist/index.mjs';
import jsesc from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/jsesc/jsesc.js';
import { Readable, PassThrough } from 'node:stream';
import { isbot } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/isbot/index.mjs';
import ReactDOMServer from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-dom/server.node.js';
import { ReadableStream as ReadableStream$1 } from 'node:stream/web';

function StartServer(props) {
  return /* @__PURE__ */ jsx(RouterProvider, { router: props.router });
}
function transformReadableStreamWithRouter(router, routerStream) {
  return transformStreamWithRouter(router, routerStream);
}
function transformPipeableStreamWithRouter(router, routerStream) {
  return Readable.fromWeb(
    transformStreamWithRouter(router, Readable.toWeb(routerStream))
  );
}
const patternBodyStart = /(<body)/;
const patternBodyEnd = /(<\/body>)/;
const patternHtmlEnd = /(<\/html>)/;
const patternHeadStart = /(<head.*?>)/;
const patternClosingTag = /(<\/[a-zA-Z][\w:.-]*?>)/g;
const textDecoder = new TextDecoder();
function createPassthrough() {
  let controller;
  const encoder = new TextEncoder();
  const stream = new ReadableStream$1({
    start(c) {
      controller = c;
    }
  });
  const res = {
    stream,
    write: (chunk) => {
      controller.enqueue(encoder.encode(chunk));
    },
    end: (chunk) => {
      if (chunk) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
      res.destroyed = true;
    },
    destroy: (error) => {
      controller.error(error);
    },
    destroyed: false
  };
  return res;
}
async function readStream(stream, opts) {
  var _a, _b, _c;
  try {
    const reader = stream.getReader();
    let chunk;
    while (!(chunk = await reader.read()).done) {
      (_a = opts.onData) == null ? void 0 : _a.call(opts, chunk);
    }
    (_b = opts.onEnd) == null ? void 0 : _b.call(opts);
  } catch (error) {
    (_c = opts.onError) == null ? void 0 : _c.call(opts, error);
  }
}
function transformStreamWithRouter(router, appStream) {
  const finalPassThrough = createPassthrough();
  let isAppRendering = true;
  let routerStreamBuffer = "";
  let pendingClosingTags = "";
  let bodyStarted = false;
  let headStarted = false;
  let leftover = "";
  let leftoverHtml = "";
  function getBufferedRouterStream() {
    const html = routerStreamBuffer;
    routerStreamBuffer = "";
    return html;
  }
  function decodeChunk(chunk) {
    if (chunk instanceof Uint8Array) {
      return textDecoder.decode(chunk);
    }
    return String(chunk);
  }
  const injectedHtmlDonePromise = createControlledPromise();
  let processingCount = 0;
  router.serverSsr.injectedHtml.forEach((promise) => {
    handleInjectedHtml(promise);
  });
  const stopListeningToInjectedHtml = router.subscribe(
    "onInjectedHtml",
    (e) => {
      handleInjectedHtml(e.promise);
    }
  );
  function handleInjectedHtml(promise) {
    processingCount++;
    promise.then((html) => {
      if (!bodyStarted) {
        routerStreamBuffer += html;
      } else {
        finalPassThrough.write(html);
      }
    }).catch(injectedHtmlDonePromise.reject).finally(() => {
      processingCount--;
      if (!isAppRendering && processingCount === 0) {
        stopListeningToInjectedHtml();
        injectedHtmlDonePromise.resolve();
      }
    });
  }
  injectedHtmlDonePromise.then(() => {
    const finalHtml = leftoverHtml + getBufferedRouterStream() + pendingClosingTags;
    finalPassThrough.end(finalHtml);
  }).catch((err) => {
    console.error("Error reading routerStream:", err);
    finalPassThrough.destroy(err);
  });
  readStream(appStream, {
    onData: (chunk) => {
      const text2 = decodeChunk(chunk.value);
      let chunkString = leftover + text2;
      const bodyEndMatch = chunkString.match(patternBodyEnd);
      const htmlEndMatch = chunkString.match(patternHtmlEnd);
      if (!bodyStarted) {
        const bodyStartMatch = chunkString.match(patternBodyStart);
        if (bodyStartMatch) {
          bodyStarted = true;
        }
      }
      if (!headStarted) {
        const headStartMatch = chunkString.match(patternHeadStart);
        if (headStartMatch) {
          headStarted = true;
          const index = headStartMatch.index;
          const headTag = headStartMatch[0];
          const remaining = chunkString.slice(index + headTag.length);
          finalPassThrough.write(
            chunkString.slice(0, index) + headTag + getBufferedRouterStream()
          );
          chunkString = remaining;
        }
      }
      if (!bodyStarted) {
        finalPassThrough.write(chunkString);
        leftover = "";
        return;
      }
      if (bodyEndMatch && htmlEndMatch && bodyEndMatch.index < htmlEndMatch.index) {
        const bodyEndIndex = bodyEndMatch.index;
        pendingClosingTags = chunkString.slice(bodyEndIndex);
        finalPassThrough.write(
          chunkString.slice(0, bodyEndIndex) + getBufferedRouterStream()
        );
        leftover = "";
        return;
      }
      let result;
      let lastIndex = 0;
      while ((result = patternClosingTag.exec(chunkString)) !== null) {
        lastIndex = result.index + result[0].length;
      }
      if (lastIndex > 0) {
        const processed = chunkString.slice(0, lastIndex) + getBufferedRouterStream() + leftoverHtml;
        finalPassThrough.write(processed);
        leftover = chunkString.slice(lastIndex);
      } else {
        leftover = chunkString;
        leftoverHtml += getBufferedRouterStream();
      }
    },
    onEnd: () => {
      isAppRendering = false;
      if (processingCount === 0) {
        injectedHtmlDonePromise.resolve();
      }
    },
    onError: (error) => {
      console.error("Error reading appStream:", error);
      finalPassThrough.destroy(error);
    }
  });
  return finalPassThrough.stream;
}
function toHeadersInstance(init) {
  if (init instanceof Headers) {
    return new Headers(init);
  } else if (Array.isArray(init)) {
    return new Headers(init);
  } else if (typeof init === "object") {
    return new Headers(init);
  } else {
    return new Headers();
  }
}
function mergeHeaders(...headers) {
  return headers.reduce((acc, header) => {
    const headersInstance = toHeadersInstance(header);
    for (const [key, value] of headersInstance.entries()) {
      if (key === "set-cookie") {
        const splitCookies = splitSetCookieString(value);
        splitCookies.forEach((cookie) => acc.append("set-cookie", cookie));
      } else {
        acc.set(key, value);
      }
    }
    return acc;
  }, new Headers());
}
const startSerializer = {
  stringify: (value) => JSON.stringify(value, function replacer(key, val) {
    const ogVal = this[key];
    const serializer = serializers.find((t) => t.stringifyCondition(ogVal));
    if (serializer) {
      return serializer.stringify(ogVal);
    }
    return val;
  }),
  parse: (value) => JSON.parse(value, function parser(key, val) {
    const ogVal = this[key];
    if (isPlainObject(ogVal)) {
      const serializer = serializers.find((t) => t.parseCondition(ogVal));
      if (serializer) {
        return serializer.parse(ogVal);
      }
    }
    return val;
  }),
  encode: (value) => {
    if (Array.isArray(value)) {
      return value.map((v) => startSerializer.encode(v));
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          startSerializer.encode(v)
        ])
      );
    }
    const serializer = serializers.find((t) => t.stringifyCondition(value));
    if (serializer) {
      return serializer.stringify(value);
    }
    return value;
  },
  decode: (value) => {
    if (isPlainObject(value)) {
      const serializer = serializers.find((t) => t.parseCondition(value));
      if (serializer) {
        return serializer.parse(value);
      }
    }
    if (Array.isArray(value)) {
      return value.map((v) => startSerializer.decode(v));
    }
    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key,
          startSerializer.decode(v)
        ])
      );
    }
    return value;
  }
};
const createSerializer = (key, check, toValue, fromValue) => ({
  key,
  stringifyCondition: check,
  stringify: (value) => ({ [`$${key}`]: toValue(value) }),
  parseCondition: (value) => Object.hasOwn(value, `$${key}`),
  parse: (value) => fromValue(value[`$${key}`])
});
const serializers = [
  createSerializer(
    // Key
    "undefined",
    // Check
    (v) => v === void 0,
    // To
    () => 0,
    // From
    () => void 0
  ),
  createSerializer(
    // Key
    "date",
    // Check
    (v) => v instanceof Date,
    // To
    (v) => v.toISOString(),
    // From
    (v) => new Date(v)
  ),
  createSerializer(
    // Key
    "error",
    // Check
    (v) => v instanceof Error,
    // To
    (v) => ({
      ...v,
      message: v.message,
      stack: void 0,
      cause: v.cause
    }),
    // From
    (v) => Object.assign(new Error(v.message), v)
  ),
  createSerializer(
    // Key
    "formData",
    // Check
    (v) => v instanceof FormData,
    // To
    (v) => {
      const entries = {};
      v.forEach((value, key) => {
        const entry = entries[key];
        if (entry !== void 0) {
          if (Array.isArray(entry)) {
            entry.push(value);
          } else {
            entries[key] = [entry, value];
          }
        } else {
          entries[key] = value;
        }
      });
      return entries;
    },
    // From
    (v) => {
      const formData = new FormData();
      Object.entries(v).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((val) => formData.append(key, val));
        } else {
          formData.append(key, value);
        }
      });
      return formData;
    }
  ),
  createSerializer(
    // Key
    "bigint",
    // Check
    (v) => typeof v === "bigint",
    // To
    (v) => v.toString(),
    // From
    (v) => BigInt(v)
  )
];
const globalMiddleware = [];
function createServerFn(options, __opts) {
  const resolvedOptions = __opts || options || {};
  if (typeof resolvedOptions.method === "undefined") {
    resolvedOptions.method = "GET";
  }
  return {
    options: resolvedOptions,
    middleware: (middleware) => {
      return createServerFn(void 0, Object.assign(resolvedOptions, {
        middleware
      }));
    },
    validator: (validator) => {
      return createServerFn(void 0, Object.assign(resolvedOptions, {
        validator
      }));
    },
    type: (type) => {
      return createServerFn(void 0, Object.assign(resolvedOptions, {
        type
      }));
    },
    handler: (...args) => {
      const [extractedFn, serverFn] = args;
      Object.assign(resolvedOptions, {
        ...extractedFn,
        extractedFn,
        serverFn
      });
      const resolvedMiddleware = [...resolvedOptions.middleware || [], serverFnBaseToMiddleware(resolvedOptions)];
      return Object.assign(async (opts) => {
        return executeMiddleware$1(resolvedMiddleware, "client", {
          ...extractedFn,
          ...resolvedOptions,
          data: opts == null ? void 0 : opts.data,
          headers: opts == null ? void 0 : opts.headers,
          signal: opts == null ? void 0 : opts.signal,
          context: {}
        }).then((d) => {
          if (resolvedOptions.response === "full") {
            return d;
          }
          if (d.error) throw d.error;
          return d.result;
        });
      }, {
        // This copies over the URL, function ID
        ...extractedFn,
        // The extracted function on the server-side calls
        // this function
        __executeServer: async (opts_, signal) => {
          const opts = opts_ instanceof FormData ? extractFormDataContext(opts_) : opts_;
          opts.type = typeof resolvedOptions.type === "function" ? resolvedOptions.type(opts) : resolvedOptions.type;
          const ctx = {
            ...extractedFn,
            ...opts,
            signal
          };
          const run = () => executeMiddleware$1(resolvedMiddleware, "server", ctx).then((d) => ({
            // Only send the result and sendContext back to the client
            result: d.result,
            error: d.error,
            context: d.sendContext
          }));
          if (ctx.type === "static") {
            let response;
            if (serverFnStaticCache == null ? void 0 : serverFnStaticCache.getItem) {
              response = await serverFnStaticCache.getItem(ctx);
            }
            if (!response) {
              response = await run().then((d) => {
                return {
                  ctx: d,
                  error: null
                };
              }).catch((e) => {
                return {
                  ctx: void 0,
                  error: e
                };
              });
              if (serverFnStaticCache == null ? void 0 : serverFnStaticCache.setItem) {
                await serverFnStaticCache.setItem(ctx, response);
              }
            }
            invariant(response, "No response from both server and static cache!");
            if (response.error) {
              throw response.error;
            }
            return response.ctx;
          }
          return run();
        }
      });
    }
  };
}
async function executeMiddleware$1(middlewares, env, opts) {
  const flattenedMiddlewares = flattenMiddlewares([...globalMiddleware, ...middlewares]);
  const next = async (ctx) => {
    const nextMiddleware = flattenedMiddlewares.shift();
    if (!nextMiddleware) {
      return ctx;
    }
    if (nextMiddleware.options.validator && (env === "client" ? nextMiddleware.options.validateClient : true)) {
      ctx.data = await execValidator(nextMiddleware.options.validator, ctx.data);
    }
    const middlewareFn = env === "client" ? nextMiddleware.options.client : nextMiddleware.options.server;
    if (middlewareFn) {
      return applyMiddleware(middlewareFn, ctx, async (newCtx) => {
        return next(newCtx).catch((error) => {
          if (isRedirect(error) || isNotFound(error)) {
            return {
              ...newCtx,
              error
            };
          }
          throw error;
        });
      });
    }
    return next(ctx);
  };
  return next({
    ...opts,
    headers: opts.headers || {},
    sendContext: opts.sendContext || {},
    context: opts.context || {}
  });
}
let serverFnStaticCache;
function setServerFnStaticCache(cache) {
  const previousCache = serverFnStaticCache;
  serverFnStaticCache = typeof cache === "function" ? cache() : cache;
  return () => {
    serverFnStaticCache = previousCache;
  };
}
function createServerFnStaticCache(serverFnStaticCache2) {
  return serverFnStaticCache2;
}
async function sha1Hash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
setServerFnStaticCache(() => {
  const getStaticCacheUrl = async (options, hash) => {
    const filename = await sha1Hash(`${options.functionId}__${hash}`);
    return `/__tsr/staticServerFnCache/${filename}.json`;
  };
  const jsonToFilenameSafeString = (json2) => {
    const sortedKeysReplacer = (key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort().reduce((acc, curr) => {
      acc[curr] = value[curr];
      return acc;
    }, {}) : value;
    const jsonString = JSON.stringify(json2 ?? "", sortedKeysReplacer);
    return jsonString.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "_");
  };
  const staticClientCache = typeof document !== "undefined" ? /* @__PURE__ */ new Map() : null;
  return createServerFnStaticCache({
    getItem: async (ctx) => {
      if (typeof document === "undefined") {
        const hash = jsonToFilenameSafeString(ctx.data);
        const url = await getStaticCacheUrl(ctx, hash);
        const publicUrl = "/Users/thomasrooney/Code/ninjapal.io/.vercel/output/static";
        const {
          promises: fs
        } = await import('node:fs');
        const path = await import('node:path');
        const filePath = path.join(publicUrl, url);
        const [cachedResult, readError] = await fs.readFile(filePath, "utf-8").then((c) => [startSerializer.parse(c), null]).catch((e) => [null, e]);
        if (readError && readError.code !== "ENOENT") {
          throw readError;
        }
        return cachedResult;
      }
      return void 0;
    },
    setItem: async (ctx, response) => {
      const {
        promises: fs
      } = await import('node:fs');
      const path = await import('node:path');
      const hash = jsonToFilenameSafeString(ctx.data);
      const url = await getStaticCacheUrl(ctx, hash);
      const publicUrl = "/Users/thomasrooney/Code/ninjapal.io/.vercel/output/static";
      const filePath = path.join(publicUrl, url);
      await fs.mkdir(path.dirname(filePath), {
        recursive: true
      });
      await fs.writeFile(filePath, startSerializer.stringify(response));
    },
    fetchItem: async (ctx) => {
      const hash = jsonToFilenameSafeString(ctx.data);
      const url = await getStaticCacheUrl(ctx, hash);
      let result = staticClientCache == null ? void 0 : staticClientCache.get(url);
      if (!result) {
        result = await fetch(url, {
          method: "GET"
        }).then((r) => r.text()).then((d) => startSerializer.parse(d));
        staticClientCache == null ? void 0 : staticClientCache.set(url, result);
      }
      return result;
    }
  });
});
function extractFormDataContext(formData) {
  const serializedContext = formData.get("__TSR_CONTEXT");
  formData.delete("__TSR_CONTEXT");
  if (typeof serializedContext !== "string") {
    return {
      context: {},
      data: formData
    };
  }
  try {
    const context = startSerializer.parse(serializedContext);
    return {
      context,
      data: formData
    };
  } catch {
    return {
      data: formData
    };
  }
}
function flattenMiddlewares(middlewares) {
  const seen = /* @__PURE__ */ new Set();
  const flattened = [];
  const recurse = (middleware) => {
    middleware.forEach((m) => {
      if (m.options.middleware) {
        recurse(m.options.middleware);
      }
      if (!seen.has(m)) {
        seen.add(m);
        flattened.push(m);
      }
    });
  };
  recurse(middlewares);
  return flattened;
}
const applyMiddleware = async (middlewareFn, ctx, nextFn) => {
  return middlewareFn({
    ...ctx,
    next: async (userCtx = {}) => {
      return nextFn({
        ...ctx,
        ...userCtx,
        context: {
          ...ctx.context,
          ...userCtx.context
        },
        sendContext: {
          ...ctx.sendContext,
          ...userCtx.sendContext ?? {}
        },
        headers: mergeHeaders(ctx.headers, userCtx.headers),
        result: userCtx.result !== void 0 ? userCtx.result : ctx.response === "raw" ? userCtx : ctx.result,
        error: userCtx.error ?? ctx.error
      });
    }
  });
};
function execValidator(validator, input) {
  if (validator == null) return {};
  if ("~standard" in validator) {
    const result = validator["~standard"].validate(input);
    if (result instanceof Promise) throw new Error("Async validation not supported");
    if (result.issues) throw new Error(JSON.stringify(result.issues, void 0, 2));
    return result.value;
  }
  if ("parse" in validator) {
    return validator.parse(input);
  }
  if (typeof validator === "function") {
    return validator(input);
  }
  throw new Error("Invalid validator type!");
}
function serverFnBaseToMiddleware(options) {
  return {
    _types: void 0,
    options: {
      validator: options.validator,
      validateClient: options.validateClient,
      client: async ({
        next,
        sendContext,
        ...ctx
      }) => {
        var _a;
        const payload = {
          ...ctx,
          // switch the sendContext over to context
          context: sendContext,
          type: typeof ctx.type === "function" ? ctx.type(ctx) : ctx.type
        };
        if (ctx.type === "static" && "prerender" === "production") ;
        const res = await ((_a = options.extractedFn) == null ? void 0 : _a.call(options, payload));
        return next(res);
      },
      server: async ({
        next,
        ...ctx
      }) => {
        var _a;
        const result = await ((_a = options.serverFn) == null ? void 0 : _a.call(options, ctx));
        return next({
          ...ctx,
          result
        });
      }
    }
  };
}
function json(payload, init) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: mergeHeaders(
      { "content-type": "application/json" },
      init == null ? void 0 : init.headers
    )
  });
}
function createMiddleware(options, __opts) {
  const resolvedOptions = {
    type: "function",
    ...__opts || options
  };
  return {
    options: resolvedOptions,
    middleware: (middleware) => {
      return createMiddleware({}, Object.assign(resolvedOptions, {
        middleware
      }));
    },
    validator: (validator) => {
      return createMiddleware({}, Object.assign(resolvedOptions, {
        validator
      }));
    },
    client: (client2) => {
      return createMiddleware({}, Object.assign(resolvedOptions, {
        client: client2
      }));
    },
    server: (server) => {
      return createMiddleware({}, Object.assign(resolvedOptions, {
        server
      }));
    }
  };
}
const eventStorage = new AsyncLocalStorage();
function _setContext(event, key, value) {
  event.context[key] = value;
}
function _getContext(event, key) {
  return event.context[key];
}
function defineMiddleware(options) {
  return options;
}
function defineEventHandler(handler) {
  return defineEventHandler$1((event) => {
    return runWithEvent(event, () => handler(event));
  });
}
function eventHandler(handler) {
  return eventHandler$1((event) => {
    return runWithEvent(event, () => handler(event));
  });
}
async function runWithEvent(event, fn) {
  return eventStorage.run(event, fn);
}
function getEvent() {
  const event = eventStorage.getStore();
  if (!event) {
    throw new Error(
      `No HTTPEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`
    );
  }
  return event;
}
const HTTPEventSymbol = Symbol("$HTTPEvent");
function isEvent(obj) {
  return typeof obj === "object" && (obj instanceof H3Event || (obj == null ? void 0 : obj[HTTPEventSymbol]) instanceof H3Event || (obj == null ? void 0 : obj.__is_event__) === true);
}
function createWrapperFunction(h3Function) {
  return function(...args) {
    const event = args[0];
    if (!isEvent(event)) {
      args.unshift(getEvent());
    } else {
      args[0] = event instanceof H3Event || event.__is_event__ ? event : event[HTTPEventSymbol];
    }
    return h3Function(...args);
  };
}
const readRawBody = createWrapperFunction(readRawBody$1);
const readBody = createWrapperFunction(readBody$1);
const getQuery = createWrapperFunction(getQuery$1);
const isMethod = createWrapperFunction(isMethod$1);
const isPreflightRequest = createWrapperFunction(isPreflightRequest$1);
const getValidatedQuery = createWrapperFunction(getValidatedQuery$1);
const getRouterParams = createWrapperFunction(getRouterParams$1);
const getRouterParam = createWrapperFunction(getRouterParam$1);
const getValidatedRouterParams = createWrapperFunction(getValidatedRouterParams$1);
const assertMethod = createWrapperFunction(assertMethod$1);
const getRequestHeaders = createWrapperFunction(getRequestHeaders$1);
const getRequestHeader = createWrapperFunction(getRequestHeader$1);
const getRequestURL = createWrapperFunction(getRequestURL$1);
const getRequestHost = createWrapperFunction(getRequestHost$1);
const getRequestProtocol = createWrapperFunction(getRequestProtocol$1);
const getRequestIP = createWrapperFunction(getRequestIP$1);
const send = createWrapperFunction(send$1);
const sendNoContent = createWrapperFunction(sendNoContent$1);
const setResponseStatus = createWrapperFunction(setResponseStatus$1);
const getResponseStatus = createWrapperFunction(getResponseStatus$1);
const getResponseStatusText = createWrapperFunction(
  getResponseStatusText$1
);
const getResponseHeaders = createWrapperFunction(getResponseHeaders$1);
const getResponseHeader = createWrapperFunction(getResponseHeader$1);
const setResponseHeaders = createWrapperFunction(setResponseHeaders$1);
const setResponseHeader = createWrapperFunction(setResponseHeader$1);
const appendResponseHeaders = createWrapperFunction(
  appendResponseHeaders$1
);
const appendResponseHeader = createWrapperFunction(appendResponseHeader$1);
const defaultContentType = createWrapperFunction(defaultContentType$1);
const sendRedirect = createWrapperFunction(sendRedirect$1);
const sendStream = createWrapperFunction(sendStream$1);
const writeEarlyHints = createWrapperFunction(writeEarlyHints$1);
const sendError = createWrapperFunction(sendError$1);
const sendProxy = createWrapperFunction(sendProxy$1);
const proxyRequest = createWrapperFunction(proxyRequest$1);
const fetchWithEvent = createWrapperFunction(fetchWithEvent$1);
const getProxyRequestHeaders = createWrapperFunction(
  getProxyRequestHeaders$1
);
const parseCookies = createWrapperFunction(parseCookies$1);
const getCookie = createWrapperFunction(getCookie$1);
const setCookie = createWrapperFunction(setCookie$1);
const deleteCookie = createWrapperFunction(deleteCookie$1);
const useSession = createWrapperFunction(useSession$1);
const getSession = createWrapperFunction(getSession$1);
const updateSession = createWrapperFunction(updateSession$1);
const sealSession = createWrapperFunction(
  sealSession$1
);
const unsealSession = createWrapperFunction(unsealSession$1);
const clearSession = createWrapperFunction(clearSession$1);
const handleCacheHeaders = createWrapperFunction(handleCacheHeaders$1);
const handleCors = createWrapperFunction(handleCors$1);
const appendCorsHeaders = createWrapperFunction(appendCorsHeaders$1);
const appendCorsPreflightHeaders = createWrapperFunction(
  appendCorsPreflightHeaders$1
);
const sendWebResponse = createWrapperFunction(sendWebResponse$1);
const appendHeader = createWrapperFunction(appendHeader$1);
const appendHeaders = createWrapperFunction(appendHeaders$1);
const setHeader = createWrapperFunction(setHeader$1);
const setHeaders = createWrapperFunction(setHeaders$1);
const getHeader = createWrapperFunction(getHeader$1);
const getHeaders = createWrapperFunction(getHeaders$1);
const getRequestFingerprint = createWrapperFunction(
  getRequestFingerprint$1
);
const getRequestWebStream = createWrapperFunction(getRequestWebStream$1);
const readFormData = createWrapperFunction(readFormData$1);
const readMultipartFormData = createWrapperFunction(
  readMultipartFormData$1
);
const readValidatedBody = createWrapperFunction(readValidatedBody$1);
const removeResponseHeader = createWrapperFunction(removeResponseHeader$1);
const getContext = createWrapperFunction(_getContext);
const setContext = createWrapperFunction(_setContext);
const clearResponseHeaders = createWrapperFunction(clearResponseHeaders$1);
const getWebRequest = createWrapperFunction(toWebRequest);
function requestHandler(handler) {
  return handler;
}
const minifiedTsrBootStrapScript = 'const __TSR_SSR__={matches:[],streamedValues:{},initMatch:o=>(__TSR_SSR__.matches.push(o),o.extracted?.forEach(l=>{if(l.type==="stream"){let r;l.value=new ReadableStream({start(e){r={enqueue:t=>{try{e.enqueue(t)}catch{}},close:()=>{try{e.close()}catch{}}}}}),l.value.controller=r}else{let r,e;l.value=new Promise((t,a)=>{e=a,r=t}),l.value.reject=e,l.value.resolve=r}}),!0),resolvePromise:({matchId:o,id:l,promiseState:r})=>{const e=__TSR_SSR__.matches.find(t=>t.id===o);if(e){const t=e.extracted?.[l];if(t&&t.type==="promise"&&t.value&&r.status==="success")return t.value.resolve(r.data),!0}return!1},injectChunk:({matchId:o,id:l,chunk:r})=>{const e=__TSR_SSR__.matches.find(t=>t.id===o);if(e){const t=e.extracted?.[l];if(t&&t.type==="stream"&&t.value?.controller)return t.value.controller.enqueue(new TextEncoder().encode(r.toString())),!0}return!1},closeStream:({matchId:o,id:l})=>{const r=__TSR_SSR__.matches.find(e=>e.id===o);if(r){const e=r.extracted?.[l];if(e&&e.type==="stream"&&e.value?.controller)return e.value.controller.close(),!0}return!1},cleanScripts:()=>{document.querySelectorAll(".tsr-once").forEach(o=>{o.remove()})}};window.__TSR_SSR__=__TSR_SSR__;\n';
function attachRouterServerSsrUtils(router, manifest) {
  router.ssr = {
    manifest,
    serializer: startSerializer
  };
  router.serverSsr = {
    injectedHtml: [],
    streamedKeys: /* @__PURE__ */ new Set(),
    injectHtml: (getHtml) => {
      const promise = Promise.resolve().then(getHtml);
      router.serverSsr.injectedHtml.push(promise);
      router.emit({
        type: "onInjectedHtml",
        promise
      });
      return promise.then(() => {
      });
    },
    injectScript: (getScript, opts) => {
      return router.serverSsr.injectHtml(async () => {
        const script = await getScript();
        return `<script class='tsr-once'>${script}${""}; if (typeof __TSR_SSR__ !== 'undefined') __TSR_SSR__.cleanScripts()<\/script>`;
      });
    },
    streamValue: (key, value) => {
      warning(
        !router.serverSsr.streamedKeys.has(key),
        "Key has already been streamed: " + key
      );
      router.serverSsr.streamedKeys.add(key);
      router.serverSsr.injectScript(
        () => `__TSR_SSR__.streamedValues['${key}'] = { value: ${jsesc(
          router.ssr.serializer.stringify(value),
          {
            isScriptContext: true,
            wrap: true,
            json: true
          }
        )}}`
      );
    },
    onMatchSettled
  };
  router.serverSsr.injectScript(() => minifiedTsrBootStrapScript, {
    logScript: false
  });
}
function dehydrateRouter(router) {
  var _a, _b, _c;
  const dehydratedRouter = {
    manifest: router.ssr.manifest,
    dehydratedData: (_b = (_a = router.options).dehydrate) == null ? void 0 : _b.call(_a),
    lastMatchId: ((_c = router.state.matches[router.state.matches.length - 1]) == null ? void 0 : _c.id) || ""
  };
  router.serverSsr.injectScript(
    () => `__TSR_SSR__.dehydrated = ${jsesc(
      router.ssr.serializer.stringify(dehydratedRouter),
      {
        isScriptContext: true,
        wrap: true,
        json: true
      }
    )}`
  );
}
function extractAsyncLoaderData(loaderData, ctx) {
  const extracted = [];
  const replaced = replaceBy(loaderData, (value, path) => {
    if (value instanceof ReadableStream) {
      const [copy1, copy2] = value.tee();
      const entry = {
        type: "stream",
        path,
        id: extracted.length,
        matchIndex: ctx.match.index,
        stream: copy2
      };
      extracted.push(entry);
      return copy1;
    } else if (value instanceof Promise) {
      const deferredPromise = defer(value);
      const entry = {
        type: "promise",
        path,
        id: extracted.length,
        matchIndex: ctx.match.index,
        promise: deferredPromise
      };
      extracted.push(entry);
    }
    return value;
  });
  return { replaced, extracted };
}
function onMatchSettled(opts) {
  const { router, match } = opts;
  let extracted = void 0;
  let serializedLoaderData = void 0;
  if (match.loaderData !== void 0) {
    const result = extractAsyncLoaderData(match.loaderData, {
      match
    });
    match.loaderData = result.replaced;
    extracted = result.extracted;
    serializedLoaderData = extracted.reduce(
      (acc, entry) => {
        return deepImmutableSetByPath(acc, ["temp", ...entry.path], void 0);
      },
      { temp: result.replaced }
    ).temp;
  }
  const initCode = `__TSR_SSR__.initMatch(${jsesc(
    {
      id: match.id,
      __beforeLoadContext: router.ssr.serializer.stringify(
        match.__beforeLoadContext
      ),
      loaderData: router.ssr.serializer.stringify(serializedLoaderData),
      error: router.ssr.serializer.stringify(match.error),
      extracted: extracted == null ? void 0 : extracted.map((entry) => pick(entry, ["type", "path"])),
      updatedAt: match.updatedAt,
      status: match.status
    },
    {
      isScriptContext: true,
      wrap: true,
      json: true
    }
  )})`;
  router.serverSsr.injectScript(() => initCode);
  if (extracted) {
    extracted.forEach((entry) => {
      if (entry.type === "promise") return injectPromise(entry);
      return injectStream(entry);
    });
  }
  function injectPromise(entry) {
    router.serverSsr.injectScript(async () => {
      await entry.promise;
      return `__TSR_SSR__.resolvePromise(${jsesc(
        {
          matchId: match.id,
          id: entry.id,
          promiseState: entry.promise[TSR_DEFERRED_PROMISE]
        },
        {
          isScriptContext: true,
          wrap: true,
          json: true
        }
      )})`;
    });
  }
  function injectStream(entry) {
    router.serverSsr.injectHtml(async () => {
      try {
        const reader = entry.stream.getReader();
        let chunk = null;
        while (!(chunk = await reader.read()).done) {
          if (chunk.value) {
            const code = `__TSR_SSR__.injectChunk(${jsesc(
              {
                matchId: match.id,
                id: entry.id,
                chunk: chunk.value
              },
              {
                isScriptContext: true,
                wrap: true,
                json: true
              }
            )})`;
            router.serverSsr.injectScript(() => code);
          }
        }
        router.serverSsr.injectScript(
          () => `__TSR_SSR__.closeStream(${jsesc(
            {
              matchId: match.id,
              id: entry.id
            },
            {
              isScriptContext: true,
              wrap: true,
              json: true
            }
          )})`
        );
      } catch (err) {
        console.error("stream read error", err);
      }
      return "";
    });
  }
}
function deepImmutableSetByPath(obj, path, value) {
  if (path.length === 0) {
    return value;
  }
  const [key, ...rest] = path;
  if (Array.isArray(obj)) {
    return obj.map((item, i) => {
      if (i === Number(key)) {
        return deepImmutableSetByPath(item, rest, value);
      }
      return item;
    });
  }
  if (isPlainObject(obj)) {
    return {
      ...obj,
      [key]: deepImmutableSetByPath(obj[key], rest, value)
    };
  }
  return obj;
}
function replaceBy(obj, cb, path = []) {
  if (isPlainArray(obj)) {
    return obj.map((value, i) => replaceBy(value, cb, [...path, `${i}`]));
  }
  if (isPlainObject(obj)) {
    const newObj2 = {};
    for (const key in obj) {
      newObj2[key] = replaceBy(obj[key], cb, [...path, key]);
    }
    return newObj2;
  }
  const newObj = cb(obj, path);
  if (newObj !== obj) {
    return newObj;
  }
  return obj;
}
const VIRTUAL_MODULES = {
  routeTree: "tanstack-start-route-tree:v",
  startManifest: "tanstack-start-manifest:v",
  serverFnManifest: "tanstack-start-server-fn-manifest:v"
};
async function loadVirtualModule(id) {
  switch (id) {
    case VIRTUAL_MODULES.routeTree:
      return await Promise.resolve().then(() => routeTree_gen);
    case VIRTUAL_MODULES.startManifest:
      return await import('./_tanstack-start-manifest_v-DkhVKuB8.mjs');
    case VIRTUAL_MODULES.serverFnManifest:
      return await import('./_tanstack-start-server-fn-manifest_v-CDE_26WI.mjs');
    default:
      throw new Error(`Unknown virtual module: ${id}`);
  }
}
async function getStartManifest(opts) {
  const { tsrStartManifest } = await loadVirtualModule(
    VIRTUAL_MODULES.startManifest
  );
  const startManifest = tsrStartManifest();
  const rootRoute = startManifest.routes[rootRouteId$1] = startManifest.routes[rootRouteId$1] || {};
  rootRoute.assets = rootRoute.assets || [];
  let script = `import('${startManifest.clientEntry}')`;
  rootRoute.assets.push({
    tag: "script",
    attrs: {
      type: "module",
      suppressHydrationWarning: true,
      async: true
    },
    children: script
  });
  const manifest = {
    ...startManifest,
    routes: Object.fromEntries(
      Object.entries(startManifest.routes).map(([k, v]) => {
        const { preloads, assets } = v;
        return [
          k,
          {
            preloads,
            assets
          }
        ];
      })
    )
  };
  return manifest;
}
function sanitizeBase$1(base) {
  return base.replace(/^\/|\/$/g, "");
}
const handleServerAction = async ({
  request
}) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort);
  const method = request.method;
  const url = new URL(request.url, "http://localhost:3000");
  const regex = new RegExp(`${sanitizeBase$1("/_serverFn")}/([^/?#]+)`);
  const match = url.pathname.match(regex);
  const serverFnId = match ? match[1] : null;
  const search = Object.fromEntries(url.searchParams.entries());
  const isCreateServerFn = "createServerFn" in search;
  const isRaw = "raw" in search;
  if (typeof serverFnId !== "string") {
    throw new Error("Invalid server action param for serverFnId: " + serverFnId);
  }
  const {
    default: serverFnManifest
  } = await loadVirtualModule(VIRTUAL_MODULES.serverFnManifest);
  const serverFnInfo = serverFnManifest[serverFnId];
  if (!serverFnInfo) {
    console.info("serverFnManifest", serverFnManifest);
    throw new Error("Server function info not found for " + serverFnId);
  }
  const fnModule = await serverFnInfo.importer();
  if (!fnModule) {
    console.info("serverFnInfo", serverFnInfo);
    throw new Error("Server function module not resolved for " + serverFnId);
  }
  const action = fnModule[serverFnInfo.functionName];
  if (!action) {
    console.info("serverFnInfo", serverFnInfo);
    console.info("fnModule", fnModule);
    throw new Error(`Server function module export not resolved for serverFn ID: ${serverFnId}`);
  }
  const formDataContentTypes = ["multipart/form-data", "application/x-www-form-urlencoded"];
  const response = await (async () => {
    try {
      let result = await (async () => {
        if (request.headers.get("Content-Type") && formDataContentTypes.some((type) => {
          var _a;
          return (_a = request.headers.get("Content-Type")) == null ? void 0 : _a.includes(type);
        })) {
          invariant(method.toLowerCase() !== "get", "GET requests with FormData payloads are not supported");
          return await action(await request.formData(), signal);
        }
        if (method.toLowerCase() === "get") {
          let payload2 = search;
          if (isCreateServerFn) {
            payload2 = search.payload;
          }
          payload2 = payload2 ? startSerializer.parse(payload2) : payload2;
          return await action(payload2, signal);
        }
        const jsonPayloadAsString = await request.text();
        const payload = startSerializer.parse(jsonPayloadAsString);
        if (isCreateServerFn) {
          return await action(payload, signal);
        }
        return await action(...payload, signal);
      })();
      if (result.result instanceof Response) {
        return result.result;
      }
      if (!isCreateServerFn) {
        result = result.result;
        if (result instanceof Response) {
          return result;
        }
      }
      if (isNotFound(result)) {
        return isNotFoundResponse(result);
      }
      return new Response(result !== void 0 ? startSerializer.stringify(result) : void 0, {
        status: getResponseStatus(getEvent()),
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      if (isNotFound(error)) {
        return isNotFoundResponse(error);
      }
      console.info();
      console.info("Server Fn Error!");
      console.info();
      console.error(error);
      console.info();
      return new Response(startSerializer.stringify(error), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  })();
  request.signal.removeEventListener("abort", abort);
  if (isRaw) {
    return response;
  }
  return response;
};
function isNotFoundResponse(error) {
  const {
    headers,
    ...rest
  } = error;
  return new Response(JSON.stringify(rest), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers || {}
    }
  });
}
function getStartResponseHeaders(opts) {
  const headers = mergeHeaders(
    getResponseHeaders(),
    {
      "Content-Type": "text/html; charset=UTF-8"
    },
    ...opts.router.state.matches.map((match) => {
      return match.headers;
    })
  );
  return headers;
}
function createStartHandler({
  createRouter: createRouter2
}) {
  let routeTreeModule = null;
  let startRoutesManifest = null;
  let processedServerRouteTree = void 0;
  return (cb) => {
    const originalFetch = globalThis.fetch;
    const startRequestResolver = async ({ request }) => {
      globalThis.fetch = async function(input, init) {
        function resolve(url2, requestOptions) {
          const fetchRequest = new Request(url2, requestOptions);
          return startRequestResolver({ request: fetchRequest });
        }
        function getOrigin() {
          return request.headers.get("Origin") || request.headers.get("Referer") || "http://localhost";
        }
        if (typeof input === "string" && input.startsWith("/")) {
          const url2 = new URL(input, getOrigin());
          return resolve(url2, init);
        } else if (typeof input === "object" && "url" in input && typeof input.url === "string" && input.url.startsWith("/")) {
          const url2 = new URL(input.url, getOrigin());
          return resolve(url2, init);
        }
        return originalFetch(input, init);
      };
      const url = new URL(request.url);
      const href = url.href.replace(url.origin, "");
      const APP_BASE = "/";
      const router = createRouter2();
      const history = createMemoryHistory({
        initialEntries: [href]
      });
      router.update({
        history
      });
      const response = await (async () => {
        try {
          if (false) ;
          const serverFnBase = joinPaths([
            APP_BASE,
            trimPath("/_serverFn"),
            "/"
          ]);
          if (href.startsWith(serverFnBase)) {
            return await handleServerAction({ request });
          }
          if (routeTreeModule === null) {
            try {
              routeTreeModule = await loadVirtualModule(
                VIRTUAL_MODULES.routeTree
              );
              if (routeTreeModule.serverRouteTree) {
                processedServerRouteTree = processRouteTree({
                  routeTree: routeTreeModule.serverRouteTree,
                  initRoute: (route, i) => {
                    route.init({
                      originalIndex: i
                    });
                  }
                });
              }
            } catch (e) {
              console.log(e);
            }
          }
          async function executeRouter() {
            const requestAcceptHeader = request.headers.get("Accept") || "*/*";
            const splitRequestAcceptHeader = requestAcceptHeader.split(",");
            const supportedMimeTypes = ["*/*", "text/html"];
            const isRouterAcceptSupported = supportedMimeTypes.some(
              (mimeType) => splitRequestAcceptHeader.some(
                (acceptedMimeType) => acceptedMimeType.trim().startsWith(mimeType)
              )
            );
            if (!isRouterAcceptSupported) {
              return json(
                {
                  error: "Only HTML requests are supported here"
                },
                {
                  status: 500
                }
              );
            }
            if (startRoutesManifest === null) {
              startRoutesManifest = await getStartManifest({
                basePath: APP_BASE
              });
            }
            attachRouterServerSsrUtils(router, startRoutesManifest);
            await router.load();
            if (router.state.redirect) {
              return router.state.redirect;
            }
            dehydrateRouter(router);
            const responseHeaders = getStartResponseHeaders({ router });
            const response2 = await cb({
              request,
              router,
              responseHeaders
            });
            return response2;
          }
          if (processedServerRouteTree) {
            const [_matchedRoutes, response2] = await handleServerRoutes({
              processedServerRouteTree,
              router,
              request,
              basePath: APP_BASE,
              executeRouter
            });
            if (response2) return response2;
          }
          const routerResponse = await executeRouter();
          return routerResponse;
        } catch (err) {
          if (err instanceof Response) {
            return err;
          }
          throw err;
        }
      })();
      if (isRedirect(response)) {
        if (isResolvedRedirect(response)) {
          if (request.headers.get("x-tsr-redirect") === "manual") {
            return json(
              {
                ...response.options,
                isSerializedRedirect: true
              },
              {
                headers: response.headers
              }
            );
          }
          return response;
        }
        if (response.options.to && typeof response.options.to === "string" && !response.options.to.startsWith("/")) {
          throw new Error(
            `Server side redirects must use absolute paths via the 'href' or 'to' options. Received: ${JSON.stringify(response.options)}`
          );
        }
        if (["params", "search", "hash"].some(
          (d) => typeof response.options[d] === "function"
        )) {
          throw new Error(
            `Server side redirects must use static search, params, and hash values and do not support functional values. Received functional values for: ${Object.keys(
              response.options
            ).filter((d) => typeof response.options[d] === "function").map((d) => `"${d}"`).join(", ")}`
          );
        }
        const redirect2 = router.resolveRedirect(response);
        if (request.headers.get("x-tsr-redirect") === "manual") {
          return json(
            {
              ...response.options,
              isSerializedRedirect: true
            },
            {
              headers: response.headers
            }
          );
        }
        return redirect2;
      }
      return response;
    };
    return requestHandler(startRequestResolver);
  };
}
async function handleServerRoutes(opts) {
  var _a, _b;
  const url = new URL(opts.request.url);
  const pathname = url.pathname;
  const serverTreeResult = getMatchedRoutes({
    pathname,
    basepath: opts.basePath,
    caseSensitive: true,
    routesByPath: opts.processedServerRouteTree.routesByPath,
    routesById: opts.processedServerRouteTree.routesById,
    flatRoutes: opts.processedServerRouteTree.flatRoutes
  });
  const routeTreeResult = opts.router.getMatchedRoutes(pathname, void 0);
  let response;
  let matchedRoutes = [];
  matchedRoutes = serverTreeResult.matchedRoutes;
  if (routeTreeResult.foundRoute) {
    if (serverTreeResult.matchedRoutes.length < routeTreeResult.matchedRoutes.length) {
      const closestCommon = [...routeTreeResult.matchedRoutes].reverse().find((r) => {
        return opts.processedServerRouteTree.routesById[r.id] !== void 0;
      });
      if (closestCommon) {
        let routeId = closestCommon.id;
        matchedRoutes = [];
        do {
          const route = opts.processedServerRouteTree.routesById[routeId];
          if (!route) {
            break;
          }
          matchedRoutes.push(route);
          routeId = (_a = route.parentRoute) == null ? void 0 : _a.id;
        } while (routeId);
        matchedRoutes.reverse();
      }
    }
  }
  if (matchedRoutes.length) {
    const middlewares = flattenMiddlewares(
      matchedRoutes.flatMap((r) => r.options.middleware).filter(Boolean)
    ).map((d) => d.options.server);
    if ((_b = serverTreeResult.foundRoute) == null ? void 0 : _b.options.methods) {
      const method = Object.keys(
        serverTreeResult.foundRoute.options.methods
      ).find(
        (method2) => method2.toLowerCase() === opts.request.method.toLowerCase()
      );
      if (method) {
        const handler = serverTreeResult.foundRoute.options.methods[method];
        if (handler) {
          if (typeof handler === "function") {
            middlewares.push(handlerToMiddleware(handler));
          } else {
            if (handler._options.middlewares && handler._options.middlewares.length) {
              middlewares.push(
                ...flattenMiddlewares(handler._options.middlewares).map(
                  (d) => d.options.server
                )
              );
            }
            if (handler._options.handler) {
              middlewares.push(handlerToMiddleware(handler._options.handler));
            }
          }
        }
      }
    }
    middlewares.push(handlerToMiddleware(opts.executeRouter));
    const ctx = await executeMiddleware(middlewares, {
      request: opts.request,
      context: {},
      params: serverTreeResult.routeParams,
      pathname
    });
    response = ctx.response;
  }
  return [matchedRoutes, response];
}
function handlerToMiddleware(handler) {
  return async ({ next: _next, ...rest }) => {
    const response = await handler(rest);
    if (response) {
      return { response };
    }
    return _next(rest);
  };
}
function executeMiddleware(middlewares, ctx) {
  let index = -1;
  const next = async (ctx2) => {
    index++;
    const middleware = middlewares[index];
    if (!middleware) return ctx2;
    const result = await middleware({
      ...ctx2,
      // Allow the middleware to call the next middleware in the chain
      next: async (nextCtx) => {
        const nextResult = await next({ ...ctx2, ...nextCtx });
        return Object.assign(ctx2, handleCtxResult(nextResult));
      }
      // Allow the middleware result to extend the return context
    }).catch((err) => {
      if (isSpecialResponse(err)) {
        return {
          response: err
        };
      }
      throw err;
    });
    return Object.assign(ctx2, handleCtxResult(result));
  };
  return handleCtxResult(next(ctx));
}
function handleCtxResult(result) {
  if (isSpecialResponse(result)) {
    return {
      response: result
    };
  }
  return result;
}
function isSpecialResponse(err) {
  return isResponse(err) || isRedirect(err);
}
function isResponse(response) {
  return response instanceof Response;
}
function defineHandlerCallback(handler) {
  return handler;
}
function createServerFileRoute(_) {
  return createServerRoute();
}
function createServerRoute(__, __opts) {
  const options = __opts || {};
  const route = {
    isRoot: false,
    path: "",
    id: "",
    fullPath: "",
    to: "",
    options,
    parentRoute: void 0,
    _types: {},
    // children: undefined as TChildren,
    middleware: (middlewares) => createServerRoute(void 0, {
      ...options,
      middleware: middlewares
    }),
    methods: (methodsOrGetMethods) => {
      const methods = (() => {
        if (typeof methodsOrGetMethods === "function") {
          return methodsOrGetMethods(createMethodBuilder());
        }
        return methodsOrGetMethods;
      })();
      return createServerRoute(void 0, {
        ...__opts,
        methods
      });
    },
    update: (opts) => createServerRoute(void 0, {
      ...options,
      ...opts
    }),
    init: (opts) => {
      var _a;
      options.originalIndex = opts.originalIndex;
      const isRoot = !options.path && !options.id;
      route.parentRoute = (_a = options.getParentRoute) == null ? void 0 : _a.call(options);
      if (isRoot) {
        route.path = rootRouteId$1;
      } else if (!route.parentRoute) {
        throw new Error(`Child Route instances must pass a 'getParentRoute: () => ParentRoute' option that returns a ServerRoute instance.`);
      }
      let path = isRoot ? rootRouteId$1 : options.path;
      if (path && path !== "/") {
        path = trimPathLeft(path);
      }
      const customId = options.id || path;
      let id = isRoot ? rootRouteId$1 : joinPaths([route.parentRoute.id === rootRouteId$1 ? "" : route.parentRoute.id, customId]);
      if (path === rootRouteId$1) {
        path = "/";
      }
      if (id !== rootRouteId$1) {
        id = joinPaths(["/", id]);
      }
      const fullPath = id === rootRouteId$1 ? "/" : joinPaths([route.parentRoute.fullPath, path]);
      route.path = path;
      route.id = id;
      route.fullPath = fullPath;
      route.to = fullPath;
      route.isRoot = isRoot;
    },
    _addFileChildren: (children) => {
      if (Array.isArray(children)) {
        route.children = children;
      }
      if (typeof children === "object" && children !== null) {
        route.children = Object.values(children);
      }
      return route;
    },
    _addFileTypes: () => route
  };
  return route;
}
const createServerRootRoute = createServerRoute;
const createMethodBuilder = (__opts) => {
  return {
    _options: __opts || {},
    _types: {},
    middleware: (middlewares) => createMethodBuilder({
      ...__opts,
      middlewares
    }),
    handler: (handler) => createMethodBuilder({
      ...__opts,
      handler
    })
  };
};
const defaultStreamHandler = defineHandlerCallback(
  async ({ request, router, responseHeaders }) => {
    if (typeof ReactDOMServer.renderToReadableStream === "function") {
      const stream = await ReactDOMServer.renderToReadableStream(
        /* @__PURE__ */ jsx(StartServer, { router }),
        {
          signal: request.signal
        }
      );
      if (isbot(request.headers.get("User-Agent"))) {
        await stream.allReady;
      }
      const responseStream = transformReadableStreamWithRouter(
        router,
        stream
      );
      return new Response(responseStream, {
        status: router.state.statusCode,
        headers: responseHeaders
      });
    }
    if (typeof ReactDOMServer.renderToPipeableStream === "function") {
      const reactAppPassthrough = new PassThrough();
      try {
        const pipeable = ReactDOMServer.renderToPipeableStream(
          /* @__PURE__ */ jsx(StartServer, { router }),
          {
            ...isbot(request.headers.get("User-Agent")) ? {
              onAllReady() {
                pipeable.pipe(reactAppPassthrough);
              }
            } : {
              onShellReady() {
                pipeable.pipe(reactAppPassthrough);
              }
            },
            onError: (error, info) => {
              if (error instanceof Error && error.message === "ShellBoundaryError")
                return;
              console.error("Error in renderToPipeableStream:", error, info);
            }
          }
        );
      } catch (e) {
        console.error("Error in renderToPipeableStream:", e);
      }
      const responseStream = transformPipeableStreamWithRouter(
        router,
        reactAppPassthrough
      );
      return new Response(responseStream, {
        status: router.state.statusCode,
        headers: responseHeaders
      });
    }
    throw new Error(
      "No renderToReadableStream or renderToPipeableStream found in react-dom/server. Ensure you are using a version of react-dom that supports streaming."
    );
  }
);
function sanitizeBase(base) {
  return base.replace(/^\/|\/$/g, "");
}
const createServerRpc = (functionId, serverBase, splitImportFn) => {
  invariant(
    splitImportFn,
    "🚨splitImportFn required for the server functions server runtime, but was not provided."
  );
  const url = `/${sanitizeBase(serverBase)}/${functionId}`;
  return Object.assign(splitImportFn, {
    url,
    functionId
  });
};
function DefaultCatchBoundary({ error }) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId
  });
  console.error(error);
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6", children: [
    /* @__PURE__ */ jsx(ErrorComponent, { error }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center flex-wrap", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            router.invalidate();
          },
          className: "px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded text-white uppercase font-extrabold",
          children: "Try Again"
        }
      ),
      isRoot ? /* @__PURE__ */ jsx(
        Link,
        {
          to: "/",
          className: "px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded text-white uppercase font-extrabold",
          children: "Home"
        }
      ) : /* @__PURE__ */ jsx(
        Link,
        {
          to: "/",
          className: "px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded text-white uppercase font-extrabold",
          onClick: (e) => {
            e.preventDefault();
            window.history.back();
          },
          children: "Go Back"
        }
      )
    ] })
  ] });
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive/05 text-red-900 border border-red-800/20 shadow-xs hover:bg-destructive/10 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 rounded-md",
        xs: "h-6 rounded-md gap-1 px-3 has-[>svg]:px-2 text-xs",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-8 rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    }
  );
}
function NotFound({ children }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-2", children: [
    /* @__PURE__ */ jsx("div", { className: "text-gray-600 dark:text-gray-400", children: children || /* @__PURE__ */ jsx("p", { children: "The page you are looking for does not exist." }) }),
    /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          onClick: () => window.history.back(),
          className: "bg-emerald-500 text-white px-2 py-1 rounded uppercase font-black text-sm",
          children: "Go back"
        }
      ),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/",
          className: "bg-cyan-600 text-white px-2 py-1 rounded uppercase font-black text-sm",
          children: "Start Over"
        }
      )
    ] })
  ] });
}
const appCss = "/assets/styles-CvcsaJHi.css";
const fetchUser_createServerFn_handler = createServerRpc("src_routes_root_tsx--fetchUser_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return fetchUser.__executeServer(opts, signal);
});
const fetchUser = createServerFn({
  method: "GET"
}).handler(fetchUser_createServerFn_handler, async () => {
  var _a;
  const [{
    auth: auth2
  }, {
    signZeroToken
  }, {
    getWebRequest: getWebRequest2
  }] = await Promise.all([Promise.resolve().then(() => auth$1), import('./zero-jwt-Cxo4ZZOj.mjs'), import('./server-eNqtCl_O.mjs')]);
  const request = getWebRequest2();
  if (!request) return null;
  const session2 = await auth2.api.getSession({
    headers: request.headers
  });
  if (!((_a = session2 == null ? void 0 : session2.user) == null ? void 0 : _a.email)) {
    return null;
  }
  const user2 = {
    id: session2.user.id,
    email: session2.user.email,
    name: session2.user.name || session2.user.email.split("@")[0]
  };
  return {
    ...user2,
    accessToken: await signZeroToken(user2)
  };
});
function RootComponent() {
  return /* @__PURE__ */ jsxs(RootDocument, { children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(TanStackRouterDevtools, { position: "bottom-right" })
  ] });
}
const Route$k = createRootRoute({
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
    const user2 = await fetchUser();
    return {
      user: user2
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
  const ctx = Route$k.useRouteContext();
  const user2 = ctx.user;
  console.log("Server-side route context:", {
    user: user2
  });
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { className: "overscroll-none", children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$i = () => import('./terms-of-service-COxaCUZv.mjs');
const Route$j = createFileRoute("/terms-of-service")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component", () => Route$j.ssr)
});
const $$splitComponentImporter$h = () => import('./privacy-policy-QkvFTxJD.mjs');
const Route$i = createFileRoute("/privacy-policy")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component", () => Route$i.ssr)
});
const $$splitComponentImporter$g = () => import('./_authed-Cg-5Tuug.mjs');
const Route$h = createFileRoute("/_authed")({
  beforeLoad: async ({
    location,
    context
  }) => {
    if (!(context == null ? void 0 : context.user)) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href
        }
      });
    }
    return {
      user: context.user
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$g, "component", () => Route$h.ssr)
});
const Route$g = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/app"
    });
  }
});
const $$splitComponentImporter$f = () => import('./signup-alt-D0-lgmcK.mjs');
const Route$f = createFileRoute("/auth/signup-alt")({
  component: lazyRouteComponent($$splitComponentImporter$f, "component", () => Route$f.ssr)
});
const $$splitComponentImporter$e = () => import('./signup-DCOPQTwW.mjs');
const Route$e = createFileRoute("/auth/signup")({
  component: lazyRouteComponent($$splitComponentImporter$e, "component", () => Route$e.ssr)
});
const $$splitComponentImporter$d = () => import('./login-Dh4CQRQO.mjs');
const Route$d = createFileRoute("/auth/login")({
  component: lazyRouteComponent($$splitComponentImporter$d, "component", () => Route$d.ssr)
});
const $$splitComponentImporter$c = () => import('./route-lG2A5g7r.mjs');
const Route$c = createFileRoute("/_authed/app")({
  loader: async ({
    context
  }) => {
    const user2 = context.user;
    if (!user2) {
      throw redirect({
        to: "/auth/login"
      });
    }
    return {
      user: user2
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$c, "component", () => Route$c.ssr),
  ssr: false
});
const $$splitComponentImporter$b = () => import('./index-DYgZbWjQ.mjs');
const Route$b = createFileRoute("/_authed/app/_layout/")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component", () => Route$b.ssr)
});
const $$splitComponentImporter$a = () => import('./status-H72S8fGS.mjs');
const Route$a = createFileRoute("/_authed/app/_layout/status")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component", () => Route$a.ssr),
  ssr: false
});
const $$splitComponentImporter$9 = () => import('./ninja-connection-DYF0MuaZ.mjs');
const searchSchema = z.object({
  mode: z.enum(["edit"]).optional()
});
const Route$9 = createFileRoute("/_authed/app/_layout/ninja-connection")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component", () => Route$9.ssr),
  validateSearch: searchSchema,
  ssr: false
});
const $$splitComponentImporter$8 = () => import('./email-preview-CawZAC7e.mjs');
const Route$8 = createFileRoute("/_authed/app/_layout/email-preview")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component", () => Route$8.ssr)
});
const $$splitComponentImporter$7 = () => import('./devices-C_HifNCp.mjs');
const Route$7 = createFileRoute("/_authed/app/_layout/devices")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component", () => Route$7.ssr),
  ssr: false
});
const $$splitComponentImporter$6 = () => import('./account-debug-qfhuIKRT.mjs');
const Route$6 = createFileRoute("/_authed/app/_layout/account-debug")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component", () => Route$6.ssr)
});
const $$splitComponentImporter$5 = () => import('./account-jtOy6khb.mjs');
const Route$5 = createFileRoute("/_authed/app/_layout/account")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component", () => Route$5.ssr),
  ssr: false
});
const $$splitComponentImporter$4 = () => import('./device._deviceId-CwN5cJGB.mjs');
const Route$4 = createFileRoute("/_authed/app/_layout/device/$deviceId")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component", () => Route$4.ssr),
  ssr: false
});
const $$splitComponentImporter$3 = () => import('./device._deviceId.technical-Bz4rGYSC.mjs');
const Route$3 = createFileRoute("/_authed/app/_layout/device/$deviceId/technical")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component", () => Route$3.ssr),
  ssr: false
});
const $$splitComponentImporter$2 = () => import('./device._deviceId.status-m2mwomHW.mjs');
const Route$2 = createFileRoute("/_authed/app/_layout/device/$deviceId/status")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component", () => Route$2.ssr),
  ssr: false
});
const $$splitComponentImporter$1 = () => import('./device._deviceId.raw-Co0SMqxp.mjs');
const Route$1 = createFileRoute("/_authed/app/_layout/device/$deviceId/raw")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component", () => Route$1.ssr),
  ssr: false
});
const $$splitComponentImporter = () => import('./device._deviceId.history-D1syFJNJ.mjs');
const Route = createFileRoute("/_authed/app/_layout/device/$deviceId/history")({
  component: lazyRouteComponent($$splitComponentImporter, "component", () => Route.ssr),
  ssr: false
});
const corsMiddleware = createMiddleware({
  type: "request"
}).server(async ({
  next,
  request
}) => {
  if (request.method === "OPTIONS") {
    const result2 = await next();
    result2.response = new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
    return result2;
  }
  const result = await next();
  if (result.response) {
    const newHeaders = new Headers(result.response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    result.response = new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers: newHeaders
    });
  }
  return result;
});
const authMiddleware = createMiddleware({
  type: "request"
}).server(async ({
  next,
  request
}) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/, "");
  const {
    verifyZeroToken
  } = await import('./zero-jwt-Cxo4ZZOj.mjs');
  const sub = token ? await verifyZeroToken(token) : null;
  const result = await next({
    context: {
      authData: {
        sub
      }
    }
  });
  return result;
});
const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
});
const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const authSchema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  account,
  session,
  user,
  verification
}, Symbol.toStringTag, { value: "Module" }));
let _sql = null;
function getSql() {
  if (!_sql) {
    const url = process.env.ZERO_UPSTREAM_DB;
    if (!url) {
      throw new Error("ZERO_UPSTREAM_DB environment variable is not set");
    }
    _sql = postgres(url, {
      max: 10,
      idle_timeout: 30
    });
  }
  return _sql;
}
let _db = null;
function createDb() {
  return drizzle(getSql(), { schema: authSchema });
}
function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
const client = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getDb,
  getSql
}, Symbol.toStringTag, { value: "Module" }));
const schema = {
  tables: {
    deviceHistory: {
      name: "deviceHistory",
      columns: {
        id: {
          type: "number",
          optional: true,
          customType: null
        },
        deviceId: {
          type: "string",
          optional: false,
          customType: null,
          serverName: "device_id"
        },
        recordedAt: {
          type: "number",
          optional: true,
          customType: null,
          serverName: "recorded_at"
        },
        historyType: {
          type: "string",
          optional: false,
          customType: null,
          serverName: "history_type"
        },
        changedBy: {
          type: "string",
          optional: true,
          customType: null,
          serverName: "changed_by"
        },
        changes: {
          type: "json",
          optional: false,
          customType: null
        }
      },
      primaryKey: ["id"],
      serverName: "device_history"
    },
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
        probe1_temp_a: {
          type: "number",
          optional: true,
          customType: null
        },
        probe1_temp_b: {
          type: "number",
          optional: true,
          customType: null
        },
        probe2_temp_a: {
          type: "number",
          optional: true,
          customType: null
        },
        probe2_temp_b: {
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
        gs_state: {
          type: "string",
          optional: true,
          customType: null
        },
        gs_message: {
          type: "string",
          optional: true,
          customType: null
        },
        gs_eventmask: {
          type: "string",
          optional: true,
          customType: null
        },
        gs_sim: {
          type: "number",
          optional: true,
          customType: null
        },
        temp_smoke: {
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
        },
        prefers_celsius: {
          type: "boolean",
          optional: true,
          customType: null
        }
      },
      primaryKey: ["id"]
    }
  },
  relationships: {}
};
function createJsonMergePatch(oldObj, newObj) {
  const patch = {};
  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      const oldValue = oldObj[key];
      const newValue = newObj[key];
      if (!deepEqual(oldValue, newValue)) {
        patch[key] = newValue;
      }
    }
  }
  for (const key in oldObj) {
    if (Object.prototype.hasOwnProperty.call(oldObj, key) && !Object.prototype.hasOwnProperty.call(newObj, key)) {
      patch[key] = null;
    }
  }
  return patch;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && typeof b === "object") {
    const aObj = a;
    const bObj = b;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }
  return false;
}
function createSharedMutators(authData) {
  return {
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
        await tx.mutate.users.upsert({
          id: authData.sub,
          email: args.email,
          name: args.name,
          prefers_celsius: args.prefers_celsius
        });
      },
      async update(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.id !== authData.sub)
          throw new Error("Cannot update another user's account");
        await tx.mutate.users.update(args);
      }
    },
    ninjaConnections: {
      async upsert(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.userId !== authData.sub) {
          throw new Error("Cannot modify another user's connection.");
        }
        await tx.mutate.ninjaConnections.upsert({
          ...args,
          attempts: args.attempts ?? 0,
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
        if (!authData.sub) throw new Error("Not authenticated");
        if (args.userId !== authData.sub)
          throw new Error("Cannot modify another user's attempts");
        const connection = await tx.query.ninjaConnections.where("userId", args.userId).one().run();
        if (!connection) throw new Error("Connection not found");
        await tx.mutate.ninjaConnections.update({
          userId: args.userId,
          attempts: (connection.attempts ?? 0) + 1,
          updatedAt: Date.now()
        });
      },
      async validateAndRefreshCredentials(_tx, args) {
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
      async syncRealDevices(_tx) {
        if (!authData.sub) throw new Error("Not authenticated");
      },
      async update(tx, args) {
        if (!authData.sub) throw new Error("Not authenticated");
        const device = await tx.query.devices.where("id", args.id).where("userId", authData.sub).one().run();
        if (!device) {
          throw new Error("Device not found or access denied");
        }
        await tx.mutate.devices.update({
          id: args.id,
          ...args.data
        });
      }
    }
  };
}
function createServerMutators(authData) {
  const sharedMutators = createSharedMutators(authData);
  return {
    users: {
      async create(tx, u) {
        await sharedMutators.users.create(tx, u);
        console.log(`[Server] User created: ${u.email} (${u.id})`);
      },
      async delete(tx, args) {
        await sharedMutators.users.delete(tx, args);
        console.log(`[Server] User deleted: ${args.id}`);
      },
      async upsert(tx, args) {
        await sharedMutators.users.upsert(tx, args);
        console.log(`[Server] User upserted: ${args.email} (${authData.sub})`);
      },
      async update(tx, args) {
        await sharedMutators.users.update(tx, args);
        const updatedFields = Object.keys(args).join(", ");
        console.log(
          `[Server] User updated fields: ${updatedFields} for user: ${authData.sub}`
        );
      }
    },
    ninjaConnections: {
      async upsert(tx, args) {
        await sharedMutators.ninjaConnections.upsert(tx, args);
        console.log(
          `[Server] Ninja connection upserted for user: ${args.userId}`
        );
      },
      async updateTokens(tx, args) {
        await sharedMutators.ninjaConnections.updateTokens(tx, args);
        console.log(`[Server] Ninja tokens updated for user: ${args.userId}`);
      },
      async incrementAttempts(tx, args) {
        await sharedMutators.ninjaConnections.incrementAttempts(tx, args);
        console.log(
          `[Server] Ninja connection attempts incremented for user: ${args.userId}`
        );
      },
      async validateAndRefreshCredentials(tx, args) {
        var _a, _b, _c, _d, _e, _f;
        const { NinjaAuthManager } = await import('./ninja-auth-manager-BmGRqhY0.mjs').then((n) => n.n);
        const connection = await tx.query.ninjaConnections.where("userId", args.userId).one().run();
        if (!connection) {
          throw new Error("No connection found for user");
        }
        if (!connection.username || !connection.password) {
          throw new Error("Credentials not set");
        }
        try {
          const authManager = NinjaAuthManager.create({
            email: connection.username,
            password: connection.password
          });
          await authManager.clearState();
          await authManager.getIDToken();
          let authState = authManager.getState();
          await sharedMutators.ninjaConnections.updateTokens(tx, {
            userId: args.userId,
            oauthAccessToken: ((_a = authState.oauthTokens) == null ? void 0 : _a.accessToken) || null,
            oauthRefreshToken: ((_b = authState.oauthTokens) == null ? void 0 : _b.refreshToken) || null,
            oauthExpiresAt: ((_c = authState.oauthTokens) == null ? void 0 : _c.expiresAt) || null
          });
          await tx.mutate.ninjaConnections.update({
            userId: args.userId,
            attempts: 0
          });
          await tx.query.ninjaConnections.one();
          try {
            await authManager.getAPIToken();
            authState = authManager.getState();
            await sharedMutators.ninjaConnections.updateTokens(tx, {
              userId: args.userId,
              aylaAccessToken: ((_d = authState.aylaToken) == null ? void 0 : _d.accessToken) || null,
              aylaRefreshToken: ((_e = authState.aylaToken) == null ? void 0 : _e.refreshToken) || null,
              aylaExpiresAt: ((_f = authState.aylaToken) == null ? void 0 : _f.expiresAt) || null
            });
          } catch (aylaError) {
            console.warn(
              `[Server] Ayla token acquisition failed for user ${args.userId}, but OAuth succeeded`,
              aylaError
            );
          }
          console.log(
            `[Server] Ninja connection tested successfully for user: ${args.userId}`
          );
        } catch (error) {
          await tx.mutate.ninjaConnections.update({
            userId: args.userId,
            attempts: (connection.attempts || 0) + 1,
            updatedAt: Date.now()
          });
          console.error(
            `[Server] Ninja connection test failed for user: ${args.userId}`,
            error
          );
          throw new Error(
            `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    },
    devices: {
      async refreshFakeData(tx) {
        await sharedMutators.devices.refreshFakeData(tx);
        console.log(`[Server] Fake devices refreshed for user: ${authData.sub}`);
      },
      async syncRealDevices(tx) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!authData.sub) {
          throw new Error("Not authenticated");
        }
        const userId = authData.sub;
        try {
          const connection = await tx.query.ninjaConnections.where("userId", userId).one().run();
          if (!connection) {
            throw new Error("No connection found for user");
          }
          if (!connection.username || !connection.password) {
            throw new Error("Credentials not set");
          }
          const { NinjaAuthManager } = await import('./ninja-auth-manager-BmGRqhY0.mjs').then((n) => n.n);
          const { DEVICE_PROPERTY_MAPPINGS } = await import('./device-property-mappings-Cq-xBcwx.mjs');
          const initialState = {};
          if (connection.oauthAccessToken && connection.oauthRefreshToken && connection.oauthExpiresAt) {
            initialState.oauthTokens = {
              accessToken: connection.oauthAccessToken,
              idToken: "",
              // We don't store this, will be refreshed
              refreshToken: connection.oauthRefreshToken,
              expiresAt: connection.oauthExpiresAt
            };
          }
          if (connection.aylaAccessToken && connection.aylaExpiresAt) {
            initialState.aylaToken = {
              accessToken: connection.aylaAccessToken,
              refreshToken: connection.aylaRefreshToken || void 0,
              expiresAt: connection.aylaExpiresAt
            };
          }
          const authManager = NinjaAuthManager.create(
            {
              email: connection.username,
              password: connection.password
            },
            initialState
          );
          const apiToken = await authManager.getAPIToken();
          const newState = authManager.getState();
          if (((_a = newState.aylaToken) == null ? void 0 : _a.accessToken) !== connection.aylaAccessToken || ((_b = newState.aylaToken) == null ? void 0 : _b.expiresAt) !== connection.aylaExpiresAt) {
            await sharedMutators.ninjaConnections.updateTokens(tx, {
              userId,
              aylaAccessToken: ((_c = newState.aylaToken) == null ? void 0 : _c.accessToken) || null,
              aylaRefreshToken: ((_d = newState.aylaToken) == null ? void 0 : _d.refreshToken) || null,
              aylaExpiresAt: ((_e = newState.aylaToken) == null ? void 0 : _e.expiresAt) || null
            });
          }
          const headers = {
            authorization: `auth_token ${apiToken}`,
            accept: "application/json",
            "user-agent": "Dalvik/2.1.0 (Linux; U; Android 16; sdk_gphone64_arm64 Build/BP22.250325.006)"
          };
          const devicesResponse = await fetch(
            "https://ads-eu.aylanetworks.com/apiv1/devices.json",
            { headers }
          );
          if (!devicesResponse.ok) {
            throw new Error(
              `Failed to fetch devices: ${devicesResponse.status} ${devicesResponse.statusText}`
            );
          }
          const devicesData = await devicesResponse.json();
          const propertyPromises = devicesData.map(
            async (deviceWrapper) => {
              const device = deviceWrapper.device;
              try {
                const propsResponse = await fetch(
                  `https://ads-eu.aylanetworks.com/apiv1/dsns/${device.dsn}/properties.json`,
                  { headers }
                );
                if (propsResponse.ok) {
                  const propsData = await propsResponse.json();
                  return { device, properties: propsData };
                }
                return { device, properties: null };
              } catch (error) {
                console.warn(
                  `Failed to fetch properties for device ${device.dsn}:`,
                  error
                );
                return { device, properties: null };
              }
            }
          );
          const propertyResults = await Promise.allSettled(propertyPromises);
          const failedCount = propertyResults.filter(
            (r) => r.status === "rejected"
          ).length;
          if (failedCount > 0) {
            console.warn(
              `[Server] Failed to fetch properties for ${failedCount} devices`
            );
          }
          const devicesWithProperties = propertyResults.filter(
            (result) => result.status === "fulfilled"
          ).map((result) => result.value);
          for (const { device, properties } of devicesWithProperties) {
            const propertiesMap = {};
            if (properties && Array.isArray(properties)) {
              for (const propWrapper of properties) {
                const prop = propWrapper.property;
                if (prop == null ? void 0 : prop.name) {
                  propertiesMap[prop.name] = {
                    value: prop.value,
                    type: prop.type,
                    base_type: prop.base_type,
                    updated_at: prop.data_updated_at
                  };
                }
              }
            }
            const filteredPropertiesMap = Object.fromEntries(
              Object.entries(propertiesMap).filter(
                ([propName]) => !DEVICE_PROPERTY_MAPPINGS[propName]
              )
            );
            const handledTopLevelKeys = /* @__PURE__ */ new Set([
              "dsn",
              "product_name",
              "model",
              "mac",
              "lan_ip",
              "connection_status",
              "properties"
              // Original properties array from API
            ]);
            const unmappedApiFields = Object.fromEntries(
              Object.entries(device).filter(
                ([key]) => !handledTopLevelKeys.has(key)
              )
            );
            const additionalDeviceProperties = {
              ...unmappedApiFields,
              properties: filteredPropertiesMap,
              lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            const deviceData = {
              id: crypto.randomUUID(),
              userId,
              dsn: device.dsn,
              productName: device.product_name || null,
              model: device.model || null,
              mac: device.mac || null,
              lanIp: device.lan_ip || null,
              connectionStatus: device.connection_status || "unknown",
              additionalDeviceProperties,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            const props = Object.entries(propertiesMap);
            const grillStateIndex = props.findIndex(
              ([key]) => key === "GET_GrillState"
            );
            if (grillStateIndex > -1) {
              const grillStateEntry = props.splice(grillStateIndex, 1)[0];
              props.unshift(grillStateEntry);
            }
            for (const [propName, propData] of props) {
              const mapping = DEVICE_PROPERTY_MAPPINGS[propName];
              if (mapping) {
                const { columnName, dataType } = mapping;
                const propValue = propData.value;
                let convertedValue = null;
                if (propValue !== null && propValue !== void 0) {
                  switch (dataType) {
                    case "integer":
                      convertedValue = typeof propValue === "number" ? propValue : Number.parseInt(propValue);
                      break;
                    case "numeric":
                      convertedValue = typeof propValue === "number" ? propValue : Number.parseFloat(propValue);
                      break;
                    case "boolean":
                      convertedValue = typeof propValue === "boolean" ? propValue : propValue === 1 || propValue === "1" || propValue === "true";
                      break;
                    case "timestamptz":
                      if (propName === "GET_Estimated_End_Time" && propValue) {
                        const parsed = typeof propValue === "number" ? new Date(propValue * 1e3) : new Date(propValue);
                        convertedValue = Number.isNaN(parsed.getTime()) ? null : parsed;
                      }
                      break;
                    default:
                      convertedValue = String(propValue);
                      break;
                  }
                }
                deviceData[columnName] = convertedValue;
                if (propName === "GET_GrillState" && propValue) {
                  try {
                    const grillState = typeof propValue === "string" ? JSON.parse(propValue) : propValue;
                    if (grillState.state !== void 0)
                      deviceData.gs_state = grillState.state;
                    if (grillState.message !== void 0)
                      deviceData.gs_message = grillState.message;
                    if (grillState.eventmask !== void 0)
                      deviceData.gs_eventmask = grillState.eventmask;
                    if (grillState.sim !== void 0)
                      deviceData.gs_sim = grillState.sim;
                    if ((_f = grillState.inputs) == null ? void 0 : _f.temps) {
                      const temps = grillState.inputs.temps;
                      if (temps.grill !== void 0)
                        deviceData.temp_grill = temps.grill;
                      if (temps.air !== void 0)
                        deviceData.temp_air = temps.air;
                      if (temps.smoke !== void 0)
                        deviceData.temp_smoke = temps.smoke;
                      if (temps.probe0_a !== void 0)
                        deviceData.probe1_temp_a = temps.probe0_a;
                      if (temps.probe0_b !== void 0)
                        deviceData.probe1_temp_b = temps.probe0_b;
                      if (temps.probe1_a !== void 0)
                        deviceData.probe2_temp_a = temps.probe1_a;
                      if (temps.probe1_b !== void 0)
                        deviceData.probe2_temp_b = temps.probe1_b;
                      if (temps.main !== void 0)
                        deviceData.temp_mainpcb = temps.main;
                      if (temps.ui !== void 0)
                        deviceData.temp_uipcb = temps.ui;
                    }
                    if ((_g = grillState.inputs) == null ? void 0 : _g.io) {
                      const io = grillState.inputs.io;
                      if (io["lid open"] !== void 0) {
                        deviceData.is_lid_open = io["lid open"] === 1;
                      }
                    }
                  } catch (error) {
                    console.warn(
                      `Failed to parse grill_state for device ${device.dsn}:`,
                      error
                    );
                  }
                }
              }
            }
            const existingDevice = await tx.query.devices.where("dsn", device.dsn).where("userId", userId).one().run();
            if (existingDevice == null ? void 0 : existingDevice.id) {
              const { id, ...dataWithoutId } = deviceData;
              await sharedMutators.devices.update(tx, {
                id: existingDevice.id,
                data: dataWithoutId
              });
              const currentDevice = await tx.query.devices.where("id", existingDevice.id).one().run();
              if (currentDevice) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1e3);
                const recentHistory = await tx.query.deviceHistory.where("deviceId", existingDevice.id).orderBy("recordedAt", "desc").limit(120).run();
                const currentHourSnapshot = recentHistory.find(
                  (h) => h.historyType === "snapshot" && h.recordedAt && new Date(h.recordedAt).getTime() > oneHourAgo.getTime()
                );
                if (currentHourSnapshot) {
                  const patch = createJsonMergePatch(
                    existingDevice,
                    currentDevice
                  );
                  if (Object.keys(patch).length > 0) {
                    await tx.mutate.deviceHistory.insert(
                      // id is DB-generated (identity); zero insert type wrongly requires it
                      {
                        deviceId: existingDevice.id,
                        historyType: "patch",
                        changes: patch,
                        changedBy: userId
                      }
                    );
                  }
                } else {
                  await tx.mutate.deviceHistory.insert(
                    // id is DB-generated (identity); zero insert type wrongly requires it
                    {
                      deviceId: existingDevice.id,
                      historyType: "snapshot",
                      changes: currentDevice,
                      // The snapshot is the full new state
                      changedBy: userId
                    }
                  );
                }
              }
            } else {
              await tx.mutate.devices.insert(
                deviceData
              );
              const newDevice = await tx.query.devices.where("dsn", device.dsn).where("userId", userId).one().run();
              if (newDevice == null ? void 0 : newDevice.id) {
                await tx.mutate.deviceHistory.insert(
                  // id is DB-generated (identity); zero insert type wrongly requires it
                  {
                    deviceId: newDevice.id,
                    historyType: "snapshot",
                    changes: deviceData,
                    changedBy: userId
                  }
                );
              }
            }
          }
          console.log(
            `[Server] Synced ${devicesWithProperties.length} real devices for user: ${userId}`
          );
        } catch (error) {
          console.error("[Server] syncRealDevices error:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isPermanentAuthError = errorMessage.includes("OAuth token exchange failed") || errorMessage.includes("Invalid credentials") || errorMessage.includes("Authentication failed") || errorMessage.includes("Refresh token expired") || errorMessage.includes("Invalid refresh token");
          if (isPermanentAuthError) {
            console.log(
              "[Server] Permanent auth error detected, clearing tokens"
            );
            await sharedMutators.ninjaConnections.updateTokens(tx, {
              userId,
              aylaAccessToken: null,
              aylaRefreshToken: null,
              aylaExpiresAt: null,
              oauthAccessToken: null,
              oauthRefreshToken: null,
              oauthExpiresAt: null
            });
          }
          throw error;
        }
      },
      async update(tx, args) {
        const currentDevice = await tx.query.devices.where("id", args.id).one().run();
        if (!currentDevice) {
          throw new Error("Device not found");
        }
        await sharedMutators.devices.update(tx, args);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1e3);
        const recentHistory = await tx.query.deviceHistory.where("deviceId", args.id).orderBy("recordedAt", "desc").limit(10).run();
        const currentHourSnapshot = recentHistory.find(
          (h) => h.historyType === "snapshot" && h.recordedAt && new Date(h.recordedAt).getTime() > oneHourAgo.getTime()
        );
        const newState = {
          ...currentDevice,
          ...args.data,
          updatedAt: Date.now()
        };
        if (currentHourSnapshot) {
          const patch = createJsonMergePatch(
            currentDevice,
            newState
          );
          if (Object.keys(patch).length > 0) {
            await tx.mutate.deviceHistory.insert(
              // id is DB-generated (identity); zero insert type wrongly requires it
              {
                deviceId: args.id,
                historyType: "patch",
                changes: patch,
                changedBy: authData.sub
              }
            );
          }
        } else {
          await tx.mutate.deviceHistory.insert(
            // id is DB-generated (identity); zero insert type wrongly requires it
            {
              deviceId: args.id,
              historyType: "snapshot",
              changes: newState,
              changedBy: authData.sub
            }
          );
        }
        console.log(
          `[Server] Device ${args.id} updated with hourly snapshot/patch pattern`
        );
      }
    }
  };
}
const sql = process.env.ZERO_UPSTREAM_DB ? getSql() : null;
const database = sql ? new ZQLDatabase(new PostgresJSConnection(sql), schema) : null;
const processor = database ? new PushProcessor(database) : null;
const ServerRoute$2 = createServerFileRoute().methods((api) => ({
  POST: api.middleware([corsMiddleware, authMiddleware]).handler(async ({
    request,
    context
  }) => {
    try {
      const url = new URL(request.url);
      const query = Object.fromEntries(url.searchParams.entries());
      const bodyText = await request.text();
      const body = JSON.parse(bodyText);
      if (!sql || !processor) {
        throw new Error("Database client not initialized. Check ZERO_UPSTREAM_DB env variable.");
      }
      const authData = context.authData;
      const result = await processor.process(createServerMutators(authData), query, body);
      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      console.error("🟥 Push endpoint error:", error);
      return new Response(JSON.stringify({
        error: true,
        details: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  })
}));
if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}
const resend = new Resend(process.env.RESEND_API_KEY);
async function sendEmail({
  to,
  subject,
  react
}) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("Missing EMAIL_FROM environment variable");
  }
  console.log("📧 Sending email:");
  console.log("   - From:", process.env.EMAIL_FROM);
  console.log("   - To:", Array.isArray(to) ? to.join(", ") : to);
  console.log("   - Subject:", subject);
  const renderResult = render(react, { pretty: true });
  const html = typeof renderResult === "string" ? renderResult : await renderResult;
  console.log(`   - HTML Preview: ${html.substring(0, 100)}...`);
  try {
    console.log("📤 Calling Resend API...");
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
    console.log("✅ Resend API response:", response);
    const id = response && typeof response === "object" && "id" in response ? String(response.id) : "unknown";
    return { id };
  } catch (error) {
    console.error("❌ Resend API error:", error);
    throw error;
  }
}
const emailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  templateName: z.string().min(1),
  data: z.record(z.unknown())
});
const ServerRoute$1 = createServerFileRoute().methods({
  POST: async ({
    request
  }) => {
    try {
      const body = await request.json();
      const validatedBody = emailSchema.parse(body);
      const {
        to,
        subject,
        templateName,
        data
      } = validatedBody;
      const templateModule = await import(`./src/emails/templates/${templateName}`);
      const Template = templateModule.default;
      if (!Template) {
        throw new Error(`Email template '${templateName}' not found`);
      }
      const result = await sendEmail({
        to,
        subject,
        react: React__default.createElement(Template, data)
      });
      return new Response(JSON.stringify({
        success: true,
        messageId: typeof result === "object" && result !== null ? result.id : void 0
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
});
const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: authSchema
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  },
  user: {
    deleteUser: {
      enabled: true
    }
  },
  advanced: {
    database: {
      // UUIDs keep authData.sub compatible with uuid columns (devices.user_id)
      generateId: () => crypto.randomUUID()
    }
  }
});
const auth$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  auth
}, Symbol.toStringTag, { value: "Module" }));
const ServerRoute = createServerFileRoute().methods({
  GET: ({
    request
  }) => auth.handler(request),
  POST: ({
    request
  }) => auth.handler(request)
});
const rootServerRouteImport = createServerRootRoute();
const TermsOfServiceRoute = Route$j.update({
  id: "/terms-of-service",
  path: "/terms-of-service",
  getParentRoute: () => Route$k
});
const PrivacyPolicyRoute = Route$i.update({
  id: "/privacy-policy",
  path: "/privacy-policy",
  getParentRoute: () => Route$k
});
const AuthedRoute = Route$h.update({
  id: "/_authed",
  getParentRoute: () => Route$k
});
const IndexRoute = Route$g.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$k
});
const AuthSignupAltRoute = Route$f.update({
  id: "/auth/signup-alt",
  path: "/auth/signup-alt",
  getParentRoute: () => Route$k
});
const AuthSignupRoute = Route$e.update({
  id: "/auth/signup",
  path: "/auth/signup",
  getParentRoute: () => Route$k
});
const AuthLoginRoute = Route$d.update({
  id: "/auth/login",
  path: "/auth/login",
  getParentRoute: () => Route$k
});
const AuthedAppRouteRoute = Route$c.update({
  id: "/app",
  path: "/app",
  getParentRoute: () => AuthedRoute
});
const AuthedAppLayoutIndexRoute = Route$b.update({
  id: "/_layout/",
  path: "/",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutStatusRoute = Route$a.update({
  id: "/_layout/status",
  path: "/status",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutNinjaConnectionRoute = Route$9.update({
  id: "/_layout/ninja-connection",
  path: "/ninja-connection",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutEmailPreviewRoute = Route$8.update({
  id: "/_layout/email-preview",
  path: "/email-preview",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutDevicesRoute = Route$7.update({
  id: "/_layout/devices",
  path: "/devices",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutAccountDebugRoute = Route$6.update({
  id: "/_layout/account-debug",
  path: "/account-debug",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutAccountRoute = Route$5.update({
  id: "/_layout/account",
  path: "/account",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutDeviceDeviceIdRoute = Route$4.update({
  id: "/_layout/device/$deviceId",
  path: "/device/$deviceId",
  getParentRoute: () => AuthedAppRouteRoute
});
const AuthedAppLayoutDeviceDeviceIdTechnicalRoute = Route$3.update({
  id: "/technical",
  path: "/technical",
  getParentRoute: () => AuthedAppLayoutDeviceDeviceIdRoute
});
const AuthedAppLayoutDeviceDeviceIdStatusRoute = Route$2.update({
  id: "/status",
  path: "/status",
  getParentRoute: () => AuthedAppLayoutDeviceDeviceIdRoute
});
const AuthedAppLayoutDeviceDeviceIdRawRoute = Route$1.update({
  id: "/raw",
  path: "/raw",
  getParentRoute: () => AuthedAppLayoutDeviceDeviceIdRoute
});
const AuthedAppLayoutDeviceDeviceIdHistoryRoute = Route.update({
  id: "/history",
  path: "/history",
  getParentRoute: () => AuthedAppLayoutDeviceDeviceIdRoute
});
const ApiPushServerRoute = ServerRoute$2.update({
  id: "/api/push",
  path: "/api/push",
  getParentRoute: () => rootServerRouteImport
});
const ApiEmailSendServerRoute = ServerRoute$1.update({
  id: "/api/email/send",
  path: "/api/email/send",
  getParentRoute: () => rootServerRouteImport
});
const ApiAuthSplatServerRoute = ServerRoute.update({
  id: "/api/auth/$",
  path: "/api/auth/$",
  getParentRoute: () => rootServerRouteImport
});
const AuthedAppLayoutDeviceDeviceIdRouteChildren = {
  AuthedAppLayoutDeviceDeviceIdHistoryRoute,
  AuthedAppLayoutDeviceDeviceIdRawRoute,
  AuthedAppLayoutDeviceDeviceIdStatusRoute,
  AuthedAppLayoutDeviceDeviceIdTechnicalRoute
};
const AuthedAppLayoutDeviceDeviceIdRouteWithChildren = AuthedAppLayoutDeviceDeviceIdRoute._addFileChildren(AuthedAppLayoutDeviceDeviceIdRouteChildren);
const AuthedAppRouteRouteChildren = {
  AuthedAppLayoutAccountRoute,
  AuthedAppLayoutAccountDebugRoute,
  AuthedAppLayoutDevicesRoute,
  AuthedAppLayoutEmailPreviewRoute,
  AuthedAppLayoutNinjaConnectionRoute,
  AuthedAppLayoutStatusRoute,
  AuthedAppLayoutIndexRoute,
  AuthedAppLayoutDeviceDeviceIdRoute: AuthedAppLayoutDeviceDeviceIdRouteWithChildren
};
const AuthedAppRouteRouteWithChildren = AuthedAppRouteRoute._addFileChildren(AuthedAppRouteRouteChildren);
const AuthedRouteChildren = {
  AuthedAppRouteRoute: AuthedAppRouteRouteWithChildren
};
const AuthedRouteWithChildren = AuthedRoute._addFileChildren(AuthedRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AuthedRoute: AuthedRouteWithChildren,
  PrivacyPolicyRoute,
  TermsOfServiceRoute,
  AuthLoginRoute,
  AuthSignupRoute,
  AuthSignupAltRoute
};
const routeTree = Route$k._addFileChildren(rootRouteChildren)._addFileTypes();
const rootServerRouteChildren = {
  ApiPushServerRoute,
  ApiAuthSplatServerRoute,
  ApiEmailSendServerRoute
};
const serverRouteTree = rootServerRouteImport._addFileChildren(rootServerRouteChildren)._addFileTypes();
const routeTree_gen = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  routeTree,
  serverRouteTree
}, Symbol.toStringTag, { value: "Module" }));
const createRouter = () => {
  const router2 = createRouter$1({
    routeTree,
    context: {
      z: void 0,
      session: null
    },
    scrollRestoration: true
  });
  return router2;
};
createRouter();
const serverEntry$1 = createStartHandler({
  createRouter
})(defaultStreamHandler);
const serverEntry = defineEventHandler(function(event) {
  const request = toWebRequest(event);
  return serverEntry$1({ request });
});

export { handleCors as $, getEvent as A, getHeader as B, getHeaders as C, getProxyRequestHeaders as D, getQuery as E, getRequestFingerprint as F, getRequestHeader as G, HTTPEventSymbol as H, getRequestHeaders as I, getRequestHost as J, getRequestIP as K, getRequestProtocol as L, getRequestURL as M, getRequestWebStream as N, getResponseHeader as O, getResponseHeaders as P, getResponseStatus as Q, getResponseStatusText as R, StartServer as S, getRouterParam as T, getRouterParams as U, VIRTUAL_MODULES as V, getSession as W, getValidatedQuery as X, getValidatedRouterParams as Y, getWebRequest as Z, handleCacheHeaders as _, attachRouterServerSsrUtils as a, handleServerAction as a0, isEvent as a1, isMethod as a2, isPreflightRequest as a3, parseCookies as a4, proxyRequest as a5, readBody as a6, readFormData as a7, readMultipartFormData as a8, readRawBody as a9, cn as aA, Button as aB, Route$k as aC, createSharedMutators as aD, schema as aE, Route$c as aF, createServerFn as aG, createServerRpc as aH, Route$4 as aI, Route$3 as aJ, Route$2 as aK, Route$1 as aL, Route as aM, appCss as aN, NotFound as aO, DefaultCatchBoundary as aP, client as aQ, auth$1 as aR, readValidatedBody as aa, removeResponseHeader as ab, requestHandler as ac, runWithEvent as ad, sealSession as ae, send as af, sendError as ag, sendNoContent as ah, sendProxy as ai, sendRedirect as aj, sendStream as ak, sendWebResponse as al, setContext as am, setCookie as an, setHeader as ao, setHeaders as ap, setResponseHeader as aq, setResponseHeaders as ar, setResponseStatus as as, transformPipeableStreamWithRouter as at, transformReadableStreamWithRouter as au, unsealSession as av, updateSession as aw, useSession as ax, writeEarlyHints as ay, Route$h as az, defineHandlerCallback as b, defaultStreamHandler as c, dehydrateRouter as d, serverEntry as default, appendCorsHeaders as e, appendCorsPreflightHeaders as f, appendHeader as g, appendHeaders as h, appendResponseHeader as i, appendResponseHeaders as j, assertMethod as k, clearResponseHeaders as l, mergeHeaders as m, clearSession as n, createServerFileRoute as o, createServerRootRoute as p, createServerRoute as q, createStartHandler as r, defaultContentType as s, defineEventHandler as t, defineMiddleware as u, deleteCookie as v, eventHandler as w, fetchWithEvent as x, getContext as y, getCookie as z };
//# sourceMappingURL=ssr.mjs.map
