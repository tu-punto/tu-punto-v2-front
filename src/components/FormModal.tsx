import { ReactNode } from "react";
import { Form, FormInstance, Modal, Button } from "antd";

interface FormModalProps {
    title: string,
    open: boolean,
    closeTitle?: string,
    onClose: () => void,
    submitTitle?: string,
    onSubmit: any,
    width?: number,
    form: FormInstance<any>,
    children: ReactNode
}

function FormModal({ title, open, closeTitle = "Cancelar", onClose, submitTitle = "Guardar", onSubmit, width, form, children }: FormModalProps) {
    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            width={width}
            footer={null}
        >
            <Form
                layout="vertical"
                form={form}
                onFinish={onSubmit}
            >

                {children}

                <Form.Item>
                    <Button key="cancel" onClick={onClose}>
                        {closeTitle}
                    </Button>
                    <Button key="submit" type="primary" htmlType="submit" onClick={onSubmit}>
                        {submitTitle}
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default FormModal;