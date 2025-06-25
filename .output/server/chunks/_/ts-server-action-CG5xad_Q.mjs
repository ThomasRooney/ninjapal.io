import * as fs from 'node:fs';
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
import '@tanstack/history';
import 'jsesc';
import 'node:stream';
import 'isbot';
import 'react-dom/server';
import 'node:stream/web';

const filePath = "count.txt";
async function readCount() {
  return Number.parseInt(await fs.promises.readFile(filePath, "utf-8").catch(() => "0"));
}
const getCount_createServerFn_handler = createServerRpc("src_components_ts-server-action_tsx--getCount_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return getCount.__executeServer(opts, signal);
});
const getCount = createServerFn({
  method: "GET"
}).handler(getCount_createServerFn_handler, () => {
  return readCount();
});
const updateCount_createServerFn_handler = createServerRpc("src_components_ts-server-action_tsx--updateCount_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return updateCount.__executeServer(opts, signal);
});
const updateCount = createServerFn({
  method: "POST",
  response: "raw"
  // Tell TanStack we want to return a raw Response
}).validator((formData) => {
  if (!(formData instanceof FormData)) {
    const data = new FormData();
    data.set("addBy", "1");
    return data;
  }
  return formData;
}).handler(updateCount_createServerFn_handler, async ({
  data: formData
}) => {
  const addBy = Number(formData.get("addBy") || "1");
  const count = await readCount();
  await fs.promises.writeFile(filePath, `${count + addBy}`);
  return new Response("ok", {
    status: 303,
    // 303 See Other
    headers: {
      Location: "/_authed/app/_layout/tanstack-examples"
    }
  });
});

export { getCount_createServerFn_handler, updateCount_createServerFn_handler };
//# sourceMappingURL=ts-server-action-CG5xad_Q.mjs.map
