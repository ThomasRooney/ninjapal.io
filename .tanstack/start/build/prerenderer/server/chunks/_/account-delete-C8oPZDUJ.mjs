import { aH as createServerRpc, aG as createServerFn } from './ssr.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/history/dist/esm/index.js';
import 'node:async_hooks';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/h3/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/jsesc/jsesc.js';
import 'node:stream';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/isbot/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-dom/server.node.js';
import 'node:stream/web';

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

export { deleteUserFn_createServerFn_handler };
//# sourceMappingURL=account-delete-C8oPZDUJ.mjs.map
