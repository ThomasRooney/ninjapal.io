import { jsxs, jsx } from 'react/jsx-runtime';
import { N as NavMain, c as cn, C as Card, a as CardHeader, b as CardTitle, d as CardDescription, e as CardContent, F as Form, f as FormField, g as FormItem, h as FormLabel, i as FormControl, I as Input, j as FormMessage, B as Button, k as createServerFn, l as createServerRpc, m as getSupabaseServerClient } from './ssr.mjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import 'better-auth/client/plugins';
import 'better-auth/react';
import 'node:fs';
import '@tanstack/history';
import 'jsesc';
import 'node:stream';
import 'isbot';
import 'react-dom/server';
import 'node:stream/web';

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(2, "Password must be at least 2 characters")
});
const loginFn_createServerFn_handler = createServerRpc("src_components_supabase-login_tsx--loginFn_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return loginFn.__executeServer(opts, signal);
});
const loginFn = createServerFn({
  method: "POST"
}).validator((d) => d).handler(loginFn_createServerFn_handler, async ({
  data
}) => {
  const supabase = getSupabaseServerClient();
  const {
    error
  } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password
  });
  if (error) {
    return {
      error: true,
      message: error.message
    };
  }
  return {
    error: false
  };
});
function SupabaseLoginForm({
  className,
  ...props
}) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const navigate = useNavigate();
  async function onSubmit(values) {
    try {
      const result = await loginFn({
        data: values
      });
      if (!result.error) {
        navigate({
          to: "/app"
        });
      } else {
        form.setError("root", {
          message: result.message || "Invalid email or password"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      form.setError("root", {
        message: "An error occurred during login. Please try again."
      });
    }
  }
  return /* @__PURE__ */ jsx("div", { className: cn("flex w-full flex-col gap-4", className), ...props, children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { className: "text-2xl", children: "Login" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Enter your email below to login to your account" })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      /* @__PURE__ */ jsx(Form, { ...form, children: /* @__PURE__ */ jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "flex flex-col gap-6", children: [
        /* @__PURE__ */ jsx(FormField, { control: form.control, name: "email", render: ({
          field
        }) => /* @__PURE__ */ jsxs(FormItem, { children: [
          /* @__PURE__ */ jsx(FormLabel, { children: "Email" }),
          /* @__PURE__ */ jsx(FormControl, { children: /* @__PURE__ */ jsx(Input, { placeholder: "m@example.com", type: "email", "data-testid": "login-email", ...field }) }),
          /* @__PURE__ */ jsx(FormMessage, {})
        ] }) }),
        /* @__PURE__ */ jsx(FormField, { control: form.control, name: "password", render: ({
          field
        }) => /* @__PURE__ */ jsxs(FormItem, { children: [
          /* @__PURE__ */ jsx(FormLabel, { children: "Password" }),
          /* @__PURE__ */ jsx(FormControl, { children: /* @__PURE__ */ jsx(Input, { type: "password", "data-testid": "login-password", ...field }) }),
          /* @__PURE__ */ jsx(FormMessage, {})
        ] }) }),
        form.formState.errors.root && /* @__PURE__ */ jsx("div", { className: "text-sm text-destructive", children: form.formState.errors.root.message }),
        /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full rounded", "data-testid": "login-submit", children: "Login" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "text-center text-sm pt-6", children: [
        "Don't have an account?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/auth/signup", className: "underline underline-offset-4", children: "Sign up" })
      ] })
    ] })
  ] }) });
}
const SplitComponent = function RouteComponent() {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col flex-grow h-screen w-full items-center justify-center", children: [
    /* @__PURE__ */ jsx(NavMain, { location: "auth" }),
    /* @__PURE__ */ jsx("div", { className: "w-full h-full flex flex-col items-center justify-center max-w-md", children: /* @__PURE__ */ jsx(SupabaseLoginForm, {}) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=login-QZmQUeke.mjs.map
