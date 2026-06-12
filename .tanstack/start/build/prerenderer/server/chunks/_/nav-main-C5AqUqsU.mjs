import { jsx, jsxs } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/jsx-runtime.js';
import { B as Badge } from './badge-CW0w3Vc4.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-CXG9DuyO.mjs';
import { L as Logo } from './logo-6qfVLBMy.mjs';
import { aB as Button } from './ssr.mjs';
import { useRouterState, Link } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';

const mockDevices = [
  {
    product_name: "Young Smoky",
    model: "OG900-EU",
    dsn: "DEMO000000001",
    oem_model: "OG900-EU",
    connection_status: "Online",
    thermometer1: 165,
    thermometer2: 158,
    grillTemperature: 225,
    targetTemp: 225,
    cookTime: 240,
    // 4 hours
    mode: "smoker",
    smoke: 1
  },
  {
    product_name: "Backyard Beast",
    model: "OG700-US",
    dsn: "DEMO000000002",
    oem_model: "OG700-US",
    connection_status: "Offline",
    thermometer1: 0,
    thermometer2: 0,
    grillTemperature: 0,
    targetTemp: 0,
    cookTime: 0,
    mode: "idle",
    smoke: 0
  }
];
function DeviceSelector({
  value,
  onValueChange
}) {
  const selectedDevice = mockDevices.find((d) => d.dsn === value) || mockDevices[0];
  return /* @__PURE__ */ jsxs(Select, { value, onValueChange, children: [
    /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[220px]", children: /* @__PURE__ */ jsx(SelectValue, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "truncate", children: selectedDevice.product_name }),
      /* @__PURE__ */ jsx(
        Badge,
        {
          variant: selectedDevice.connection_status === "Online" ? "default" : "secondary",
          className: "text-xs",
          children: selectedDevice.connection_status
        }
      )
    ] }) }) }),
    /* @__PURE__ */ jsx(SelectContent, { children: mockDevices.map((device) => /* @__PURE__ */ jsx(SelectItem, { value: device.dsn, children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between w-full gap-2", children: [
      /* @__PURE__ */ jsx("span", { children: device.product_name }),
      /* @__PURE__ */ jsx(
        Badge,
        {
          variant: device.connection_status === "Online" ? "default" : "secondary",
          className: "text-xs",
          children: device.connection_status
        }
      )
    ] }) }, device.dsn)) })
  ] });
}
function NavMain({
  location = "homepage",
  selectedDevice,
  onDeviceChange
}) {
  return location === "homepage" ? /* @__PURE__ */ jsx(
    HomePageHeader,
    {
      selectedDevice,
      onDeviceChange
    }
  ) : location === "auth" ? /* @__PURE__ */ jsx(AuthPageHeader, {}) : null;
}
const HomePageHeader = ({
  selectedDevice = mockDevices[0].dsn,
  onDeviceChange = () => {
  }
}) => {
  var _a, _b;
  const routerState = useRouterState();
  const user = (_b = (_a = routerState.matches[0]) == null ? void 0 : _a.context) == null ? void 0 : _b.user;
  const isLoggedIn = !!user;
  return /* @__PURE__ */ jsx("div", { className: "w-full bg-background border-b border-border", children: /* @__PURE__ */ jsxs("nav", { className: "w-full py-4 px-4 flex justify-between items-center text-base h-18", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
      /* @__PURE__ */ jsxs(
        Link,
        {
          className: "font-semibold text-sm flex items-center gap-2 p-1.5",
          to: "/",
          "data-testid": "main-heading",
          children: [
            /* @__PURE__ */ jsx(Logo, {}),
            "PitMinder"
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        DeviceSelector,
        {
          value: selectedDevice,
          onValueChange: onDeviceChange
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-6 items-center text-sm", children: isLoggedIn ? /* @__PURE__ */ jsx(Link, { to: "/app", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "default", children: "Dashboard" }) }) : /* @__PURE__ */ jsx(Link, { to: "/auth/login", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", children: "Login" }) }) })
  ] }) });
};
const AuthPageHeader = () => {
  return /* @__PURE__ */ jsx("nav", { className: "w-full py-4 px-4 bg-background flex justify-between items-center border-b border-border h-18", children: /* @__PURE__ */ jsxs(
    Link,
    {
      className: "font-semibold text-sm flex items-center gap-2 p-1.5",
      to: "/",
      "data-testid": "main-heading",
      children: [
        /* @__PURE__ */ jsx(Logo, {}),
        "PitMinder"
      ]
    }
  ) });
};

export { NavMain as N };
//# sourceMappingURL=nav-main-C5AqUqsU.mjs.map
