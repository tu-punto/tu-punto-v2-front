import boxIcon from "../assets/boxIcon.svg";
import sellerIcon from "../assets/sellersIcon.svg";
import cartIcon from "../assets/cartIcon.svg";
import shippingIcon from "../assets/shippingIcon.svg";
import financeFluxIcon from "../assets/financeFluxIcon.svg";
import stockManagementIcon from "../assets/stockManagement.svg";
import statsIcon from "../assets/statsIcon.svg";
import branchIcon from "../assets/branchIcon.svg";

export const menu = [
  // {
  //   path: "/product",
  //   label: "Inventario",
  //   icon: boxIcon,
  //   roles: ["admin"],
  // },
  { path: "/seller", label: "Vendedores", icon: sellerIcon, roles: ["admin"] },
  { path: "/sellerFactura", label: "Vendedores de Factura", icon: sellerIcon, roles: ["admin"] },
  { path: "/sales", label: "Ventas", icon: cartIcon, roles: ["admin"] },
  { path: "/shipping", label: "Pedidos", icon: shippingIcon, roles: ["admin"] },
  {
    path: "/financeFlux",
    label: "Flujo Financiero",
    icon: financeFluxIcon,
    roles: ["admin"],
  },
  {
    path: "/stock",
    label: "Stock",
    icon: stockManagementIcon,
    roles: ["admin", "seller"],
  },
  {
    path: "/shop",
    label: "Comprar",
    icon: cartIcon,
    roles: ["seller"],
  },
  {
    path: "/seller-info",
    label: "Mi Información",
    icon: sellerIcon,
    roles: ["seller"],
  },
  {
    path: "/stats",
    label: "Estadísticas",
    icon: statsIcon,
    roles: ["admin"],
  },
  {
    path: "/cash",
    label: "Reconciliación de Caja",
    icon: boxIcon,
    roles: ["admin"],
  },
  {
    path: "/cierreCaja",
    label: "Reconciliación de Caja",
    icon: boxIcon,
    roles: ["admin"],
  },
  {
    path: "/branch",
    label: "Sucursales",
    icon: branchIcon,
    roles: ["admin"],
  },
];
