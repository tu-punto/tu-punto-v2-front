import { Navigate } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage";
import AdminLoginPage from "../pages/Login/AdminLoginPage";
import SellerLoginPage from "../pages/Login/SellerLoginPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";

const publicRoutes = [
  {
    path: "/login-admin",
    element: <AdminLoginPage />,
  },
  {
    path: "/login-seller",
    element: <SellerLoginPage />,
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },
  {
    path: "/",
    element: <Navigate to="/login-admin" replace />,
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
];

export default publicRoutes;
