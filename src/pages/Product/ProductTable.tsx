import { Space, Table, Tooltip, Typography, message } from 'antd';
import { useContext } from 'react';
import PromotionPrice from '../../components/PromotionPrice';
import { UserContext } from '../../context/userContext';
import { normalizeRole } from '../../utils/role';
import { getFarmerUnitBonus } from '../../utils/farmerBonus';
import { resolvePromotionPricing } from '../../utils/promotionPricing';

const CRITICAL_STOCK_THRESHOLD = 1;

const ProductTable = ({ data, onSelectProduct, onConditionalPromotionRequest, isMobile = false, farmerDiscountRules = [], farmerBonusStatus = 'loading' }: any) => {
    const { user } = useContext(UserContext) || {};
    const isSeller = normalizeRole(user?.role) === 'seller';
    const isFarmer = normalizeRole(user?.role) === 'farmer';
    const columns = [
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Producto</span>,
            dataIndex: 'producto',
            key: 'producto',
        },
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Stock actual</span>,
            dataIndex: 'stockActual',
            key: 'stockActual',
            render: (stockActual: number, record: any) => {
                const stock = Number(stockActual || 0);
                const stockEnReserva = Math.max(0, Number(record?.stockEnReserva ?? 0));
                const critical = stock <= CRITICAL_STOCK_THRESHOLD;
                return (
                    <span className={isSeller && stock === 0 ? 'text-red-700 font-semibold' : isSeller && critical ? 'text-amber-700 font-semibold' : ''}>
                        {stock}
                        {stockEnReserva > 0 && (
                            <Tooltip title="En reserva">
                                <span style={{ marginLeft: 4, color: '#722ed1', cursor: 'help' }}>+{stockEnReserva}</span>
                            </Tooltip>
                        )}
                        {isSeller && (stock === 0 ? ' (agotado)' : critical ? ' (crítico)' : '')}
                    </span>
                );
            }
        },
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Precio</span>,
            dataIndex: 'precio',
            key: 'precio',
            render: (_: any, record: any) => (
                <Space direction="vertical" size={4}>
                    <PromotionPrice
                        price={record.precio}
                        basePrice={record.precio_original ?? record.originalPrice ?? record.precio_base}
                        promotion={record.pricingPromotion}
                        compact
                        showTierBadge
                        onConditionalAccept={
                            !isMobile
                                ? (accepted) => onSelectProduct({ ...record, promoAccepted: accepted })
                                : undefined
                        }
                    />
                </Space>
            ),
        },
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Vendedor</span>,
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: (vendedor: any, record: any) => {
                return record.vendedor || 'Sin vendedor';
            }
        },
        ...(isFarmer ? [{
            title: <span className="text-mobile-sm xl:text-desktop-sm">Tu bono por unidad</span>,
            key: 'bono_granjero',
            render: (_: any, record: any) => {
                if (farmerBonusStatus === 'loading') return <Typography.Text type="secondary">Cargando...</Typography.Text>;
                if (farmerBonusStatus === 'error') return <Typography.Text type="secondary">No disponible</Typography.Text>;
                const basePrice = Number(record.precio_original ?? record.originalPrice ?? record.basePrice ?? record.precio ?? 0);
                const price = resolvePromotionPricing(basePrice, record.pricingPromotion || record.promotionPricing || null, 1).effectivePrice;
                const bonus = getFarmerUnitBonus(price, farmerDiscountRules);
                return bonus === null
                    ? <Typography.Text type="secondary">Sin regla</Typography.Text>
                    : <Typography.Text strong type="success">Bs. {bonus.toFixed(2)}</Typography.Text>;
            },
        }] : []),
    ];

    return (
        <div className="flex">
                <Table
                className="flex-1"
                columns={columns}
                dataSource={data}
                pagination={{ pageSize: 10, pageSizeOptions: [] }}
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                    className: `text-mobile-sm xl:text-desktop-sm ${isSeller ? (record.stockActual === 0 ? 'bg-red-100 text-red-700' : record.stockActual <= CRITICAL_STOCK_THRESHOLD ? 'bg-amber-100 text-amber-900' : '') : ''}`,
                    onClick: () => {
                        if (record.stockActual === 0) {
                            message.error(`El producto "${record.producto}" no tiene stock disponible.`);
                            return;
                        }

                        if (isMobile && record.pricingPromotion?.pricingMode === "conditional") {
                            onConditionalPromotionRequest?.(record);
                            return;
                        }

                        onSelectProduct(record);
                    },
                })}
            />
        </div>
    );
};

export default ProductTable;
