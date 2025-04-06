import { Table } from 'antd';

import { useContext, useEffect, useState } from 'react';
import useProducts from '../../hooks/useProducts';
import { UserContext } from '../../context/userContext';
const ProductTable = ({ data, onSelectProduct, refreshKey }: any) => {
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

    const { fetchProducts } = useProducts()
    const [localData, setLocalData] = useState<any>([])

    useEffect(() => {
        const getNewData = async () => {
            const newData = await fetchProducts()
            setLocalData(newData)
        }
        getNewData()
    }, [refreshKey])

    return (
        <div className='flex'>
            <Table
                className='flex-1'
                columns={columns}
                dataSource={data}
                pagination={{pageSize: 10, pageSizeOptions: []}}
                scroll={{x: "max-content" }}
                onRow={(record) => ({
                    className: 'text-mobile-sm xl:text-desktop-sm',
                    onClick: () => onSelectProduct(record),
                })}
            />
        </div>
    );
};
export default ProductTable;
