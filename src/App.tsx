import { ConfigProvider } from "antd";
import { App as AntdApp } from "antd";
import { createHashRouter, RouterProvider } from "react-router-dom";
import {UserContext, UserContextProvider} from "./context/userContext";

import "./App.css";
import publicRoutes from "./routes/publicRoutes";
import protectedRoutes from "./routes/protectedRoutes";
import {useContext} from "react";
import { Spin } from "antd";
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