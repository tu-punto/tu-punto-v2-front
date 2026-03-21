import { useState } from "react";
import SellerForm from "./SellerFormModal";
import SellerTable from "./SellerTable";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";

interface SellerProps {
  isFactura: boolean
}

export const Seller = ({ isFactura }: SellerProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
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
      />
      <SellerForm
        visible={isModalVisible}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </PageTemplate>
  );
};

export default Seller;
