import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { B as Button, k as createServerFn, l as createServerRpc } from './ssr.mjs';
import { D as Dialog, d as DialogTrigger, a as DialogContent, b as DialogHeader, c as DialogTitle, e as DialogDescription, f as DialogFooter } from './dialog-DMacpTK8.mjs';
import { T as TooltipProvider, k as Tooltip, l as TooltipTrigger, m as TooltipContent } from './sidebar-Cc3VdR9k.mjs';
import { g as getSupabaseBrowserClient } from './supabase-client-V5KmjbJ_.mjs';
import { useZero, useQuery } from '@rocicorp/zero/react';
import { BugIcon, CheckCircle2, XCircle, RefreshCw, LogOutIcon, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { N as NavApp } from './nav-app-DlzaaJa1.mjs';
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

function base64UrlDecode(inputStr) {
  let base64 = inputStr.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    return atob(base64);
  } catch (e) {
    console.error("Base64Url decode failed:", e);
    return "";
  }
}
function formatTimeUntilExpiration(exp) {
  const now = Math.floor(Date.now() / 1e3);
  const diff = exp - now;
  if (diff <= 0) return "Expired";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor(diff % 3600 / 60)}m`;
}
function AccountDebug() {
  var _a, _b, _c;
  const z = useZero();
  const supabase = getSupabaseBrowserClient();
  const [zeroUsers] = useQuery(z.query.users);
  const [jwt, setJwt] = useState(null);
  const [decodedHeader, setDecodedHeader] = useState(null);
  const [decodedPayload, setDecodedPayload] = useState(null);
  const [jwksData, setJwksData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({});
  const [tokenExpiration, setTokenExpiration] = useState("Unknown");
  const [zeroStatusData, setZeroStatusData] = useState(
    null
  );
  const [idSyncStatus, setIdSyncStatus] = useState({ match: false });
  const fetchToken = useCallback(async () => {
    var _a2;
    setIsLoading(true);
    try {
      const startTime = performance.now();
      const { data, error } = await supabase.auth.getSession();
      const endTime = performance.now();
      setNetworkInfo({
        status: error ? 400 : 200,
        time: Math.floor(endTime - startTime),
        size: data ? JSON.stringify(data).length : 0
      });
      if (error) {
        console.error("Error getting Supabase session:", error);
        setJwt(null);
        return;
      }
      if ((_a2 = data.session) == null ? void 0 : _a2.access_token) {
        setJwt(data.session.access_token);
      } else {
        setJwt(null);
      }
    } catch (err) {
      console.error("Error fetching JWT:", err);
      setJwt(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);
  const fetchJwks = useCallback(async () => {
    try {
      setJwksData({
        keys: [
          {
            kid: "supabase-jwt-key",
            alg: "HS256",
            description: "JWT signature key managed by Supabase Auth"
          }
        ]
      });
    } catch (err) {
      console.error("Error with JWKS info:", err);
      setJwksData(null);
    }
  }, []);
  const fetchSession = useCallback(async () => {
    var _a2, _b2, _c2, _d, _e, _f, _g;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        setSessionData(null);
        setAllSessions([]);
        return;
      }
      const supaSession = data.session;
      if (supaSession) {
        const formattedSession = {
          user: {
            id: (_a2 = supaSession.user) == null ? void 0 : _a2.id,
            email: ((_b2 = supaSession.user) == null ? void 0 : _b2.email) || void 0,
            name: (_d = (_c2 = supaSession.user) == null ? void 0 : _c2.user_metadata) == null ? void 0 : _d.name,
            emailVerified: !!((_e = supaSession.user) == null ? void 0 : _e.email_confirmed_at)
          },
          provider: (_g = (_f = supaSession.user) == null ? void 0 : _f.app_metadata) == null ? void 0 : _g.provider,
          expiresAt: supaSession.expires_at
        };
        setSessionData(formattedSession);
        const formattedSessions = [
          {
            id: supaSession.id,
            userAgent: navigator.userAgent,
            ipAddress: "Not available in client",
            // Supabase doesn't expose this client-side
            expiresAt: supaSession.expires_at,
            createdAt: supaSession.created_at,
            updatedAt: supaSession.last_sign_in_at,
            current: true
          }
        ];
        setAllSessions(formattedSessions);
      } else {
        setSessionData(null);
        setAllSessions([]);
      }
    } catch (err) {
      console.error("Error fetching session:", err);
      setSessionData(null);
      setAllSessions([]);
    }
  }, [supabase]);
  const fetchZeroStatus = useCallback(() => {
    if (!z) {
      setZeroStatusData(null);
      return;
    }
    try {
      const status = {
        isInitialized: z != null,
        userID: (z == null ? void 0 : z.userID) || "unknown",
        userMode: (z == null ? void 0 : z.userID) === "guest" ? "Guest Mode" : "Authenticated",
        mutatorNames: Object.keys((z == null ? void 0 : z.mutate) || {}),
        isAuthenticated: (z == null ? void 0 : z.userID) !== "guest"
      };
      setZeroStatusData(status);
    } catch (err) {
      console.error("Error getting Zero status:", err);
      setZeroStatusData(null);
    }
  }, [z]);
  useEffect(() => {
    var _a2;
    const authId = (_a2 = sessionData == null ? void 0 : sessionData.user) == null ? void 0 : _a2.id;
    const zeroId = zeroStatusData == null ? void 0 : zeroStatusData.userID;
    const userExistsInZero = authId ? zeroUsers == null ? void 0 : zeroUsers.some((user) => user.id === authId) : false;
    if (authId && zeroId) {
      setIdSyncStatus({
        match: authId === zeroId && userExistsInZero,
        authId,
        zeroId,
        userExistsInZero
      });
    } else {
      setIdSyncStatus({ match: false });
    }
  }, [sessionData, zeroStatusData, zeroUsers]);
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
      }
      await fetchSession();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchSession]);
  const fetchAllData = useCallback(() => {
    fetchToken();
    fetchJwks();
    fetchSession();
    fetchZeroStatus();
  }, [fetchToken, fetchJwks, fetchSession, fetchZeroStatus]);
  useEffect(() => {
    if (jwt) {
      try {
        const headerBase64Url = jwt.split(".")[0];
        if (headerBase64Url) {
          const decodedJson = base64UrlDecode(headerBase64Url);
          setDecodedHeader(JSON.parse(decodedJson));
        } else {
          setDecodedHeader(null);
        }
        const payloadBase64Url = jwt.split(".")[1];
        if (payloadBase64Url) {
          const decodedJson = base64UrlDecode(payloadBase64Url);
          const payload = JSON.parse(decodedJson);
          setDecodedPayload(payload);
          if (payload.exp) {
            setTokenExpiration(formatTimeUntilExpiration(payload.exp));
            const interval = setInterval(() => {
              setTokenExpiration(formatTimeUntilExpiration(payload.exp));
            }, 1e3);
            return () => clearInterval(interval);
          }
        } else {
          setDecodedPayload(null);
        }
      } catch (err) {
        console.error("Error decoding JWT:", err);
        setDecodedHeader(null);
        setDecodedPayload({ error: "Failed to decode payload" });
      }
    } else {
      setDecodedHeader(null);
      setDecodedPayload(null);
    }
  }, [jwt]);
  return /* @__PURE__ */ jsxs(
    Dialog,
    {
      onOpenChange: (open) => {
        if (open) {
          fetchAllData();
        }
      },
      children: [
        /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "xs", className: "px-2", children: [
          /* @__PURE__ */ jsx(BugIcon, { className: "h-4 w-4" }),
          "Debug"
        ] }) }),
        /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[700px]", children: [
          /* @__PURE__ */ jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsx(DialogTitle, { children: "Debug Account" }),
            /* @__PURE__ */ jsx(DialogDescription, { children: "View debug information about your account, JWT, and Zero sync status." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-8 py-4 max-h-[600px] overflow-y-auto", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background shadow rounded", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Session Info" }),
                /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-blue-50/50 text-blue-800 rounded border border-blue-200 dark:bg-blue-950/40 dark:text-blue-50 dark:border-blue-900 text-sm", children: "Supabase Auth" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "User ID" }),
                    idSyncStatus.authId && /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
                      /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: idSyncStatus.match ? /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 text-green-500" }) : /* @__PURE__ */ jsx(XCircle, { className: "w-4 h-4 text-red-500" }) }),
                      /* @__PURE__ */ jsx(TooltipContent, { side: "right", children: /* @__PURE__ */ jsx("p", { className: "text-xs max-w-[225px]", children: idSyncStatus.match ? "User exists in Zero DB and IDs match" : idSyncStatus.userExistsInZero === false ? "User not found in Zero database" : "Auth ID and Zero ID are not synchronized" }) })
                    ] }) })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: ((_a = sessionData == null ? void 0 : sessionData.user) == null ? void 0 : _a.id) || "Not signed in" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Email" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: ((_b = sessionData == null ? void 0 : sessionData.user) == null ? void 0 : _b.email) || "N/A" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Provider" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: (sessionData == null ? void 0 : sessionData.provider) || "N/A" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Token Expires" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: tokenExpiration })
                ] })
              ] }) })
            ] }),
            allSessions && allSessions.length > 0 && /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background shadow rounded", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: [
                /* @__PURE__ */ jsxs("h2", { className: "font-medium text-sm", children: [
                  "Active Sessions (",
                  allSessions.length,
                  ")"
                ] }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: signOut,
                    disabled: isLoading,
                    className: "text-xs",
                    children: isLoading ? "..." : "Sign Out"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: allSessions.map((session, index) => /* @__PURE__ */ jsx(
                "div",
                {
                  className: "flex justify-between items-center p-2 rounded-md border bg-muted/20",
                  children: /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                      session.current && /* @__PURE__ */ jsx("span", { className: "px-1.5 py-0.5 bg-green-50/70 text-green-800 rounded text-xs", children: "Current" }),
                      /* @__PURE__ */ jsx("span", { className: "text-xs truncate max-w-[250px]", children: session.userAgent || "Unknown device" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [
                      /* @__PURE__ */ jsxs("span", { children: [
                        "Created:",
                        " ",
                        new Date(session.createdAt || "").toLocaleString()
                      ] }),
                      session.ipAddress && /* @__PURE__ */ jsxs("span", { className: "ml-3", children: [
                        "IP: ",
                        session.ipAddress
                      ] })
                    ] })
                  ] })
                },
                session.id || `session-${index}`
              )) }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background shadow rounded", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Zero Sync Status" }),
                /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-pink-50/50 text-pink-800 rounded border border-pink-200 dark:bg-pink-950/40 dark:text-pink-50 dark:border-pink-900 text-sm", children: "Zero" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Zero User ID" }),
                    idSyncStatus.zeroId && /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
                      /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: idSyncStatus.match ? /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 text-green-500" }) : /* @__PURE__ */ jsx(XCircle, { className: "w-5 h-5 text-red-500" }) }),
                      /* @__PURE__ */ jsx(TooltipContent, { side: "right", children: /* @__PURE__ */ jsx("p", { className: "text-xs max-w-[225px]", children: idSyncStatus.match ? "User exists in Zero DB and IDs match" : idSyncStatus.userExistsInZero === false ? "User not found in Zero database" : "Zero ID and Auth ID are not synchronized" }) })
                    ] }) })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: (zeroStatusData == null ? void 0 : zeroStatusData.userID) || "N/A" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Initialized" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: (zeroStatusData == null ? void 0 : zeroStatusData.isInitialized) ? "Yes" : "No" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Available Mutators" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: ((_c = zeroStatusData == null ? void 0 : zeroStatusData.mutatorNames) == null ? void 0 : _c.join(", ")) || "None" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "User Mode" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: (zeroStatusData == null ? void 0 : zeroStatusData.userMode) || "Unknown" })
                ] })
              ] }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background shadow rounded", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Network & Environment" }),
                /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-green-50/50 text-green-800 rounded border border-green-200 dark:bg-green-950/40 dark:text-green-50 dark:border-green-900 text-sm", children: "Connectivity" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Token Status" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: networkInfo.status || "N/A" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Token Response Time" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: networkInfo.time ? `${networkInfo.time}ms` : "N/A" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Supabase URL" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: "http://127.0.0.1:54331" })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "JWKS Keys" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm", children: (jwksData == null ? void 0 : jwksData.keys) ? `${jwksData.keys.length} available` : "N/A" })
                ] })
              ] }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background shadow rounded", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: [
                /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "JWT Details" }),
                /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-amber-50/50 text-amber-800 rounded border border-amber-200 dark:bg-amber-950/40 dark:text-amber-50 dark:border-amber-900 text-sm", children: "Token" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "p-4 space-y-4", children: [
                jwt && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Algorithm" }),
                      /* @__PURE__ */ jsx("p", { className: "text-sm", children: (decodedHeader == null ? void 0 : decodedHeader.alg) || "N/A" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Key ID" }),
                      /* @__PURE__ */ jsx("p", { className: "text-sm", children: (decodedHeader == null ? void 0 : decodedHeader.kid) || "N/A" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Issued At" }),
                      /* @__PURE__ */ jsx("p", { className: "text-sm", children: (decodedPayload == null ? void 0 : decodedPayload.iat) ? new Date(decodedPayload.iat * 1e3).toLocaleString() : "N/A" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Expires At" }),
                      /* @__PURE__ */ jsx("p", { className: "text-sm", children: (decodedPayload == null ? void 0 : decodedPayload.exp) ? new Date(decodedPayload.exp * 1e3).toLocaleString() : "N/A" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ jsx("h4", { className: "font-medium text-sm", children: "JWT Header:" }),
                    /* @__PURE__ */ jsx("pre", { className: "bg-muted p-4 rounded-md overflow-auto text-xs", children: JSON.stringify(decodedHeader, null, 2) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ jsx("h4", { className: "font-medium text-sm", children: "JWT Payload:" }),
                    /* @__PURE__ */ jsx("pre", { className: "bg-muted p-4 rounded-md overflow-auto text-xs", children: JSON.stringify(decodedPayload, null, 2) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ jsx("h4", { className: "font-medium text-sm", children: "Raw JWT:" }),
                    /* @__PURE__ */ jsx("pre", { className: "bg-muted p-4 rounded-md overflow-auto text-xs", children: jwt })
                  ] })
                ] }),
                !jwt && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No JWT available" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              type: "button",
              onClick: fetchAllData,
              disabled: isLoading,
              children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "h-4 w-4 mr-2 animate-spin" }),
                "Refreshing..."
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "h-4 w-4 mr-2" }),
                "Refresh Data"
              ] })
            }
          ) })
        ] })
      ]
    }
  );
}
function AccountLogout() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };
  return /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: handleLogout, size: "xs", className: "px-2", children: [
    /* @__PURE__ */ jsx(LogOutIcon, { className: "h-4 w-4" }),
    "Log Out"
  ] });
}
const deleteUserFn_createServerFn_handler = createServerRpc("src_components_account-delete_tsx--deleteUserFn_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return deleteUserFn.__executeServer(opts, signal);
});
const deleteUserFn = createServerFn({
  method: "POST"
}).handler(deleteUserFn_createServerFn_handler, async () => {
  var _a;
  const {
    getSupabaseServerClient
  } = await import('./ssr.mjs').then((n) => n.K);
  const supabase = getSupabaseServerClient();
  try {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        error: true,
        message: "No authenticated user found"
      };
    }
    const postgres = await import('postgres');
    const dbUrl = (_a = process.env.ZERO_UPSTREAM_DB) != null ? _a : "";
    const sql = postgres.default(dbUrl, {
      max: 1,
      ssl: false,
      idle_timeout: 20
    });
    try {
      await sql.begin(async (tx) => {
        await tx`DELETE FROM public.users WHERE id = ${user.id}`;
      });
    } finally {
      await sql.end({
        timeout: 5
      });
    }
    await supabase.auth.admin.deleteUser(user.id);
    return {
      error: false
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to delete user"
    };
  }
});
function AccountDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const supabase = getSupabaseBrowserClient();
  const deleteUser = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      return;
    }
    try {
      setIsDeleting(true);
      console.log("Deleting user account...");
      const result = await deleteUserFn();
      if (result.error) {
        throw new Error(result.message || "Failed to delete account");
      }
      await supabase.auth.signOut();
      navigate({
        to: "/"
      });
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert(`Failed to delete your account: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };
  return /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: deleteUser, size: "sm", disabled: isDeleting, children: isDeleting ? "Deleting..." : "Delete Account" });
}
const AccountOverview = () => {
  var _a, _b;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const z = useZero();
  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    };
    fetchSession();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  const userId = ((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.id) || "";
  const [zeroUser] = useQuery(z.query.users.where("id", userId).one());
  const refetchSubscription = () => {
    console.log("Refetching subscription...");
    setIsSubscriptionLoading(true);
    setTimeout(() => setIsSubscriptionLoading(false), 1e3);
  };
  return /* @__PURE__ */ jsxs("div", { className: "m-4", children: [
    loading && /* @__PURE__ */ jsx("p", { children: "Loading account data..." }),
    session ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Profile Information" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Name" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm", children: ((_b = session.user.user_metadata) == null ? void 0 : _b.name) || (zeroUser == null ? void 0 : zeroUser.name) || "Not available" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Email" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm", children: session.user.email || (zeroUser == null ? void 0 : zeroUser.email) || "Not available" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Billing" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Current Plan" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Free (Placeholder)" })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "Upgrade to Pro (Placeholder)" }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", children: "Test Pro Feature (Placeholder)" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "ghost",
                size: "sm",
                onClick: refetchSubscription,
                disabled: isSubscriptionLoading,
                children: isSubscriptionLoading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Refresh"
              }
            )
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col border bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 w-full justify-between px-4 border-b pb-2 pt-2", children: /* @__PURE__ */ jsx("h2", { className: "font-medium text-sm", children: "Danger Zone" }) }),
        /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Deleting your account will permanently remove all your data from Zero and Supabase. This action cannot be undone." }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(AccountDelete, {}) })
        ] }) })
      ] })
    ] }) : !loading && /* @__PURE__ */ jsx("p", { children: "Please log in to view account details." })
  ] });
};
const SplitComponent = function RouteComponent() {
  return /* @__PURE__ */ jsxs("div", { className: "container flex flex-col min-h-screen", children: [
    /* @__PURE__ */ jsx(NavApp, { title: "Account", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(AccountDebug, {}),
      /* @__PURE__ */ jsx(AccountLogout, {})
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-col grow overflow-y-auto", children: /* @__PURE__ */ jsx(AccountOverview, {}) })
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=account-DbSHNl3-.mjs.map
