import boxIcon from "../assets/boxIcon.svg";
import sellerIcon from "../assets/sellersIcon.svg";
import cartIcon from "../assets/cartIcon.svg";
import shippingIcon from "../assets/shippingIcon.svg";
import financeFluxIcon from "../assets/financeFluxIcon.svg";
import stockManagementIcon from "../assets/stockManagement.svg";
import statsIcon from "../assets/statsIcon.svg";
import branchIcon from "../assets/branchIcon.svg";
import salesHistoryIcon from "../assets/historyIcono.png";
import infoProductIcon from "../assets/infoProductIcon.svg";
import tagIcon from "../assets/tagIcon.svg";
import superadminVariantsIcon from "../assets/superadminVariantsIcon.svg";
import servicesIcon from "../assets/services.png";
import attendanceClockIcon from "../assets/attendanceClockIcon.svg";
import historyIcon from "../assets/historyIcono.png";
import paperNoteIcon from "../assets/paperNoteIcon.svg";
import { getAllowedRoles } from "./accessControl";

export const menu = [
  {
    path: "/seller-dashboard",
    label: "Mi Dashboard",
    icon: statsIcon,
    roles: getAllowedRoles("/seller-dashboard"),
    hiddenInMenuForRoles: ["seller"],
  },
  {
    path: "/seller",
    label: "Vendedores",
    icon: sellerIcon,
    roles: getAllowedRoles("/seller"),
  },
  {
    path: "/sales",
    label: "Ventas",
    icon: cartIcon,
    roles: getAllowedRoles("/sales"),
  },
  {
    path: "/shipping",
    label: "Pedidos",
    icon: shippingIcon,
    roles: getAllowedRoles("/shipping"),
  },
  {
    path: "/financeFlux",
    label: "Flujo Financiero",
    icon: financeFluxIcon,
    roles: getAllowedRoles("/financeFlux"),
  },
  {
    path: "/stock",
    label: "Stock",
    icon: stockManagementIcon,
    roles: getAllowedRoles("/stock"),
  },
  {
    path: "/shop",
    label: "Vender",
    icon: cartIcon,
    roles: getAllowedRoles("/shop"),
  },
  {
    path: "/seller-info",
    label: "Mi Informacion",
    icon: sellerIcon,
    roles: getAllowedRoles("/seller-info"),
  },
  {
    path: "/stats",
    label: "Gestión Empresarial",
    icon: statsIcon,
    roles: getAllowedRoles("/stats"),
  },
  {
    path: "/cash",
    label: "Reconciliacion de Caja",
    icon: boxIcon,
    roles: getAllowedRoles("/cash"),
  },
  {
    path: "/branch",
    label: "Sucursales",
    icon: branchIcon,
    roles: getAllowedRoles("/branch"),
    hiddenInMenuForRoles: ["admin"],
  },
  {
    path: "/sales-history",
    label: "Historial de Ventas",
    icon: salesHistoryIcon,
    roles: getAllowedRoles("/sales-history"),
    hiddenInMenuForRoles: ["admin", "operator"],
  },
  {
    path: "/user",
    label: "Usuarios",
    icon: sellerIcon,
    roles: getAllowedRoles("/user"),
  },
  {
    path: "/attendance",
    label: "Asistencia",
    icon: attendanceClockIcon,
    roles: getAllowedRoles("/attendance"),
    requiresSuperadmin: true,
    hiddenInMenuForRoles: ["admin"],
  },
  {
    path: "/servicesPage",
    label: "Comunicados y Tutoriales",
    icon: servicesIcon,
    roles: getAllowedRoles("/servicesPage"),
    hiddenInMenuForRoles: ["admin"],
  },
  {
    path: "/simple-packages",
    label: "Paquetes",
    icon: boxIcon,
    roles: getAllowedRoles("/simple-packages"),
  },
  {
    path: "/shipping-guide",
    label: "Guías y Listas de ingresos",
    icon: paperNoteIcon,
    roles: getAllowedRoles("/shipping-guide"),
  },
  {
    path: "/seller-product-info",
    label: "Informacion Productos",
    icon: infoProductIcon,
    roles: getAllowedRoles("/seller-product-info"),
  },
  {
    path: "/seller-promotions",
    label: "Promociones",
    icon: tagIcon,
    roles: getAllowedRoles("/seller-promotions"),
    hiddenInMenuForRoles: ["seller", "admin", "operator"],
  },
  {
    path: "/admin-seller-product-info",
    label: "Productos Clientes",
    icon: infoProductIcon,
    roles: getAllowedRoles("/admin-seller-product-info"),
    hiddenInMenuForRoles: ["admin"],
  },
  {
    path: "/superadmin-variants",
    label: "Control Variantes",
    icon: superadminVariantsIcon,
    roles: getAllowedRoles("/superadmin-variants"),
    requiresSuperadmin: true,
    hiddenInMenuForRoles: ["admin"],
  },
  {
    path: "/inventory-audit",
    label: "Auditoria Stock",
    icon: historyIcon,
    roles: getAllowedRoles("/inventory-audit"),
    requiresSuperadmin: true,
    hiddenInMenuForRoles: ["admin"],
  },
];
