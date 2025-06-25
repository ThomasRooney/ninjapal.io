import { jsxs, jsx } from 'react/jsx-runtime';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
import { B as Button } from './ssr.mjs';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { Table, FileJson2 } from 'lucide-react';
import { useState } from 'react';
import '@radix-ui/react-slot';
import './sidebar-Cc3VdR9k.mjs';
import 'class-variance-authority';
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';
import '@tanstack/react-router';
import 'clsx';
import 'tailwind-merge';
import '@supabase/ssr';
import 'node:async_hooks';
import '@tanstack/react-router-devtools';
import 'tiny-invariant';
import 'tiny-warning';
import '@tanstack/router-core';
import '@radix-ui/react-select';
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

function UserList({
  view
}) {
  const z = useZero();
  const [users] = useQuery(z.query.users);
  if (view === "json") {
    return /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-background min-w-[300px]", children: /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsx("pre", { className: "text-xs text-left", children: JSON.stringify(users, null, 2) }) }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-background min-w-[300px]", children: [
    /* @__PURE__ */ jsx("div", { children: users == null ? void 0 : users.map((user) => /* @__PURE__ */ jsx("div", { className: "flex", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 grow items-start hover:bg-secondary/40 group pl-4 pr-4 py-3", children: [
      /* @__PURE__ */ jsx("span", { className: "font-medium text-sm text-stone-700 group-hover:text-stone-950", children: user.name ? user.name : /* @__PURE__ */ jsx("span", { className: "italic text-stone-500", children: "No username" }) }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: user.email }) }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: user.id }) })
    ] }) }, user.id)) }),
    (users == null ? void 0 : users.length) === 0 && /* @__PURE__ */ jsx("div", { className: "flex items-center h-full px-4 py-3.5", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No users yet" }) })
  ] });
}
const SplitComponent = function RouteComponent() {
  var _a;
  const z = useZero();
  const [users] = useQuery(z.query.users);
  const [view, setView] = useState("table");
  const numUsers = (_a = users == null ? void 0 : users.length) != null ? _a : 0;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full overflow-y-auto w-full", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Zero Users", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "xs", onClick: () => setView("table"), className: view === "table" ? "bg-stone-200/80 hover:bg-stone-200 border-stone-300" : "", children: [
        /* @__PURE__ */ jsx(Table, { className: "w-4 h-4" }),
        "Table"
      ] }),
      /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "xs", onClick: () => setView("json"), className: view === "json" ? "bg-stone-200/80 hover:bg-stone-200 border-stone-300" : "", children: [
        /* @__PURE__ */ jsx(FileJson2, { className: "w-3.5 h-3.5" }),
        "JSON"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
      /* @__PURE__ */ jsx("div", { className: "sticky top-0 flex items-center gap-2 w-full justify-between px-4 py-2 bg-background border-b border-border", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-4", children: /* @__PURE__ */ jsxs("h2", { className: "font-medium text-sm", children: [
        "Users (",
        numUsers,
        ")"
      ] }) }) }),
      /* @__PURE__ */ jsx(UserList, { view })
    ] }) }) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=users-cx3gIwey.mjs.map
