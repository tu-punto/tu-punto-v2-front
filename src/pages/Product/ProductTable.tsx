import { Table , message} from 'antd';
import PromotionPrice from '../../components/PromotionPrice';

const CRITICAL_STOCK_THRESHOLD = 1;

const ProductTable = ({ data, onSelectProduct }: any) => {
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
            render: (stockActual: number) => {
                const stock = Number(stockActual || 0);
                const critical = stock <= CRITICAL_STOCK_THRESHOLD;
                return (
                    <span className={stock === 0 ? 'text-red-700 font-semibold' : critical ? 'text-amber-700 font-semibold' : ''}>
                        {stock}
                        {stock === 0 ? ' (agotado)' : critical ? ' (critico)' : ''}
                    </span>
                );
            }
        },
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Precio</span>,
            dataIndex: 'precio',
            key: 'precio',
            render: (_: any, record: any) => (
                <PromotionPrice
                    price={record.precio}
                    basePrice={record.precio_original ?? record.originalPrice ?? record.precio_base}
                    promotion={record.pricingPromotion}
                    compact
                    showTierBadge
                />
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
                    className: `text-mobile-sm xl:text-desktop-sm ${record.stockActual === 0 ? 'bg-red-100 text-red-700' : record.stockActual <= CRITICAL_STOCK_THRESHOLD ? 'bg-amber-100 text-amber-900' : ''}`,
                    onClick: () => {
                        if (record.stockActual === 0) {
                            message.error(`El producto "${record.producto}" no tiene stock disponible.`);
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
