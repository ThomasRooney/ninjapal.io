import { u as useZero } from './use-typed-zero-DKggV6Yc.mjs';
import { useQuery } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@rocicorp/zero/out/react.js';
import { useNavigate } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@tanstack/react-router/dist/esm/index.js';
import { useEffect } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/react/index.js';

const SplitComponent = function RedirectComponent() {
  const navigate = useNavigate();
  const z = useZero();
  const [connections] = useQuery(z.query.ninjaConnections);
  useEffect(() => {
    var _a;
    if (connections !== void 0) {
      const hasConnection = !!((_a = connections == null ? void 0 : connections[0]) == null ? void 0 : _a.username);
      if (!hasConnection) {
        navigate({
          to: "/app/ninja-connection",
          replace: true
        });
      } else {
        navigate({
          to: "/app/devices",
          replace: true
        });
      }
    }
  }, [connections, navigate]);
  return null;
};

export { SplitComponent as component };
//# sourceMappingURL=index-DYgZbWjQ.mjs.map
