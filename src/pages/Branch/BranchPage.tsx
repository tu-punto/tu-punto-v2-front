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
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                <img src="/branches-icon.png" alt="Sucursales" className="w-8 h-8" />
                <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                    Sucursales
                </h1>
            </div>
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
