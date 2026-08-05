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
  | "seller-stock-withdrawal-request";
type TourStatus = "unseen" | "seen";

type TourMenuItem = {
  key: TourKey;
  title: string;
  description: string;
  status: TourStatus;
  canAutoLaunch: boolean;
};

type TourStepSpec = {
  title: string;
  description: ReactNode;
  targetId?: string;
  placement?: TourStepProps["placement"];
  onEnter?: () => void;
};

type ResolvedTourStep = TourStepProps & {
  onEnter?: () => void;
};

type TourDefinition = {
  key: TourKey;
  title: string;
  description: string;
  role: "seller";
  autoLaunch: boolean;
  route?: string;
  buildSteps: (params: {
    device: TourDevice;
    dismiss: () => void;
    user: any;
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
    role: "seller",
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
    role: "seller",
    autoLaunch: false,
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
    ],
  },
  {
    key: "seller-stock-shipping-guide",
    title: "Subir guia de envio de stock",
    description: "Ubica donde subir y revisar guias de envio de stock.",
    role: "seller",
    autoLaunch: false,
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
        title: "Guias registradas",
        targetId: "shipping-guide-table",
        placement: "top",
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
    role: "seller",
    autoLaunch: false,
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
    ],
  },
  {
    key: "seller-stock-withdrawal-request",
    title: "Solicitud de salida de stock",
    description: "Ubica el flujo para pedir salida de productos de tu inventario.",
    role: "seller",
    autoLaunch: false,
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
        title: "Listado de productos",
        targetId: "stock-seller-products",
        placement: "top",
        description: buildStepDescription({
          text: "Desde la lista revisas stock y detalles de productos antes de solicitar una salida.",
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
      if (tourKey && opts?.rememberDismiss !== false) {
        markDismissedThisSession(tourKey);
      }
      setActiveTour(null);
      setCurrentStep(0);
    },
    [markDismissedThisSession]
  );

  const dismissActiveTour = useCallback(() => {
    const tourKey = activeTourRef.current?.key;
    closeTour(tourKey);
  }, [closeTour]);

  const buildResolvedSteps = useCallback(
    (definition: TourDefinition) => {
      const device: TourDevice = isMobile ? "mobile" : "desktop";
      const baseSteps = definition.buildSteps({ device, dismiss: dismissActiveTour, user });
      const mobilePanelWidth = "min(320px, calc(100vw - 92px))";

      return baseSteps
        .map((step) => {
          const targetNode = findTargetById(step.targetId);
          if (step.targetId && !targetNode) return null;

          return {
            title: step.title,
            description: step.description,
            placement: step.placement,
            target: step.targetId ? (() => targetNode as HTMLElement) : null,
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
    [dismissActiveTour, isMobile, user]
  );

  const openTour = useCallback(
    (tourKey: TourKey) => {
      const definition = tourDefinitions.find((item) => item.key === tourKey && item.role === "seller");
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
    [buildResolvedSteps, location.pathname, navigate]
  );

  const refreshProgress = useCallback(async () => {
    if (role !== "seller") {
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

    const res = await completeTourAPI(current.key);
    if (!res?.success) {
      message.error(res?.message || "No se pudo guardar el progreso del tour");
      closeTour(current.key, { rememberDismiss: false });
      return;
    }

    clearDismissedThisSession(current.key);
    setProgress((currentProgress) => ({
      ...currentProgress,
      [current.key]: {
        status: "seen",
        completedAt: res.progress?.completedAt || new Date().toISOString(),
      },
    }));
    message.success("Tour completado");
    closeTour(current.key, { rememberDismiss: false });
  }, [clearDismissedThisSession, closeTour]);

  const tours = useMemo<TourMenuItem[]>(() => {
    if (role !== "seller") return [];

    const visiblePaths = new Set(getVisibleMenuItems(user).map((item) => item.path));

    return tourDefinitions
      .filter((item) => !item.route || visiblePaths.has(item.route))
      .map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        status: progress[item.key]?.status === "seen" ? "seen" : "unseen",
        canAutoLaunch: item.autoLaunch,
      }));
  }, [progress, role, user]);

  useEffect(() => {
    if (role !== "seller" || loading || activeTour) return;

    const pendingAutoTour = tours.find(
      (tour) => tour.canAutoLaunch && tour.status !== "seen" && !wasDismissedThisSession(tour.key)
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

  const shouldShowMobileNavTop =
    isMobile && activeTour?.key === "seller-welcome" && currentStep >= 4 && currentStep <= 7;

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
      <Tour
        className="tp-tour-overlay"
        rootClassName="tp-tour-root"
        open={Boolean(activeTour)}
        onClose={dismissActiveTour}
        steps={renderedSteps}
        current={currentStep}
        onChange={setCurrentStep}
        type="default"
        zIndex={1200}
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

export const TourMenuList = () => {
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
              <Button size="small" type="primary" onClick={() => openTour(tour.key)}>
                Iniciar
              </Button>
            </div>
          </div>
        ))
      )}
    </Space>
  );
};
