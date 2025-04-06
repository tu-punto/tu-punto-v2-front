import { Table } from "antd";
import { useContext, useState } from "react";
import { UserContext } from "../../context/userContext";
import { EditableCellInputNumber } from "../components/editableCell";


const RestockTable = ({ products, onSave, setRestockData }) => {
    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role === 'admin';

    const [restockData, setRestockDataState] = useState(products.map(product => ({
        ...product,
        stock: product.producto_sucursal.reduce((acc: number, prodSuc: any) => acc + prodSuc.cantidad_por_sucursal, 0) || 0,
        incomingQuantity: 0,
        precio: product.precio || 0  // Initialize precio if it's not present
    })));

    const handleDataChange = (index, key, value) => {
        const newRestockData = [...restockData];
        newRestockData[index][key] = value;
        setRestockDataState(newRestockData);
        setRestockData(newRestockData);
    };

    const columns = [
        {
            title: 'Nombre del Producto',
            dataIndex: 'nombre_producto',
            key: 'nombre_producto',
            className: 'text-mobile-sm xl:text-desktop-sm',
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            render: (text, record, index) => (
                <EditableCellInputNumber
                    isAdmin={isAdmin}
                    value={text}
                    min={0} 
                    onChange={(value) => handleDataChange(index, 'precio', value)}
                />
            ),
            className: 'text-mobile-sm xl:text-desktop-sm',
        },
        {
            title: 'Cantidad',
            dataIndex: 'stock',
            key: 'stock',
            className: 'text-mobile-sm xl:text-desktop-sm',
        },
        {
            title: 'Entrada',
            dataIndex: 'incomingQuantity',
            key: 'incomingQuantity',
            render: (text, record, index) => (
                <EditableCellInputNumber
                    isAdmin={isAdmin}
                    value={text}
                    min={0} 
                    onChange={(value) => handleDataChange(index, 'incomingQuantity', value)}
                    
                />
            ),
            className: 'text-mobile-sm xl:text-desktop-sm',
        },
    ];

    return (
        <div>
            <Table
                columns={columns}
                dataSource={restockData}
                scroll={{ x: "max-content" }}
                pagination={false}
                rowKey="id_producto"
            />
        </div>
    );
}

export default RestockTable