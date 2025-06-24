import { Button, InputNumber, Table } from "antd";
import { useEffect, useState } from "react";

const EmptySalesTable = ({ products, onDeleteProduct, onUpdateTotalAmount, handleValueChange, sellers, isAdmin,readonly = false, }: any) => {
    const [updatedProducts, setUpdatedProducts] = useState(products);

    useEffect(() => {
        const withUtilidades = products.map((product: any) => {
            const vendedor = sellers.find((v: any) => v._id === product.id_vendedor);
            const comision = Number(vendedor?.comision_porcentual || 0);
            const cantidad = Number(product.cantidad || 0);
            const precio = Number(product.precio_unitario || 0);
            const utilidadCalculada = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));

            return {
                ...product,
                utilidad:
                    product.utilidad != null ? product.utilidad : utilidadCalculada,

            };
        });
        setUpdatedProducts(withUtilidades);
    }, [products, sellers]);

    const totalAmount = updatedProducts.reduce((acc: number, product: any) => {
        return acc + (product.precio_unitario * product.cantidad);
    }, 0);

    const columns = [
        {
            title: 'Producto',
            key: 'producto',
            className: "text-mobile-sm xl:text-desktop-sm",
            render: (_: any, record: any) => (
                <span>
                  {record.nombre_variante || record.producto || "—"}
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
            render: (_: any, record: any) =>
                readonly ? (
                    <span>{record.cantidad}</span>
                ) : (
                    <InputNumber
                        min={1}
                        {...(!record.esTemporal && {
                            max: record.cantidadMaximaEditable ?? record.stockActual ?? Infinity
                        })}
                        value={record.cantidad}
                        onChange={value => handleValueChange(record.key, 'cantidad', value)}
                    />
                ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: 'Precio Unitario',
            dataIndex: 'precio_unitario',
            key: 'precio_unitario',
            render: (_: any, record: any) =>
                readonly ? (
                    <span>{record.precio_unitario}</span>
                ) : (
                    <InputNumber
                        min={0}
                        value={record.precio_unitario}
                        onChange={value => handleValueChange(record.key, 'precio_unitario', value)}
                    />
                ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        ...(isAdmin ? [
            {
                title: 'Utilidad',
                dataIndex: 'utilidad',
                key: 'utilidad',
                render: (_: any, record: any) =>
                    readonly ? (
                        <span>{record.utilidad}</span>
                    ) : (
                        <InputNumber
                            min={0}
                            max={record.precio_unitario * record.cantidad}
                            value={record.utilidad}
                            onChange={value => handleValueChange(record.key, 'utilidad', value)}
                        />
                    )
            }
        ] : []),
        ...(!readonly && onDeleteProduct
            ? [
                {
                    title: 'Acción',
                    key: 'action',
                    render: (_: any, record: any) => (
                        <Button type="link" onClick={() => onDeleteProduct(record.key)}>
                            Eliminar
                        </Button>
                    )
                }
            ]
            : []),
    ];
    useEffect(() => {
        const recalculated = updatedProducts.reduce((acc: number, p: any) => {
            return acc + (p.precio_unitario * p.cantidad);
        }, 0);
        onUpdateTotalAmount(recalculated);
    }, [updatedProducts, onUpdateTotalAmount]);


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