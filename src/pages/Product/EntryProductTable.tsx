import { Button, Table } from "antd";
import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";
import { EditableCellInputNumber } from "../components/editableCell";
import { UserContext } from "../../context/userContext";
import { getProductHistoryEntriesByProductIdAPI } from "../../api/entry";
import useEditableTable from "../../hooks/useEditableTable";

const EntryProductTable = ({product, onSave, setEntryData}) => {
    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role === 'admin';
    const [productDetails, setProductDetails, handleValueChange] = useEditableTable([]);
    
    const fetchProductDetails = async () => {
        try {
            const details = await getProductHistoryEntriesByProductIdAPI(product[0].id_producto);
            setProductDetails(Array.isArray(details) ? details : []);
        } catch (error) {
            console.error("Error fetching product details:", error);
            setProductDetails([]);
        }
    };
    useEffect(() => {
        fetchProductDetails();
    }, [product]);

    useEffect(() => {
        setEntryData(productDetails);
    }, [productDetails]);
    
    const handleDelete = (key) => {
        setProductDetails(prevDetails => prevDetails.map(detail => detail.key === key ? { ...detail, deleted: true } : detail));
    };

    const columns = [
        {
            title: "Fecha",
            dataIndex: "fecha_ingreso",
            key: "fecha_ingreso",
            render: (text: string) => {
                return dayjs(text).format('DD/MM/YYYY');
            },
            className: "text-mobile-sm xl:text-desktop-sm",
            fixed: 'left' as const,
        },
        {
            title: "Cantidad",
            dataIndex: "cantidad_ingreso",
            key: "cantidad_ingreso",
            render: (_: any, record: any) => (
                <EditableCellInputNumber
                    isAdmin={isAdmin}
                    value={record.cantidad_ingreso || 0}
                    min={0}
                    onChange={(value) => handleValueChange(record.key, "cantidad_ingreso", value)}
                />
            ),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        ...(isAdmin
            ? [
                {
                    title: "Vendedor",
                    dataIndex: ["vendedor", "nombre"],
                    key: "nombre_vendedor",
                    render: (_: any, record: any) => {
                        const { nombre, apellido, marca } = record.vendedor;
                        return `${nombre} ${apellido} - ${marca}`;
                    },
                    className: "text-mobile-sm xl:text-desktop-sm",
                },
                {
                    title: "Acción",
                    key: "action",
                    render: (_: any, record: any) => (
                        <Button type="link" onClick={() => handleDelete(record.key)}>
                            Eliminar
                        </Button>
                    ),
                    className: "text-mobile-sm xl:text-desktop-sm",
                },
            ]
            : []),
    ];

    return (
      <div>
        <Table
          columns={columns}
          dataSource={productDetails.filter((detail) => !detail.deleted)}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 5 }}
        />
      </div>
    );
};

export default EntryProductTable;
