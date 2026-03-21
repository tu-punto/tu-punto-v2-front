import { ReactNode } from "react";
import { Form, FormInstance, Modal, Button } from "antd";
import { Callbacks } from "rc-field-form/lib/interface";

interface FormModalProps {
    title: string,
    open: boolean,
    closeTitle?: string,
    onClose: () => void,
    submitTitle?: string,
    submitDisabled?: boolean,
    submitLoading?: boolean,
    onFinish: Callbacks['onFinish'],
    width?: number,
    form: FormInstance<any>,
    children: ReactNode
}

function FormModal({ title, open, closeTitle = "Cancelar", onClose, submitTitle = "Guardar", submitDisabled = false, submitLoading = false, onFinish, width, form, children }: FormModalProps) {
    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            width={width}
            footer={null}
            className="p-3"
        >
            <Form
                layout="vertical"
                form={form}
                onFinish={onFinish}
            >

                {children}

                <Form.Item>
                    <div className="flex gap-2 justify-end my-2">
                        <Button key="cancel" onClick={onClose}>
                            {closeTitle}
                        </Button>
                        <Button
                            key="submit"
                            type="primary" 
                            htmlType="submit"
                            loading={submitLoading}
                            disabled={submitDisabled}
                        >
                            {submitTitle}
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default FormModal;