import { Button, Space, Tag, Tour, Typography, message } from "antd";
import type { TourStepProps } from "antd";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from "@ant-design/icons";
import { completeTourAPI, getMyTourProgressAPI, type TourProgressMap } from "../api/userTourProgress";
import { getVisibleMenuItems } from "../utils/navigationMenu";
import { normalizeRole } from "../utils/role";
import { UserContext } from "./userContext";
import "./tourContext.css";

type TourDevice = "desktop" | "mobile";
type TourKey =
  | "seller-welcome"
  | "seller-simple-deliveries"
  | "seller-stock-shipping-guide"
  | "seller-stock-deliveries"
  | "seller-stock-withdrawal-request"
  | "seller-catalog-product-info"
  | "seller-promotions-create"
  | "staff-operator-sales"
  | "staff-stock-ingress"
  | "staff-product-create"
  | "staff-branch-transfer"
  | "staff-variant-create"
  | "staff-external-delivery-create";
type TourRole = "admin" | "operator" | "seller";
type TourStatus = "unseen" | "seen";

type TourMenuItem = {
  key: TourKey;
  title: string;
  description: string;
  status: TourStatus;
  canAutoLaunch: boolean;
  route?: string;
};

type TourStepSpec = {
  title: string;
  description: ReactNode;
  targetId?: string;
  placement?: TourStepProps["placement"];
  onEnter?: () => void;
};

type ResolvedTourStep = TourStepProps & {
  targetId?: string;
  onEnter?: () => void;
};

type TourDefinition = {
  key: TourKey;
  title: string;
  description: string;
  roles: TourRole[];
  autoLaunch: boolean;
  route?: string;
  buildSteps: (params: {
    device: TourDevice;
    dismiss: () => void;
    user: any;
    navigate: ReturnType<typeof useNavigate>;
  }) => TourStepSpec[];
};

type ActiveTourState = {
  key: TourKey;
  title: string;
  steps: ResolvedTourStep[];
};

type TourContextValue = {
  tours: TourMenuItem[];
  loading: boolean;
  activeTourKey: TourKey | null;
  openTour: (tourKey: TourKey, source?: "manual" | "auto") => void;
  dismissActiveTour: () => void;
};

const TOUR_SESSION_PREFIX = "tp-tour-session-dismissed";

const sellerMenuDescriptions: Record<string, string> = {
  "/seller": "Administra tus datos y consulta el estado general de tu cuenta de vendedor.",
  "/shop": "Aquí registras ventas y mueves el flujo comercial principal.",
  "/seller-info": "Revisa tu perfil, pagos, datos de contacto y detalles de tu servicio.",
  "/servicesPage": "Aquí tienes comunicados y tutoriales para resolver dudas rápidas.",
  "/simple-packages": "Crea y gestiona entregas simples o paquetes entre sucursales.",
  "/shipping-guide": "Consulta o sube guías de envío según el servicio habilitado.",
  "/seller-dashboard": "Mira tus indicadores y un resumen rápido de tu operación.",
  "/seller-product-info": "Completa y mejora la información de tus productos.",
  "/sales-history": "Revisa tu historial de ventas y movimientos anteriores.",
  "/shipping": "Consulta pedidos vinculados a tu operación cuando el acceso aplica.",
  "/stock": "Administra tu stock disponible cuando este módulo esté habilitado.",
};

const dispatchWindowEvent = (eventName: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(eventName));
};

const closeTourDemoSurfaces = () => {
  [
    "tp-tour-close-shipping-guide-modal",
    "tp-tour-close-sales-demo-modals",
    "tp-tour-close-stock-demo-modals",
    "tp-tour-close-shipping-demo-modals",
    "tp-tour-close-seller-product-info-modal",
    "tp-tour-close-promotions-modal",
  ].forEach(dispatchWindowEvent);
};

const buildStepDescription = ({
  text,
  dismiss,
  hint,
  demo,
}: {
  text: string;
  dismiss: () => void;
  hint?: string;
  demo?: Array<{ label: string; value: string }>;
}) => (
  <>
    <div>{text}</div>
    {demo?.length ? (
      <div className="tp-tour-demo-values" aria-label="Valores de ejemplo">
        {demo.map((item) => (
          <div className="tp-tour-demo-value" key={`${item.label}-${item.value}`}>
            <span className="tp-tour-demo-label">{item.label}</span>
            <span className="tp-tour-demo-text">{item.value}</span>
          </div>
        ))}
      </div>
    ) : null}
    {hint ? <div className="tp-tour-step-hint">{hint}</div> : null}
    <div style={{ marginTop: 10 }}>
      <Button
        type="link"
        size="small"
        onClick={dismiss}
        className="tp-tour-skip-btn"
        style={{ paddingInline: 12 }}
      >
        Saltar este tour
      </Button>
    </div>
  </>
);

const buildSellerNavigationSteps = ({
  device,
  dismiss,
  user,
}: {
  device: TourDevice;
  dismiss: () => void;
  user: any;
}) => {
  const visibleItems = getVisibleMenuItems(user).filter((item) => item.path !== "/seller-promotions");

  if (device === "mobile") {
    const bottomPaths = new Set(["/shipping", "/simple-packages", "/shop"]);
    const bottomItems = visibleItems.filter((item) => bottomPaths.has(item.path));
    const plusItems = visibleItems.filter((item) => !bottomPaths.has(item.path));
    const steps: TourStepSpec[] = [];

    bottomItems.forEach((item) => {
      steps.push({
        title: item.label,
        targetId: `mobile-menu-link-${item.path.replace(/^\//, "")}`,
        placement: "top",
        description: buildStepDescription({
          text:
            sellerMenuDescriptions[item.path] || `Desde aquí ingresas al módulo de ${item.label.toLowerCase()}.`,
          dismiss,
        }),
        onEnter: () => dispatchWindowEvent("tp-tour-close-mobile-plus"),
      });
    });

    if (plusItems.length) {
      steps.push({
        title: "Más opciones",
        targetId: "mobile-menu-plus",
        placement: "top",
        description: buildStepDescription({
          text: "Este botón abre el resto de accesos disponibles para tu cuenta de vendedor.",
          dismiss,
        }),
        onEnter: () => dispatchWindowEvent("tp-tour-close-mobile-plus"),
      });

      plusItems.forEach((item) => {
        steps.push({
          title: item.label,
          targetId: `mobile-plus-link-${item.path.replace(/^\//, "")}`,
          placement: "top",
          description: buildStepDescription({
            text:
              sellerMenuDescriptions[item.path] || `Desde aquí ingresas al módulo de ${item.label.toLowerCase()}.`,
            dismiss,
            hint: "Si una opción no aparece, ese servicio todavía no está habilitado para este vendedor.",
          }),
          onEnter: () => dispatchWindowEvent("tp-tour-open-mobile-plus"),
        });
      });
    }

    return steps;
  }

  return visibleItems.map((item) => ({
    title: item.label,
    targetId: `sidebar-link-${item.path.replace(/^\//, "")}`,
    placement: "right" as TourStepProps["placement"],
    description: buildStepDescription({
      text:
        sellerMenuDescriptions[item.path] || `Desde aquí ingresas al módulo de ${item.label.toLowerCase()}.`,
      dismiss,
    }),
  }));
};

