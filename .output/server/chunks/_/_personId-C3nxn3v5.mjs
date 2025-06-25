import { jsx, jsxs } from 'react/jsx-runtime';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
import { D as Route$1, B as Button } from './ssr.mjs';
import { u as useRapidFire } from './use-rapid-fire-C65CPGm5.mjs';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { useRouter } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';
import '@radix-ui/react-slot';
import './sidebar-Cc3VdR9k.mjs';
import 'class-variance-authority';
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';
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

const SplitComponent = function PersonComponent() {
  var _a;
  const {
    personId
  } = Route$1.useParams();
  const z = useZero();
  const router = useRouter();
  const [persons] = useQuery(z.query.persons.orderBy("name", "asc"));
  const currentIndex = (_a = persons == null ? void 0 : persons.findIndex((p) => p.id === personId)) != null ? _a : -1;
  const person = persons == null ? void 0 : persons[currentIndex];
  const goToNext = useCallback(() => {
    if (!(persons == null ? void 0 : persons.length)) return;
    const nextIndex = (currentIndex + 1) % persons.length;
    const nextPerson = persons[nextIndex];
    router.navigate({
      to: "/app/$personId",
      params: {
        personId: nextPerson.id
      },
      replace: true
      // Use replace to avoid building up history
    });
  }, [currentIndex, persons, router]);
  const goToPrev = useCallback(() => {
    if (!(persons == null ? void 0 : persons.length)) return;
    const prevIndex = (currentIndex - 1 + persons.length) % persons.length;
    const prevPerson = persons[prevIndex];
    router.navigate({
      to: "/app/$personId",
      params: {
        personId: prevPerson.id
      },
      replace: true
      // Use replace to avoid building up history
    });
  }, [currentIndex, persons, router]);
  const nextButtonHandlers = useRapidFire(goToNext, 100);
  const prevButtonHandlers = useRapidFire(goToPrev, 100);
  if (!person) {
    return /* @__PURE__ */ jsx("div", { className: "p-4", children: "Person not found" });
  }
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col h-full overflow-y-auto", children: [
    /* @__PURE__ */ jsx(NavApp, { breadcrumbs: {
      items: [{
        label: "Zero Mutators",
        href: "/app"
      }, {
        label: person.name
      }]
    }, children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "icon", disabled: !(persons == null ? void 0 : persons.length), ...prevButtonHandlers, children: [
        /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Previous person" })
      ] }),
      /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "icon", disabled: !(persons == null ? void 0 : persons.length), ...nextButtonHandlers, children: [
        /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Next person" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold mb-4", children: person.name }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        "ID: ",
        person.id
      ] })
    ] })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=_personId-C3nxn3v5.mjs.map
