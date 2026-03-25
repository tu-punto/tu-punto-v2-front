import { useEffect, useState } from 'react';
import { Modal, Button, Typography, message } from 'antd';
import VariantInputs from './VariantInputs';
import { saveTempVariant } from '../../utils/storageHelpers';

const normalizeText = (value: string) => value.trim().toLowerCase();

const buildCombinationFingerprint = (variantes: Record<string, string>) =>
    Object.entries(variantes || {})
        .map(([key, value]) => [normalizeText(key), String(value || '').trim().toLowerCase()] as [string, string])
        .filter(([key, value]) => key && value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('|');

const AddVariantModal = ({ visible, onCancel, group }: any) => {
    const [combinations, setCombinations] = useState<any[]>([]);
    const [variantSuggestions, setVariantSuggestions] = useState<string[]>([]);
    const [subvariantSuggestions, setSubvariantSuggestions] = useState<Record<string, string[]>>({});
    const [resetKey, setResetKey] = useState(0);
    const sucursalId = localStorage.getItem("sucursalId");

    useEffect(() => {
        if (!visible || !group?.product) return;

        const sucursal = group.product.sucursales?.find(
            (branch: any) => String(branch.id_sucursal) === String(sucursalId)
        );
        const current = sucursal?.combinaciones || [];

        const variantNameMap = new Map<string, string>();
        const subvariantMap = new Map<string, Map<string, string>>();

        current.forEach((combo: any) => {
            Object.entries(combo.variantes || {}).forEach(([rawName, rawValue]) => {
                const normalizedName = normalizeText(rawName);
                const normalizedValue = normalizeText(String(rawValue || ''));
                if (!normalizedName || !normalizedValue) return;

                if (!variantNameMap.has(normalizedName)) {
                    variantNameMap.set(normalizedName, rawName);
                }

                if (!subvariantMap.has(normalizedName)) {
                    subvariantMap.set(normalizedName, new Map<string, string>());
                }

                const currentValues = subvariantMap.get(normalizedName)!;
                if (!currentValues.has(normalizedValue)) {
                    currentValues.set(normalizedValue, String(rawValue));
                }
            });
        });

        setVariantSuggestions(
            Array.from(variantNameMap.values()).sort((a, b) => a.localeCompare(b))
        );
        setSubvariantSuggestions(
            Array.from(subvariantMap.entries()).reduce((acc, [variantName, values]) => {
                acc[variantName] = Array.from(values.values()).sort((a, b) => a.localeCompare(b));
                return acc;
            }, {} as Record<string, string[]>)
        );
        setCombinations([]);
        setResetKey((currentKey) => currentKey + 1);
    }, [group?.product, sucursalId, visible]);

    const handleFinish = async () => {
        if (!sucursalId) return message.error("No se encontro la sucursal en localStorage");

        if (combinations.length === 0) {
            return message.warning("No se han agregado nuevas combinaciones");
        }

        const combinacionesFiltradas = combinations.filter(
            (combo) => Number(combo.stock) > 0 && Number(combo.price) > 0
        );

        if (combinacionesFiltradas.length === 0) {
            return message.warning("Debe ingresar al menos una combinacion con stock y precio.");
        }

        const sucursal = group?.product?.sucursales?.find(
            (branch: any) => String(branch.id_sucursal) === String(sucursalId)
        );
        const existingFingerprints = new Set(
            (sucursal?.combinaciones || []).map((combo: any) =>
                buildCombinationFingerprint(combo.variantes || {})
            )
        );

        const payload = {
            product: group.product,
            sucursalId,
            combinaciones: combinacionesFiltradas
                .map((combo) => {
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
                .filter((combo) => !existingFingerprints.has(buildCombinationFingerprint(combo.variantes)))
        };

        if (payload.combinaciones.length === 0) {
            return message.warning("Las combinaciones nuevas ya existen en este producto.");
        }

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
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Si abriste este modal desde una variante, esa combinacion ya viene cargada como base. Si no, el formulario empieza vacio y usa las variantes ya registradas solo como sugerencias.
            </Typography.Paragraph>
            <VariantInputs
                combinations={combinations}
                setCombinations={setCombinations}
                readOnlyCombinations={[]}
                startEmpty
                variantSuggestions={variantSuggestions}
                subvariantSuggestions={subvariantSuggestions}
                prefillCombination={group?.referenceCombination || null}
                resetKey={`${resetKey}-${buildCombinationFingerprint(group?.referenceCombination || {}) || 'blank'}`}
            />
        </Modal>
    );
};

export default AddVariantModal;
