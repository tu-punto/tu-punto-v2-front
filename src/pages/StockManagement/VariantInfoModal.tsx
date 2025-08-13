import { Modal, Table, Button, message, Card } from 'antd';
import { useEffect, useState } from 'react';
import { getSucursalsAPI } from '../../api/sucursal';

const VariantInfoModal = ({ visible, onClose, rowRecord }: {
    visible: boolean;
    onClose: () => void;
    rowRecord?: any;
}) => {
    const [isSelectedRow, setIsSelectedRow] = useState(false)
    const [productName, setProductName] = useState<string | null>(null);
    const [variantName, setVariantName] = useState<string | null>(null);
    const [stockData, setStockData] = useState<any[]>();
    const [salesData, setSalesData] = useState<any[]>();
    const [ingData, setIngData] = useState<any[]>();
    const [branchMap, setBranchMap] = useState<Map<string,string>>(new Map);

    useEffect(() => {
        fetchBranches();
        if (!rowRecord) return;
        if (rowRecord.nombre_producto) {
            setProductName(rowRecord.nombre_producto)
        }
        if (rowRecord.variant) {
            setVariantName(rowRecord.variant)
        }
        cleanStockData();
        cleanSalesData();
        cleanIngData();
    }, [rowRecord])

    const fetchBranches = async () => {
        try {
            const branchData = await getSucursalsAPI();
            if(!branchData) return

            const map = new Map<string, string>();
            branchData.forEach((branch: any) => {
                map.set(branch._id, branch.nombre)
            });
            setBranchMap(map);
        } catch (error) {
            console.error("Error al obtener sucursales", error)
            message.error("Error al obtener sucursales.")
        }
    }

    const cleanStockData = () => {
        const cleanData: {nombre_sucursal: string, stock: number}[] = [];
        const branches = rowRecord.sucursales;
        branches.forEach((branch: any) => {
            branch.combinaciones.forEach((b: any) => {
                if (b.variantes["Variante 1"] == rowRecord.variant) {
                    const nombre_sucursal = branchMap.get(branch.id_sucursal) || "";
                    const stock = b.stock;
                    cleanData.push({nombre_sucursal, stock})
                }
            })
        });
        setStockData(cleanData);
    }

    const cleanSalesData = () => {

    }

    const cleanIngData = () => {

    }

    const stockColumns = [
        {
            title: 'Sucursal',
            key: 'sucursal',
            dataIndex: 'nombre_sucursal',
        },
        {
            title: 'Stock',
            key: 'stock',
            dataIndex: 'stock',
        }
    ];
    const sellsColumns = [
        {
            title: 'Fecha',
            key: 'fecha',
            dataIndex: 'fecha',
        },
        {
            title: 'Producto',
            key: 'producto',
            dataIndex: 'producto',
        },
        {
            title: 'Sucursal',
            key: 'sucursal',
            dataIndex: 'sucursal',
        },
        {
            title: 'Precio unitario',
            key: 'precio',
            dataIndex: 'precio',
        },
        {
            title: 'Cantidad',
            key: 'cantidad',
            dataIndex: 'cantidad',
        },
        {
            title: 'Subtotal',
            key: 'subtotal',
            dataIndex: 'subtotal',
        },
    ];
    const ingColumns = [
        {
            title: 'Fecha',
            key: 'fecha',
            dataIndex: 'fecha',
        },
        {
            title: 'Sucursal',
            key: 'sucursal',
            dataIndex: 'sucursal',
        },
        {
            title: 'Producto',
            key: 'producto',
            dataIndex: 'producto',
        },
        {
            title: 'Cantidad',
            key: 'cantidad',
            dataIndex: 'cantidad',
        },
    ]

    const handleClose = () => {
        resetFields();
        onClose();
    }

    const resetFields = () => {
        setIsSelectedRow(false);
        setProductName(null);
        setVariantName(null);
    }

    return (
        <Modal
            title={"Detalles " + (variantName ? `de la variante: ${productName} - ${variantName}` : `del producto: ${productName}`)}
            open={visible}
            onCancel={handleClose}
            footer={false}
            width={1000}
        >
            <Card title="Stock por sucursal" bordered={false}>
                <Table
                    columns={stockColumns}
                    dataSource={stockData}
                    pagination={{ pageSize: 15 }}
                />
            </Card>
            <Card title="Historial de ventas" bordered={false}>
                <Table
                    columns={sellsColumns}
                    dataSource={salesData}
                    pagination={{ pageSize: 15 }}
                />
            </Card>
            <Card title="Historial de ingresos" bordered={false}>
                <Table
                    columns={ingColumns}
                    dataSource={ingData}
                    pagination={{ pageSize: 15 }}
                />
            </Card>
        </Modal>
    );
};

export default VariantInfoModal;
