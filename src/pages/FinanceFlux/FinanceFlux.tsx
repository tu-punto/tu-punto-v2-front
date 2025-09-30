import { useEffect, useState } from "react";
import FinanceFluxTable from "./FinanceFluxTable"
import FinanceFluxFormModal from "./FinanceFluxFormModal";
import { Button } from "antd";
import { useFinanceFluxCategoryStore } from "../../stores/financeFluxCategoriesStore";

const FinanceFlux = () => {
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [editingFlux, setEditingFlux] = useState(null);
    const fetchFluxCategory = useFinanceFluxCategoryStore(
    (state) => state.fetchFluxCategory
    );

    useEffect(() => {
        fetchFluxCategory();
    }, []);

    const handleEdit = (flux: any) => {
        setEditingFlux(flux);
        setIsModalVisible(true);
    };

    const showModal = () => {
        setEditingFlux(null);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    }
    const onFinish = () => {
        setIsModalVisible(false);
    }

    const handleSuccess = () => {
        setIsModalVisible(false)
        setRefreshKey(prevKey => prevKey + 1)
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src="/finance-icon1.png" alt="Gastos e Ingresos" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Gastos e Ingresos
                    </h1>
                </div>
                <Button
                    onClick={showModal}
                    type="primary"
                    className="text-mobile-sm xl:text-desktop-sm"
                >
                    Agregar Gasto o Ingreso
                </Button>
            </div>

            <FinanceFluxTable refreshKey={refreshKey} onEdit={handleEdit} />
            <FinanceFluxFormModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onFinish={onFinish}
                onSuccess={handleSuccess}
                editingFlux={editingFlux}
            />
        </div>
    )

}

export default FinanceFlux