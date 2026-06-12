import { jsx, jsxs } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { aA as cn, aB as Button } from './ssr.mjs';
import { C as Card, a as CardHeader, b as CardTitle, c as CardDescription, d as CardContent } from './card-Dfo2Z8fy.mjs';
import { F as Form, a as FormField, b as FormItem, c as FormLabel, d as FormControl, e as FormMessage } from './form-WgBv-VXs.mjs';
import { I as Input } from './input-DNyvLqac.mjs';
import { a as authClient } from './auth-client-DwKswVNB.mjs';
import { zodResolver } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@hookform/resolvers/zod/dist/zod.mjs';
import { useRouter, Link } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { useForm } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react-hook-form/dist/index.esm.mjs';
import { z } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/zod/dist/esm/index.js';

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});
function AuthSignupForm({
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
    const { error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.email.split("@")[0]
    });
    if (error) {
      form.setError("root", {
        message: error.message || "An error occurred during signup"
      });
      return;
    }
    await router.invalidate();
    await router.navigate({ to: "/app" });
  }
  return /* @__PURE__ */ jsx("div", { className: cn("flex w-full flex-col gap-4", className), ...props, children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { className: "text-2xl", children: "Sign Up" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Create an account to get started" })
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
                      "data-testid": "signup-email",
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
                      "data-testid": "signup-password",
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
                "data-testid": "signup-submit",
                disabled: form.formState.isSubmitting,
                children: "Sign Up"
              }
            )
          ]
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { className: "text-center text-sm pt-6", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/auth/login", className: "underline underline-offset-4", children: "Login" })
      ] })
    ] })
  ] }) });
}

export { AuthSignupForm as A };
//# sourceMappingURL=auth-signup-form-Bgcp6D8O.mjs.map
