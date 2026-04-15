import { Navigate } from "react-router-dom";
import { useContext } from "react";
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
import SalesHistoryPage from "../pages/SalesHistory/SalesHistoryPage";
import UsersPage from "../pages/Users/UsersPage";
import ServicesPage from "../pages/Service/ServicePanelPage";
import FindShipping from "../pages/Shipping/FindShipping";
import ShippingGuide from "../pages/ShippingGuide/ShippinGuide";
import SellerProductInfoPage from "../pages/SellerProductInfo/SellerProductInfoPage";
import SuperadminVariantsPage from "../pages/SuperadminVariants/SuperadminVariantsPage";
import SimplePackagesPage from "../pages/SimplePackages/SimplePackagesPage";
import { getAllowedRoles } from "../constants/accessControl";
import { UserContext } from "../context/userContext";
import { canAccessSellerProductInfo } from "../constants/sellerProductInfoAccess";
import { isSuperadminUser, normalizeRole } from "../utils/role";
import { canSellerAccessInventory, canSellerAccessShop } from "../utils/sellerServiceAccess";

const guard = (path: string, element: JSX.Element) => (
  <RoleGuard allowedRoles={getAllowedRoles(path)}>{element}</RoleGuard>
);

const SellerProductInfoRoute = () => {
  const { user } = useContext(UserContext);

  if (!canAccessSellerProductInfo(user)) {
    return <Navigate to="/shop" replace />;
  }

  return <SellerProductInfoPage mode="seller" />;
};

const StockRoute = () => {
  const { user } = useContext(UserContext);

  if (!canSellerAccessInventory(user)) {
    return <Navigate to="/simple-packages" replace />;
  }

  return <StockManagement />;
};

const ShopRoute = () => {
  const { user } = useContext(UserContext);

  if (!canSellerAccessShop(user)) {
    return <Navigate to="/seller-info" replace />;
  }

  return <Sales />;
};

const SimplePackagesRoute = () => {
  const { user } = useContext(UserContext);

  if (normalizeRole(user?.role) !== "seller") {
    return <Navigate to="/shipping" replace />;
  }

  return <SimplePackagesPage />;
};

const AdminSellerProductInfoRoute = () => {
  return <SellerProductInfoPage mode="admin" />;
};

const SuperadminVariantsRoute = () => {
  const { user } = useContext(UserContext);

  if (!isSuperadminUser(user)) {
    return <Navigate to="/stock" replace />;
  }

  return <SuperadminVariantsPage />;
};

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
        element: guard("/product", <Product />),
      },
      {
        path: "/seller",
        element: guard("/seller", <Seller isFactura={false} />),
      },
      {
        path: "/sales",
        element: guard("/sales", <Sales />),
      },
      {
        path: "/shipping",
        element: guard("/shipping", <Shipping />),
      },
      {
        path: "/find-shipping",
        element: guard("/find-shipping", <FindShipping />),
      },
      {
        path: "/financeFlux",
        element: guard("/financeFlux", <FinanceFlux />),
      },
      {
        path: "/stock",
        element: guard("/stock", <StockRoute />),
      },
      {
        path: "/stats",
        element: guard("/stats", <StatsPage />),
      },
      {
        path: "/sellerFactura",
        element: guard("/sellerFactura", <Seller isFactura={true} />),
      },
      {
        path: "/servicesPage",
        element: guard("/servicesPage", <ServicesPage isFactura={false} />),
      },
      {
        path: "/seller-info",
        element: guard("/seller-info", <SellerInfoPageWrapper />),
      },
      {
        path: "/shop",
        element: guard("/shop", <ShopRoute />),
      },
      {
        path: "/simple-packages",
        element: guard("/simple-packages", <SimplePackagesRoute />),
      },
      {
        path: "/cash",
        element: guard("/cash", <CashReconciliationPage />),
      },
      {
        path: "/cierreCaja",
        element: guard("/cierreCaja", <CierreCajaPage />),
      },
      {
        path: "/branch",
        element: guard("/branch", <BranchPage />),
      },
      {
        path: "/sales-history",
        element: guard("/sales-history", <SalesHistoryPage />),
      },
      {
        path: "/user",
        element: guard("/user", <UsersPage />),
      },
      {
        path: "/shipping-guide",
        element: guard("/shipping-guide", <ShippingGuide />),
      },
      {
        path: "/seller-product-info",
        element: guard("/seller-product-info", <SellerProductInfoRoute />),
      },
      {
        path: "/admin-seller-product-info",
        element: guard("/admin-seller-product-info", <AdminSellerProductInfoRoute />),
      },
      {
        path: "/superadmin-variants",
        element: guard("/superadmin-variants", <SuperadminVariantsRoute />),
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
    ],
  },
];

export default protectedRoutes;
