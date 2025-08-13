import { Modal, Table, message, Card } from 'antd';
import { useEffect, useState, useContext } from 'react';
import { UserContext } from '../../context/userContext';
import { getSucursalsAPI } from '../../api/sucursal';
import { getProductsEntryAmount } from '../../api/entry';
import moment from 'moment-timezone';
import { getSalesBySellerIdAPI } from '../../api/sales';

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
    const [sellRawData, setSellRawData] = useState<any[]>();
    const [entryRawData, setEntryRawData] = useState<any[]>();

    useEffect(() => {
        fetchBranches();
        fetchSells();
        fetchEntries();
    }, [rowRecord])

    useEffect(() => {
        if (!rowRecord) return;

        if (rowRecord.ingreso) {

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
    }, [rowRecord, visible])

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

    const fetchSells = async () => {
        try {
            const sellData = await getSalesBySellerIdAPI(user.id_vendedor);
            if (!sellData) return
            setSellRawData(sellData);
        } catch (error) {
            console.error("Error al obtener ventas:", error)
            message.error("Error al obtener ventas.")
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
                const varianteKeys = Object.keys(b.variantes);
                if (varianteKeys.length > 0) {
                    const varianteKey = varianteKeys[0];
                    const varianteValue = b.variantes[varianteKey]; 
                    if (varianteValue === rowRecord.variant) {
                        const nombre_sucursal = branchMap.get(branch.id_sucursal) || "";
                        const stock = b.stock;
                        cleanData.push({ nombre_sucursal, stock });
                    }
                }
            })
        });
        setStockData(cleanData);
    }

    const cleanSalesData = () => {
        const cleanData: {
            fecha: Date, producto: string, sucursal: string,
            precio: number, cantidad: number, subtotal: number
        }[] = [];
        sellRawData?.forEach((sell: any) => {
            if (sell.id_producto == rowRecord._id) {
                const fecha = sell.fecha_pedido;
                const producto = sell.nombre_variante;
                const sucursal = branchMap.get(sell.id_sucursal) || "";
                const precio = sell.precio_unitario;
                const cantidad = sell.cantidad;
                const subtotal = sell.id_pedido.subtotal_efectivo + sell.id_pedido.subtotal_qr;
                cleanData.push({ fecha, producto, sucursal, precio, cantidad, subtotal });
            }
        })
        setSalesData(cleanData);
    }

    const cleanEntryData = async () => {
        const entrySet = new Set(rowRecord.ingreso);
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
            render: (text: string) =>
                moment.parseZone(text).format("DD/MM/YYYY"),
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
        setStockData([]);
        setSalesData([]);
        setEntryData([]);
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
