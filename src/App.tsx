import { ConfigProvider } from "antd";
import { App as AntdApp } from "antd";
import { UserContextProvider } from "./context/userContext";

import "./App.css";
import RouterGuard from "./routes/RouterGuard";
import PaqueteriaExternalLanding from "./pages/Paqueteria/PaqueteriaExternalLanding";


export const App = () => {
  const match = window.location.pathname.match(/^\/paqueteria\/([^/]+)\/?$/);
  const externalSlug = match ? decodeURIComponent(match[1]) : null;

  return (
    <AntdApp>
      <UserContextProvider>
        <ConfigProvider
          theme={{
            components: {
              Button: {
                colorPrimary: "#f6863a",
                algorithm: true,
              },
            },
          }}
        >
          {externalSlug ? <PaqueteriaExternalLanding slug={externalSlug} /> : <RouterGuard />}
        </ConfigProvider>
      </UserContextProvider>
    </AntdApp>
  );
};

export default App;
