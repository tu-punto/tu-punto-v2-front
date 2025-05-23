import { useEffect, useState } from 'react';
import { Modal, Button, message } from 'antd';
import VariantInputs from './VariantInputs';
import { createVariantAPI } from '../../api/product';

const AddVariantModal = ({ visible, onCancel, group, onAdd }: any) => {
    const [combinations, setCombinations] = useState([]);
    const [existingCombinations, setExistingCombinations] = useState([]);
    const sucursalId = localStorage.getItem("sucursalId");

    useEffect(() => {
        if (visible && group?.product) {
            const sucursal = group.product.sucursales?.find(s => (s.id_sucursal.$oid || s.id_sucursal) === sucursalId);
            const current = sucursal?.combinaciones || [];

            const formatted = current.map((combo: any, index: number) => {
                const varianteEntries = Object.entries(combo.variantes || {});
                const entry: any = {
                    id: `existing-${index}`,
                    disabled: true,
                    price: combo.precio,
                    stock: combo.stock
                };

                varianteEntries.forEach(([varName, varValue], i) => {
                    entry[`varName${i}`] = varName;
                    entry[`var${i}`] = varValue;
                });

                return entry;
            });

            setExistingCombinations(formatted);
            setCombinations(formatted); // inicializamos con los existentes visibles pero desactivados
        }
    }, [visible]);

    const handleFinish = async () => {
        if (!sucursalId) return message.error("No se encontró la sucursal en localStorage");

        const newCombinations = combinations.filter(c => !c.disabled);

        if (newCombinations.length === 0) {
            return message.warning("No se han agregado nuevas combinaciones");
        }

        try {
            const payload = {
                productId: group.product._id,
                sucursalId,
                combinaciones: newCombinations.map(combo => {
                    const variantes: Record<string, string> = {};
                    let i = 0;
                    while (combo[`varName${i}`] && combo[`var${i}`]) {
                        variantes[combo[`varName${i}`]] = combo[`var${i}`];
                        i++;
                    }
                    return {
                        variantes,
                        precio: combo.price,
                        stock: combo.stock
                    };
                })
            };

            const res = await createVariantAPI(payload);

            if (res?.success) {
                message.success("Variantes agregadas con éxito");
                onCancel();
                onAdd && onAdd(res); // actualiza la tabla desde StockManagement
            } else {
                message.error("No se pudieron agregar las variantes");
            }
        } catch (err) {
            console.error(err);
            message.error("Error inesperado al agregar variantes");
        }
    };

    return (
        <Modal
            title={`Agregar variantes a "${group.name}"`}
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancelar
                </Button>,
                <Button key="submit" type="primary" onClick={handleFinish}>
                    Guardar Variantes
                </Button>
            ]}
            width={1000}
        >
            <VariantInputs
                combinations={combinations}
                setCombinations={setCombinations}
                readOnlyCombinations={existingCombinations}
            />
        </Modal>
    );
};

export default AddVariantModal;
