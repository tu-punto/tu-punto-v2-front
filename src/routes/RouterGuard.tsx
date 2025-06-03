// RouterGuard.tsx
import { useContext } from "react";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { Spin } from "antd";
import publicRoutes from "./publicRoutes";
import protectedRoutes from "./protectedRoutes";

const RouterGuard = () => {
    const { loading } = useContext(UserContext);

    if (loading) {
        return (
            <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Spin size="large" tip="Cargando usuario..." />
            </div>
        );
    }

    const router = createHashRouter([...publicRoutes, ...protectedRoutes]); // 👈 solo se crea cuando loading termina

    return <RouterProvider router={router} />;
};

export default RouterGuard;
