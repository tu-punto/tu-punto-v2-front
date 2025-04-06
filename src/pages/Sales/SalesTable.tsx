import { Table } from 'antd';
import { useEffect, useState } from 'react';
import { getSalesAPI } from '../../api/sales';

const SalesTable = (refreshKey: any) => {
    const [pendingPaymentData, setPendingPaymentData] = useState([]);

    async function fetchSales() {
        try {
            const response = await getSalesAPI();

            const salesData = response.data || response;

            // Verifica si salesData es un array
            if (!Array.isArray(salesData)) {
                console.error('Los datos de vendedores no son un array:', salesData);
                return;
            }

            // Aquí ajusta cómo mapeas los datos según la estructura de tu respuesta de la API
            const formattedData: any = salesData.map((sales: any) => {
                return {
                    key: sales.id_venta.toString(),
                    nombre: `${sales.producto}`,
                    cantidad: `${sales.cantidad}`,
                    precio_unitario: `Bs. ${sales.precio_unitario}`,
                    utilidad: `Bs. ${sales.utilidad}`,
                    utilidad_extra: `Bs. ${sales.utilidad_extra}`,
                };
            })
            // Actualiza el estado con los datos formateados
            setPendingPaymentData(formattedData);

        } catch (error) {
            console.error('Error al obtener los vendedores:', error);
        }
    }


    useEffect(() => {
        fetchSales();
    }, [refreshKey]);

    const columns = [
        {
            title: 'Producto',
            dataIndex: 'producto',
            key: 'producto',
            className: "text-mobile-sm xl:text-desktop-sm"
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            className: "text-mobile-sm xl:text-desktop-sm"
        },
        {
            title: 'Precio Unitario',
            dataIndex: 'precio_unitario',
            key: 'precio_unitario',
            className: "text-mobile-sm xl:text-desktop-sm"
        },
        {
            title: 'Utilidad',
            dataIndex: 'utilidad',
            key: 'utilidad',
            className: "text-mobile-sm xl:text-desktop-sm"
        },
        {
            title: 'Utilidad Extra',
            dataIndex: 'utilidad_extra',
            key: 'utilidad_extra',
            className: "text-mobile-sm xl:text-desktop-sm"
        },
    ];

    return (
        <div>
            <Table
                columns={columns}
                dataSource={pendingPaymentData}
                pagination={false}
            />
        </div>
    );
};

export default SalesTable;
