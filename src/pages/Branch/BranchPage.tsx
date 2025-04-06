import { useEffect, useState } from "react";
import { getSucursalsAPI } from "../../api/sucursal";
import BranchTable from "./BranchTable";
import { IBranch } from "../../models/branchModel";
import { Button } from "antd";
import BranchFormModal from "./BranchFormModal";

const BranchPage = () => {
  const [branches, setBranches] = useState<IBranch[]>();
  const [selectedBranch, setSelectedBranch] = useState<IBranch | null>(null);
  const [isFormModal, setIsFormModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-mobile-2xl xl:text-desktop-2xl font-bold">
          Sucursales
        </h1>
        <Button
          onClick={() => {
            setIsFormModal(true);
            setSelectedBranch(null);
          }}
          type="primary"
          className="text-mobile-sm xl:text-desktop-sm"
        >
          Agregar Sucursal
        </Button>
      </div>
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
    </div>
  );
};

export default BranchPage;
