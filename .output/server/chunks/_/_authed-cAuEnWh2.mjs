import { jsx } from 'react/jsx-runtime';
import { Outlet } from '@tanstack/react-router';
import { R as Route$h } from './ssr.mjs';
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

const SplitComponent = function AuthWrapper() {
  const {
    user
  } = Route$h.useRouteContext();
  console.log("\u{1F510} _authed route context:", {
    user
  });
  return /* @__PURE__ */ jsx(Outlet, {});
};

export { SplitComponent as component };
//# sourceMappingURL=_authed-cAuEnWh2.mjs.map
