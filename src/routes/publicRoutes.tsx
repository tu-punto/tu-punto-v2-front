import { Navigate } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage";
import AdminLoginPage from "../pages/Login/AdminLoginPage";
import SellerLoginPage from "../pages/Login/SellerLoginPage";

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
    path: "*",
    element: <ErrorPage />,
  },
  {
    path: "/",
    element: <Navigate to="/login-admin" replace />,
  },
];

export default publicRoutes;
