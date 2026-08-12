import { ConfigProvider } from "antd";
import { App as AntdApp } from "antd";
import { UserContextProvider } from "./context/userContext";

import "./App.css";
import RouterGuard from "./routes/RouterGuard";


export const App = () => {
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
          <RouterGuard />
        </ConfigProvider>
      </UserContextProvider>
    </AntdApp>
  );
};

export default App;
