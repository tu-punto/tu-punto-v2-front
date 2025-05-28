import { DatePicker, Input, message, Select, Table } from 'antd';
import { useEffect, useState } from 'react';
import { getShippingsAPI } from '../../api/shipping';
import ShippingInfoModal from './ShippingInfoModal';
import { InfoCircleOutlined } from '@ant-design/icons';
import ShippingStateModal from './ShippingStateModal';
import { getSucursalsAPI } from '../../api/sucursal';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ShippingTable = (refreshKey: any) => {
    const [shippingData, setShippingData] = useState([]);
    const [esperaData, setEsperaData] = useState([]);
    const [entregadoData, setEntregadoData] = useState([]);
    const [filteredEsperaData, setFilteredEsperaData] = useState([]);
    const [filteredEntregadoData, setFilteredEntregadoData] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState<'espera' | 'entregado'>('espera');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isModaStatelVisible, setIsModalStateVisible] = useState(false);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [otherLocation, setOtherLocation] = useState('');
    const [sucursal, setSucursal] = useState([] as any[]);

    const fetchShippings = async () => {
        try {
            const apiData = await getShippingsAPI();
            const dataWithKey = apiData.map((pedido: any) => ({
                ...pedido,
                key: pedido._id
            }));
            setShippingData(dataWithKey);
        } catch (error) {
            console.error("Error fetching shipping data:", error);
        }
    };

    const filterByLocationAndDate = (data: any) => {
        return data.filter((pedido: any) => {
            const isOtherLocation = selectedLocation === 'other';
            const matchesOrigin = !selectedOrigin || pedido.id_sucursal === sucursal.find((suc) => suc.nombre.toLowerCase() === selectedOrigin.toLowerCase())?.id_sucursal;
            const matchesLocation = isOtherLocation
                ? !sucursal.some((suc) => suc.nombre.toLowerCase() === pedido.lugar_entrega.toLowerCase()) &&
                (!otherLocation || pedido.lugar_entrega.toLowerCase().includes(otherLocation.toLowerCase()))
                : !selectedLocation || pedido.lugar_entrega.toLowerCase().includes(selectedLocation.toLowerCase());
            const matchesDateRange = dateRange[0] && dateRange[1]
                ? new Date(pedido.fecha_pedido) >= dateRange[0] && new Date(pedido.fecha_pedido) <= dateRange[1]
                : true;
            return matchesOrigin && matchesLocation && matchesDateRange;
        });
    };

    const columns = [
        {
            title: '',
            dataIndex: 'infoButton',
            key: 'infoButton',
            width: '5%',
            render: (_: any, record: any) => (
                <InfoCircleOutlined
                    style={{ fontSize: '20px', color: '#1890ff', cursor: 'pointer' }}
                    onClick={() => handleIconClick(record)}
                />
            )
        },
        {
            title: 'Fecha Pedido',
            dataIndex: 'fecha_pedido',
            key: 'fecha_pedido',
            render: (text: string) => new Date(text).toLocaleDateString('es-ES')
        },
        {
            title: 'Lugar de Origen',
            dataIndex: 'id_sucursal',
            key: 'lugar_origen',
            render: (text: string) => sucursal.find((suc) => suc.id_sucursal === text)?.nombre
        },
        {
            title: 'Lugar de entrega',
            dataIndex: 'lugar_entrega',
            key: 'lugar_entrega'
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
        },
        {
            title: 'Cliente',
            dataIndex: 'cliente',
            key: 'cliente',
        },
    ];

    const handleIconClick = (order: any) => {
        setSelectedShipping(order);
        setIsModalStateVisible(true);
    };

    const handleRowClick = (order: any) => {
        setSelectedShipping(order);
        setIsModalVisible(true);
    };

    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsAPI();
            setSucursal(response);
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    };

    useEffect(() => {
        fetchShippings();
        fetchSucursal();
    }, [refreshKey]);

    useEffect(() => {
        setEsperaData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'En espera'));
        setEntregadoData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'Entregado'));
    }, [shippingData]);

    useEffect(() => {
        setFilteredEsperaData(filterByLocationAndDate(esperaData));
        setFilteredEntregadoData(filterByLocationAndDate(entregadoData));
    }, [esperaData, entregadoData, selectedLocation, selectedOrigin, dateRange]);

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Select
                    className="mt-2 w-full xl:w-1/5"
                    placeholder="Estado del pedido"
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value)}
                >
                    <Option value="espera">En espera</Option>
                    <Option value="entregado">Entregado</Option>
                </Select>
                <Select
                    className="mr-2 w-2/3 xl:w-1/5"
                    placeholder="Sucursal de Origen"
                    onChange={(value) => setSelectedOrigin(value || '')}
                    allowClear
                >
                    {sucursal.map((suc: any) => (
                        <Option key={suc.id_sucursal} value={suc.nombre}>
                            {suc.nombre}
                        </Option>
                    ))}
                </Select>
                <Select
                    className="mr-2 w-2/3 xl:w-1/5"
                    placeholder="Sucursal De Destino"
                    onChange={(value) => {
                        setSelectedLocation(value || '');
                        if (value !== 'other') {
                            setOtherLocation('');
                        }
                    }}
                    allowClear
                >
                    <Option value="other">Otro lugar</Option>
                    {sucursal.map((suc: any) => (
                        <Option key={suc.id_sucursal} value={suc.nombre}>
                            {suc.nombre}
                        </Option>
                    ))}
                </Select>
                {selectedLocation === 'other' && (
                    <Input
                        className="mt-2 w-2/3 xl:w-1/5"
                        placeholder="Especificar otro lugar"
                        value={otherLocation}
                        onChange={(e) => setOtherLocation(e.target.value)}
                    />
                )}
                <RangePicker
                    className="mt-2 w-full xl:w-1/5"
                    onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                            setDateRange([dates[0].toDate(), dates[1].toDate()]);
                        } else {
                            setDateRange([null, null]);
                        }
                    }}
                />
            </div>

            {selectedStatus === 'espera' && (
                <>
                    <h2 className="text-mobile-sm xl:text-desktop-3xl">En espera</h2>
                    <Table
                        columns={columns}
                        dataSource={filteredEsperaData}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        onRow={(record) => ({
                            onClick: () => handleRowClick(record)
                        })}
                    />
                </>
            )}

            {selectedStatus === 'entregado' && (
                <>
                    <h2 className="text-mobile-sm xl:text-desktop-3xl">Entregado</h2>
                    <Table
                        columns={columns}
                        dataSource={filteredEntregadoData}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        onRow={(record) => ({
                            onClick: () => handleRowClick(record)
                        })}
                    />
                </>
            )}

            <ShippingInfoModal
                visible={isModalVisible && !isModaStatelVisible}
                shipping={selectedShipping}
                onClose={() => setIsModalVisible(false)}
                onSave={() => {
                    setIsModalVisible(false);
                    fetchShippings();
                }}
            />
            <ShippingStateModal
                visible={isModaStatelVisible}
                order={selectedShipping}
                onClose={() => {
                    setIsModalStateVisible(false);
                    setIsModalVisible(false);
                }}
                onSave={() => {
                    setIsModalStateVisible(false);
                    fetchShippings();
                }}
                shipping={selectedShipping}
            />
        </div>
    );
};

export default ShippingTable;
