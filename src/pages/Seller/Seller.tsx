import { PlusOutlined } from "@ant-design/icons";
import SellerTable from "./SellerTable";
import SellerForm from "./SellerFormModal";
import { useState } from "react";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";

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

  const actions: FunctionButtonProps[] = [
    {
      visible: true,
      title: "Agregar Vendedor",
      onClick: showModal
    }
  ];

  return (
    <PageTemplate
      title={isFactura ? "Vendedores con factura" : "Vendedores"}
      iconSrc="/seller-icon.png"
      actions={actions}
    >
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
    </PageTemplate>
  );
};

export default Seller;
