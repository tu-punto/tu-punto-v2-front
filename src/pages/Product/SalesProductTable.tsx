import { Button, Table } from "antd";
import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";
import { EditableCellInputNumber } from "../components/editableCell";
import { getProductHistorySalesByProductIdAPI } from "../../api/sales";
import { UserContext } from "../../context/userContext";
import useEditableTable from "../../hooks/useEditableTable";

const SalesProductTable = ({product, onSave, setSalesData}) => {
    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role === 'admin';
    const [productSales, setProductSales, handleValueChange] = useEditableTable([]);
    const [totalAmount, setTotalAmount] = useState(0);

    const calculateTotalAmount = () => {
        const total = (productSales.filter(sale => !sale.deleted)).reduce((acc, product) => {
            const cantidad = product.cantidad || 0;
            const precio = product.precio_unitario || 0;
            return acc + (cantidad * precio);
        }, 0);
        setTotalAmount(total);
    };

    const fetchProductSalesHistory = async () => {
        try {
            const details = await getProductHistorySalesByProductIdAPI(product[0].id_producto);
            setProductSales(Array.isArray(details) ? details : []);
        } catch (error) {
            console.error("Error fetching product sales:", error);
            setProductSales([]);
        }
    };
    useEffect(() => {
        fetchProductSalesHistory();
    }, [product]);

    useEffect(() => {
        calculateTotalAmount();
        setSalesData(productSales);
    }, [productSales]);

    const handleDelete = (key) => {
        setProductSales(prevSales => prevSales.map(sale => sale.key === key ? { ...sale, deleted: true } : sale));
    };
    const columns = [
        {
            title: "Fecha",
            dataIndex: "fecha_pedido",
            key: "fecha_pedido",
            render: (text: string) => {
                return dayjs(text).format('DD/MM/YYYY');
            },
            className: "text-mobile-sm xl:text-desktop-sm",
            fixed: 'left' as const,
        },
        {
            title: "Precio Unitario",
            dataIndex: "precio_unitario",
            key: "precio_unitario",
            render: (_: any, record: any) => (
                <EditableCellInputNumber
                    isAdmin={isAdmin}
                    value={record.precio_unitario}
                    min={1}
                    onChange={(value) => handleValueChange(record.key, "precio_unitario", value)}
                />
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: "Cantidad",
            dataIndex: "cantidad",
            key: "cantidad",
            render: (_: any, record: any) => (
                <EditableCellInputNumber
                    isAdmin={isAdmin}
                    value={record.cantidad}
                    min={1}
                    onChange={(value) => handleValueChange(record.key, "cantidad", value)}
                />
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: "Subtotal",
            dataIndex: "subtotal",
            key: "subtotal",
            render: (_: any, record: any) => {
                const subtotal = (record.cantidad || 0) * (record.precio_unitario || 0);
                return `Bs. ${subtotal.toFixed(2)}`;
            },
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        ...(isAdmin
            ? [
                {
                    title: "Vendedor",
                    dataIndex: "nombre_vendedor",
                    key: "nombre_vendedor",
                    className: "text-mobile-sm xl:text-desktop-sm",
                },
                {
                    title: "Acción",
                    key: "action",
                    render: (_: any, record: any) => (
                        <Button type="link" onClick={() => handleDelete(record.key)}>
                            Eliminar
                        </Button>
                    ),
                    className: "text-mobile-sm xl:text-desktop-sm",
                },
            ]
            : []),
    ];

    return (
      <div>
        <div style={{ textAlign: "right" }}>
          <strong className="text-mobile-base xl:text-desktop-base">Monto Total:</strong> Bs.{totalAmount.toFixed(2)}
        </div>
        <Table
          columns={columns}
          dataSource={productSales.filter((sale) => !sale.deleted)}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 5 }}
        />
      </div>
    );
};

export default SalesProductTable;
