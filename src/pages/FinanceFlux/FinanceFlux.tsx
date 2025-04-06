import { useState } from "react";
import FinanceFluxTable from "./FinanceFluxTable"
import FinanceFluxFormModal from "./FinanceFluxFormModal";
import { Button } from "antd";

const FinanceFlux = () => {
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    const showModal = () => {
        setIsModalVisible(true);
    }

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
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-mobile-2xl xl:text-desktop-2xl font-bold">GASTOS E INGRESOS</h1>
                <Button onClick={showModal} type="primary" className="text-mobile-sm xl:text-desktop-sm">Agregar Gasto o Ingreso</Button>
            </div>
            <FinanceFluxTable key={refreshKey} />
            <FinanceFluxFormModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onFinish={onFinish}
                onSuccess={handleSuccess}
            />
        </div>
    )
}

export default FinanceFlux