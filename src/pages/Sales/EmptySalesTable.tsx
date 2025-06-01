import { Button, InputNumber, Table } from "antd";
import { useEffect } from "react";

const EmptySalesTable = ({ products, onDeleteProduct, onUpdateTotalAmount, handleValueChange, sellers }: any) => {
    const updatedProducts = products.map((product: any) => {
        const vendedor = sellers.find((v: any) => v._id === product.id_vendedor);
        const comision = vendedor?.comision_porcentual || 0;
        const cantidad = product.cantidad || 0;
        const precio = product.precio_unitario || 0;
        const utilidad = (precio * cantidad * comision) / 100;

        return {
            ...product,
            utilidad: utilidad
        };
    });
    const totalAmount = updatedProducts.reduce((acc: number, product: any) => {
        const cantidad = product.cantidad || 0;
        const precio = product.precio_unitario || 0;
        const utilidad = product.utilidad || 0;
        return acc + ((precio - utilidad) * cantidad);
    }, 0);
    const columns = [
        {
            title: 'Producto',
            dataIndex: 'producto',
            key: 'producto',
            className: "text-mobile-sm xl:text-desktop-sm",
            render: (text: string, record: any) => (
                <span>
            {text}
                    {record.esTemporal && (
                        <span style={{ marginLeft: 8, color: '#faad14', fontWeight: 500 }}>
                    (Temporal)
                </span>
                    )}
        </span>
            )
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            render: (_: any, record: any) => (
                <InputNumber
                    min={1}
                    max={record.stockActual ?? Infinity}
                    value={record.cantidad}
                    onChange={value => handleValueChange(record.key, 'cantidad', value)}
                    className="text-mobile-sm xl:text-desktop-sm"
                />

            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: 'Precio Unitario',
            dataIndex: 'precio_unitario',
            key: 'precio_unitario',
            render: (_: any, record: any) => (
                <InputNumber
                    min={0}
                    value={record.precio_unitario}
                    onChange={value => handleValueChange(record.key, 'precio_unitario', value)}
                    className="text-mobile-sm xl:text-desktop-sm"
                />
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: 'Utilidad',
            dataIndex: 'utilidad',
            key: 'utilidad',
            render: (_: any, record: any) => (
                <InputNumber
                    min={0}
                    value={record.utilidad}
                    onChange={value => handleValueChange(record.key, 'utilidad', value)}
                    defaultValue={0}
                    className="text-mobile-sm xl:text-desktop-sm"
                />
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: 'Acción',
            key: 'action',
            render: (_: any, record: any) => (
                <Button type="link" onClick={() => onDeleteProduct(record.key)} className="text-mobile-sm xl:text-desktop-sm">
                    Eliminar
                </Button>
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
    ];
    useEffect(() => {
        onUpdateTotalAmount(totalAmount)
    }, [products, onUpdateTotalAmount]);

    return (
        <div>
            <div style={{ textAlign: 'right' }}>
                <strong>Monto Total:</strong> Bs.{totalAmount.toFixed(2)}
            </div>
            <Table
                columns={columns}
                dataSource={updatedProducts}
                pagination={{pageSize: 10, pageSizeOptions: []}}
                scroll={{x: "max-content"}}
            // footer={() => (
            //     <div style={{ textAlign: 'right' }}>
            //         <strong>Monto Total:</strong> Bs.{totalAmount.toFixed(2)}
            //     </div>
            // )}
            />
        </div>
    );
}

export default EmptySalesTable;