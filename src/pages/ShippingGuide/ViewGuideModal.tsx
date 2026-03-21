import { Modal } from "antd";
import ShippingGuideTable from "./ShippingGuideTable";
import { IBranch } from "../../models/branchModel";

interface ViewGuideModalProps {
    visible: boolean,
    onCancel: () => void,
    refreshKey: number,
    branch: IBranch,
}

function ViewGuideModal({ visible, onCancel, refreshKey, branch }: ViewGuideModalProps) {
    if (!branch) return
    
    return (
        <Modal
            title={`Guías de Envío - ${branch.nombre}`}
            footer={null}
            open={visible}
            width={1000}
            onCancel={onCancel}
        >
            <ShippingGuideTable
                refreshKey={refreshKey}
                filterData='branch'
                search_id={branch._id}
            />
        </Modal>
    );
}

export default ViewGuideModal;