import { jsx, jsxs, Fragment } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { C as Card, a as CardHeader, b as CardTitle, d as CardContent, c as CardDescription } from './card-Dfo2Z8fy.mjs';
import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { r as reconstructHistorySnapshots } from './historyUtils-Di6Fwh6R.mjs';
import { f as formatTemperature, c as celsiusToFahrenheit } from './temperature-utils-BbJLKh3r.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { Loader2, Wifi, WifiOff, Thermometer, CloudSnow, Flame, AlertCircle, CheckCircle2, DoorOpen, Clock } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/lucide-react/dist/cjs/lucide-react.js';
import { useMemo, useState, useEffect } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/recharts/lib/index.js';
import { A as Alert, b as AlertTitle, a as AlertDescription } from './alert-CUu2PQ8M.mjs';
import { B as Badge } from './badge-CW0w3Vc4.mjs';
import { useMatchRoute, Link, Outlet } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { aI as Route$4 } from './ssr.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/class-variance-authority/dist/index.mjs';
import 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@radix-ui/react-slot/dist/index.mjs';
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

function TemperatureGraph({
  deviceId,
  series,
  timeWindowHours = 6,
  prefersCelsius,
  className
}) {
  const z = useZero();
  const startTime = useMemo(() => {
    const time = /* @__PURE__ */ new Date();
    time.setHours(time.getHours() - timeWindowHours);
    return time.getTime();
  }, [timeWindowHours]);
  const [baselineSnapshot] = useQuery(
    z.query.deviceHistory.where("deviceId", deviceId).where("historyType", "snapshot").where("recordedAt", "<=", startTime).orderBy("recordedAt", "desc").limit(1)
  );
  const [windowRecords] = useQuery(
    z.query.deviceHistory.where("deviceId", deviceId).where("recordedAt", ">", startTime).orderBy("recordedAt", "desc")
  );
  const chartData = useMemo(() => {
    if (!windowRecords) return [];
    const allRecords = [];
    if (baselineSnapshot == null ? void 0 : baselineSnapshot[0]) {
      allRecords.push(baselineSnapshot[0]);
    }
    allRecords.push(...windowRecords);
    if (allRecords.length === 0) return [];
    const snapshots = reconstructHistorySnapshots(allRecords);
    const filteredSnapshots = snapshots.filter(
      (snapshot) => snapshot.recordedAt && snapshot.recordedAt > startTime
    );
    return filteredSnapshots.reverse().map((snapshot) => {
      const dataPoint = {
        time: snapshot.recordedAt || 0
      };
      for (const s of series) {
        const value = snapshot.state[s.attributeName];
        dataPoint[s.attributeName] = typeof value === "number" ? value : null;
      }
      return dataPoint;
    });
  }, [windowRecords, baselineSnapshot, series, startTime]);
  const stats = useMemo(() => {
    var _a;
    if (!chartData || chartData.length === 0) return null;
    const result = {};
    for (const s of series) {
      const values = chartData.map((d) => d[s.attributeName]).filter((v) => typeof v === "number" && !Number.isNaN(v));
      if (values.length > 0) {
        result[s.attributeName] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          current: (_a = chartData[chartData.length - 1]) == null ? void 0 : _a[s.attributeName]
        };
      }
    }
    return result;
  }, [chartData, series]);
  if (windowRecords === void 0 || baselineSnapshot === void 0) {
    return /* @__PURE__ */ jsx(Card, { className, children: /* @__PURE__ */ jsx(CardContent, { className: "flex items-center justify-center h-[400px]", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin" }) }) });
  }
  if (chartData.length === 0) {
    return /* @__PURE__ */ jsxs(Card, { className, children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Temperature History" }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "flex items-center justify-center h-[300px]", children: /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "No temperature data available for the selected time period" }) })
    ] });
  }
  return /* @__PURE__ */ jsxs(Card, { className, children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Temperature History" }) }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      /* @__PURE__ */ jsx("div", { className: "h-[300px] w-full", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(LineChart, { data: chartData, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", className: "stroke-muted" }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "time",
            type: "number",
            domain: ["dataMin", "dataMax"],
            tickFormatter: (unixTime) => new Date(unixTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            className: "text-xs"
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            tickFormatter: (temp) => {
              var _a;
              return String(
                prefersCelsius ? temp : (_a = celsiusToFahrenheit(temp)) != null ? _a : temp
              );
            },
            className: "text-xs",
            label: {
              value: prefersCelsius ? "\xB0C" : "\xB0F",
              position: "insideLeft",
              style: { textAnchor: "middle" }
            }
          }
        ),
        /* @__PURE__ */ jsx(
          Tooltip,
          {
            labelFormatter: (unixTime) => new Date(unixTime).toLocaleString(),
            formatter: (value, name) => [
              formatTemperature(value, prefersCelsius),
              name
            ],
            contentStyle: {
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px"
            }
          }
        ),
        /* @__PURE__ */ jsx(Legend, {}),
        series.map((s) => /* @__PURE__ */ jsx(
          Line,
          {
            type: "monotone",
            dataKey: s.attributeName,
            name: s.name,
            stroke: s.color,
            strokeWidth: 2,
            dot: false,
            connectNulls: false
          },
          s.attributeName
        ))
      ] }) }) }),
      stats && /* @__PURE__ */ jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-4", children: series.map((s) => {
        const seriesStats = stats[s.attributeName];
        if (!seriesStats) return null;
        return /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-muted-foreground", children: s.name }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs space-y-0.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Current:" }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: seriesStats.current !== null ? formatTemperature(
                seriesStats.current,
                prefersCelsius
              ) : "\u2014" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Min:" }),
              /* @__PURE__ */ jsx("span", { children: formatTemperature(seriesStats.min, prefersCelsius) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Max:" }),
              /* @__PURE__ */ jsx("span", { children: formatTemperature(seriesStats.max, prefersCelsius) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Avg:" }),
              /* @__PURE__ */ jsx("span", { children: formatTemperature(
                Math.round(seriesStats.avg),
                prefersCelsius
              ) })
            ] })
          ] })
        ] }, s.attributeName);
      }) })
    ] })
  ] });
}
const useCountdown = (targetDate) => {
  if (!targetDate) {
    return { hours: "00", minutes: "00", seconds: "00", formatted: "00:00:00" };
  }
  const countDownDate = new Date(targetDate).getTime();
  const [countDown, setCountDown] = useState(
    countDownDate - (/* @__PURE__ */ new Date()).getTime()
  );
  useEffect(() => {
    if (!targetDate || countDown <= 0) {
      setCountDown(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = countDownDate - (/* @__PURE__ */ new Date()).getTime();
      if (remaining <= 0) {
        clearInterval(interval);
        setCountDown(0);
      } else {
        setCountDown(remaining);
      }
    }, 1e3);
    return () => clearInterval(interval);
  }, [targetDate, countDownDate, countDown]);
  return formatTime(countDown);
};
const formatTime = (timeInMs) => {
  if (timeInMs <= 0) {
    return { hours: "00", minutes: "00", seconds: "00", formatted: "00:00:00" };
  }
  const seconds = Math.floor(timeInMs / 1e3 % 60);
  const minutes = Math.floor(timeInMs / (1e3 * 60) % 60);
  const hours = Math.floor(timeInMs / (1e3 * 60 * 60) % 24);
  const pad = (num) => String(num).padStart(2, "0");
  return {
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  };
};
const DISPLAYABLE_GRILL_TEMPS = [
  "grill",
  "air",
  "smoke"
];
const TEMP_DISPLAY_NAMES = {
  grill: "Grill",
  air: "Chamber",
  smoke: "Exhaust"
};
function useGrillViewModel(grillState, probeState, connectionStatus) {
  return useMemo(() => {
    if (!grillState || !probeState) {
      return null;
    }
    const displayTemperatures = Object.entries(grillState.inputs.temps).filter(
      ([key]) => DISPLAYABLE_GRILL_TEMPS.includes(key)
    ).map(([key, value]) => ({
      name: TEMP_DISPLAY_NAMES[key] || key,
      temp: Math.round(value)
    }));
    const lidIsOpen = grillState.inputs.io["lid open"] === 1;
    const smokeIsOn = grillState.smoke === 1;
    const isOffline = connectionStatus === "Offline" || grillState.state === "zc loss";
    const hasDeviceError = grillState.error != null && grillState.error !== 0;
    const errorStatus = {
      hasError: !isOffline && hasDeviceError,
      message: hasDeviceError ? grillState.message || "Unknown error" : ""
    };
    const deviceStatus = connectionStatus === "Online" ? "Online" : connectionStatus === "Offline" ? "Offline" : "Unknown";
    const connectedProbes = probeState.probes.filter(
      (p) => p["plugged in"] === 1
    );
    return {
      displayTemperatures,
      lidIsOpen,
      smokeIsOn,
      deviceStatus,
      errorStatus,
      connectedProbes,
      activeProbeCount: connectedProbes.filter((p) => p.active === 1).length
    };
  }, [grillState, probeState, connectionStatus]);
}
function CookTimeDisplay({
  device,
  grillState
}) {
  const estimatedEndTime = useMemo(() => {
    if (device.estimated_end_at) {
      return typeof device.estimated_end_at === "number" ? new Date(device.estimated_end_at).toISOString() : device.estimated_end_at;
    }
    if ((grillState == null ? void 0 : grillState["seconds left"]) && grillState["seconds left"] > 0) {
      const endTime = /* @__PURE__ */ new Date();
      endTime.setSeconds(endTime.getSeconds() + grillState["seconds left"]);
      return endTime.toISOString();
    }
    return null;
  }, [device.estimated_end_at, grillState]);
  const countdown = useCountdown(estimatedEndTime);
  const isExpired = estimatedEndTime && new Date(estimatedEndTime) <= /* @__PURE__ */ new Date();
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsx(Clock, { className: "h-5 w-5 text-muted-foreground" }),
    /* @__PURE__ */ jsx("div", { className: "text-right", children: estimatedEndTime && !isExpired ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold font-mono", children: countdown.formatted }),
      (grillState == null ? void 0 : grillState["seconds set"]) && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
        "of ",
        Math.floor(grillState["seconds set"] / 60),
        "m total"
      ] })
    ] }) : (grillState == null ? void 0 : grillState["seconds left"]) ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: "Timer Complete" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Cook time finished" })
    ] }) : /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: "\u2014" }) })
  ] });
}
function DeviceOverviewPage({
  device,
  zeroUser
}) {
  var _a2, _b2, _c, _d, _e;
  var _a, _b;
  const parseJsonSafely = (jsonString) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };
  const grillState = device ? parseJsonSafely(device.grill_state_raw) : null;
  const probeState = device ? parseJsonSafely(device.probe_state_raw) : null;
  const viewModel = useGrillViewModel(grillState, probeState, device.connectionStatus);
  if (!device) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4 pb-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { "data-testid": "device-status", children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Cook Status" }) }),
        /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Mode" }),
              /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold capitalize", children: (grillState == null ? void 0 : grillState.mode) || device.cooking_mode || "\u2014" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "State" }),
              /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold capitalize", children: (grillState == null ? void 0 : grillState.state) || device.cooking_state || "Idle" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "Grill Temperature" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold", "data-testid": "temperature-display", children: ((_b = (_a = grillState == null ? void 0 : grillState.inputs) == null ? void 0 : _a.temps) == null ? void 0 : _b.grill) ? formatTemperature(grillState.inputs.temps.grill, (_a2 = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _a2 : false) : "\u2014" }),
                (grillState == null ? void 0 : grillState.setpoint) && /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground", children: [
                  "/",
                  " ",
                  formatTemperature(grillState.setpoint, (_b2 = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _b2 : false)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(CookTimeDisplay, { device, grillState })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "Grill Environment" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Temperature readings" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: viewModel == null ? void 0 : viewModel.displayTemperatures.map((temp) => {
          var _a3;
          return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              temp.name === "Chamber" && /* @__PURE__ */ jsx(Thermometer, { className: "h-4 w-4 text-muted-foreground" }),
              temp.name === "Exhaust" && /* @__PURE__ */ jsx(CloudSnow, { className: "h-4 w-4 text-muted-foreground" }),
              temp.name === "Grill" && /* @__PURE__ */ jsx(Flame, { className: "h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: temp.name })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold", children: formatTemperature(temp.temp, (_a3 = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _a3 : false) })
          ] }, temp.name);
        }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "System Vitals" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          (viewModel == null ? void 0 : viewModel.deviceStatus) === "Offline" ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(WifiOff, { className: "h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Status" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground font-medium", children: "Offline" })
          ] }) : (viewModel == null ? void 0 : viewModel.errorStatus.hasError) ? /* @__PURE__ */ jsxs(Alert, { variant: "destructive", children: [
            /* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx(AlertTitle, { children: "Error" }),
            /* @__PURE__ */ jsx(AlertDescription, { children: viewModel.errorStatus.message })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-green-600" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Status" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-green-600 font-medium", children: "OK" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(DoorOpen, { className: "h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Lid" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: `text-sm font-medium ${(viewModel == null ? void 0 : viewModel.deviceStatus) === "Offline" ? "text-muted-foreground" : (viewModel == null ? void 0 : viewModel.lidIsOpen) ? "text-yellow-600" : "text-muted-foreground"}`, children: (viewModel == null ? void 0 : viewModel.deviceStatus) === "Offline" ? "\u2014" : (viewModel == null ? void 0 : viewModel.lidIsOpen) ? "Open" : "Closed" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(CloudSnow, { className: "h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Smoke" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: (viewModel == null ? void 0 : viewModel.deviceStatus) === "Offline" ? "\u2014" : (viewModel == null ? void 0 : viewModel.smokeIsOn) ? "On" : "Off" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Thermometer, { className: "h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Active Probes" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: (viewModel == null ? void 0 : viewModel.deviceStatus) === "Offline" ? "\u2014" : (_c = viewModel == null ? void 0 : viewModel.activeProbeCount) != null ? _c : 0 })
          ] })
        ] }) })
      ] }),
      (viewModel == null ? void 0 : viewModel.connectedProbes) && viewModel.connectedProbes.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "Food Probes" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Temperature probe readings" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: viewModel.connectedProbes.map((probe) => {
          var _a3;
          return /* @__PURE__ */ jsxs("div", { className: `flex items-center justify-between p-3 rounded-lg ${probe.active ? "bg-primary/10" : "bg-muted/50"}`, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-medium capitalize", children: probe.name.replace("probe", "Probe ") }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: probe.active ? "Active" : "Monitoring" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
              /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: formatTemperature(probe.temp, (_a3 = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _a3 : false) }),
              probe.progress < 100 && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
                probe.progress,
                "% done"
              ] })
            ] })
          ] }, probe.name);
        }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(TemperatureGraph, { deviceId: (_d = device.id) != null ? _d : "", prefersCelsius: (_e = zeroUser == null ? void 0 : zeroUser.prefers_celsius) != null ? _e : false, series: [{
      attributeName: "temp_grill",
      name: "Grill Temp",
      color: "#ef4444"
    }, {
      attributeName: "temp_air",
      name: "Air Temp",
      color: "#3b82f6"
    }, {
      attributeName: "probe1_temp_a",
      name: "Probe 1",
      color: "#f59e0b"
    }, {
      attributeName: "probe2_temp_a",
      name: "Probe 2",
      color: "#8b5cf6"
    }], className: "mt-4 mb-8" })
  ] });
}
const SplitComponent = function DeviceDetailLayout() {
  const {
    deviceId
  } = Route$4.useParams();
  const z = useZero();
  const matchRoute = useMatchRoute();
  const isIndex = matchRoute({
    to: Route$4.fullPath,
    fuzzy: false
  });
  const {
    user
  } = Route$4.useRouteContext();
  const [zeroUser] = useQuery(z.query.users.where("id", (user == null ? void 0 : user.id) || "").one());
  const [devices] = useQuery(z.query.devices.where("id", deviceId));
  const device = devices == null ? void 0 : devices[0];
  if (!devices) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center min-h-screen", children: /* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin" }) });
  }
  if (!device) {
    return /* @__PURE__ */ jsx("div", { children: "Device not found." });
  }
  return /* @__PURE__ */ jsxs("div", { className: "container mx-auto p-6 max-w-6xl", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: device.productName || "Unnamed Device" }),
        /* @__PURE__ */ jsxs(Badge, { variant: device.connectionStatus === "Online" ? "default" : "secondary", className: "text-base px-3 py-1", children: [
          device.connectionStatus === "Online" ? /* @__PURE__ */ jsx(Wifi, { className: "h-4 w-4 mr-1" }) : /* @__PURE__ */ jsx(WifiOff, { className: "h-4 w-4 mr-1" }),
          device.connectionStatus || "Unknown"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        "Model: ",
        device.model || "Unknown",
        " \u2022 DSN: ",
        device.dsn
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxs("div", { className: "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Link, { to: "/app/device/$deviceId", params: {
        deviceId
      }, className: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all", activeProps: {
        className: "bg-background text-foreground shadow-sm"
      }, children: "Overview" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/device/$deviceId/status", params: {
        deviceId
      }, className: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all", activeProps: {
        className: "bg-background text-foreground shadow-sm"
      }, children: "Status" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/device/$deviceId/technical", params: {
        deviceId
      }, className: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all", activeProps: {
        className: "bg-background text-foreground shadow-sm"
      }, children: "Technical" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/device/$deviceId/history", params: {
        deviceId
      }, className: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all", activeProps: {
        className: "bg-background text-foreground shadow-sm"
      }, children: "History" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/device/$deviceId/raw", params: {
        deviceId
      }, className: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all", activeProps: {
        className: "bg-background text-foreground shadow-sm"
      }, children: "Raw Data" })
    ] }) }),
    isIndex ? /* @__PURE__ */ jsx(DeviceOverviewPage, { device, zeroUser }) : /* @__PURE__ */ jsx(Outlet, {})
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=device._deviceId-CwN5cJGB.mjs.map
