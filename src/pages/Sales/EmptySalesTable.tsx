import { Button, InputNumber, Popover, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { applySellerCommissionCap } from "../../utils/commissionCap";
import PromotionPrice from "../../components/PromotionPrice";

const getSellerBranchCommission = (seller: any, branchId?: string) => {
    const useBranchCommission = Boolean(seller?.comision_diferente_por_sucursal);
    const branch = Array.isArray(seller?.pago_sucursales)
        ? seller.pago_sucursales.find((item: any) => String(item?.id_sucursal?._id || item?.id_sucursal || "").trim() === String(branchId || "").trim())
        : null;

    if (useBranchCommission && branch) {
        return {
            percent: Number(branch?.comision_porcentual || 0),
            fixed: Number(branch?.comision_fija || 0),
        };
    }

    return {
        percent: Number(seller?.comision_porcentual || 0),
        fixed: Number(seller?.comision_fija || 0),
    };
};

const formatMoney = (value: number) => `Bs. ${Number(value || 0).toFixed(2)}`;

const EmptySalesTable = ({
    products,
    onDeleteProduct,
    onUpdateTotalAmount,
    handleValueChange,
    onConditionalPromotionDecision,
    sellers,
    isAdmin,
    branchId,
    readonly = false,
}: any) => {
    const [updatedProducts, setUpdatedProducts] = useState(products);

    useEffect(() => {
        const withUtilidades = products.map((product: any) => {
            const vendedor = sellers.find((v: any) => v._id === product.id_vendedor);
            const branchCommission = getSellerBranchCommission(vendedor, branchId);
            const cantidad = Number(product.cantidad || 0);
            const precio = Number(product.precio_unitario || 0);
            const utilidadCalculada = applySellerCommissionCap(
                product.id_vendedor,
                parseFloat((((precio * cantidad * branchCommission.percent) / 100) + branchCommission.fixed).toFixed(2))
            );

            return {
                ...product,
                utilidad: applySellerCommissionCap(
                    product.id_vendedor,
                    product.utilidad != null ? Number(product.utilidad) : utilidadCalculada
                ),

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
                    <Space direction="vertical" size={4}>
                        <Typography.Text strong>{formatMoney(record.precio_unitario)}</Typography.Text>
                        {record.pricingPromotion?.pricingMode === "conditional" && (
                          <Tag color={record.promoAccepted ? "green" : "magenta"} bordered={false}>
                            {record.promoAccepted ? "Promo aplicada" : "Promo"}
                          </Tag>
                        )}
                    </Space>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {record.pricingPromotion?.pricingMode === "conditional" && (
                          <>
                            <Typography.Text strong>{formatMoney(record.precio_unitario)}</Typography.Text>
                            <Popover
                              trigger={["hover", "click"]}
                              placement="topLeft"
                              content={
                                <div style={{ minWidth: 220 }}>
                                  <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                                    Promocion condicional
                                  </Typography.Text>
                                  <Typography.Text style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                                    {record.pricingPromotion?.conditionalQuestion || "Confirma si aplica la promo."}
                                  </Typography.Text>
                                  <Space>
                                    <Button type="primary" size="small" onClick={() => onConditionalPromotionDecision?.(record.key, true)}>
                                      Si aplica
                                    </Button>
                                    <Button size="small" onClick={() => onConditionalPromotionDecision?.(record.key, false)}>
                                      No aplica
                                    </Button>
                                  </Space>
                                </div>
                              }
                            >
                              <Tag color={record.promoAccepted ? "green" : "magenta"} bordered={false} style={{ width: "fit-content", cursor: "pointer" }}>
                                {record.promoAccepted ? "Promo aplicada" : "Promo"}
                              </Tag>
                            </Popover>
                          </>
                        )}
                        {record.pricingPromotion?.pricingMode !== "conditional" && (
                          <PromotionPrice
                              price={record.precio_unitario}
                              basePrice={record.precio_original ?? record.originalPrice ?? record.precio_base}
                              promotion={record.pricingPromotion}
                              quantity={record.cantidad}
                              compact
                              showTierBadge
                          />
                        )}
                        <InputNumber
                            min={0}
                            value={record.precio_unitario}
                            onChange={value => handleValueChange(record.key, 'precio_unitario', value)}
                        />
                    </div>
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
                            max={applySellerCommissionCap(
                                record.id_vendedor || record.vendedor?._id || record.vendedor,
                                Number(record.precio_unitario || 0) * Number(record.cantidad || 0)
                            )}
                            value={record.utilidad}
                            onChange={value => handleValueChange(
                                record.key,
                                'utilidad',
                                applySellerCommissionCap(
                                    record.id_vendedor || record.vendedor?._id || record.vendedor,
                                    Number(value || 0)
                                )
                            )}
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
