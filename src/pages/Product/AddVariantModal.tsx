import { useEffect, useState } from 'react';
import { Modal, Button, message } from 'antd';
import VariantInputs from './VariantInputs';
import { createVariantAPI } from '../../api/product';
import { saveTempVariant } from '../../utils/storageHelpers';
const AddVariantModal = ({ visible, onCancel, group, onAdd }: any) => {
    const [combinations, setCombinations] = useState([]);
    const [existingCombinations, setExistingCombinations] = useState([]);
    const sucursalId = localStorage.getItem("sucursalId");

    useEffect(() => {
        if (visible && group?.product) {
            //console.log("🧪 group.product:", group.product);

            const sucursal = group.product.sucursales?.find(
                s => String(s.id_sucursal) === String(sucursalId)
            );
            //console.log("🧪 sucursal encontrada:", sucursal);

            const current = sucursal?.combinaciones || [];
            //console.log("🧪 combinaciones actuales:", current);

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

            //console.log("🧪 combinaciones formateadas:", formatted);

            setExistingCombinations(formatted);
            setCombinations(formatted);
        }
    }, [visible]);
    const handleFinish = async () => {
        if (!sucursalId) return message.error("No se encontró la sucursal en localStorage");

        const newCombinations = combinations.filter(c => !c.disabled);
        if (newCombinations.length === 0) {
            return message.warning("No se han agregado nuevas combinaciones");
        }

        const combinacionesFiltradas = newCombinations.filter(
            combo => Number(combo.stock) > 0 && Number(combo.price) > 0
        );

        if (combinacionesFiltradas.length === 0) {
            return message.warning("Debe ingresar al menos una combinación con stock y precio.");
        }

        const payload = {
            product: group.product,
            sucursalId,
            combinaciones: combinacionesFiltradas.map(combo => {
                const variantes: Record<string, string> = {};
                let i = 0;
                while (combo[`varName${i}`] && combo[`var${i}`]) {
                    variantes[combo[`varName${i}`]] = combo[`var${i}`];
                    i++;
                }
                return {
                    variantes,
                    precio: combo.price,
                    stock: combo.stock,
                    isNew: true
                };
            })
        };
        saveTempVariant(payload);
        message.success("Variantes guardadas localmente");
        onCancel();
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