const tourDefinitions: TourDefinition[] = [
  {
    key: "seller-welcome",
    title: "Bienvenida vendedor",
    description: "Ubica ayuda rápida, notificaciones y tu navegación principal.",
    roles: ["seller"],
    autoLaunch: true,
    buildSteps: ({ device, dismiss, user }) => {
      const navigationSteps = buildSellerNavigationSteps({ device, dismiss, user });

      if (device === "mobile") {
        return [
          {
            title: "Bienvenida",
            description: buildStepDescription({
              text: "Te muestro los accesos básicos para orientarte rápido dentro del sistema.",
              dismiss,
            }),
          },
          {
            title: "Tours rápidos",
            description: buildStepDescription({
              text: "Desde aquí puedes repetir este tour cuando quieras. Los que termines quedarán como vistos.",
              dismiss,
            }),
            targetId: "tour-quick-menu-trigger-mobile",
            placement: "bottom",
          },
          {
            title: "Notificaciones",
            description: buildStepDescription({
              text: "Aquí verás avisos operativos y comunicados importantes del servicio.",
              dismiss,
            }),
            targetId: "notification-bell-trigger-mobile",
            placement: "bottom",
          },
          {
            title: "Menú principal",
            description: buildStepDescription({
              text: "Usa este botón para abrir el menú lateral y encontrar secciones como tu información y tutoriales.",
              dismiss,
            }),
            targetId: "mobile-header-menu-trigger",
            placement: "bottomLeft",
          },
          ...navigationSteps,
          {
            title: "Listo",
            description: buildStepDescription({
              text: "Puedes volver a abrir este tour desde Tours rápidos cuando lo necesites.",
              dismiss,
            }),
          },
        ];
      }

      return [
        {
          title: "Bienvenida",
          description: buildStepDescription({
            text: "Te muestro los accesos básicos para orientarte rápido dentro del sistema.",
            dismiss,
          }),
        },
        {
          title: "Tours rápidos",
          description: buildStepDescription({
            text: "Desde aquí puedes repetir este tour cuando quieras. Los que termines quedarán como vistos.",
            dismiss,
          }),
          targetId: "tour-quick-menu-trigger-desktop",
          placement: "bottom",
        },
        {
          title: "Notificaciones",
          description: buildStepDescription({
            text: "Aquí verás avisos operativos y comunicados importantes del servicio.",
            dismiss,
          }),
          targetId: "notification-bell-trigger-desktop",
          placement: "bottom",
        },
        ...navigationSteps,
        {
          title: "Listo",
          description: buildStepDescription({
            text: "Puedes volver a abrir este tour desde Tours rápidos cuando lo necesites.",
            dismiss,
          }),
        },
      ];
    },
  },
  {
    key: "seller-simple-deliveries",
    title: "Registro de entregas simples",
    description: "Aprende el flujo para crear paquetes simples sin usar datos reales.",
    roles: ["seller"],
    autoLaunch: true,
    route: "/simple-packages",
    buildSteps: ({ dismiss }) => [
      {
        title: "Entregas simples",
        targetId: "simple-packages-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Aqui registras paquetes simples para enviarlos entre sucursales.",
          dismiss,
        }),
      },
      {
        title: "Racha mensual",
        targetId: "simple-packages-monthly-streak",
        placement: "bottom",
        description: buildStepDescription({
          text: "La racha mensual muestra cuantos paquetes llevas registrados este mes y cuanto falta para llegar al siguiente rango de precio.",
          dismiss,
        }),
      },
      {
        title: "Cantidad y ruta",
        targetId: "simple-packages-route",
        placement: "bottom",
        description: buildStepDescription({
          text: "Primero defines cuantos paquetes crearas y de que sucursal salen hacia que destino.",
          dismiss,
          demo: [
            { label: "Paquetes", value: "2" },
            { label: "Origen", value: "Sucursal Central" },
            { label: "Destino", value: "Sucursal Norte" },
          ],
        }),
      },
      {
        title: "Descripcion general",
        targetId: "simple-packages-description",
        placement: "bottom",
        description: buildStepDescription({
          text: "Si varios paquetes comparten descripcion, puedes escribirla una vez y aplicarla a todos.",
          dismiss,
          demo: [{ label: "Descripcion", value: "Ropa y accesorios pequenos" }],
        }),
      },
      {
        title: "Detalle por paquete",
        targetId: "simple-packages-table",
        placement: "top",
        description: buildStepDescription({
          text: "Luego completas o ajustas los datos de cada paquete antes de guardar.",
          dismiss,
          demo: [
            { label: "Comprador", value: "Maria Lopez" },
            { label: "Celular", value: "70000000" },
            { label: "Saldo", value: "Bs. 85" },
          ],
        }),
      },
      {
        title: "Guardar paquetes",
        targetId: "simple-packages-save",
        placement: "top",
        description: buildStepDescription({
          text: "Cuando todo este correcto, este boton registra los paquetes reales. El tour solo muestra ejemplos, no guarda nada.",
          dismiss,
        }),
      },
      {
        title: "Pedidos pendientes",
        targetId: "simple-packages-pending-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Desde aqui puedes ver tus paquetes pendientes y modificarlos antes de que sean aprobados o procesados por operaciones.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "seller-stock-shipping-guide",
    title: "Subir guia de envio de stock",
    description: "Ubica donde subir y revisar guias de envio de stock.",
    roles: ["seller"],
    autoLaunch: true,
    route: "/shipping-guide",
    buildSteps: ({ dismiss }) => [
      {
        title: "Guias de envio",
        targetId: "shipping-guide-header",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este modulo concentra las guias de envio relacionadas a tu operacion.",
          dismiss,
        }),
      },
      {
        title: "Subir nueva guia",
        targetId: "shipping-guide-upload-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Desde aqui abres el formulario para cargar una nueva guia cuando corresponda.",
          dismiss,
        }),
      },
      {
        title: "Formulario de guia",
        targetId: "shipping-guide-upload-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-shipping-guide-modal"),
        description: buildStepDescription({
          text: "En este modal seleccionas la sucursal, agregas una descripcion opcional y adjuntas la foto de la guia. El tour no guarda la guia.",
          dismiss,
          demo: [
            { label: "Sucursal", value: "Sucursal actual" },
            { label: "Archivo", value: "Foto de guia" },
          ],
        }),
      },
      {
        title: "Guias registradas",
        targetId: "shipping-guide-table",
        placement: "top",
        onEnter: () => dispatchWindowEvent("tp-tour-close-shipping-guide-modal"),
        description: buildStepDescription({
          text: "En esta tabla revisas las guias ya cargadas y su informacion principal.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "seller-stock-deliveries",
    title: "Registro de entregas con stock",
    description: "Aprende como seleccionar productos de stock y preparar la entrega.",
    roles: ["seller"],
    autoLaunch: true,
    route: "/shop",
    buildSteps: ({ dismiss }) => [
      {
        title: "Carrito con stock",
        targetId: "sales-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Aqui preparas entregas usando productos disponibles en tu stock.",
          dismiss,
        }),
      },
      {
        title: "Inventario",
        targetId: "sales-inventory-card",
        placement: "right",
        description: buildStepDescription({
          text: "Busca el producto, filtra por sucursal si aplica y agrega lo que ira en la entrega.",
          dismiss,
          demo: [
            { label: "Producto", value: "Polera negra M" },
            { label: "Cantidad", value: "1" },
          ],
        }),
      },
      {
        title: "Carrito",
        targetId: "sales-cart-card",
        placement: "left",
        description: buildStepDescription({
          text: "Aqui se arma el detalle de productos seleccionados antes de crear la entrega.",
          dismiss,
          demo: [
            { label: "Precio", value: "Bs. 120" },
            { label: "Utilidad", value: "Segun comision" },
          ],
        }),
      },
      {
        title: "Realizar entrega",
        targetId: "sales-delivery-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Cuando el carrito esta listo, este boton abre el formulario final de entrega.",
          dismiss,
        }),
      },
      {
        title: "Datos del cliente",
        targetId: "delivery-form-client",
        placement: "right",
        onEnter: () => dispatchWindowEvent("tp-tour-open-delivery-modal"),
        description: buildStepDescription({
          text: "Aqui se coloca el nombre del cliente y su celular. Estos datos ayudan a ubicar al comprador si hay dudas con la entrega.",
          dismiss,
          demo: [
            { label: "Cliente", value: "Carlos Rojas" },
            { label: "Celular", value: "70000000" },
          ],
        }),
      },
      {
        title: "Fecha y horario",
        targetId: "delivery-form-order",
        placement: "right",
        description: buildStepDescription({
          text: "Define la fecha de entrega y, si corresponde, una hora especifica o rango horario acordado con el cliente.",
          dismiss,
          demo: [
            { label: "Fecha", value: "Hoy o fecha pactada" },
            { label: "Hora", value: "Opcional" },
          ],
        }),
      },
      {
        title: "Destino de entrega",
        targetId: "delivery-form-destination",
        placement: "right",
        description: buildStepDescription({
          text: "Elige si el pedido se queda en esta sucursal, va a otra sucursal o se entrega en otro lugar. Esto define donde queda asignado el cobro.",
          dismiss,
          demo: [
            { label: "Esta sucursal", value: "Retiro local" },
            { label: "Otro lugar", value: "Direccion cliente" },
          ],
        }),
      },
      {
        title: "Pago y saldo",
        targetId: "delivery-form-payment",
        placement: "right",
        description: buildStepDescription({
          text: "Marca si ya esta pagado, si queda saldo pendiente o si hay adelanto. Si se entrega al momento, selecciona tambien el metodo de pago.",
          dismiss,
          demo: [
            { label: "Estado", value: "No / Si / Adelanto" },
            { label: "Pago", value: "Efectivo, QR o mixto" },
          ],
        }),
      },
      {
        title: "Guardar entrega",
        targetId: "delivery-form-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Solo al presionar Guardar se crea la entrega real. En este tour no se guarda nada.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "seller-stock-withdrawal-request",
    title: "Solicitud de salida de stock",
    description: "Ubica el flujo para pedir salida de productos de tu inventario.",
    roles: ["seller"],
    autoLaunch: true,
    route: "/stock",
    buildSteps: ({ dismiss }) => [
      {
        title: "Stock disponible",
        targetId: "stock-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este modulo muestra los productos y variantes disponibles para tu cuenta.",
          dismiss,
        }),
      },
      {
        title: "Filtros",
        targetId: "stock-seller-filters",
        placement: "bottom",
        description: buildStepDescription({
          text: "Puedes cambiar sucursal, categoria o buscar productos para encontrar lo que necesitas.",
          dismiss,
        }),
      },
      {
        title: "Solicitar salida",
        targetId: "stock-withdrawal-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este boton inicia una solicitud para retirar productos del stock seleccionado.",
          dismiss,
        }),
      },
      {
        title: "Modal de solicitud",
        targetId: "stock-withdrawal-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-withdrawal-modal"),
        description: buildStepDescription({
          text: "En este modal eliges sucursal, productos, cantidades y un comentario para pedir la salida. El tour no guarda la solicitud.",
          dismiss,
          demo: [
            { label: "Sucursal", value: "Sucursal actual" },
            { label: "Cantidad", value: "2 unidades" },
          ],
        }),
      },
      {
        title: "Listado de productos",
        targetId: "stock-seller-products",
        placement: "top",
        onEnter: () => dispatchWindowEvent("tp-tour-close-stock-demo-modals"),
        description: buildStepDescription({
          text: "Desde la lista revisas stock y detalles de productos antes de solicitar una salida.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "seller-catalog-product-info",
    title: "Subir productos al catalogo",
    description: "Guia para completar descripcion, imagenes y datos que se muestran en catalogo.",
    roles: ["seller"],
    autoLaunch: true,
    route: "/seller-product-info",
    buildSteps: ({ dismiss }) => [
      {
        title: "Informacion para catalogo",
        targetId: "seller-product-info-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Esta pantalla solo aparece para vendedores habilitados para catalogo. Desde aqui mejoras lo que vera el cliente final.",
          dismiss,
        }),
      },
      {
        title: "Filtros de productos",
        targetId: "seller-product-info-filters",
        placement: "bottom",
        description: buildStepDescription({
          text: "Busca por producto, sucursal, categoria o estado para encontrar rapido las variantes que necesitan informacion.",
          dismiss,
          demo: [
            { label: "Busqueda", value: "Nombre o uso" },
            { label: "Filtros", value: "Stock, imagenes, descripcion" },
          ],
        }),
      },
      {
        title: "Semaforo de informacion",
        targetId: "seller-product-info-legend",
        placement: "left",
        description: buildStepDescription({
          text: "El color te indica prioridad: rojo sin informacion, amarillo incompleto y verde listo para mostrarse mejor.",
          dismiss,
          demo: [
            { label: "Rojo", value: "Falta descripcion e imagen" },
            { label: "Verde", value: "Completo" },
          ],
        }),
      },
      {
        title: "Lista de variantes",
        targetId: "seller-product-info-table",
        placement: "top",
        description: buildStepDescription({
          text: "Cada fila representa una variante. Revisa descripcion, uso, imagenes, promocion y usa el lapiz para actualizar.",
          dismiss,
        }),
      },
      {
        title: "Editar variante",
        targetId: "seller-product-info-edit-action",
        placement: "left",
        description: buildStepDescription({
          text: "Este boton abre el formulario de informacion de la variante seleccionada.",
          dismiss,
        }),
      },
      {
        title: "Descripcion clara",
        targetId: "seller-product-info-edit-description",
        placement: "right",
        onEnter: () => dispatchWindowEvent("tp-tour-open-seller-product-info-modal"),
        description: buildStepDescription({
          text: "Resume el producto como lo leeria un comprador: material, estilo, medidas o detalle importante.",
          dismiss,
          demo: [{ label: "Ejemplo", value: "Tela suave, corte amplio" }],
        }),
      },
      {
        title: "Uso recomendado",
        targetId: "seller-product-info-edit-usage",
        placement: "right",
        description: buildStepDescription({
          text: "Activa el uso solo si aporta valor: cuidados, modo de uso o recomendacion para elegir mejor.",
          dismiss,
          demo: [{ label: "Uso", value: "Ideal para clima frio" }],
        }),
      },
      {
        title: "Imagenes",
        targetId: "seller-product-info-edit-images",
        placement: "right",
        description: buildStepDescription({
          text: "Sube imagenes claras. La primera queda como principal, asi que pon ahi la foto mas representativa.",
          dismiss,
          demo: [
            { label: "Maximo", value: "4 imagenes" },
            { label: "Principal", value: "Primera tarjeta" },
          ],
        }),
      },
      {
        title: "Guardar cambios",
        targetId: "seller-product-info-edit-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Este boton guarda la informacion real. En el tour solo se muestra el flujo y no se presiona guardar.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "seller-promotions-create",
    title: "Crear promociones",
    description: "Guia para entrar desde stock y crear promociones por variante.",
    roles: ["seller"],
    autoLaunch: true,
    route: "/stock",
    buildSteps: ({ dismiss, navigate }) => [
      {
        title: "Stock del vendedor",
        targetId: "stock-root",
        placement: "bottom",
        onEnter: () => dispatchWindowEvent("tp-tour-close-promotions-modal"),
        description: buildStepDescription({
          text: "Las promociones se crean desde tu stock porque se aplican a productos y variantes existentes.",
          dismiss,
        }),
      },
      {
        title: "Entrar a promociones",
        targetId: "stock-seller-promotions-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Usa este boton para ir a la pantalla donde administras descuentos y precios promocionales.",
          dismiss,
        }),
      },
      {
        title: "Pantalla de promociones",
        targetId: "seller-promotions-root",
        placement: "bottom",
        onEnter: () => navigate("/seller-promotions"),
        description: buildStepDescription({
          text: "Aqui ves tus promociones activas, programadas y por canal. El tour te guia sin crear nada real.",
          dismiss,
        }),
      },
      {
        title: "Resumen y accion principal",
        targetId: "seller-promotions-hero",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este bloque resume el modulo. Nueva promocion abre el formulario para configurar una rebaja.",
          dismiss,
        }),
      },
      {
        title: "Filtros",
        targetId: "seller-promotions-filters",
        placement: "bottom",
        description: buildStepDescription({
          text: "Filtra por texto, canal y estado para revisar promociones antes de crear o editar una.",
          dismiss,
          demo: [
            { label: "Canal", value: "Interno, catalogo o ambos" },
            { label: "Estado", value: "Activa, borrador" },
          ],
        }),
      },
      {
        title: "Nueva promocion",
        targetId: "seller-promotions-create-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este boton abre el formulario. En el tour se abre como demostracion y no se guarda.",
          dismiss,
        }),
      },
      {
        title: "Seleccionar variante",
        targetId: "seller-promotions-form-selection",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-promotions-modal"),
        description: buildStepDescription({
          text: "Busca el producto o variante exacta. La promocion se aplica a esa combinacion, no a todo el inventario.",
          dismiss,
          demo: [{ label: "Variante", value: "Polera negra / M" }],
        }),
      },
      {
        title: "Canal y estado",
        targetId: "seller-promotions-form-scope",
        placement: "left",
        description: buildStepDescription({
          text: "Define si aplica al sistema interno, catalogo o ambos, y si queda activa o como borrador.",
          dismiss,
          demo: [
            { label: "Canal", value: "Ambos" },
            { label: "Estado", value: "Activa" },
          ],
        }),
      },
      {
        title: "Tipo y precio",
        targetId: "seller-promotions-form-pricing",
        placement: "left",
        description: buildStepDescription({
          text: "Elige precio fijo para una rebaja directa o por cantidad si quieres escalas como 3+ unidades a menor precio.",
          dismiss,
          demo: [
            { label: "Fijo", value: "Bs. 95" },
            { label: "Escala", value: "3+ unidades" },
          ],
        }),
      },
      {
        title: "Vigencia",
        targetId: "seller-promotions-form-dates",
        placement: "left",
        description: buildStepDescription({
          text: "Configura inicio y fin para evitar promociones vencidas o abiertas por error.",
          dismiss,
          demo: [
            { label: "Inicio", value: "Hoy" },
            { label: "Fin", value: "Fecha limite" },
          ],
        }),
      },
      {
        title: "Vista previa",
        targetId: "seller-promotions-preview",
        placement: "left",
        description: buildStepDescription({
          text: "Usa la vista previa para validar el precio efectivo antes de guardar la promocion real.",
          dismiss,
        }),
      },
      {
        title: "Crear promocion",
        targetId: "seller-promotions-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Al confirmar se crea la promocion real. Durante el tour no se presiona este boton.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "staff-operator-sales",
    title: "Ventas operario",
    description: "Guia para registrar ventas desde el carrito operativo.",
    roles: ["admin", "operator"],
    autoLaunch: true,
    route: "/sales",
    buildSteps: ({ dismiss }) => [
      {
        title: "Modulo de ventas",
        targetId: "sales-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Aqui el encargado arma ventas o entregas usando el inventario disponible.",
          dismiss,
        }),
      },
      {
        title: "Inventario",
        targetId: "sales-inventory-card",
        placement: "right",
        description: buildStepDescription({
          text: "Busca productos, filtra si corresponde y agrega los items al carrito.",
          dismiss,
          demo: [
            { label: "Producto", value: "Polera negra M" },
            { label: "Cantidad", value: "1" },
          ],
        }),
      },
      {
        title: "Carrito de venta",
        targetId: "sales-cart-card",
        placement: "left",
        description: buildStepDescription({
          text: "En esta zona revisas cantidades, precios y totales antes de confirmar.",
          dismiss,
          demo: [
            { label: "Precio", value: "Bs. 120" },
            { label: "Total", value: "Bs. 120" },
          ],
        }),
      },
      {
        title: "Realizar venta",
        targetId: "sales-sale-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este boton abre el formulario final para registrar la venta.",
          dismiss,
        }),
      },
      {
        title: "Modal de venta",
        targetId: "sales-sale-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-sales-modal"),
        description: buildStepDescription({
          text: "El modal de venta sirve para registrar el cobro directo y su tipo de pago. En el tour no se registra nada real.",
          dismiss,
          demo: [
            { label: "Pago", value: "Efectivo / QR" },
            { label: "Total", value: "Bs. 120" },
          ],
        }),
      },
      {
        title: "Tipo de pago",
        targetId: "sales-sale-modal-payment",
        placement: "left",
        description: buildStepDescription({
          text: "Selecciona como se cobro la venta. Si eliges efectivo + QR, revisa que los subtotales sumen el total.",
          dismiss,
          demo: [
            { label: "QR", value: "Pago digital" },
            { label: "Mixto", value: "Efectivo + QR" },
          ],
        }),
      },
      {
        title: "Registrar venta",
        targetId: "sales-sale-modal-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Este boton registra la venta real. El tour solo muestra el flujo y no presiona el guardado.",
          dismiss,
        }),
      },
      {
        title: "Realizar entrega",
        targetId: "sales-delivery-button",
        placement: "bottom",
        onEnter: () => dispatchWindowEvent("tp-tour-close-sales-demo-modals"),
        description: buildStepDescription({
          text: "Si necesitas despacho, usa Realizar Entrega para cargar cliente, destino y datos de pago.",
          dismiss,
        }),
      },
      {
        title: "Modal de entrega",
        targetId: "sales-delivery-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-delivery-modal"),
        description: buildStepDescription({
          text: "Aqui se completan datos de cliente, fecha, destino, pago y observaciones. El tour no crea una entrega real.",
          dismiss,
          demo: [
            { label: "Cliente", value: "Carlos Rojas" },
            { label: "Destino", value: "Otra sucursal" },
          ],
        }),
      },
      {
        title: "Cliente de la entrega",
        targetId: "delivery-form-client",
        placement: "right",
        description: buildStepDescription({
          text: "Completa nombre y celular del cliente para que el equipo pueda contactar y validar la entrega.",
          dismiss,
          demo: [
            { label: "Cliente", value: "Carlos Rojas" },
            { label: "Celular", value: "70000000" },
          ],
        }),
      },
      {
        title: "Destino y fecha",
        targetId: "delivery-form-order",
        placement: "right",
        description: buildStepDescription({
          text: "Define cuando se entrega y hacia donde va. La opcion de destino afecta el flujo operativo y el cobro.",
          dismiss,
          demo: [
            { label: "Fecha", value: "Fecha pactada" },
            { label: "Destino", value: "Sucursal o direccion" },
          ],
        }),
      },
      {
        title: "Pago de la entrega",
        targetId: "delivery-form-payment",
        placement: "right",
        description: buildStepDescription({
          text: "Revisa si el pedido esta pagado, pendiente o con adelanto, y completa el metodo de pago cuando corresponda.",
          dismiss,
          demo: [
            { label: "Estado", value: "En espera / Entregado" },
            { label: "Saldo", value: "Calculado automatico" },
          ],
        }),
      },
      {
        title: "Guardar entrega",
        targetId: "delivery-form-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Este boton crea la entrega real. Durante el tour solo se muestra donde queda.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "staff-stock-ingress",
    title: "Registrar ingreso de stock",
    description: "Ubica como seleccionar vendedor, cargar ingresos y confirmar stock.",
    roles: ["admin", "operator"],
    autoLaunch: true,
    route: "/stock",
    buildSteps: ({ dismiss }) => [
      {
        title: "Gestion de stock",
        targetId: "stock-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Desde aqui administras inventario por vendedor, sucursal y producto.",
          dismiss,
        }),
      },
      {
        title: "Seleccionar vendedor",
        targetId: "stock-admin-seller-selector",
        placement: "bottom",
        description: buildStepDescription({
          text: "Primero selecciona el vendedor al que se le registrara el ingreso de stock.",
          dismiss,
        }),
      },
      {
        title: "Ingresos por producto",
        targetId: "stock-products-table",
        placement: "top",
        description: buildStepDescription({
          text: "En la tabla se cargan las cantidades de ingreso por producto o variante.",
          dismiss,
          demo: [
            { label: "Variante", value: "Negro / M" },
            { label: "Ingreso", value: "10 unidades" },
          ],
        }),
      },
      {
        title: "Actualizar stock",
        targetId: "stock-ingress-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Al confirmar, se revisan los cambios antes de guardarlos. El tour no modifica el stock real.",
          dismiss,
        }),
      },
      {
        title: "Confirmar cambios",
        targetId: "stock-ingress-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-stock-ingress-modal"),
        description: buildStepDescription({
          text: "Antes de guardar, el sistema muestra un resumen de ingresos y cambios para confirmar. El tour no guarda stock.",
          dismiss,
          demo: [
            { label: "Ingreso", value: "10 unidades" },
            { label: "Accion", value: "Confirmar cambios" },
          ],
        }),
      },
    ],
  },
  {
    key: "staff-product-create",
    title: "Registrar nuevo producto",
    description: "Guia rapida para iniciar el alta de un producto.",
    roles: ["admin", "operator"],
    autoLaunch: true,
    route: "/stock",
    buildSteps: ({ dismiss }) => [
      {
        title: "Stock",
        targetId: "stock-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Los productos se crean desde el modulo de stock para asociarlos al vendedor correcto.",
          dismiss,
        }),
      },
      {
        title: "Vendedor",
        targetId: "stock-admin-seller-selector",
        placement: "bottom",
        description: buildStepDescription({
          text: "Selecciona el vendedor antes de crear el producto para que quede asociado correctamente.",
          dismiss,
        }),
      },
      {
        title: "Agregar producto",
        targetId: "stock-product-create-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este boton abre el formulario del producto nuevo.",
          dismiss,
          demo: [
            { label: "Producto", value: "Polera basica" },
            { label: "Categoria", value: "Ropa" },
          ],
        }),
      },
      {
        title: "Formulario de producto",
        targetId: "stock-product-create-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-product-modal"),
        description: buildStepDescription({
          text: "En este modal cargas nombre, categoria y variantes iniciales del producto. El tour no guarda productos.",
          dismiss,
          demo: [
            { label: "Nombre", value: "Polera basica" },
            { label: "Variante", value: "Color / Talla" },
          ],
        }),
      },
      {
        title: "Nombre del producto",
        targetId: "stock-product-name-field",
        placement: "left",
        description: buildStepDescription({
          text: "Escribe un nombre claro y facil de buscar. Evita mezclar talla o color aqui si eso se manejara como variante.",
          dismiss,
          demo: [{ label: "Nombre", value: "Polera basica" }],
        }),
      },
      {
        title: "Categoria",
        targetId: "stock-product-category-field",
        placement: "left",
        description: buildStepDescription({
          text: "La categoria ayuda a filtrar el inventario y el catalogo. Selecciona la opcion mas cercana al producto.",
          dismiss,
          demo: [{ label: "Categoria", value: "Ropa" }],
        }),
      },
      {
        title: "Variantes iniciales",
        targetId: "stock-product-variants-field",
        placement: "left",
        description: buildStepDescription({
          text: "Aqui defines combinaciones como Color y Talla, luego asignas stock y precio por cada combinacion generada.",
          dismiss,
          demo: [
            { label: "Variante", value: "Color: Negro" },
            { label: "Subvariante", value: "Talla: M" },
          ],
        }),
      },
      {
        title: "Registrar producto",
        targetId: "stock-product-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Este boton guarda el producto real. El tour no crea productos ni modifica stock.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "staff-branch-transfer",
    title: "Traspaso entre sucursales",
    description: "Ubica los filtros y acciones para enviar o recibir paquetes entre sucursales.",
    roles: ["admin", "operator"],
    autoLaunch: true,
    route: "/shipping",
    buildSteps: ({ dismiss }) => [
      {
        title: "Pedidos",
        targetId: "shipping-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Los traspasos entre sucursales se gestionan desde el tablero de pedidos.",
          dismiss,
        }),
      },
      {
        title: "Pendientes de envio",
        targetId: "shipping-status-send",
        placement: "top",
        description: buildStepDescription({
          text: "Usa este estado para revisar paquetes listos para enviar a otra sucursal.",
          dismiss,
        }),
      },
      {
        title: "Accion de traspaso",
        targetId: "shipping-transfer-action",
        placement: "bottom",
        description: buildStepDescription({
          text: "Cuando existan paquetes aplicables, aqui aparece la accion para enviar sucursal o confirmar llegada.",
          dismiss,
          hint: "Si no hay paquetes en ese estado, la accion puede no aparecer o estar deshabilitada.",
        }),
      },
      {
        title: "Modal de envio",
        targetId: "shipping-transfer-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-transfer-send-modal"),
        description: buildStepDescription({
          text: "Este modal permite revisar paquetes detectados, costo del delivery y metodo de pago antes de marcar el envio. El tour no confirma nada real.",
          dismiss,
          demo: [
            { label: "Modo", value: "Enviar sucursal" },
            { label: "Costo", value: "Bs. 0.00" },
          ],
        }),
      },
      {
        title: "En camino",
        targetId: "shipping-status-transit",
        placement: "top",
        onEnter: () => dispatchWindowEvent("tp-tour-close-shipping-demo-modals"),
        description: buildStepDescription({
          text: "Luego puedes entrar a En camino para confirmar la llegada a la sucursal destino.",
          dismiss,
        }),
      },
      {
        title: "Modal de recepcion",
        targetId: "shipping-transfer-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-transfer-receive-modal"),
        description: buildStepDescription({
          text: "En recepcion confirmas que los paquetes llegaron a la sucursal destino. El tour solo muestra el modal.",
          dismiss,
          demo: [{ label: "Modo", value: "Confirmar llegada" }],
        }),
      },
    ],
  },
  {
    key: "staff-variant-create",
    title: "Registrar nueva variante",
    description: "Guia para ubicar la creacion de variantes desde stock.",
    roles: ["admin", "operator"],
    autoLaunch: true,
    route: "/stock",
    buildSteps: ({ dismiss }) => [
      {
        title: "Seleccionar vendedor",
        targetId: "stock-admin-seller-selector",
        placement: "bottom",
        description: buildStepDescription({
          text: "Primero elige el vendedor dueno del producto al que agregaras la variante.",
          dismiss,
        }),
      },
      {
        title: "Buscar producto",
        targetId: "stock-admin-search",
        placement: "bottom",
        description: buildStepDescription({
          text: "Busca el producto base para ubicarlo mas rapido en la tabla.",
          dismiss,
          demo: [{ label: "Busqueda", value: "Polera" }],
        }),
      },
      {
        title: "Agregar variante",
        targetId: "stock-variant-create-action",
        placement: "left",
        description: buildStepDescription({
          text: "En la columna Agregar Variante abres el formulario para crear una combinacion nueva.",
          dismiss,
          demo: [
            { label: "Color", value: "Negro" },
            { label: "Talla", value: "M" },
          ],
          hint: "Si no hay vendedor seleccionado, el boton puede aparecer deshabilitado.",
        }),
      },
      {
        title: "Formulario de variante",
        targetId: "stock-variant-create-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-variant-modal"),
        description: buildStepDescription({
          text: "En este modal agregas combinaciones nuevas, precio y stock inicial por variante. El tour no guarda variantes.",
          dismiss,
          demo: [
            { label: "Color", value: "Negro" },
            { label: "Talla", value: "M" },
          ],
        }),
      },
      {
        title: "Campos de variante",
        targetId: "stock-variant-create-fields",
        placement: "left",
        description: buildStepDescription({
          text: "Agrega el nombre de la variante, sus valores y revisa las combinaciones. Cada combinacion debe tener stock y precio valido.",
          dismiss,
          demo: [
            { label: "Variante", value: "Color" },
            { label: "Valor", value: "Negro" },
            { label: "Precio", value: "Bs. 120" },
          ],
        }),
      },
      {
        title: "Guardar variantes",
        targetId: "stock-variant-create-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Al guardar se preparan las variantes nuevas. El tour no presiona este boton ni guarda cambios reales.",
          dismiss,
        }),
      },
    ],
  },
  {
    key: "staff-external-delivery-create",
    title: "Registrar entregas externas",
    description: "Guia para crear entregas externas desde Pedidos.",
    roles: ["admin", "operator"],
    autoLaunch: true,
    route: "/shipping",
    buildSteps: ({ dismiss }) => [
      {
        title: "Pedidos",
        targetId: "shipping-root",
        placement: "bottom",
        description: buildStepDescription({
          text: "Las entregas externas se registran desde el modulo de pedidos.",
          dismiss,
        }),
      },
      {
        title: "Filtros",
        targetId: "shipping-filters",
        placement: "bottom",
        description: buildStepDescription({
          text: "Desde aqui puedes filtrar por vendedor, sucursal, estado o fechas antes de registrar/revisar entregas.",
          dismiss,
        }),
      },
      {
        title: "Crear externo",
        targetId: "shipping-external-create-button",
        placement: "bottom",
        description: buildStepDescription({
          text: "Este boton abre el formulario para registrar una entrega externa.",
          dismiss,
          demo: [
            { label: "Cliente", value: "Carlos Rojas" },
            { label: "Telefono", value: "70000000" },
            { label: "Cobro", value: "Bs. 90" },
          ],
        }),
      },
      {
        title: "Formulario externo",
        targetId: "shipping-external-delivery-modal",
        placement: "left",
        onEnter: () => dispatchWindowEvent("tp-tour-open-external-delivery-modal"),
        description: buildStepDescription({
          text: "En este modal cargas vendedor, comprador, destino, precio y estado de pago de entregas externas. El tour no registra entregas.",
          dismiss,
          demo: [
            { label: "Comprador", value: "Carlos Rojas" },
            { label: "Destino", value: "Sucursal Norte" },
          ],
        }),
      },
      {
        title: "Datos del vendedor",
        targetId: "external-delivery-seller",
        placement: "left",
        description: buildStepDescription({
          text: "Completa carnet, nombre, celular y cantidad de paquetes. Las sugerencias ayudan a reutilizar contactos ya registrados.",
          dismiss,
          demo: [
            { label: "Carnet", value: "1234567" },
            { label: "Paquetes", value: "2" },
          ],
        }),
      },
      {
        title: "Pago del vendedor",
        targetId: "external-delivery-seller-payment",
        placement: "left",
        description: buildStepDescription({
          text: "Si el vendedor paga al dejar el paquete, marca si sera efectivo o QR para cuadrar caja correctamente.",
          dismiss,
          demo: [{ label: "Pago", value: "Efectivo o QR" }],
        }),
      },
      {
        title: "Origen y destino",
        targetId: "external-delivery-route",
        placement: "left",
        description: buildStepDescription({
          text: "Selecciona la sucursal de origen y destino. Puedes aplicar el mismo destino a todos los paquetes si corresponde.",
          dismiss,
          demo: [
            { label: "Origen", value: "Sucursal actual" },
            { label: "Destino", value: "Sucursal Norte" },
          ],
        }),
      },
      {
        title: "Datos de cada paquete",
        targetId: "external-delivery-packages",
        placement: "top",
        description: buildStepDescription({
          text: "Por cada paquete revisa comprador, descripcion, celular, destino, precio y estado de pago. Esta tabla es donde mas errores suelen ocurrir.",
          dismiss,
          demo: [
            { label: "Comprador", value: "Nombre o celular" },
            { label: "Estado pago", value: "Si / No / Mixto" },
          ],
        }),
      },
      {
        title: "Guardar externos",
        targetId: "external-delivery-submit",
        placement: "top",
        description: buildStepDescription({
          text: "Este boton registra las entregas externas reales. El tour solo indica el paso final y no guarda nada.",
          dismiss,
        }),
      },
    ],
  },
];

