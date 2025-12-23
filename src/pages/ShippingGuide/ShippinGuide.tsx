import { useContext, useState } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { PlusOutlined } from '@ant-design/icons';
import UploadGuideModal from "./UploadGuideModal.tsx";
import ShippingGuideTable from "./ShippingGuideTable.tsx";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";

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

    const actions: FunctionButtonProps[] = [
        {
            visible: !isAdmin,
            title: "Subir nueva guía",
            onClick: () => { setIsUploadGuideModalView(true) },
            icon:<PlusOutlined/>
        }
    ];

    return (
        <PageTemplate
            title="Guías de Envío"
            iconSrc="/box-icon.png"
            actions={actions}
        >
            <div className="px-5 py-4">
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
        </PageTemplate>
    );
}

export default ShippingGuide