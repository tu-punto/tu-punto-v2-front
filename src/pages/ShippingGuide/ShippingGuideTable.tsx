import { useEffect, useMemo, useState } from "react";
import { Divider, Modal, Table, Typography, message } from "antd";
import { FileImageOutlined, CheckCircleOutlined } from '@ant-design/icons';
import moment from "moment-timezone";
import TableActionButton from "../../components/TableActionButton";
import { getSignedURL } from "../../helpers/s3Helper";
import useShippingGuide from "../../hooks/useShippingGuide";
import { useUserRole } from "../../hooks/useUserRole";
import { IShippingGuide } from "../../interfaces/shipping_guide.interfaces";

interface ShippingGuideTableProps {
    filterData: 'all' | 'seller' | 'branch',
    search_id?: string,
    refreshKey?: number
}

function ShippingGuideTab({ filterData, search_id, refreshKey = 0 }: ShippingGuideTableProps) {
    const [isImageVisible, setIsImageVisible] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>()
    const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend')
    const { isAdmin } = useUserRole()
    const { guidesList, fetchAllGuides, fetchGuidesByBranch, fetchGuidesBySeller, checkShippingDelivered } = useShippingGuide()

    useEffect(() => {
        fetchGuides()
    }, [filterData, refreshKey])

    const fetchGuides = () => {
        if (filterData == 'all') {
            fetchAllGuides()
        } else {
            if (!search_id) {
                console.error("Para el filtrado por Vendedor o Sucursal debe ingresar el ID de dicho recurso en el prop search_id")
                return
            }
            if (filterData == 'seller') {
                fetchGuidesBySeller(search_id)
            } else if (filterData == 'branch') {
                fetchGuidesByBranch(search_id)
            }
        }
    }

    const imageView = useMemo(() => {
        return (
            <Modal
                open={isImageVisible}
                onCancel={() => setIsImageVisible(false)}
                footer={null}
            >
                <Typography.Title level={4}>Guía de Envío - Foto</Typography.Title>
                <Divider />
                {imageUrl && <img src={imageUrl} alt="Imagen" style={{ width: '100%' }} />}
            </Modal>
        )
    }, [isImageVisible])

    const handleShowImage = async (record: IShippingGuide) => {
        if (record.imagen_key) {
            console.log(record)
            const image_url = await getSignedURL(record.imagen_key);
            setImageUrl(image_url);
            setIsImageVisible(true);
        }
    }

    const handleCheckShipping = async (record: IShippingGuide) => {
        if (record.isRecogido) {
            message.info("Esta guía ya fue marcada como recogida")
            return
        }
        const res = await checkShippingDelivered(record._id)
        if (res.success) {
            fetchGuides()
            message.success("Guía actualizada correctamente")
        } else {
            message.error("Ha ocurrido un error al actualizar esta guía")
        }
    }

    const columns = [
        {
            title: '¿Recogido?',
            dataIndex: 'is_recogido',
            key: 'is_recogido',
            width: 100,
            render: (_: any, record: any) => {
                return {
                    children: <div className={`w-4 h-4 rounded-full ${record.isRecogido ? 'bg-green-500' : 'bg-red-500'}`} />
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
            render: (_: any, record: any) => record.descripcion !== "undefined" ? record.descripcion : 'Sin descripción'
        },
        {
            title: 'Acciones',
            dataIndex: 'imagen_key',
            key: 'imagen_key',
            render: (_: any, record: any) => {
                return (
                    <>
                        {record.imagen_key && (
                            <TableActionButton
                                title="Ver foto"
                                onClick={() => { handleShowImage(record) }}
                                icon={<FileImageOutlined />}
                            />
                        )}
                        {isAdmin && (
                            <TableActionButton
                                title="Confirmar entrega"
                                onClick={() => { handleCheckShipping(record) }}
                                icon={<CheckCircleOutlined />}
                            />
                        )}
                    </>
                )
            }
        }
    ]

    return (
        <>
            <Table
                columns={columns}
                dataSource={guidesList}
                scroll={{ x: "max-content" }}
            />
            {imageView}
        </>
    );
}

export default ShippingGuideTab;