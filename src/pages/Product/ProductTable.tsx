import { Table , message} from 'antd';
import { useContext } from 'react';
import { UserContext } from '../../context/userContext';

const ProductTable = ({ data, onSelectProduct }: any) => {
    const { user }: any = useContext(UserContext);

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
        },
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Precio</span>,
            dataIndex: 'precio',
            key: 'precio',
        },
        {
            title: <span className="text-mobile-sm xl:text-desktop-sm">Categoría</span>,
            dataIndex: 'categoria',
            key: 'categoria',
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
                    className: `text-mobile-sm xl:text-desktop-sm ${record.stockActual === 0 ? 'bg-red-100 text-red-700' : ''}`,
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
