import { jsxs, jsx } from 'react/jsx-runtime';
import { T as TsServerAction, p as Label, I as Input, B as Button, S as Select, q as SelectTrigger, r as SelectValue, s as SelectContent, t as SelectItem } from './ssr.mjs';
import { useForm } from '@tanstack/react-form';
import { T as Textarea } from './textarea-BwlHZp3V.mjs';
import { z } from 'zod';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
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
import 'node:fs';
import '@tanstack/history';
import 'jsesc';
import 'node:stream';
import 'isbot';
import 'react-dom/server';
import 'node:stream/web';
import './sidebar-Cc3VdR9k.mjs';
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';

function FieldError$1({ error }) {
  return error ? /* @__PURE__ */ jsx("p", { className: "text-red-500 text-sm mt-1", children: error }) : null;
}
function FormAddress() {
  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: ""
      },
      phone: ""
    },
    validators: {
      onChangeAsyncDebounceMs: 500,
      onChange: ({ value }) => {
        if (value.fullName.trim().length === 0) ;
        return void 0;
      }
    },
    onSubmit: ({ value }) => {
      console.log(value);
      alert("Form submitted successfully!");
    }
  });
  return /* @__PURE__ */ jsx("div", { className: "container", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col border m-4 bg-background", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-semibold text-sm", children: "Address Form" }) }),
    /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs(
      "form",
      {
        onSubmit: (e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        },
        className: "space-y-6",
        children: [
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "fullName",
              validators: {
                onChange: ({ value }) => !value || value.trim().length === 0 ? "Full name is required" : void 0
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Full Name" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: field.name,
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: (e) => field.handleChange(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "email",
              validators: {
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return "Email is required";
                  }
                  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                    return "Invalid email address";
                  }
                  return void 0;
                }
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Email" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: field.name,
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: (e) => field.handleChange(e.target.value),
                    type: "email"
                  }
                ),
                /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "address.street",
              validators: {
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return "Street address is required";
                  }
                  return void 0;
                }
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Street Address" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: field.name,
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: (e) => field.handleChange(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
              ] })
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsx(
              form.Field,
              {
                name: "address.city",
                validators: {
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return "City is required";
                    }
                    return void 0;
                  }
                },
                children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "City" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      id: field.name,
                      name: field.name,
                      value: field.state.value,
                      onBlur: field.handleBlur,
                      onChange: (e) => field.handleChange(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
                ] })
              }
            ),
            /* @__PURE__ */ jsx(
              form.Field,
              {
                name: "address.state",
                validators: {
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return "State is required";
                    }
                    return void 0;
                  }
                },
                children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "State" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      id: field.name,
                      name: field.name,
                      value: field.state.value,
                      onBlur: field.handleBlur,
                      onChange: (e) => field.handleChange(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
                ] })
              }
            ),
            /* @__PURE__ */ jsx(
              form.Field,
              {
                name: "address.zipCode",
                validators: {
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return "Zip code is required";
                    }
                    if (!/^\d{5}(-\d{4})?$/.test(value)) {
                      return "Invalid zip code format";
                    }
                    return void 0;
                  }
                },
                children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Zip Code" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      id: field.name,
                      name: field.name,
                      value: field.state.value,
                      onBlur: field.handleBlur,
                      onChange: (e) => field.handleChange(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "address.country",
              validators: {
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return "Country is required";
                  }
                  return void 0;
                }
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Country" }),
                /* @__PURE__ */ jsxs(
                  Select,
                  {
                    value: field.state.value,
                    onValueChange: (value) => field.handleChange(value),
                    name: field.name,
                    children: [
                      /* @__PURE__ */ jsx(SelectTrigger, { id: field.name, className: "w-full", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select a country" }) }),
                      /* @__PURE__ */ jsxs(SelectContent, { children: [
                        /* @__PURE__ */ jsx(SelectItem, { value: "US", children: "United States" }),
                        /* @__PURE__ */ jsx(SelectItem, { value: "CA", children: "Canada" }),
                        /* @__PURE__ */ jsx(SelectItem, { value: "UK", children: "United Kingdom" }),
                        /* @__PURE__ */ jsx(SelectItem, { value: "AU", children: "Australia" }),
                        /* @__PURE__ */ jsx(SelectItem, { value: "DE", children: "Germany" }),
                        /* @__PURE__ */ jsx(SelectItem, { value: "FR", children: "France" }),
                        /* @__PURE__ */ jsx(SelectItem, { value: "JP", children: "Japan" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "phone",
              validators: {
                onChange: ({ value }) => {
                  if (!value || value.trim().length === 0) {
                    return "Phone number is required";
                  }
                  if (!/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(value)) {
                    return "Invalid phone number format (e.g., 123-456-7890)";
                  }
                  return void 0;
                }
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Phone" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: field.name,
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: (e) => field.handleChange(e.target.value),
                    placeholder: "123-456-7890",
                    type: "tel"
                  }
                ),
                /* @__PURE__ */ jsx(FieldError$1, { error: field.state.meta.errors.join(", ") })
              ] })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(
            form.Subscribe,
            {
              selector: (state) => [state.canSubmit, state.isSubmitting],
              children: ([canSubmit, isSubmitting]) => /* @__PURE__ */ jsx(
                Button,
                {
                  type: "submit",
                  size: "sm",
                  disabled: !canSubmit || isSubmitting,
                  children: isSubmitting ? "Submitting..." : "Submit"
                }
              )
            }
          ) })
        ]
      }
    ) })
  ] }) });
}
const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required")
});
function FieldError({ error }) {
  return error ? /* @__PURE__ */ jsx("p", { className: "text-red-500 text-sm mt-1", children: error }) : null;
}
function FormSimple() {
  const form = useForm({
    defaultValues: {
      title: "",
      description: ""
    },
    onSubmit: ({ value }) => {
      console.log(value);
      alert("Form submitted successfully!");
    }
  });
  return /* @__PURE__ */ jsx("div", { className: "container", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col border m-4 bg-background", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-semibold text-sm", children: "Simple Form" }) }),
    /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs(
      "form",
      {
        onSubmit: (e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        },
        className: "space-y-6",
        children: [
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "title",
              validators: {
                onChange: ({ value }) => {
                  const result = schema.shape.title.safeParse(value);
                  return result.success ? void 0 : result.error.errors[0].message;
                }
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Title" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: field.name,
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: (e) => field.handleChange(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsx(FieldError, { error: field.state.meta.errors[0] })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            form.Field,
            {
              name: "description",
              validators: {
                onChange: ({ value }) => {
                  const result = schema.shape.description.safeParse(value);
                  return result.success ? void 0 : result.error.errors[0].message;
                }
              },
              children: (field) => /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: field.name, children: "Description" }),
                /* @__PURE__ */ jsx(
                  Textarea,
                  {
                    id: field.name,
                    name: field.name,
                    value: field.state.value,
                    onBlur: field.handleBlur,
                    onChange: (e) => field.handleChange(e.target.value)
                  }
                ),
                /* @__PURE__ */ jsx(FieldError, { error: field.state.meta.errors[0] })
              ] })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(
            form.Subscribe,
            {
              selector: (state) => [state.canSubmit, state.isSubmitting],
              children: ([canSubmit, isSubmitting]) => /* @__PURE__ */ jsx(
                Button,
                {
                  type: "submit",
                  size: "sm",
                  disabled: !canSubmit || isSubmitting,
                  children: isSubmitting ? "Submitting..." : "Submit"
                }
              )
            }
          ) })
        ]
      }
    ) })
  ] }) });
}
const SplitComponent = function RouteComponent() {
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col h-full overflow-y-auto", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Tanstack Examples" }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-8", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 max-w-2xl", children: [
      /* @__PURE__ */ jsx(FormSimple, {}),
      /* @__PURE__ */ jsx(FormAddress, {}),
      /* @__PURE__ */ jsx(TsServerAction, {})
    ] }) }) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=tanstack-examples-Dy6eQvUi.mjs.map
