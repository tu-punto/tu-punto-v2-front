import { ConfigProvider } from "antd";
import { App as AntdApp } from "antd";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { UserContextProvider } from "./context/userContext";
import "./App.css";
import publicRoutes from "./routes/publicRoutes";
import protectedRoutes from "./routes/protectedRoutes";

export const App = () => {
  const router = createHashRouter([...publicRoutes, ...protectedRoutes]);
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
          <RouterProvider router={router} />
        </ConfigProvider>
      </UserContextProvider>
    </AntdApp>
  );
};

export default App;
