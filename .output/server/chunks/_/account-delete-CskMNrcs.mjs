import { l as createServerRpc, k as createServerFn } from './ssr.mjs';
import 'react/jsx-runtime';
import '@tanstack/react-router';
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

const deleteUserFn_createServerFn_handler = createServerRpc("src_components_account-delete_tsx--deleteUserFn_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return deleteUserFn.__executeServer(opts, signal);
});
const deleteUserFn = createServerFn({
  method: "POST"
}).handler(deleteUserFn_createServerFn_handler, async () => {
  var _a;
  const {
    getSupabaseServerClient
  } = await import('./ssr.mjs').then((n) => n.K);
  const supabase = getSupabaseServerClient();
  try {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        error: true,
        message: "No authenticated user found"
      };
    }
    const postgres = await import('postgres');
    const dbUrl = (_a = process.env.ZERO_UPSTREAM_DB) != null ? _a : "";
    const sql = postgres.default(dbUrl, {
      max: 1,
      ssl: false,
      idle_timeout: 20
    });
    try {
      await sql.begin(async (tx) => {
        await tx`DELETE FROM public.users WHERE id = ${user.id}`;
      });
    } finally {
      await sql.end({
        timeout: 5
      });
    }
    await supabase.auth.admin.deleteUser(user.id);
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
//# sourceMappingURL=account-delete-CskMNrcs.mjs.map
