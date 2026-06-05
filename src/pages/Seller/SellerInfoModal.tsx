import { Modal } from "antd";
import SellerInfoPage from "./components/SellerInfoBase";


const SellerInfoModalTry = ({ visible, onSuccess, onCancel, onRefresh, seller }: any) => {
    return (
        <Modal
            visible={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
        >
            <SellerInfoPage
                visible={visible}
                onSuccess={() => {
                    onSuccess();   // 🚀 refresca tabla porque SellerTable envía refresh()
                }}
                onRefresh={onRefresh}
                onCancel={onCancel}
                seller={seller}
            />
        </Modal>
    );
};

export default SellerInfoModalTry;
