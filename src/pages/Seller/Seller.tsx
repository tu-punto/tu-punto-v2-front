import { Alert, Badge, Button, List, message, Modal, Space } from "antd";
import SellerTable from "./SellerTable";
import SellerForm from "./SellerFormModal";
import { useContext, useEffect, useState } from "react";
import { autoRenewSellersAPI, getSellerAlertsAPI } from "../../api/seller";
import "./SellerTable.css";
import LandingLeadsModal from "./LandingLeadsModal";
import { getLandingLeadsAPI } from "../../api/landingLeads";
import DeclineResponsesModal from "./DeclineResponsesModal";
import { UserContext } from "../../context/userContext";
import { isSuperadminUser } from "../../utils/role";

export const Seller: React.FC<{ isFactura: boolean }> = ({
  isFactura = false,
}) => {
  const { user } = useContext(UserContext) || {};
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [autoRenewing, setAutoRenewing] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadNewCount, setLeadNewCount] = useState(0);
  const [leadCounterLoading, setLeadCounterLoading] = useState(false);
  const [declineResponsesOpen, setDeclineResponsesOpen] = useState(false);
  const [declineResponsesCount, setDeclineResponsesCount] = useState(0);
  const [noSalesCount, setNoSalesCount] = useState(0);
  const [debtAlertCount, setDebtAlertCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<{ noSales: boolean; debt: boolean }>({
    noSales: false,
    debt: false,
  });
  const [alertModal, setAlertModal] = useState<{ title: string; rows: any[] } | null>(null);

  const refreshLeadCounter = async () => {
    setLeadCounterLoading(true);
    try {
      const response = await getLandingLeadsAPI();
      const rows = Array.isArray(response?.leads) ? response.leads : [];
      setLeadNewCount(rows.filter((row: any) => row?.contactado !== true).length);
    } catch {
      setLeadNewCount(0);
    } finally {
      setLeadCounterLoading(false);
    }
  };

  const refreshSellerAlerts = async () => {
    setAlertsLoading(true);
    try {
      const response = await getSellerAlertsAPI();
      setNoSalesCount(Number(response?.noSalesCount || 0));
      setDebtAlertCount(Number(response?.debtCount || 0));
    } catch {
      setNoSalesCount(0);
      setDebtAlertCount(0);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    void refreshLeadCounter();
    void refreshSellerAlerts();
  }, [refreshKey]);

  const openAlertDetails = async (type: "noSales" | "debt", title: string) => {
    try {
      const response = await getSellerAlertsAPI(true);
      setAlertModal({ title, rows: type === "noSales" ? response.noSales || [] : response.debt || [] });
    } catch {
      message.error("No se pudo cargar el detalle de la alerta");
    }
  };

  const renderAlert = (title: string, count: number, dismissKey: "noSales" | "debt") => {
    if (dismissedAlerts[dismissKey] || (!alertsLoading && count === 0)) return null;

    const singular = count === 1;
    const summary = singular ? "1 persona" : `${count} personas`;

    return (
      <Alert
        type="warning"
        showIcon
        closable
        onClose={() => setDismissedAlerts((prev) => ({ ...prev, [dismissKey]: true }))}
        message={title}
        description={
          <Space size={8} wrap>
            {alertsLoading ? <span>Cargando...</span> : <span>{summary}</span>}
            {!singular && (
              <Button type="link" size="small" loading={alertsLoading} onClick={() => void openAlertDetails(dismissKey, title)}>
                Ver más
              </Button>
            )}
          </Space>
        }
      />
    );
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const onFinish = () => {
    setIsModalVisible(false);
  };

  const handleSuccess = () => {
    setIsModalVisible(false);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  const handleAutoRenew = () => {
    Modal.confirm({
      title: "Renovación automática",
      content:
        "Se renovarán por 1 mes los clientes que vencen mañana o que ya vencieron y no declinaron el servicio.",
      okText: "Renovar",
      cancelText: "Cancelar",
      onOk: async () => {
        setAutoRenewing(true);
        try {
          const res = await autoRenewSellersAPI();
          if (!res?.success) throw new Error("No se pudo renovar");
          const data = res.data || {};
          message.success(`Renovados: ${data.renewed || 0}. Omitidos: ${data.skipped || 0}.`);
          setRefreshKey((prevKey) => prevKey + 1);
        } catch {
          message.error("Error al ejecutar la renovación automática");
        } finally {
          setAutoRenewing(false);
        }
      },
    });
  };

  return (
    <div className="seller-page p-4">
      <div className="seller-page-header flex justify-between items-center mb-4">
        <div className="seller-page-title flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/seller-icon.png" alt="Vendedores" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
            {isFactura ? "Vendedores con factura" : "Vendedores"}
          </h1>
        </div>

        <div className="seller-page-actions flex gap-2">
          {isSuperadminUser(user) && (
            <Button onClick={() => window.dispatchEvent(new Event("tp-open-payment-limit"))} className="text-mobile-sm xl:text-desktop-sm">
              Configurar limite de pagos
            </Button>
          )}
          <Button
            onClick={() => setDeclineResponsesOpen(true)}
            className="text-mobile-sm xl:text-desktop-sm"
          >
            Respuestas declinación
          </Button>
          <Badge count={leadNewCount} offset={[-8, 8]} color="#f97316">
            <Button
              onClick={() => setLeadModalOpen(true)}
              loading={leadCounterLoading}
              className="text-mobile-sm xl:text-desktop-sm"
            >
              Leads registrados
            </Button>
          </Badge>
          <Button
              onClick={handleAutoRenew}
              loading={autoRenewing}
              className="text-mobile-sm xl:text-desktop-sm"
          >
            Renovación automática
          </Button>
          <Button
              onClick={showModal}
              type="primary"
              className="text-mobile-sm xl:text-desktop-sm"
          >
            Agregar Vendedor
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 xl:grid-cols-2">
        {renderAlert("Esta o estas personas no hicieron una venta este mes", noSalesCount, "noSales")}
        {renderAlert("Revisar pago pendiente de esta o estas personas", debtAlertCount, "debt")}
      </div>

      <SellerTable
        refreshKey={refreshKey}
        setRefreshKey={setRefreshKey}
        isFactura={isFactura}
      />
      <SellerForm
        visible={isModalVisible}
        onCancel={handleCancel}
        onFinish={onFinish}
        onSuccess={handleSuccess}
      />
      <LandingLeadsModal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onCounterChange={setLeadNewCount}
      />
      <DeclineResponsesModal
        open={declineResponsesOpen}
        onClose={() => setDeclineResponsesOpen(false)}
        onCountChange={setDeclineResponsesCount}
      />

      <Modal
        open={Boolean(alertModal)}
        onCancel={() => setAlertModal(null)}
        footer={null}
        title={alertModal?.title || "Alerta"}
        destroyOnClose
      >
        <List
          dataSource={alertModal?.rows || []}
          renderItem={(row: any) => (
            <List.Item>
              <List.Item.Meta
                title={`${row?.nombre || "Sin nombre"} ${row?.apellido || ""}`.trim()}
                description={row?.mail || row?.email || ""}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default Seller;
