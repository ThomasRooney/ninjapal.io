import { jsxs, jsx } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { aA as cn, aB as Button } from './ssr.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardDescription, d as CardContent } from './card-Dfo2Z8fy.mjs';
import { F as Form, a as FormField, b as FormItem, c as FormLabel, d as FormControl, e as FormMessage } from './form-WgBv-VXs.mjs';
import { I as Input } from './input-DNyvLqac.mjs';
import { a as authClient } from './auth-client-DwKswVNB.mjs';
import { zodResolver } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@hookform/resolvers/zod/dist/zod.mjs';
import { useRouter, Link } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { useForm } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-hook-form/dist/index.esm.mjs';
import { z } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/zod/dist/esm/index.js';
import { N as NavMain } from './nav-main-C5AqUqsU.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/clsx/dist/clsx.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tailwind-merge/dist/bundle-mjs.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router-devtools/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-invariant/dist/esm/tiny-invariant.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-warning/dist/tiny-warning.cjs.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/router-core/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/cookie-es/dist/index.mjs';
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
import './label-DgvpRhnp.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-label/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/better-auth/dist/client/react/index.mjs';
import './badge-CW0w3Vc4.mjs';
import './select-CXG9DuyO.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-select/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import './logo-6qfVLBMy.mjs';

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});
function AuthLoginForm({
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
  const router = useRouter();
  async function onSubmit(values) {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password
    });
    if (error) {
      form.setError("root", {
        message: error.message || "Invalid email or password"
      });
      return;
    }
    await router.invalidate();
    await router.navigate({ to: "/app" });
  }
  return /* @__PURE__ */ jsx("div", { className: cn("flex w-full flex-col gap-4", className), ...props, children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { className: "text-2xl", children: "Login" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Enter your email below to login to your account" })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      /* @__PURE__ */ jsx(Form, { ...form, children: /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: form.handleSubmit(onSubmit),
          className: "flex flex-col gap-6",
          children: [
            /* @__PURE__ */ jsx(
              FormField,
              {
                control: form.control,
                name: "email",
                render: ({ field }) => /* @__PURE__ */ jsxs(FormItem, { children: [
                  /* @__PURE__ */ jsx(FormLabel, { children: "Email" }),
                  /* @__PURE__ */ jsx(FormControl, { children: /* @__PURE__ */ jsx(
                    Input,
                    {
                      placeholder: "m@example.com",
                      type: "email",
                      "data-testid": "login-email",
                      ...field
                    }
                  ) }),
                  /* @__PURE__ */ jsx(FormMessage, {})
                ] })
              }
            ),
            /* @__PURE__ */ jsx(
              FormField,
              {
                control: form.control,
                name: "password",
                render: ({ field }) => /* @__PURE__ */ jsxs(FormItem, { children: [
                  /* @__PURE__ */ jsx(FormLabel, { children: "Password" }),
                  /* @__PURE__ */ jsx(FormControl, { children: /* @__PURE__ */ jsx(
                    Input,
                    {
                      type: "password",
                      "data-testid": "login-password",
                      ...field
                    }
                  ) }),
                  /* @__PURE__ */ jsx(FormMessage, {})
                ] })
              }
            ),
            form.formState.errors.root && /* @__PURE__ */ jsx("div", { className: "text-sm text-destructive", children: form.formState.errors.root.message }),
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "submit",
                className: "w-full rounded",
                "data-testid": "login-submit",
                disabled: form.formState.isSubmitting,
                children: "Login"
              }
            )
          ]
        }
      ) }),
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
    /* @__PURE__ */ jsx("div", { className: "w-full h-full flex flex-col items-center justify-center max-w-md", children: /* @__PURE__ */ jsx(AuthLoginForm, {}) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=login-Dh4CQRQO.mjs.map
