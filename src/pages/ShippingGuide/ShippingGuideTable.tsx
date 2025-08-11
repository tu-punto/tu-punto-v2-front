import { useEffect, useState } from "react";
import { Buffer } from 'buffer';
import { getShippingGuidesAPI, getShippingGuidesBySellerAPI, markAsDelivered } from "../../api/shippingGuide";
import { Button, Card, Col, message, Modal, Row, Table, Tooltip } from "antd";
import { FileImageOutlined, CheckCircleOutlined } from '@ant-design/icons';
import moment from "moment-timezone";

const ShippingGuideTable = (
    { refreshKey, user, isFilterBySeller, id_vendedor }:
        { refreshKey: number, user: any, isFilterBySeller: boolean, id_vendedor: string }) => {
    const [guidesList, setGuidesList] = useState([]);
    const [imageUrl, setImageUrl] = useState<string | null>();
    const [imageDesc, setImageDesc] = useState<string | null>();
    const [isImageVisible, setIsImageVisible] = useState(false);
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend');

    const isAdmin = user?.role?.toLowerCase() === 'admin';

    useEffect(() => {
        if (!isFilterBySeller) {
            fetchAllGuides();
        } else {
            fetchGuidesBySeller();
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
            console.error("Error al obtener Guías de Envío: ", error)
            message.error("Error al cargar Guías de Envío")
        }
    }
    const fetchGuidesBySeller = async () => {
        try {
            const apiData = await getShippingGuidesBySellerAPI(id_vendedor);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener Guías de Envío por vendedor: ", error)
            message.error("Error al cargar Guías de Envío")
        }
    };

    const handleShowImage = (record: any) => {
        if (record.imagen) {
            const imageData = record.imagen.data;
            const buffer = Buffer.from(imageData);
            const blob = new Blob([buffer], { type: record.tipoArchivo });
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
            setIsImageVisible(true);
            setImageDesc(record.descripcion)
        }
    }

    const handleCheckShipping = async (record: any) => {
        if (record.isRecogido) {
            message.info("Esta guía ya fue marcada como recogida")
            return
        }
        try {
            const res = await markAsDelivered(record._id);
            if (res.success) {
                message.success("El estado de la guía se ha actualizado correctamente")
            } else {
                message.error("Error al actualizar el estado de la guía")
            }
        } catch (error) {
            console.error("Erorr al actualizar el estado entregado de Guía de Envío: ",error)
            message.error("Error al actualizar el estado de la guía")
        }
    }

    const columns = [
        {
            title: '¿Recogido?',
            dataIndex: 'isRecogido',
            key:'isRecogido',
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
            title: 'Fecha de creación',
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
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            render: (_: any, record: any) => {
                if (record.descripcion == "undefined") {
                    return "Sin descripción"
                } else {
                    return record.descripcion
                }
            }
        },
        {
            title: 'Acciones',
            dataIndex: 'imagen',
            key: 'imagen',
            render: (_: any, record: any) => {
                return (
                    <>
                        {record.imagen && (
                            <Tooltip title="Ver foto">
                                <Button
                                    size="small"
                                    icon={<FileImageOutlined />}
                                    onClick={() => { handleShowImage(record) }}
                                />
                            </Tooltip>
                        )}
                        {isAdmin && (
                            <Tooltip title="Confirmar entrega">
                                <Button 
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => { handleCheckShipping(record) }}/>
                            </Tooltip>
                        )}
                    </>
                )
            }
        }
    ];

    return (
        <>
            <Table
                columns={columns}
                dataSource={guidesList}
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
                <Card title="Foto - Guía de Envío" bordered={false}>
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