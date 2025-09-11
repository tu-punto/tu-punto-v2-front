import { ConfigProvider } from "antd";
import { App as AntdApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { createHashRouter, RouterProvider } from "react-router-dom";
import { UserContextProvider } from "./context/userContext";
import "./App.css";
// import publicRoutes from "./routes/publicRoutes";
// import protectedRoutes from "./routes/protectedRoutes";
// import { useContext } from "react";
// import { Spin } from "antd";
import RouterGuard from "./routes/RouterGuard";

const queryClient = new QueryClient();
export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};

export default App;
