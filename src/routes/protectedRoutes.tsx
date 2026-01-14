import { Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import RoleGuard from "./RoleGuard";
import FinanceFlux from "../pages/FinanceFlux/FinanceFlux";
import Product from "../pages/Product/Product";
import Seller from "../pages/Seller/Seller";
import Shipping from "../pages/Shipping/Shipping";
import StockManagement from "../pages/StockManagement/StockManagement";
import ErrorPage from "../pages/ErrorPage";
import StatsPage from "../pages/Stats/StatsPage";
import SellerInfoPageWrapper from "../pages/Seller/SellerInfo";
import CashReconciliationPage from "../pages/BoxClose/BoxClosePage";
import CierreCajaPage from "../pages/BoxClose/DailyBoxClose";
import BranchPage from "../pages/Branch/BranchPage";
import SalesHistoryPage from "../pages/SalesHistory/SalesHistoryPage";
import UsersPage from "../pages/Users/UsersPage";
import ServicesPage from "../pages/Service/ServicePanelPage";
import ShippingGuide from "../pages/ShippingGuide/ShippinGuide";
import SalesPage from "../pages/Sales/SalesPage";

const protectedRoutes = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/login-admin" replace />,
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
            <Seller isFactura={false} />
          </RoleGuard>
        ),
      },

      {
        path: "/sales",
        element: (
          <RoleGuard allowedRoles={["admin", "operator"]}>
            <SalesPage />
          </RoleGuard>
        ),
      },
      {
        path: "/shipping",
        element: (
          <RoleGuard allowedRoles={["admin", "seller", "operator"]}>
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
          <RoleGuard allowedRoles={["admin", "seller", "operator"]}>
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
        )
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
        path: "/servicesPage",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <ServicesPage isFactura={false} />
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
            <SalesPage />
          </RoleGuard>
        ),
      },
      {
        path: "/cash",
        element: (
          <RoleGuard allowedRoles={["admin", "operator"]}>
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
          <RoleGuard allowedRoles={["admin","seller", "operator"]}>
            <BranchPage />
          </RoleGuard>
        ),
      },
      {
        path: "/sales-history",
        element: (
          <RoleGuard allowedRoles={["admin", "operator"]}>
            <SalesHistoryPage />
          </RoleGuard>
        ),
      },
      {
        path: "/user",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: "/shipping-guide",
        element: (
          <RoleGuard allowedRoles={["seller"]}>
            <ShippingGuide/>
          </RoleGuard>
        )
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
    ],
  },
];

export default protectedRoutes;
