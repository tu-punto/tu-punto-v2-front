import { Modal } from "antd";
import SellerInfoPage from "./components/SellerInfoBase";


const SellerInfoModalTry = ({ visible, onSuccess, onCancel, seller }: any) => {
    return (
        <Modal
            visible={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
            className="p-3"
        >
            <SellerInfoPage
                visible={visible}
                onSuccess={() => {
                    onSuccess();   // 🚀 refresca tabla porque SellerTable envía refresh()
                }}
                onCancel={onCancel}
                seller={seller}
            />
        </Modal>
    );
};

export default SellerInfoModalTry;
