import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import ShippingGuideTable from './ShippingGuideTable';
import UploadGuideForm from './UploadGuideForm';
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";
import { useUserRole } from '../../hooks/useUserRole';

function ShippingGuide() {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const { user, isAdmin } = useUserRole();

    const handleFinish = () => {
        setShowUploadModal(false)
        setRefreshKey(prev => prev + 1)
    }

    const actions: FunctionButtonProps[] = [
        {
            visible: !isAdmin,
            title: "Subir nueva guía",
            onClick: () => { setShowUploadModal(true) },
            icon: <PlusOutlined />
        }
    ]

    return (
        <PageTemplate
            title="Guías de Envío"
            iconSrc="/box-icon.png"
            actions={actions}
        >
            <ShippingGuideTable
                filterData='seller'
                search_id={user.id_vendedor}
                refreshKey={refreshKey}
            />
            <UploadGuideForm
                visible={showUploadModal}
                onCancel={() => { setShowUploadModal(false) }}
                onFinish={handleFinish}
            />
        </PageTemplate>
    );
}

export default ShippingGuide;