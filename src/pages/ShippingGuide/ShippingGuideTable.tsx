import { useEffect, useMemo, useState } from "react";
import { getShippingByBranchAPI, getShippingGuidesAPI, getShippingGuidesBySellerAPI, markAsDelivered } from "../../api/shippingGuide";
import { Button, Card, Col, message, Modal, Row, Select, Table, Tooltip } from "antd";
import { FileImageOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getSignedURL } from "../../helpers/s3Helper";
import moment from "moment-timezone";

type PickupFilter = "all" | "picked_up" | "pending";

const ShippingGuideTable = (
    { refreshKey, user, isFilterBySeller, isFilterByBranch, search_id }:
        { refreshKey: number, user: any, isFilterBySeller?: boolean, isFilterByBranch?: boolean, search_id: string }) => {
    const [guidesList, setGuidesList] = useState<any[]>([]);
    const [imageUrl, setImageUrl] = useState<string | null>();
    const [imageDesc, setImageDesc] = useState<string | null>();
    const [isImageVisible, setIsImageVisible] = useState(false);
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');
    const [pickupFilter, setPickupFilter] = useState<PickupFilter>("all");

    const normalizedRole = String(user?.role || "").toLowerCase();
    const isAdmin = normalizedRole === "admin";
    const isOperator = normalizedRole === "operator";
    const isSuperadmin = normalizedRole === "superadmin";

    useEffect(() => {
        if (!isFilterBySeller && !isFilterByBranch) {
            fetchAllGuides();
        } else if (isFilterBySeller) {
            fetchGuidesBySeller();
        } else if (isFilterByBranch) {
            fetchGuidesByBranch();
        }
    }, [refreshKey])

    const fetchAllGuides = async () => {
        try {
            const apiData = await getShippingGuidesAPI();
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener GuÃ­as de EnvÃ­o: ", error)
            message.error("Error al cargar GuÃ­as de EnvÃ­o")
        }
    }
    const fetchGuidesBySeller = async () => {
        try {
            const apiData = await getShippingGuidesBySellerAPI(search_id);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener GuÃ­as de EnvÃ­o por vendedor: ", error)
            message.error("Error al cargar GuÃ­as de EnvÃ­o")
        }
    };

    const fetchGuidesByBranch = async () => {
        try {
            const apiData = await getShippingByBranchAPI(search_id);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
            setPickupFilter("all")
        } catch (error) {
            console.error("Error al obtener GuÃ­as de EnvÃ­o por vendedor: ", error)
            message.error("Error al cargar GuÃ­as de EnvÃ­o")
        }
    }

    const filteredGuidesList = useMemo(() => {
        if (pickupFilter === "picked_up") {
            return guidesList.filter((guide: any) => guide.isRecogido);
        }
        if (pickupFilter === "pending") {
            return guidesList.filter((guide: any) => !guide.isRecogido);
        }
        return guidesList;
    }, [guidesList, pickupFilter]);

    const handleShowImage = async (record: any) => {
        if (record.imagen_key) {
            const image_url = await getSignedURL(record.imagen_key);
            setImageUrl(image_url);
            setIsImageVisible(true);
            setImageDesc(record.descripcion)
        }
    }

    const handleCheckShipping = async (record: any) => {
        if (record.isRecogido) {
            message.info("Esta guÃ­a ya fue marcada como recogida")
            return
        }
        try {
            const res = await markAsDelivered(record._id);
            if (res.success) {
                message.success("El estado de la guÃ­a se ha actualizado correctamente")
                setGuidesList((current: any[]) =>
                    current.map((item) =>
                        String(item._id) === String(record._id)
                            ? { ...item, isRecogido: true }
                            : item
                    )
                );
            } else {
                message.error("Error al actualizar el estado de la guÃ­a")
            }
        } catch (error) {
            console.error("Erorr al actualizar el estado entregado de GuÃ­a de EnvÃ­o: ", error)
            message.error("Error al actualizar el estado de la guÃ­a")
        }
    }

    const columns = [
        {
            title: 'Â¿Recogido?',
            dataIndex: 'isRecogido',
            key: 'isRecogido',
            width: 100,
            render: (_: any, record: any) => {
                const color = record.isRecogido ? 'bg-green-500' : 'bg-red-500';
                return {
                    children: <div
                        className={`w-4 h-4 rounded-full ${color}`}
                    />,
                }
            }
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: (_: any, record: any) => {
                const vendedor = record.vendedor
                return `${vendedor.nombre} ${vendedor.apellido}`
            }
        },
        {
            title: 'Fecha de creaciÃ³n',
            dataIndex: 'fecha_subida',
            key: 'fecha_subida',
            width: 180,
            render: (text: string) => moment.parseZone(text).format("DD/MM/YYYY"),
            sorter: (a: any, b: any) =>
                moment.parseZone(a.fecha_subida).valueOf() -
                moment.parseZone(b.fecha_subida).valueOf(),
            sortOrder,
            onHeaderCell: () => ({
                onClick: () => {
                    setSortOrder(prev => (prev === 'ascend' ? 'descend' : 'ascend'));
                },
            }),
        },
        {
            title: 'DescripciÃ³n',
            dataIndex: 'descripcion',
            key: 'descripcion',
            render: (_: any, record: any) => {
                if (record.descripcion == "undefined") {
                    return "Sin descripciÃ³n"
                } else {
                    return record.descripcion
                }
            }
        },
        {
            title: 'Acciones',
            dataIndex: 'imagen_key',
            key: 'imagen_key',
            render: (_: any, record: any) => {
                return (
                    <>
                        {record.imagen_key && (
                            <Tooltip title="Ver foto">
                                <Button
                                    size="small"
                                    icon={<FileImageOutlined />}
                                    onClick={() => { handleShowImage(record) }}
                                />
                            </Tooltip>
                        )}
                        {(isAdmin || isOperator || isSuperadmin) && (
                            <Tooltip title="Confirmar entrega">
                                <Button
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => { handleCheckShipping(record) }} />
                            </Tooltip>
                        )}
                    </>
                )
            }
        }
    ];

    return (
        <>
            {isFilterByBranch && (
                <div className="mb-4 flex justify-end">
                    <Select
                        value={pickupFilter}
                        onChange={(value: PickupFilter) => setPickupFilter(value)}
                        style={{ width: 180 }}
                        options={[
                            { value: "all", label: "Todos" },
                            { value: "picked_up", label: "Ya recogido" },
                            { value: "pending", label: "No recogido" },
                        ]}
                    />
                </div>
            )}

            <Table
                columns={columns}
                dataSource={filteredGuidesList}
                scroll={{ x: "max-content" }}
            />

            <Modal
                open={isImageVisible}
                onCancel={() => {
                    setIsImageVisible(false)
                    setImageUrl(null)
                    setImageDesc(null)
                }}
                footer={null}
            >
                <Card title="Foto - GuÃ­a de EnvÃ­o" bordered={false}>
                    <Row gutter={16}>
                        {imageUrl && <img src={imageUrl} alt="Imagen" style={{ width: '100%' }} />}
                    </Row>
                    <div className="py-4">
                        <Row gutter={16}>
                            <Col>
                                {imageDesc}
                            </Col>
                        </Row>
                    </div>
                </Card>

            </Modal>
        </>
    )
}

export default ShippingGuideTable;
