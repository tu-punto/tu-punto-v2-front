import { Navigate } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage";
  import AdminLoginPage from "../pages/Login/AdminLoginPage";
import SellerLoginPage from "../pages/Login/SellerLoginPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import TrackingPage from "../pages/Tracking/TrackingPage";

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
    path: "/tracking/:code",
    element: <TrackingPage />,
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
