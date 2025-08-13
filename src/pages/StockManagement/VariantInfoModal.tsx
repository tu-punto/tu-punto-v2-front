import { Modal, Table, message, Card } from 'antd';
import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../../context/userContext';
import { getSucursalsAPI } from '../../api/sucursal';
import { getProductsEntryAmount } from '../../api/entry';
import moment from 'moment-timezone';

const VariantInfoModal = ({ visible, onClose, rowRecord }: {
    visible: boolean;
    onClose: () => void;
    rowRecord?: any;
}) => {
    const { user }: any = useContext(UserContext);
    const [productName, setProductName] = useState<string | null>(null);
    const [variantName, setVariantName] = useState<string | null>(null);
    const [stockData, setStockData] = useState<any[]>();
    const [salesData, setSalesData] = useState<any[]>();
    const [entryData, setEntryData] = useState<any[]>();
    const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map);
    const [entrySet, setEntrySet] = useState<Set<string>>(new Set);
    const [entryRawData, setEntryRawData] = useState<any[]>();

    useEffect(() => {
        fetchBranches();
        fetchEntries();
    }, [rowRecord])

    useEffect(() => {
        if (!rowRecord) return;

        if (rowRecord.ingreso) {
            setEntrySet(new Set(rowRecord.ingreso));
        }
        if (rowRecord.nombre_producto) {
            setProductName(rowRecord.nombre_producto);
        }
        if (rowRecord.variant) {
            setVariantName(rowRecord.variant);
        }

        cleanStockData();
        cleanSalesData();
        cleanEntryData();
    }, [rowRecord, entrySet])

    const fetchBranches = async () => {
        try {
            const branchData = await getSucursalsAPI();
            if (!branchData) return

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

    const fetchEntries = async () => {
        try {
            const entriesData = await getProductsEntryAmount(user.id_vendedor);
            if (!entriesData) return
            setEntryRawData(entriesData);
        } catch (error) {
            console.error("Error al obtener ingresos", error)
        }
    }

    const cleanStockData = () => {
        const cleanData: { nombre_sucursal: string, stock: number }[] = [];
        const branches = rowRecord.sucursales;
        branches.forEach((branch: any) => {
            branch.combinaciones.forEach((b: any) => {
                if (b.variantes["Variante 1"] == rowRecord.variant) {
                    const nombre_sucursal = branchMap.get(branch.id_sucursal) || "";
                    const stock = b.stock;
                    cleanData.push({ nombre_sucursal, stock })
                }
            })
        });
        setStockData(cleanData);
    }

    const cleanSalesData = () => {

    }

    const cleanEntryData = async () => {
        if (entrySet.size == 0) {
            console.log("ya ni le muevas pa")
        }
        const cleanData: { fecha: Date, sucursal: string, producto: string, cantidad: number }[] = [];
        entryRawData?.forEach((entry: any) => {
            if (entrySet.has(entry._id)) {
                const fecha = entry.fecha_ingreso;
                const sucursal = branchMap.get(entry.sucursal) || "";
                const producto = entry.nombre_variante;
                const cantidad = entry.cantidad_ingreso;
                cleanData.push({ fecha, sucursal, producto, cantidad })
            }
        })
        setEntryData(cleanData);
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
    const entryColumns = [
        {
            title: 'Fecha',
            key: 'fecha',
            dataIndex: 'fecha',
            render: (text: string) =>
                moment.parseZone(text).format("DD/MM/YYYY"),
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
                    columns={entryColumns}
                    dataSource={entryData}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

        </Modal>
    );
};

export default VariantInfoModal;
