import { Button, Drawer, Table, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { getSellersAPI } from "../../api/seller";
import DebtModal from "./DebtModal";
import { EditOutlined } from "@ant-design/icons";
import PayDebtButton from "./components/PayDebtButton";
import { getSellerAdvancesById } from "../../helpers/sellerHelpers";
import SellerInfoModalTry from "./SellerInfoModal";
import { ISeller } from "../../models/sellerModels";

const SellerTable = ({ refreshKey, setRefreshKey, isFactura }: any) => {
    const [pendingPaymentData, setPendingPaymentData] = useState<ISeller[]>([]);
    const [onTimePaymentData, setOnTimePaymentData] = useState<ISeller[]>([]);
    const [selectedSeller, setSelectedSeller] = useState<any>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSellerModalVisible, setIsSellerModalVisible] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedSucursalData, setSelectedSucursalData] = useState<any[]>([]);
    const sucursales = [
        { nombre: "Sucursal 1", alquiler: 100, exhibicion: 80, entrega_simple: 50, delivery: 60 },
        { nombre: "Sucursal 2", alquiler: 120, exhibicion: 90, entrega_simple: 70, delivery: 50 },
        { nombre: "Sucursal 3", alquiler: 110, exhibicion: 85, entrega_simple: 65, delivery: 55 },
    ];

    const servicios = ["alquiler", "exhibicion", "entrega_simple", "delivery"];
    const columns = [
        {
            title: "Nombre",
            dataIndex: "nombre",
            key: "nombre",
            className: "text-mobile-sm xl:text-desktop-sm",
            fixed: "left" as const,
        },
        {
            title: "Pago total",
            dataIndex: "deuda",
            key: "deuda",
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: "Fecha Vigencia",
            dataIndex: "fecha_vigencia",
            key: "fecha_vigencia",
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: "Pago Mensual",
            dataIndex: "pago_mensual",
            key: "pago_mensual",
            className: "text-mobile-sm xl:text-desktop-sm",
            render: (_: any, record: any) => (
                <Button
                    type="link"
                    onClick={(e) => {
                        e.stopPropagation();
                        openSucursalDrawer(record);
                    }}
                >
                    {record.pago_mensual}
                </Button>
            ),
        },
        {
            title: "Comisión Porcentual",
            dataIndex: "comision_porcentual",
            key: "comision_porcentual",
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        {
            title: "Acciones",
            key: "actions",
            className: "text-mobile-sm flex xl:text-desktop-sm",
            render: (_: any, seller: any) => (
                <div className="flex items-center gap-2 justify-end">
                    <PayDebtButton seller={seller} />
                    <Tooltip title="Renovar vendedor">
                        <Button
                            type="default"
                            onClick={(e) => {
                                e.stopPropagation();
                                showModal(seller);
                            }}
                            icon={<EditOutlined />}
                            className="text-mobile-sm xl:text-desktop-sm"
                        />
                    </Tooltip>
                </div>
            ),
        },
    ];

    async function fetchSellers() {
        try {
            const response = await getSellersAPI();
            const sellersData = response.data || response;
            if (!Array.isArray(sellersData)) {
                console.error("Los datos de vendedores no son un array:", sellersData);
                return;
            }

            const formattedData = await Promise.all(
                sellersData.map(async (seller: any) => {
                    const finish_date = new Date(seller.fecha_vigencia);
                    const advances = await getSellerAdvancesById(seller._id);
                    const date = new Date(seller.fecha);
                    return {
                        key: seller._id,
                        nombre: `${seller.nombre} ${seller.apellido}`,
                        deuda: `Bs. ${seller.deuda}`,
                        deudaInt: seller.deuda,
                        pagoTotalInt: seller.deuda - parseInt(advances),
                        fecha_vigencia: finish_date.toLocaleDateString("es-ES"),
                        fecha: date.toLocaleDateString("es-ES"),
                        pago_mensual: `Bs. ${
                            seller.alquiler + seller.exhibicion + seller.delivery
                        }`,
                        alquiler: seller.alquiler,
                        exhibicion: seller.exhibicion,
                        delivery: seller.delivery,
                        comision_porcentual: `${seller.comision_porcentual}%`,
                        comision_fija: `Bs. ${seller.comision_fija}`,
                        telefono: seller.telefono,
                        mail: seller.mail,
                        carnet: seller.carnet,
                        adelanto_servicio: seller.adelanto_servicio,
                        marca: seller.marca,
                        emite_factura: seller.emite_factura,
                    };
                })
            );

            const pendingPayments = formattedData.filter(
                (seller: any) => seller.pagoTotalInt > 0
            );
            const onTimePayments = formattedData.filter(
                (seller: any) => seller.pagoTotalInt === 0
            );

            setPendingPaymentData(pendingPayments);
            setOnTimePaymentData(onTimePayments);
        } catch (error) {
            console.error("Error al obtener los vendedores:", error);
        }
    }

    const showModal = (seller: any) => {
        setSelectedSeller(seller);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setIsSellerModalVisible(false);
        setDrawerVisible(false);
        setSelectedSeller(null);
    };

    const handleSuccess = () => {
        setIsModalVisible(false);
        setSelectedSeller(null);
        setRefreshKey((prev: number) => prev + 1);
    };

    const handleRowClick = (seller: any) => {
        setSelectedSeller(seller);
        setIsSellerModalVisible(true);
    };

    const openSucursalDrawer = (seller: any) => {
        setSelectedSeller(seller);

        const data = sucursales.map((sucursal, index) => {
            const serviciosSucursal = servicios.reduce((acc: any, servicio: string) => {
                const valor = seller[servicio] ?? 0;
                acc[servicio] = `Bs. ${valor}`;
                return acc;
            }, {});

            return {
                key: index.toString(),
                sucursal: sucursal.nombre,
                ...serviciosSucursal,
            };
        });

        setSelectedSucursalData(data);
        setDrawerVisible(true);
    };

    const drawerColumns = [
        {
            title: "Sucursal",
            dataIndex: "sucursal",
            key: "sucursal",
        },
        {
            title: "Alquiler",
            dataIndex: "alquiler",
            key: "alquiler",
        },
        {
            title: "Exhibición",
            dataIndex: "exhibicion",
            key: "exhibicion",
        },
        {
            title: "Entrega Simple",
            dataIndex: "entrega_simple",
            key: "entrega_simple",
        },
        {
            title: "Delivery",
            dataIndex: "delivery",
            key: "delivery",
        },
    ];

    useEffect(() => {
        fetchSellers();
    }, [refreshKey]);

    const filteredSellers = (data: ISeller[]) => {
        return isFactura
            ? data.filter((seller) => seller.emite_factura)
            : data.filter((seller) => !seller.emite_factura);
    };

    return (
        <div>
            <Table
                columns={columns}
                dataSource={filteredSellers(pendingPaymentData)}
                scroll={{ x: "max-content" }}
                title={() => (
                    <h2 className="text-2xl font-bold justify-center">
                        Pago pendiente Bs.
                        {filteredSellers(pendingPaymentData).reduce(
                            (acc: number, seller: any) => acc + seller.pagoTotalInt,
                            0
                        )}
                    </h2>
                )}
                pagination={{ pageSize: 5 }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
            />

            <Table
                columns={columns}
                scroll={{ x: "max-content" }}
                dataSource={filteredSellers(onTimePaymentData)}
                title={() => <h2 className="text-2xl font-bold">Pago al día</h2>}
                pagination={{ pageSize: 5 }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
            />

            {selectedSeller && (
                <DebtModal
                    visible={isModalVisible}
                    onCancel={handleCancel}
                    onSuccess={handleSuccess}
                    seller={selectedSeller}
                />
            )}

            {selectedSeller && (
                <SellerInfoModalTry
                    visible={isSellerModalVisible && !isModalVisible}
                    onCancel={handleCancel}
                    onSuccess={handleSuccess}
                    seller={selectedSeller}
                />
            )}

            <Drawer
                title={`Detalle por sucursal - ${selectedSeller?.nombre}`}
                placement="right"
                width={600}
                onClose={handleCancel}
                open={drawerVisible}
            >
                <Table
                    dataSource={selectedSucursalData}
                    columns={drawerColumns}
                    pagination={false}
                />
            </Drawer>
        </div>
    );
};

export default SellerTable;
