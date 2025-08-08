import { useContext, useState } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { Button } from 'antd';
import UploadGuideModal from "./UploadGuideModal.tsx";

const ShippingGuide = () => {
    const [isUploadGuideModalView, setIsUploadGuideModalView] = useState(false);

    const { user } = useContext(UserContext);
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src="/box-icon.png" alt="Pedidos" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Guías de Envío
                    </h1>
                </div>
            </div>
            {!isAdmin && (
                <Button 
                    type="primary"
                    onClick={() => {setIsUploadGuideModalView(true)}}>
                    Subir nueva guía
                </Button>
            )}
            <UploadGuideModal 
                visible={isUploadGuideModalView} 
                onCancel={() => {setIsUploadGuideModalView(false)}}
                onFinish={() => {console.log("TODO actualiza la tabla")}}
            />
        </div>
    );
}

export default ShippingGuide