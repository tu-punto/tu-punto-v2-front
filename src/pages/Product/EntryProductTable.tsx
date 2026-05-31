import { Button, Select, Table } from "antd";
import dayjs from "dayjs";
import { useContext, useEffect, useMemo, useState } from "react";
import { EditableCellInputNumber } from "../components/editableCell";
import { UserContext } from "../../context/userContext";
import { getProductHistoryEntriesByProductIdAPI } from "../../api/entry";
import useEditableTable from "../../hooks/useEditableTable";

const EntryProductTable = ({product, onSave, setEntryData}) => {
    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role === 'admin';
    const [selectedBranch, setSelectedBranch] = useState<string>();
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
            sorter: (a: any, b: any) => dayjs(a.fecha_ingreso).valueOf() - dayjs(b.fecha_ingreso).valueOf(),
            className: "text-mobile-sm xl:text-desktop-sm",
            fixed: 'left' as const,
        },
        {
            title: "Sucursal",
            dataIndex: "sucursal",
            key: "sucursal",
            render: (value: any) => value?.nombre || "Sucursal no encontrada",
            sorter: (a: any, b: any) =>
                String(a.sucursal?.nombre || "").localeCompare(String(b.sucursal?.nombre || "")),
            className: "text-mobile-sm xl:text-desktop-sm",
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
            sorter: (a: any, b: any) => Number(a.cantidad_ingreso || 0) - Number(b.cantidad_ingreso || 0),
            className: "text-mobile-sm xl:text-desktop-sm",
        },
        ...(isAdmin
            ? [
                {
                    title: "Vendedor",
                    dataIndex: ["vendedor", "nombre"],
                    key: "nombre_vendedor",
                    render: (_: any, record: any) => {
                        const { nombre, apellido, marca } = record.vendedor || {};
                        return `${nombre} ${apellido} - ${marca}`;
                    },
                    sorter: (a: any, b: any) => {
                        const sellerA = `${a.vendedor?.nombre || ""} ${a.vendedor?.apellido || ""}`;
                        const sellerB = `${b.vendedor?.nombre || ""} ${b.vendedor?.apellido || ""}`;
                        return sellerA.localeCompare(sellerB);
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

    const activeDetails = useMemo(
        () => productDetails.filter((detail: any) => !detail.deleted),
        [productDetails]
    );

    const branchOptions = useMemo(() => {
        const branches = new Map<string, string>();
        activeDetails.forEach((detail: any) => {
            const id = String(detail.sucursal?._id || detail.sucursal || "");
            if (id) branches.set(id, detail.sucursal?.nombre || "Sucursal no encontrada");
        });
        return Array.from(branches, ([value, label]) => ({ value, label }));
    }, [activeDetails]);

    const filteredDetails = useMemo(
        () =>
            selectedBranch
                ? activeDetails.filter(
                    (detail: any) => String(detail.sucursal?._id || detail.sucursal || "") === selectedBranch
                )
                : activeDetails,
        [activeDetails, selectedBranch]
    );

    return (
      <div>
        <Select
          allowClear
          placeholder="Todas las sucursales"
          options={branchOptions}
          style={{ width: 260, marginBottom: 16 }}
          value={selectedBranch}
          onChange={setSelectedBranch}
        />
        <Table
          columns={columns}
          dataSource={filteredDetails}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 5 }}
        />
      </div>
    );
};

export default EntryProductTable;
