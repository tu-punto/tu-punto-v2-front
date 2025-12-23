import { useEffect, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import FinanceFluxTable from "./FinanceFluxTable"
import FinanceFluxFormModal from "./FinanceFluxFormModal";
import { useFinanceFluxCategoryStore } from "../../stores/financeFluxCategoriesStore";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";

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

    const actions: FunctionButtonProps[] = [
        {
            visible: true,
            title: "Agregar Gasto o Ingreso",
            onClick: showModal,
            icon: <PlusOutlined />
        }
    ]

    return (
        <PageTemplate
            title="Gastos e Ingresos"
            iconSrc="/finance-icon1.png"
            actions={actions}
        >
            <FinanceFluxTable refreshKey={refreshKey} onEdit={handleEdit} />
            <FinanceFluxFormModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onFinish={onFinish}
                onSuccess={handleSuccess}
                editingFlux={editingFlux}
            />
        </PageTemplate>
    )
}

export default FinanceFlux