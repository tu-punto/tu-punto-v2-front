import { Table } from 'antd';
import { useEffect, useState } from 'react';
import { getSalesAPI } from '../../api/sales';
import PromotionPrice from '../../components/PromotionPrice';

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
                    producto: `${sales.producto}`,
                    cantidad: Number(sales.cantidad || 0),
                    precio_unitario: Number(sales.precio_unitario || 0),
                    precio_original: Number(sales.precio_original || sales.precio_unitario || 0),
                    utilidad: Number(sales.utilidad || 0),
                    utilidad_extra: Number(sales.utilidad_extra || 0),
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
            className: "text-mobile-sm xl:text-desktop-sm",
            render: (_: any, record: any) => (
              <PromotionPrice
                price={record.precio_unitario}
                basePrice={record.precio_original}
                quantity={record.cantidad}
                compact
              />
            )
        },
        {
            title: 'Utilidad',
            dataIndex: 'utilidad',
            key: 'utilidad',
            className: "text-mobile-sm xl:text-desktop-sm",
            render: (value: number) => `Bs. ${Number(value || 0).toFixed(2)}`
        },
        {
            title: 'Utilidad Extra',
            dataIndex: 'utilidad_extra',
            key: 'utilidad_extra',
            className: "text-mobile-sm xl:text-desktop-sm",
            render: (value: number) => `Bs. ${Number(value || 0).toFixed(2)}`
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
