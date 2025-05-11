import { Button, Form, Input, InputNumber, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { IBranch } from "../../models/branchModel";

const SucursalVariantsForm = ({ branches }: { branches: IBranch[] }) => {
    return (
        <Form.List name="sucursales">
            {(fields, { add, remove }) => (
                <>
                    {fields.map(({ key, name }) => (
                        <div key={key} style={{ marginBottom: 24, padding: 16, border: '1px solid #ccc' }}>
                            <Space align="start">
                                <Form.Item
                                    name={[name, "id_sucursal"]}
                                    label="Sucursal"
                                    rules={[{ required: true, message: "Seleccione la sucursal" }]}
                                >
                                    <Select
                                        placeholder="Sucursal"
                                        options={branches.map((s) => ({ value: s._id, label: s.nombre }))}
                                    />
                                </Form.Item>
                                <Button danger onClick={() => remove(name)} icon={<MinusCircleOutlined />} />
                            </Space>

                            <Form.List name={[name, "variantes"]}>
                                {(variantFields, { add: addVar, remove: removeVar }) => (
                                    <>
                                        {variantFields.map(({ key: vKey, name: vName }) => (
                                            <Space key={vKey} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                                                <Form.Item
                                                    name={[vName, "nombre_variante"]}
                                                    rules={[{ required: true, message: "Nombre requerido" }]}
                                                >
                                                    <Input placeholder="Nombre variante" />
                                                </Form.Item>
                                                <Form.Item
                                                    name={[vName, "precio"]}
                                                    rules={[{ required: true, message: "Precio requerido" }]}
                                                >
                                                    <InputNumber placeholder="Precio" min={0} />
                                                </Form.Item>
                                                <Form.Item
                                                    name={[vName, "stock"]}
                                                    rules={[{ required: true, message: "Stock requerido" }]}
                                                >
                                                    <InputNumber placeholder="Stock" min={0} />
                                                </Form.Item>
                                                <MinusCircleOutlined onClick={() => removeVar(vName)} />
                                            </Space>
                                        ))}
                                        <Form.Item>
                                            <Button onClick={() => addVar()} icon={<PlusOutlined />}>
                                                Añadir Variante
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </div>
                    ))}
                    <Form.Item>
                        <Button onClick={() => add()} icon={<PlusOutlined />}>
                            Añadir Sucursal con Variantes
                        </Button>
                    </Form.Item>
                </>
            )}
        </Form.List>
    );
};

export default SucursalVariantsForm;
