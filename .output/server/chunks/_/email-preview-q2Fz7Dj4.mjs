import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
import { p as Label, I as Input, S as Select, q as SelectTrigger, r as SelectValue, s as SelectContent, t as SelectItem, B as Button } from './ssr.mjs';
import { T as Textarea } from './textarea-BwlHZp3V.mjs';
import { Check, CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col h-full overflow-y-auto", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Email Preview & Testing" }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow overflow-y-auto p-4", children: /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-8", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 max-w-2xl", children: [
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
//# sourceMappingURL=email-preview-q2Fz7Dj4.mjs.map
