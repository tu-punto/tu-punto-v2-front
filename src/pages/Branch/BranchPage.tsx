import { useEffect, useState, useContext } from "react";
import { PlusOutlined } from "@ant-design/icons";
import BranchFormModal from "./BranchFormModal";
import BranchTable from "./BranchTable";
import { getSucursalsAPI } from "../../api/sucursal";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";
import { UserContext } from "../../context/userContext";
import { IBranch } from "../../models/branchModel";

const BranchPage = () => {
  const [branches, setBranches] = useState<IBranch[]>();
  const [selectedBranch, setSelectedBranch] = useState<IBranch | null>(null);
  const [isFormModal, setIsFormModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { user } = useContext(UserContext);
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isOperator = user?.role.toLowerCase() === 'operator';

  const fetchBranches = async () => {
    try {
      const branches = await getSucursalsAPI();
      setBranches(branches);
    } catch (error) {
      console.error(error);
    }
  };

  const showEditModal = (branch: IBranch) => {
    setSelectedBranch(branch);
    setIsFormModal(true);
  };
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
    </PageTemplate>
  );
};

export default BranchPage;
