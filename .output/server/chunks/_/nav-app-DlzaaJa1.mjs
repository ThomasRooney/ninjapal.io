import { jsxs, jsx } from 'react/jsx-runtime';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight } from 'lucide-react';
import { c as cn } from './ssr.mjs';
import { T as TooltipProvider, k as Tooltip, l as TooltipTrigger, n as SidebarTrigger, m as TooltipContent } from './sidebar-Cc3VdR9k.mjs';
import { Link } from '@tanstack/react-router';
import React__default from 'react';

function Breadcrumb({ ...props }) {
  return /* @__PURE__ */ jsx("nav", { "aria-label": "breadcrumb", "data-slot": "breadcrumb", ...props });
}
function BreadcrumbList({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "ol",
    {
      "data-slot": "breadcrumb-list",
      className: cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className
      ),
      ...props
    }
  );
}
function BreadcrumbItem({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "li",
    {
      "data-slot": "breadcrumb-item",
      className: cn("inline-flex items-center gap-1.5", className),
      ...props
    }
  );
}
function BreadcrumbLink({
  asChild,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "breadcrumb-link",
      className: cn("hover:text-foreground transition-colors", className),
      ...props
    }
  );
}
function BreadcrumbPage({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "span",
    {
      "data-slot": "breadcrumb-page",
      role: "link",
      "aria-disabled": "true",
      "aria-current": "page",
      tabIndex: 0,
      className: cn("text-foreground font-normal", className),
      ...props
    }
  );
}
function BreadcrumbSeparator({
  children,
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    "li",
    {
      "data-slot": "breadcrumb-separator",
      role: "presentation",
      "aria-hidden": "true",
      className: cn("[&>svg]:size-3.5", className),
      ...props,
      children: children != null ? children : /* @__PURE__ */ jsx(ChevronRight, {})
    }
  );
}
const NavApp = ({ title, breadcrumbs, children }) => {
  return /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center border-b border-gray-200 h-12 px-4 sticky top-0 bg-background z-10 shrink-0", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
        /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(SidebarTrigger, { className: "opacity-50 hover:opacity-100" }) }),
        /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsxs("p", { children: [
          "Toggle sidebar",
          " ",
          /* @__PURE__ */ jsx("kbd", { className: "ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-2 rounded border border-muted-foreground px-1 font-mono text-xs font-medium text-muted opacity-100 bg-muted-foreground", children: "\u2318 B" })
        ] }) })
      ] }) }),
      breadcrumbs ? /* @__PURE__ */ jsx(Breadcrumb, { children: /* @__PURE__ */ jsx(BreadcrumbList, { children: breadcrumbs.items.map((item, i) => /* @__PURE__ */ jsxs(React__default.Fragment, { children: [
        /* @__PURE__ */ jsx(BreadcrumbItem, { children: i === breadcrumbs.items.length - 1 ? /* @__PURE__ */ jsx(BreadcrumbPage, { children: item.label }) : /* @__PURE__ */ jsx(BreadcrumbLink, { asChild: true, children: /* @__PURE__ */ jsx(Link, { to: item.href, children: item.label }) }) }),
        i < breadcrumbs.items.length - 1 && /* @__PURE__ */ jsx(BreadcrumbSeparator, { children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }) })
      ] }, `${item.label}-${item.href || "current"}`)) }) }) : /* @__PURE__ */ jsx(
        "h2",
        {
          className: "font-medium text-sm",
          "data-testid": "ninja-connection--page-title",
          children: title
        }
      )
    ] }),
    children || /* @__PURE__ */ jsx("div", {})
  ] });
};

export { NavApp as N };
//# sourceMappingURL=nav-app-DlzaaJa1.mjs.map
