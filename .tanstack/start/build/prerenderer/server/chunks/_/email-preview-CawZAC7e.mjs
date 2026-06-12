import { jsxs, jsx, Fragment } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { N as NavApp } from './nav-app-BB_Rsu4o.mjs';
import { aB as Button, aA as cn } from './ssr.mjs';
import { I as Input } from './input-DNyvLqac.mjs';
import { L as Label } from './label-DgvpRhnp.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-CXG9DuyO.mjs';
import { Check, CircleAlert } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { useState } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { toast } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/sonner/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
import './sidebar-BbScpU58.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-dialog/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-tooltip/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/clsx/dist/clsx.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tailwind-merge/dist/bundle-mjs.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router-devtools/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-invariant/dist/esm/tiny-invariant.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/tiny-warning/dist/tiny-warning.cjs.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/router-core/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/cookie-es/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/zod/dist/esm/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/drizzle-orm/postgres-js/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/postgres/src/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/drizzle-orm/pg-core/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@faker-js/faker/dist/index.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/zero/src/pg.js';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@react-email/render/dist/node/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/resend/dist/index.mjs';
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
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-label/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-select/dist/index.mjs';

function Textarea({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "textarea",
    {
      "data-slot": "textarea",
      className: cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ...props
    }
  );
}
async function sendEmail({
  to,
  subject,
  templateName,
  data
}) {
  try {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to,
        subject,
        templateName,
        data
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || "Failed to send email"
      };
    }
    const result = await response.json();
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email"
    };
  }
}
const SplitComponent = function EmailPreview() {
  const [templateName, setTemplateName] = useState("welcome");
  const [welcomeData, setWelcomeData] = useState({
    username: "User",
    verifyUrl: "https://example.com/verify"
  });
  const [notificationData, setNotificationData] = useState({
    username: "User",
    message: "This is a notification message.",
    actionUrl: "https://example.com/action",
    actionText: "Click here"
  });
  const [emailState, setEmailState] = useState({
    to: "",
    subject: "",
    loading: false,
    success: false,
    error: ""
  });
  const getCurrentTemplateData = () => {
    return templateName === "welcome" ? welcomeData : notificationData;
  };
  const handleSendEmail = async () => {
    setEmailState((prev) => ({
      ...prev,
      loading: true,
      success: false,
      error: ""
    }));
    try {
      const result = await sendEmail({
        to: emailState.to,
        subject: emailState.subject,
        templateName,
        data: getCurrentTemplateData()
      });
      if (result.success) {
        setEmailState((prev) => ({
          ...prev,
          loading: false,
          success: true
        }));
        toast.success("Email sent successfully!");
      } else {
        setEmailState((prev) => ({
          ...prev,
          loading: false,
          error: result.error || "Failed to send email"
        }));
        toast.error(result.error || "Failed to send email");
      }
    } catch (error) {
      setEmailState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to send email"
      }));
      toast.error("Failed to send email");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Email Preview & Testing" }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow p-4", children: /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-8", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 max-w-2xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "border rounded-lg bg-background p-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-base font-medium mb-2", children: "Email Configuration" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mb-4", children: "Configure and send a test email" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "recipient", children: "Recipient Email" }),
            /* @__PURE__ */ jsx(Input, { id: "recipient", placeholder: "recipient@example.com", value: emailState.to, onChange: (e) => setEmailState((prev) => ({
              ...prev,
              to: e.target.value
            })) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "subject", children: "Subject" }),
            /* @__PURE__ */ jsx(Input, { id: "subject", placeholder: "Welcome to our platform", value: emailState.subject, onChange: (e) => setEmailState((prev) => ({
              ...prev,
              subject: e.target.value
            })) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "template", children: "Email Template" }),
            /* @__PURE__ */ jsxs(Select, { value: templateName, onValueChange: (value) => setTemplateName(value), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { id: "template", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select a template" }) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "welcome", children: "Welcome Email" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "notification", children: "Notification" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "pt-4", children: /* @__PURE__ */ jsx(Button, { onClick: handleSendEmail, variant: "default", disabled: emailState.loading || !emailState.to || !emailState.subject, className: "w-full rounded", children: emailState.loading ? "Sending..." : "Send Test Email" }) }),
          emailState.success && /* @__PURE__ */ jsxs("div", { className: "flex items-center text-green-500 mt-2", children: [
            /* @__PURE__ */ jsx(Check, { size: 16, className: "mr-1" }),
            /* @__PURE__ */ jsx("span", { children: "Email sent successfully!" })
          ] }),
          emailState.error && /* @__PURE__ */ jsxs("div", { className: "flex items-center text-red-500 mt-2", children: [
            /* @__PURE__ */ jsx(CircleAlert, { size: 16, className: "mr-1" }),
            /* @__PURE__ */ jsx("span", { children: emailState.error })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "border rounded-lg bg-background p-4", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-base font-medium mb-2", children: "Template Data" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mb-4", children: "Customize the data that will be used to render the selected template" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          templateName === "welcome" && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "username", children: "Username" }),
              /* @__PURE__ */ jsx(Input, { id: "username", value: welcomeData.username, onChange: (e) => setWelcomeData((prev) => ({
                ...prev,
                username: e.target.value
              })) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "verifyUrl", children: "Verification URL" }),
              /* @__PURE__ */ jsx(Input, { id: "verifyUrl", value: welcomeData.verifyUrl, onChange: (e) => setWelcomeData((prev) => ({
                ...prev,
                verifyUrl: e.target.value
              })) })
            ] })
          ] }),
          templateName === "notification" && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "username", children: "Username" }),
              /* @__PURE__ */ jsx(Input, { id: "username", value: notificationData.username, onChange: (e) => setNotificationData((prev) => ({
                ...prev,
                username: e.target.value
              })) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "message", children: "Message" }),
              /* @__PURE__ */ jsx(Textarea, { id: "message", value: notificationData.message, onChange: (e) => setNotificationData((prev) => ({
                ...prev,
                message: e.target.value
              })), rows: 4 })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "actionUrl", children: "Action URL (optional)" }),
              /* @__PURE__ */ jsx(Input, { id: "actionUrl", value: notificationData.actionUrl || "", onChange: (e) => setNotificationData((prev) => ({
                ...prev,
                actionUrl: e.target.value
              })) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "actionText", children: "Action Text (optional)" }),
              /* @__PURE__ */ jsx(Input, { id: "actionText", value: notificationData.actionText || "", onChange: (e) => setNotificationData((prev) => ({
                ...prev,
                actionText: e.target.value
              })) })
            ] })
          ] })
        ] })
      ] })
    ] }) }) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=email-preview-CawZAC7e.mjs.map
