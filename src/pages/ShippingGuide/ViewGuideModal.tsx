import { Modal } from "antd";
import ShippingGuideTable from "./ShippingGuideTable";

interface ViewGuideModalProps {
    visible: boolean,
    onCancel: () => void,
    refreshKey: number,
    search_id?: string,
}

function ViewGuideModal({ visible, onCancel, refreshKey, search_id }: ViewGuideModalProps) {
    return (
        <Modal
            title='Guías de Envío'
            footer={false}
            open={visible}
            width={1000}
            onCancel={onCancel}
        >
            <ShippingGuideTable
                refreshKey={refreshKey}
                isFilterByBranch
                search_id={search_id || ""}
            />
        </Modal>
    );
}

export default ViewGuideModal;