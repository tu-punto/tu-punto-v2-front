// import { Routes, Route, Navigate } from "react-router-dom";
// import Product from "../pages/Product/Product";
// import Seller from "../pages/Seller/Seller";
// import Sales from "../pages/Sales/Sales";
// import Shipping from "../pages/Shipping/Shipping";
// import FinanceFlux from "../pages/FinanceFlux/FinanceFlux";
// import StockManagement from "../pages/StockManagement/StockManagement";
// import LoginPage from "../pages/Login/LoginPage";
// import RoleGuard from "./RoleGuard";
// import ErrorPage from "../pages/ErrorPage";

// const AppRoutes = () => {
//   return (
//     <Routes>
//       <Route path="/" element={<Navigate to="/login" replace />} />
//       <Route path="*" element={<ErrorPage />} />
//       <Route path="/login" element={<LoginPage />} />
//       <Route
//         path="/product"
//         element={
//           <RoleGuard allowedRoles={["admin", "seller"]}>
//             <Product />
//           </RoleGuard>
//         }
//       />
//       <Route
//         path="/seller"
//         element={
//           <RoleGuard allowedRoles={["admin"]}>
//             <Seller />
//           </RoleGuard>
//         }
//       />
//       <Route
//         path="/sales"
//         element={
//           <RoleGuard allowedRoles={["admin"]}>
//             <Sales />
//           </RoleGuard>
//         }
//       />
//       <Route
//         path="/shipping"
//         element={
//           <RoleGuard allowedRoles={["admin"]}>
//             <Shipping />
//           </RoleGuard>
//         }
//       />
//       <Route
//         path="/financeFlux"
//         element={
//           <RoleGuard allowedRoles={["admin"]}>
//             <FinanceFlux />
//           </RoleGuard>
//         }
//       />
//       <Route
//         path="/stock"
//         element={
//           <RoleGuard allowedRoles={["admin", "seller"]}>
//             <StockManagement />
//           </RoleGuard>
//         }
//       />
//     </Routes>
//   );
// };

// export default AppRoutes;