const TourContext = createContext<TourContextValue | null>(null);

const getSessionDismissKey = (tourKey: TourKey) => `${TOUR_SESSION_PREFIX}:${tourKey}`;

const findTargetById = (targetId?: string) => {
  if (!targetId || typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-tour-id="${targetId}"]`);
};

const useTourDismissState = () => {
  const markDismissedThisSession = useCallback((tourKey: TourKey) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(getSessionDismissKey(tourKey), "1");
  }, []);

  const wasDismissedThisSession = useCallback((tourKey: TourKey) => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(getSessionDismissKey(tourKey)) === "1";
  }, []);

  const clearDismissedThisSession = useCallback((tourKey: TourKey) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(getSessionDismissKey(tourKey));
  }, []);

  return {
    markDismissedThisSession,
    wasDismissedThisSession,
    clearDismissedThisSession,
  };
};

export const TourProvider = ({
  children,
  isMobile,
}: {
  children: ReactNode;
  isMobile: boolean;
}) => {
  const { user } = useContext(UserContext) || {};
  const location = useLocation();
  const navigate = useNavigate();
  const role = normalizeRole(user?.role);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<TourProgressMap>({});
  const [activeTour, setActiveTour] = useState<ActiveTourState | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const activeTourRef = useRef<ActiveTourState | null>(null);
  const autoOpenTimeoutRef = useRef<number | null>(null);
  const { markDismissedThisSession, wasDismissedThisSession, clearDismissedThisSession } =
    useTourDismissState();

  useEffect(() => {
    activeTourRef.current = activeTour;
  }, [activeTour]);

  const closeTour = useCallback(
    (tourKey?: TourKey, opts?: { rememberDismiss?: boolean }) => {
      if (autoOpenTimeoutRef.current) {
        window.clearTimeout(autoOpenTimeoutRef.current);
        autoOpenTimeoutRef.current = null;
      }
      closeTourDemoSurfaces();
      if (tourKey && opts?.rememberDismiss !== false) {
        markDismissedThisSession(tourKey);
      }
      setActiveTour(null);
      setCurrentStep(0);
    },
    [markDismissedThisSession]
  );

  const markTourAsSeen = useCallback(async (tourKey: TourKey, showMessage = false) => {
    const res = await completeTourAPI(tourKey);
    if (!res?.success) {
      message.error(res?.message || "No se pudo guardar el progreso del tour");
      closeTour(tourKey, { rememberDismiss: false });
      return false;
    }

    clearDismissedThisSession(tourKey);
    setProgress((currentProgress) => ({
      ...currentProgress,
      [tourKey]: {
        status: "seen",
        completedAt: res.progress?.completedAt || new Date().toISOString(),
      },
    }));
    if (showMessage) message.success("Tour completado");
    closeTour(tourKey, { rememberDismiss: false });
    return true;
  }, [clearDismissedThisSession, closeTour]);

  const dismissActiveTour = useCallback(() => {
    const tourKey = activeTourRef.current?.key;
    if (!tourKey) return;
    void markTourAsSeen(tourKey);
  }, [markTourAsSeen]);

  const buildResolvedSteps = useCallback(
    (definition: TourDefinition) => {
      const device: TourDevice = isMobile ? "mobile" : "desktop";
      const baseSteps = definition.buildSteps({ device, dismiss: dismissActiveTour, user, navigate });
      const mobilePanelWidth = "min(292px, calc(100vw - 120px))";

      return baseSteps
        .map((step) => {
          return {
            title: step.title,
            description: step.description,
            targetId: step.targetId,
            placement: step.placement,
            target: step.targetId ? (() => findTargetById(step.targetId) as HTMLElement) : null,
            onEnter: step.onEnter,
            style: isMobile
              ? {
                  width: mobilePanelWidth,
                  maxWidth: mobilePanelWidth,
                }
              : undefined,
          } as ResolvedTourStep;
        })
        .filter(Boolean) as ResolvedTourStep[];
    },
    [dismissActiveTour, isMobile, navigate, user]
  );

  const openTour = useCallback(
    (tourKey: TourKey) => {
      const definition = tourDefinitions.find((item) => item.key === tourKey && item.roles.includes(role as TourRole));
      if (!definition) {
        message.warning("Este tour todavía no está disponible.");
        return;
      }

      if (autoOpenTimeoutRef.current) {
        window.clearTimeout(autoOpenTimeoutRef.current);
      }

      const shouldNavigate = Boolean(definition.route && location.pathname !== definition.route);
      if (shouldNavigate && definition.route) {
        navigate(definition.route);
      }

      const startTourWhenReady = (attempt = 0) => {
        const steps = buildResolvedSteps(definition);
        if (!steps.length) {
          if (attempt < 8) {
            autoOpenTimeoutRef.current = window.setTimeout(() => startTourWhenReady(attempt + 1), 180);
            return;
          }
          message.warning("No se pudieron encontrar los elementos del tour en esta pantalla.");
          autoOpenTimeoutRef.current = null;
          return;
        }

        setCurrentStep(0);
        setActiveTour({
          key: definition.key,
          title: definition.title,
          steps,
        });
        autoOpenTimeoutRef.current = null;
      };

      autoOpenTimeoutRef.current = window.setTimeout(() => startTourWhenReady(), shouldNavigate ? 420 : 120);
    },
    [buildResolvedSteps, location.pathname, navigate, role]
  );

  const refreshProgress = useCallback(async () => {
    if (!role) {
      setProgress({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const res = await getMyTourProgressAPI();
    if (res?.success) {
      setProgress(res.progress || {});
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const completeActiveTour = useCallback(async () => {
    const current = activeTourRef.current;
    if (!current) return;

    await markTourAsSeen(current.key, true);
  }, [markTourAsSeen]);

  const tours = useMemo<TourMenuItem[]>(() => {
    if (!role) return [];

    const visiblePaths = new Set(getVisibleMenuItems(user).map((item) => item.path));

    return tourDefinitions
      .filter((item) => item.roles.includes(role as TourRole))
      .filter((item) => !item.route || visiblePaths.has(item.route))
      .map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        status: progress[item.key]?.status === "seen" ? "seen" : "unseen",
        canAutoLaunch: item.autoLaunch,
        route: item.route,
      }));
  }, [progress, role, user]);

  useEffect(() => {
    if (!role || loading || activeTour) return;

    const pendingAutoTour = tours.find(
      (tour) =>
        tour.canAutoLaunch &&
        tour.status !== "seen" &&
        (!tour.route || tour.route === location.pathname) &&
        !wasDismissedThisSession(tour.key)
    );

    if (pendingAutoTour) {
      openTour(pendingAutoTour.key);
    }
  }, [activeTour, loading, location.pathname, openTour, role, tours, wasDismissedThisSession]);

  useEffect(() => {
    return () => {
      if (autoOpenTimeoutRef.current) {
        window.clearTimeout(autoOpenTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentResolvedStep = activeTour?.steps[currentStep];
    currentResolvedStep?.onEnter?.();
  }, [activeTour, currentStep]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const targetId = activeTour?.steps[currentStep]?.targetId || "";
    const isModalStep =
      targetId.includes("modal") ||
      targetId.includes("form") ||
      targetId.includes("edit") ||
      targetId.includes("submit");

    document.body.classList.toggle("tp-tour-active", Boolean(activeTour));
    document.body.classList.toggle("tp-tour-modal-step", Boolean(activeTour && isModalStep));
    return () => {
      document.body.classList.remove("tp-tour-active");
      document.body.classList.remove("tp-tour-modal-step");
    };
  }, [activeTour, currentStep]);

  const renderedSteps = useMemo(() => {
    if (!activeTour) return [];

    return activeTour.steps.map((step, index, allSteps) => ({
      ...step,
      nextButtonProps: {
        children: index === allSteps.length - 1 ? <CheckOutlined /> : <ArrowRightOutlined />,
        onClick: index === allSteps.length - 1 ? () => void completeActiveTour() : undefined,
        className: "tp-tour-hidden-nav-btn",
      },
      prevButtonProps: {
        children: <ArrowLeftOutlined />,
        className: "tp-tour-hidden-nav-btn",
      },
    }));
  }, [activeTour, completeActiveTour]);

  const currentTargetId = activeTour?.steps[currentStep]?.targetId || "";
  const isModalOrFormStep =
    currentTargetId.includes("modal") ||
    currentTargetId.includes("form") ||
    currentTargetId.includes("field") ||
    currentTargetId.includes("submit");
  const shouldShowMobileNavTop =
    isMobile &&
    ((activeTour?.key === "seller-welcome" && currentStep >= 4 && currentStep <= 7) || isModalOrFormStep);

  const contextValue = useMemo<TourContextValue>(
    () => ({
      tours,
      loading,
      activeTourKey: activeTour?.key || null,
      openTour,
      dismissActiveTour,
    }),
    [activeTour?.key, dismissActiveTour, loading, openTour, tours]
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {activeTour ? <div className="tp-tour-interaction-blocker" aria-hidden="true" /> : null}
      <Tour
        className="tp-tour-overlay"
        rootClassName="tp-tour-root"
        open={Boolean(activeTour)}
        onClose={dismissActiveTour}
        steps={renderedSteps}
        current={currentStep}
        onChange={setCurrentStep}
        type="default"
        mask={!isModalOrFormStep}
        zIndex={1320}
        indicatorsRender={() => null}
        scrollIntoViewOptions={{ behavior: "smooth", block: "center" }}
      />
      {activeTour ? (
        <div
          className={`tp-tour-floating-nav ${
            isMobile
              ? shouldShowMobileNavTop
                ? "tp-tour-floating-nav-mobile-top"
                : "tp-tour-floating-nav-mobile-bottom"
              : "tp-tour-floating-nav-desktop"
          }`}
        >
          <Button
            className="tp-tour-floating-btn tp-tour-floating-btn-secondary"
            onClick={() => setCurrentStep((current) => Math.max(0, current - 1))}
            disabled={currentStep === 0}
            aria-label="Paso anterior"
            icon={<ArrowLeftOutlined />}
          />
          <div className="tp-tour-floating-progress" aria-live="polite">
            <span className="tp-tour-floating-progress-current">{currentStep + 1}</span>
            <span className="tp-tour-floating-progress-separator">/</span>
            <span>{activeTour.steps.length}</span>
          </div>
          <Button
            className="tp-tour-floating-btn tp-tour-floating-btn-primary"
            onClick={() => {
              if (currentStep === activeTour.steps.length - 1) {
                void completeActiveTour();
                return;
              }
              setCurrentStep((current) => Math.min(activeTour.steps.length - 1, current + 1));
            }}
            aria-label={currentStep === activeTour.steps.length - 1 ? "Finalizar tour" : "Paso siguiente"}
            icon={currentStep === activeTour.steps.length - 1 ? <CheckOutlined /> : <ArrowRightOutlined />}
          />
        </div>
      ) : null}
    </TourContext.Provider>
  );
};

export const useTourContext = () => {
  const value = useContext(TourContext);
  if (!value) {
    throw new Error("useTourContext debe usarse dentro de TourProvider");
  }

  return value;
};

export const TourStatusTag = ({ status }: { status: TourStatus }) => (
  <Tag color={status === "seen" ? "green" : "gold"} bordered={false}>
    {status === "seen" ? "Visto" : "No visto"}
  </Tag>
);

export const TourMenuList = ({ onTourStart }: { onTourStart?: () => void }) => {
  const { tours, loading, openTour } = useTourContext();

  if (!tours.length) {
    return <Typography.Text type="secondary">No hay tours disponibles para este usuario.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      {loading ? (
        <Typography.Text type="secondary">Cargando tours...</Typography.Text>
      ) : (
        tours.map((tour) => (
          <div
            key={tour.key}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <Typography.Text strong>{tour.title}</Typography.Text>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {tour.description}
                  </Typography.Text>
                </div>
              </div>
              <TourStatusTag status={tour.status} />
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  onTourStart?.();
                  openTour(tour.key);
                }}
              >
                Iniciar
              </Button>
            </div>
          </div>
        ))
      )}
    </Space>
  );
};

