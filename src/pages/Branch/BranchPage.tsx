import { useEffect, useState } from "react";
import { message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import BranchFormModal from "./BranchFormModal";
import BranchTable from "./BranchTable";
import { getSucursalsAPI } from "../../api/sucursal";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";
import { useUserRole } from "../../hooks/useUserRole";
import { IBranch } from "../../models/branchModel";
import ViewGuideModal from "../ShippingGuide/ViewGuideModal";

const BranchPage = () => {
  const { isAdmin, isOperator } = useUserRole();
  const [branches, setBranches] = useState<IBranch[]>();
  const [selectedBranch, setSelectedBranch] = useState<IBranch | null>(null);
  const [isFormModal, setIsFormModal] = useState(false);
  const [isGuideModal, setIsGuideModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchBranches = async () => {
    try {
      const branches = await getSucursalsAPI();
      setBranches(branches);
    } catch (error) {
      console.error(error);
      message.error("Ha ocurrido un error. Intente de nuevo más tarde.")
    }
  };

  const showEditModal = (branch: IBranch) => {
    setSelectedBranch(branch);
    setIsFormModal(true);
  };
  
  const showGuideModal = (branch: IBranch) => {
    setSelectedBranch(branch)
    setIsGuideModal(true);
  }

  useEffect(() => {
    fetchBranches();
  }, [refreshKey]);

  const actions: FunctionButtonProps[] = [
    {
      visible: isAdmin || isOperator,
      title: "Agregar Sucursal",
      onClick: () => {
        setIsFormModal(true);
        setSelectedBranch(null);
      },
      icon: <PlusOutlined />,
    }
  ]

  return (
    <PageTemplate
      title="Sucursales"
      iconSrc="/branches-icon.png"
      actions={actions}
    >
      <BranchTable
        refreshKey={refreshKey}
        branches={branches || []}
        showEditModal={showEditModal}
        showGuideModal={showGuideModal}
      />

      <BranchFormModal
        visible={isFormModal}
        onClose={() => setIsFormModal(false)}
        onSubmit={() => {
          setIsFormModal(false);
          setRefreshKey((prev) => prev + 1);
          setSelectedBranch(null);
        }}
        branch={selectedBranch}
      />
      <ViewGuideModal
        visible={isGuideModal}
        onCancel={() => {
          setIsGuideModal(false)
          setSelectedBranch(null);
        }}
        refreshKey={refreshKey}
        search_id={selectedBranch?._id}
      />
    </PageTemplate>
  );
};

export default BranchPage;
