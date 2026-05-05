import { Button, message, Modal } from "antd";
import SellerTable from "./SellerTable";
import SellerForm from "./SellerFormModal";
import { useState } from "react";
import { autoRenewSellersAPI } from "../../api/seller";

export const Seller: React.FC<{ isFactura: boolean }> = ({
  isFactura = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [autoRenewing, setAutoRenewing] = useState(false);

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
        "Se renovarán por 1 mes los clientes vencidos que no declinaron el servicio.",
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/seller-icon.png" alt="Vendedores" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
            {isFactura ? "Vendedores con factura" : "Vendedores"}
          </h1>
        </div>

        <div className="flex gap-2">
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
    </div>
  );
};

export default Seller;
