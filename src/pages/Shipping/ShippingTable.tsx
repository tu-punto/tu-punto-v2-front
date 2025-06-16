import { DatePicker, Input, message, Select, Table } from 'antd';
import {useContext, useEffect, useState} from 'react';
import { getShippingsAPI, getShippingByIdAPI  } from '../../api/shipping';
import ShippingInfoModal from './ShippingInfoModal';
import { InfoCircleOutlined } from '@ant-design/icons';
import ShippingStateModal from './ShippingStateModal';
import { getSucursalsAPI } from '../../api/sucursal';
import { getSellersAPI } from "../../api/seller";
import {UserContext} from "../../context/userContext.tsx";

const { RangePicker } = DatePicker;
const { Option } = Select;

const ShippingTable = ({ refreshKey }: { refreshKey: number }) => {
    const { user }: any = useContext(UserContext);
    const [shippingData, setShippingData] = useState([]);
    const [esperaData, setEsperaData] = useState([]);
    const [entregadoData, setEntregadoData] = useState([]);
    const [filteredEsperaData, setFilteredEsperaData] = useState([]);
    const [filteredEntregadoData, setFilteredEntregadoData] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState<'En Espera' | 'entregado'>('En Espera');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isModaStatelVisible, setIsModalStateVisible] = useState(false);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [otherLocation, setOtherLocation] = useState('');
    const [sucursal, setSucursal] = useState([] as any[]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [selectedVendedor, setSelectedVendedor] = useState("Todos");
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isVendedor = user?.role?.toLowerCase() === 'vendedor';
    //console.log("Usuario:", user);
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
    const toSimpleDate = (d: Date | null) =>
        d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;

    const filterByLocationAndDate = (data: any) => {
        const nombreSucursalToIdMap = new Map(
            sucursal.map((suc) => [suc.nombre, suc._id?.toString()])
        );
        return data.filter((pedido: any) => {
            const isOtherLocation = selectedLocation === 'other';
            const matchesOrigin =
                !selectedOrigin ||
                pedido.lugar_origen?._id?.toString() === nombreSucursalToIdMap.get(selectedOrigin);

            const matchesLocation = isOtherLocation
                ? !sucursal.some((suc) => suc.nombre.toLowerCase() === pedido.lugar_entrega.toLowerCase()) &&
                (!otherLocation || pedido.lugar_entrega.toLowerCase().includes(otherLocation.toLowerCase()))
                : !selectedLocation || pedido.lugar_entrega.toLowerCase().includes(selectedLocation.toLowerCase());
            const matchesDateRange =
                dateRange[0] && dateRange[1]
                    ? toSimpleDate(new Date(pedido.fecha_pedido)) >= toSimpleDate(dateRange[0]) &&
                    toSimpleDate(new Date(pedido.fecha_pedido)) <= toSimpleDate(dateRange[1])
                    : true;
            const matchesVendedor = isAdmin
                ? (selectedVendedor === "Todos" || pedido.venta?.some((v: any) =>
                    v.vendedor?._id === selectedVendedor ||
                    v.id_vendedor === selectedVendedor
                ))
                : pedido.venta?.some((v: any) =>
                    v.id_vendedor === user?.id_vendedor ||
                    v.vendedor?._id === user?.id_vendedor ||
                    v.vendedor === user?.id_vendedor
                );


            return matchesOrigin && matchesLocation && matchesDateRange && matchesVendedor;
        });
    };
    useEffect(() => {
        if (isVendedor && user?.id_vendedor) {
            setSelectedVendedor(user.id_vendedor);
        }
    }, [isVendedor, user]);

    const columns = [
        {/*{
            title: '',
            dataIndex: 'infoButton',
            key: 'infoButton',
            width: '5%',
            render: (_: any, record: any) =>
                record.estado_pedido !== "Entregado" && (
                    <InfoCircleOutlined
                        style={{ fontSize: '20px', color: '#1890ff', cursor: 'pointer' }}
                        onClick={() => handleIconClick(record)}
                    />
                )
        },*/},
        {
            title: 'Fecha Pedido',
            dataIndex: 'fecha_pedido',
            key: 'fecha_pedido',
            render: (text: string) => new Date(text).toLocaleDateString('es-ES')
        },
        {
            title: 'Lugar de Origen',
            dataIndex: 'lugar_origen',
            key: 'lugar_origen',
            render: (_: any, record: any) => {
                const lugar = record.lugar_origen;
                if (typeof lugar === 'object' && lugar !== null) {
                    return lugar.nombre || '—';
                }
                const suc = sucursal.find((s) => s._id === lugar || s._id === record.id_sucursal);
                return suc?.nombre || '—';
            }
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
            render: (_: any, record: any) => {
                const vendedoresUnicos = new Map();

                // 1. De ventas normales
                (record.venta || []).forEach((v: any) => {
                    if (v.vendedor) {
                        vendedoresUnicos.set(v.vendedor._id, `${v.vendedor.nombre} ${v.vendedor.apellido}`);
                    } else if (v.id_vendedor) {
                        const vend = vendedores.find(vend => vend._id === v.id_vendedor);
                        if (vend) {
                            vendedoresUnicos.set(vend._id, `${vend.nombre} ${vend.apellido}`);
                        }
                    }
                });

                // 2. De productos temporales
                (record.productos_temporales || []).forEach((p: any) => {
                    const vend = vendedores.find(vend => vend._id === p.id_vendedor);
                    if (vend) {
                        vendedoresUnicos.set(vend._id, `${vend.nombre} ${vend.apellido}`);
                    }
                });

                const vendedorArray = Array.from(vendedoresUnicos.values());

                if (vendedorArray.length === 0) return 'Sin vendedor';
                if (vendedorArray.length <= 3) return vendedorArray.join(', ');

                return (
                    <>
                        {vendedorArray.slice(0, 2).join(', ')}{' '}
                        <span style={{ color: '#1890ff', cursor: 'pointer' }} title={vendedorArray.join(', ')}>
                    +{vendedorArray.length - 2} más
                </span>
                    </>
                );
            }
        },
        {
            title: 'Cliente',
            dataIndex: 'cliente',
            key: 'cliente',
        },
    ];

    const handleIconClick = (order: any) => {
        if (order.estado_pedido === "Entregado") return;
        setSelectedShipping(order);
        setIsModalStateVisible(true);
    };

    const handleRowClick = async (record: any) => {
        try {
            const shipping = await getShippingByIdAPI(record._id); // ✅ este endpoint debe devolver solo UN pedido
            console.log("📦 Pedido individual para el modal:", shipping);
            setSelectedShipping(shipping);
            setIsModalVisible(true);
        } catch (error) {
            console.error("Error al obtener pedido por ID:", error);
            message.error("Error al cargar el pedido");
        }
    };
    const fetchSucursal = async () => {
        try {
            const response = await getSucursalsAPI();
            setSucursal(response);
        } catch (error) {
            message.error('Error al obtener las sucursales');
        }
    };

    useEffect(() => {
        fetchShippings();
        fetchSucursal();
    }, [refreshKey]);

    useEffect(() => {
        setEsperaData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'En Espera'));
        setEntregadoData(shippingData.filter((pedido: any) => pedido.estado_pedido === 'Entregado'));
    }, [shippingData]);

    useEffect(() => {
        setFilteredEsperaData(filterByLocationAndDate(esperaData));
        setFilteredEntregadoData(filterByLocationAndDate(entregadoData));
    }, [esperaData, entregadoData, selectedLocation, selectedOrigin, dateRange]);
    useEffect(() => {
        const fetchVendedores = async () => {
            try {
                const response = await getSellersAPI();
                setVendedores(response);
            } catch (error) {
                message.error("Error al obtener vendedores");
            }
        };
        fetchVendedores();
    }, []);
    //console.log("Rol", user?.role?.toLowerCase());
    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                {isAdmin && (
                    <Select
                        placeholder="Filtrar por vendedor"
                        style={{ width: 200, marginBottom: 16 }}
                        value={selectedVendedor}
                        onChange={(value) => setSelectedVendedor(value)}
                    >
                        <Select.Option value="Todos">Todos</Select.Option>
                        {vendedores.map((v: any) => (
                            <Select.Option key={v._id} value={v._id}>
                                {v.nombre} {v.apellido}
                            </Select.Option>
                        ))}
                    </Select>
                )}

                <Select
                    className="mt-2 w-full xl:w-1/5"
                    placeholder="Estado del pedido"
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value)}
                >
                    <Option value="En Espera">En Espera</Option>
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

            {selectedStatus === 'En Espera' && (
                <>
                    <h2 className="text-mobile-sm xl:text-desktop-3xl">En Espera</h2>
                    <Table
                        columns={columns}
                        dataSource={filteredEsperaData}
                        pagination={false}
                        scroll={{ x: "max-content" }}
                        onRow={(record) => ({
                            onClick: async () => {
                                const fullShipping = await getShippingByIdAPI(record._id);
                                console.log("📦 Pedido completo con ventas:", fullShipping);
                                setSelectedShipping(fullShipping);
                                setIsModalVisible(true);
                            },
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
                            onClick: async () => {
                                const fullShipping = await getShippingByIdAPI(record._id);
                                console.log("📦 Pedido completo con ventas:", fullShipping);
                                setSelectedShipping(fullShipping);
                                setIsModalVisible(true);
                            },
                        })}

                    />
                </>
            )}

            <ShippingInfoModal
                visible={isModalVisible && !isModaStatelVisible}
                shipping={selectedShipping }
                sucursals={sucursal} // <-- esta línea es clave
                onClose={() => setIsModalVisible(false)}
                onSave={() => {
                    setIsModalVisible(false);
                    fetchShippings();
                }}
                isAdmin={user?.role?.toLowerCase() === 'admin'}

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
