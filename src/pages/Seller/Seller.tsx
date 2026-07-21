import { Badge, Button, message, Modal } from "antd";
import SellerTable from "./SellerTable";
import SellerForm from "./SellerFormModal";
import { useEffect, useState } from "react";
import { autoRenewSellersAPI, getSellersAPI } from "../../api/seller";
import "./SellerTable.css";
import LandingLeadsModal from "./LandingLeadsModal";
import { getLandingLeadsAPI } from "../../api/landingLeads";
import DeclineResponsesModal from "./DeclineResponsesModal";

export const Seller: React.FC<{ isFactura: boolean }> = ({
  isFactura = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [autoRenewing, setAutoRenewing] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadNewCount, setLeadNewCount] = useState(0);
  const [leadCounterLoading, setLeadCounterLoading] = useState(false);
  const [declineResponsesOpen, setDeclineResponsesOpen] = useState(false);
  const [declineResponsesCount, setDeclineResponsesCount] = useState(0);

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

  const refreshDeclineResponsesCounter = async () => {
    try {
      const response = await getSellersAPI();
      const rows = Array.isArray(response) ? response : Array.isArray((response as any)?.data) ? (response as any).data : [];
      setDeclineResponsesCount(
        rows.filter((row: any) => Boolean(row?.declinacion_servicio_fecha)).length
      );
    } catch {
      setDeclineResponsesCount(0);
    }
  };

  useEffect(() => {
    void refreshLeadCounter();
    void refreshDeclineResponsesCounter();
  }, []);

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
    </div>
  );
};

export default Seller;
