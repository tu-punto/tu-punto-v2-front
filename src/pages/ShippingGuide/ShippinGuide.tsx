import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { Button } from 'antd';
import UploadGuideModal from "./UploadGuideModal.tsx";
import ShippingGuideTable from "./ShippingGuideTable.tsx";

const ShippingGuide = () => {
    const [isUploadGuideModalView, setIsUploadGuideModalView] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0)

    const { user } = useContext(UserContext);
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    const handleFinish = () => {
        setRefreshKey(prevKey => prevKey + 1);
        setIsUploadGuideModalView(false); 
        console.log("key",refreshKey)
    };

    useEffect(() => {
        const openTourModal = () => setIsUploadGuideModalView(true);
        const closeTourModal = () => setIsUploadGuideModalView(false);

        window.addEventListener("tp-tour-open-shipping-guide-modal", openTourModal);
        window.addEventListener("tp-tour-close-shipping-guide-modal", closeTourModal);

        return () => {
            window.removeEventListener("tp-tour-open-shipping-guide-modal", openTourModal);
            window.removeEventListener("tp-tour-close-shipping-guide-modal", closeTourModal);
        };
    }, []);

    return (
        <div className="p-4" data-tour-id="shipping-guide-root">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md" data-tour-id="shipping-guide-header">
                    <img src="/box-icon.png" alt="Pedidos" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Guías de Envío
                    </h1>
                </div>
            </div>
            {!isAdmin && (
                <Button
                    data-tour-id="shipping-guide-upload-button"
                    type="primary"
                    onClick={() => { setIsUploadGuideModalView(true) }}>
                    Subir nueva guía
                </Button>
            )}
            <div className="px-5 py-4" data-tour-id="shipping-guide-table">
                <ShippingGuideTable
                    refreshKey={refreshKey}
                    user={user}
                    isFilterBySeller
                    search_id={user.id_vendedor}
                />
            </div>
            
            <UploadGuideModal
                visible={isUploadGuideModalView}
                onCancel={() => { setIsUploadGuideModalView(false) }}
                onFinish={handleFinish}
            />
        </div>
    );
}

export default ShippingGuide
