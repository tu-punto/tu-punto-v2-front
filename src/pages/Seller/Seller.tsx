import { Button } from "antd";
import SellerTable from "./SellerTable";
import SellerForm from "./SellerFormModal";
import { useState } from "react";

export const Seller: React.FC<{ isFactura: boolean }> = ({
  isFactura = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/seller-icon.png" alt="Vendedores" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
            {isFactura ? "Vendedores con factura" : "Vendedores"}
          </h1>
        </div>

        <Button
            onClick={showModal}
            type="primary"
            className="text-mobile-sm xl:text-desktop-sm"
        >
          Agregar Vendedor
        </Button>
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
