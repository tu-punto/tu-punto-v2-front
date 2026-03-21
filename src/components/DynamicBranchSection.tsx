import { Button, FormInstance, Card, Col, Form, Row } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import BranchFields from "../pages/Seller/components/BranchFields";

interface DynamicBranchSectionProps {
    form: FormInstance<any>,
    branchOptions: any[],
    handleAddBranch: () => void,
    disabled?: boolean
}

function DynamicBranchSection({ disabled, branchOptions, handleAddBranch, form }: DynamicBranchSectionProps) {
    return (
        <>
            <Row justify="space-between" align="middle">
                <Col>
                    <h3>Sucursales</h3>
                </Col>
                <Col>
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={handleAddBranch}
                        disabled={disabled}
                    >
                        Añadir Sucursal
                    </Button>
                </Col>
            </Row>
            <Form.List name="sucursales">
                {(fields, { remove }) => (
                    <>
                        {fields.map((field) => (
                            <Card key={field.key} style={{ marginTop: 16 }}>
                                <BranchFields
                                    field={field}
                                    remove={remove}
                                    sucursalOptions={branchOptions}
                                    form={form}
                                />
                            </Card>
                        ))}
                    </>
                )}
            </Form.List>
        </>
    );
}

export default DynamicBranchSection;