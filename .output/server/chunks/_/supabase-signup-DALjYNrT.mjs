import { jsx, jsxs } from 'react/jsx-runtime';
import { c as cn, C as Card, a as CardHeader, b as CardTitle, d as CardDescription, e as CardContent, F as Form, f as FormField, g as FormItem, h as FormLabel, i as FormControl, I as Input, j as FormMessage, B as Button } from './ssr.mjs';
import { g as getSupabaseBrowserClient } from './supabase-client-V5KmjbJ_.mjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(2, "Password must be at least 2 characters")
});
function SupabaseSignupForm({
  className,
  ...props
}) {
  useNavigate();
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  async function onSubmit(values) {
    setStatus("pending");
    setErrorMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error, data } = await supabase.auth.signUp({
        email: values.email,
        password: values.password
      });
      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }
      setStatus("success");
      setSuccessMessage("Check your email for the confirmation link.");
    } catch (error) {
      console.error("Signup error:", error);
      setStatus("error");
      setErrorMessage("An error occurred during signup. Please try again.");
    }
  }
  return /* @__PURE__ */ jsx("div", { className: cn("flex w-full flex-col gap-4", className), ...props, children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { className: "text-2xl", children: "Sign Up" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Create an account to get started" })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      successMessage ? /* @__PURE__ */ jsx("div", { className: "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-4 rounded-md mb-4", children: successMessage }) : /* @__PURE__ */ jsx(Form, { ...form, children: /* @__PURE__ */ jsxs(
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
            errorMessage && /* @__PURE__ */ jsx("div", { className: "text-sm text-destructive", children: errorMessage }),
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "submit",
                className: "w-full rounded",
                "data-testid": "signup-submit",
                disabled: status === "pending",
                children: status === "pending" ? "Signing up..." : "Sign Up"
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

export { SupabaseSignupForm as S };
//# sourceMappingURL=supabase-signup-DALjYNrT.mjs.map
