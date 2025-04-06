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

  const onFinish = (values: any) => {
    setIsModalVisible(false);
  };

  const handleSuccess = () => {
    setIsModalVisible(false);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-mobile-2xl xl:text-desktop-2xl font-bold">
          {isFactura ? "Vendedores con factura" : "Vendedores"}
        </h1>
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
