import { Button, DatePicker, Input, message, Select, Table, Typography } from 'antd';
import { EnvironmentOutlined, HomeOutlined } from '@ant-design/icons';
import { useContext, useEffect, useState } from 'react';
import { getExternalSalesAPI } from '../../api/externalSale.ts'
import ShippingInfoModal from './ShippingInfoModal';
import ShippingStateModal from './ShippingStateModal';
import { getSucursalsAPI } from '../../api/sucursal';
import { getSellersAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext.tsx";
import moment from "moment-timezone";
import ExternalSalesModal from './ExternalSalesModal.tsx';
import { render } from '@react-pdf/renderer';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ExternalSalesTable = ({ refreshKey }: { refreshKey: number }) => {
    const [externalSalesData, setExternalSalesData] = useState([]);
    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const [isModalExternalVisible, setIsModalExternalVisible] = useState(false);
    const [isShippingStatusFilterActive, setIsShippingStatusFilterActive] = useState(false);
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
    const [shippingStatus, setShippingStatus] = useState<null | 'Por sucursal' | 'Por flota' | 'Sin envío'>();

    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isOperator = user?.role.toLowerCase() === 'operator';

    const fetchExternalSales = async () => {
        try {
            const apiData = await getExternalSalesAPI();
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime()
            );
            setExternalSalesData(sortedData);
            setFilteredSalesData(sortedData);
        } catch (error) {
            console.error("Error fetching external sales data:", error);
        }
    }

    const columns = [
        {
            title: '¿Con envío?',
            key: 'isEnvio',
            width: 110,
            render: (_: any, record: any) => {
                const color = record.ciudad_envio ? 'bg-green-500' : 'bg-red-500';
                return {
                    children: <div
                        className={`w-4 h-4 rounded-full ${color}`}
                    />,
                }
            }
        },
        {
            title: 'Fecha del Pedido',
            dataIndex: 'fecha_pedido',
            key: 'fecha_pedido',
            render: (text: string) => moment.parseZone(text).format("DD/MM/YYYY"),
            sorter: (a: any, b: any) =>
                moment.parseZone(a.fecha_pedido).valueOf() -
                moment.parseZone(b.fecha_pedido).valueOf(),
            sortOrder,
            onHeaderCell: () => ({
                onClick: () => {
                    setSortOrder(prev => (prev === 'ascend' ? 'descend' : 'ascend'));
                },
            }),
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor'
        },
        {
            title: 'Comprador',
            dataIndex: 'comprador',
            key: 'comprador'
        },
        {
            title: '¿Dónde se recogerá?',
            key: 'punto',
            render: (_: any, record: any) => {
                const sucursal = record.sucursal;
                if (typeof sucursal === 'object' && sucursal !== null) {
                    return (
                        <>
                            <HomeOutlined style={{ color: 'blue', marginRight: 8 }} />
                            <Typography.Text>
                                {sucursal.nombre}
                            </Typography.Text>
                        </>
                    );
                } else if (record.nombre_flota) {
                    return (
                        <>
                            <EnvironmentOutlined style={{ color: 'blue', marginRight: 8 }} />
                            <Typography.Text>
                                {record.nombre_flota}
                            </Typography.Text>
                        </>
                    );
                } else {
                    return 'No requiere envío'
                }
            }
        }
    ];

    const handleCancel = () => {
        setIsModalExternalVisible(false)
    };

    const updateFilteredSalesData = () => {
        setFilteredSalesData(externalSalesData.filter(row => isRowOnFilter(row)));
    }

    const isRowOnFilter = (fila: any) => {
        return (
            isRowOnShippingStatusFilter(fila)
        )
    }

    const isRowOnShippingStatusFilter = (fila: any) => {
        return !isShippingStatusFilterActive || (isShippingStatusFilterActive && (
            (shippingStatus === "Por sucursal" && fila.sucursal) ||
            (shippingStatus === "Por flota" && fila.nombre_flota && fila.nombre_flota.trim().length > 0) ||
            (shippingStatus === "Sin envío" && !fila.sucursal && !(fila.nombre_flota.trim().length > 0))
        ))
    }

    useEffect(() => {
        updateFilteredSalesData();
    }, [shippingStatus]);

    useEffect(() => {
        fetchExternalSales();
    }, [refreshKey]);

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                {isAdmin || isOperator && (
                    <Button
                        type="primary"
                        onClick={() => setIsModalExternalVisible(true)}
                        className="text-mobile-base xl:text-desktop-sm "
                    >
                        Crear pedido por venta externa
                    </Button>
                )}
            </div>
            <div>
                <Select
                    className="mt-2 w-full xl:w-1/5"
                    placeholder="Filtrar por método de envío"
                    value={shippingStatus}
                    allowClear
                    onChange={(value) => {
                        setShippingStatus(value)
                        setIsShippingStatusFilterActive(value != null);
                    }}
                >
                    <Option value="Por sucursal">En sucursal</Option>
                    <Option value="Por flota">Por flota</Option>
                    <Option value="Sin envío">Sin envío</Option>
                </Select>
            </div>
            <h2 className='text-mobile-sm xl:text-desktop-3xl my-4'>Ventas externas</h2>

            <Table
                columns={columns}
                dataSource={filteredSalesData}
                pagination={false}
                scroll={{ x: "max-content" }}
            />

            <ExternalSalesModal
                visible={isModalExternalVisible}
                onCancel={handleCancel}
                onClose={() => {
                    setIsModalExternalVisible(false);
                    fetchExternalSales();
                }}
            />
        </div>
    );
};

export default ExternalSalesTable;
