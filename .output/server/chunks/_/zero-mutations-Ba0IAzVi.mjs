import { jsxs, jsx } from 'react/jsx-runtime';
import { B as Button, c as cn } from './ssr.mjs';
import { useNavigate, Link } from '@tanstack/react-router';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
import { T as TooltipProvider, k as Tooltip, l as TooltipTrigger, m as TooltipContent } from './sidebar-Cc3VdR9k.mjs';
import { u as useRapidFire } from './use-rapid-fire-C65CPGm5.mjs';
import { faker } from '@faker-js/faker';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { Table, FileJson2, Plus, ListX, X } from 'lucide-react';
import { useState, useCallback } from 'react';
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
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';

function MouseDownLink({
  children,
  className,
  ...linkOpts
  // to, params, search, hash, state, etc.
}) {
  const navigate = useNavigate();
  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    e.preventDefault();
    navigate(linkOpts);
  };
  return /* @__PURE__ */ jsx(Link, { ...linkOpts, className: cn(className), onMouseDown: handleMouseDown, children });
}
function PersonList({
  view
}) {
  const z = useZero();
  const [persons] = useQuery(z.query.persons);
  if (view === "json") {
    return /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-background min-w-[300px]", children: /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsx("pre", { className: "text-xs text-left", children: JSON.stringify(persons, null, 2) }) }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-background min-w-[300px]", children: [
    /* @__PURE__ */ jsx("div", { children: persons == null ? void 0 : persons.map((person) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between hover:bg-secondary/40 group", children: [
      /* @__PURE__ */ jsxs(MouseDownLink, { to: "/app/$personId", params: {
        personId: person.id
      }, className: "flex grow items-center pl-4 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium text-sm text-stone-700 group-hover:text-stone-950", children: person.name }),
          person.email && /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: person.email })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 ml-auto mr-4", children: /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground w-auto", children: person.id }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pr-2 flex items-center", children: /* @__PURE__ */ jsx(Button, { onClick: () => z.mutate.persons.delete({
        id: person.id
      }), variant: "ghost", size: "xs", className: "opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" }) }) })
    ] }, person.id)) }),
    (persons == null ? void 0 : persons.length) === 0 && /* @__PURE__ */ jsx("div", { className: "flex items-center h-full px-4 py-3.5", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No one's here yet" }) })
  ] });
}
const SplitComponent = function RouteComponent() {
  var _a;
  const z = useZero();
  const [persons] = useQuery(z.query.persons);
  const [view, setView] = useState("table");
  const numPersons = (_a = persons == null ? void 0 : persons.length) != null ? _a : 0;
  const addPerson = useCallback(() => {
    z.mutate.persons.insert({
      id: crypto.randomUUID(),
      name: faker.person.fullName(),
      email: faker.internet.email()
    });
  }, [z.mutate.persons]);
  const clearAll = useCallback(() => {
    if (persons && persons.length > 0) {
      const ids = persons.map((p) => p.id);
      z.mutate.persons.deleteMany({
        ids
      });
    }
  }, [persons, z.mutate.persons]);
  const rapidAddHandlers = useRapidFire(addPerson);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full overflow-y-auto w-full", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Zero Mutations", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
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
      /* @__PURE__ */ jsxs("div", { className: "sticky top-0 flex items-center gap-2 w-full justify-between px-4 py-2 bg-background border-b border-border", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-4", children: /* @__PURE__ */ jsxs("h2", { className: "font-medium text-sm", children: [
          "Persons (",
          numPersons,
          ")"
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { delayDuration: 500, children: [
            /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "xs", ...rapidAddHandlers, children: /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }) }) }),
            /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: "Hold to rapidly add people" }) })
          ] }) }),
          /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { delayDuration: 500, children: [
            /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { size: "xs", variant: "ghost", onClick: clearAll, children: /* @__PURE__ */ jsx(ListX, { className: "w-4 h-4" }) }) }),
            /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: "Clear all people" }) })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(PersonList, { view })
    ] }) }) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=zero-mutations-Ba0IAzVi.mjs.map
