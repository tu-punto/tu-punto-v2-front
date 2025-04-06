import { Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import RoleGuard from "./RoleGuard";
import FinanceFlux from "../pages/FinanceFlux/FinanceFlux";
import Product from "../pages/Product/Product";
import Sales from "../pages/Sales/Sales";
import Seller from "../pages/Seller/Seller";
import Shipping from "../pages/Shipping/Shipping";
import StockManagement from "../pages/StockManagement/StockManagement";
import ErrorPage from "../pages/ErrorPage";
import StatsPage from "../pages/Stats/StatsPage";
import SellerInfoPageWrapper from "../pages/Seller/SellerInfo";
import CashReconciliationPage from "../pages/BoxClose/BoxClosePage";
import CierreCajaPage from "../pages/BoxClose/DailyBoxClose";
import BranchPage from "../pages/Branch/BranchPage";

const protectedRoutes = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: "/product",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <Product />
          </RoleGuard>
        ),
      },
      {
        path: "/seller",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <Seller />
          </RoleGuard>
        ),
      },
      {
        path: "/sellerFactura",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <Seller isFactura={true} />
          </RoleGuard>
        ),
      },
      {
        path: "/sales",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <Sales />
          </RoleGuard>
        ),
      },
      {
        path: "/shipping",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <Shipping />
          </RoleGuard>
        ),
      },
      {
        path: "/financeFlux",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <FinanceFlux />
          </RoleGuard>
        ),
      },
      {
        path: "/stock",
        element: (
          <RoleGuard allowedRoles={["admin", "seller"]}>
            <StockManagement />
          </RoleGuard>
        ),
      },
      {
        path: "/stats",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <StatsPage />
          </RoleGuard>
        ),
      },
      {
        path: "/seller-info",
        element: (
          <RoleGuard allowedRoles={["seller"]}>
            <SellerInfoPageWrapper />
          </RoleGuard>
        ),
      },
      {
        path: "/shop",
        element: (
          <RoleGuard allowedRoles={["seller"]}>
            <Sales />
          </RoleGuard>
        ),
      },
      {
        path: "/cash",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <CashReconciliationPage />
          </RoleGuard>
        ),
      },
      {
        path: "/cierreCaja",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <CierreCajaPage />
          </RoleGuard>
        ),
      },
      {
        path: "/branch",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <BranchPage />
          </RoleGuard>
        ),
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
    ],
  },
];

export default protectedRoutes;
