import { DatePicker, Select, Table } from "antd"
import { getFinancesFluxAPI, getSellerByShippingAPI, getWorkerByShippingAPI } from "../../api/financeFlux";
import { useEffect, useState } from "react";

const FinanceFluxTable = (refreshKey: any) => {
    const [dataWithKey, setDataWithKey] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedType, setSelectedType] = useState('');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const { RangePicker } = DatePicker;

    const financeFluxTypes: any = {
        1: "GASTO",
        2: "INGRESO",
        3: "INVERSION"
    }

    const fetchFinances = async () => {
        try {
            const apiData = await getFinancesFluxAPI();
            const sellerPromises = apiData.map((financeFlux: any) =>
                financeFlux.id_vendedor ? getSellerByShippingAPI(financeFlux.id_vendedor) : Promise.resolve(null)
            );
            const workerPromises = apiData.map((financeFlux: any) =>
                financeFlux.id_trabajador ? getWorkerByShippingAPI(financeFlux.id_trabajador) : Promise.resolve(null)
            );
            const sellers = await Promise.all(sellerPromises);
            const workers = await Promise.all(workerPromises);

            const dataWithKeys = apiData.map((financeFlux: any, index: number) => ({
                ...financeFlux,
                key: financeFlux.id_flujo_financiero, // Usa un campo único como key
                vendedor: sellers[index]?.nombre && sellers[index]?.apellido ? `${sellers[index]?.nombre} ${sellers[index]?.apellido}` : '',
                encargado: workers[index]?.nombre || '',
                esDeuda: financeFlux.esDeuda ? 'SI' : 'NO'
            }));
            setDataWithKey(dataWithKeys);
            setFilteredData(dataWithKeys);
        } catch (error) {
            console.error("Error fetching financeFlux data:", error);
        }
    }

    useEffect(() => {
        fetchFinances();
    }, [refreshKey])

    useEffect(() => {
        const filterData = (data: any) => {
            return data.filter((financeFlux: any) => {
                // Filtrar por tipo si está seleccionado
                const matchesType = !selectedType || selectedType === '' || financeFlux.tipo.toLowerCase() === financeFluxTypes[selectedType].toLowerCase();
                // Filtrar por fecha si el rango de fechas está definido
                const matchesDateRange = dateRange[0] && dateRange[1] ?
                    (new Date(financeFlux.fecha) >= dateRange[0] && new Date(financeFlux.fecha) <= dateRange[1])
                    : true;
                // Solo se necesita que uno de los filtros coincida
                return matchesType && matchesDateRange;
            });
        };
        setFilteredData(filterData(dataWithKey));
    }, [selectedType, dateRange, dataWithKey]);


    const columns = [
        {
            title: "Tipo",
            dataIndex: "tipo",
            key: "finance_flux_type",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{text}</span>
            ),
        },
        {
            title: "Fecha",
            dataIndex: "fecha",
            key: "finance_flux_date",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{new Date(text).toLocaleDateString('es-ES')}</span>
            ),
        },
        {
            title: "Categoría",
            dataIndex: "categoria",
            key: "finance_flux_category",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{text}</span>
            ),
        },
        {
            title: "Monto",
            dataIndex: "monto",
            key: "finance_flux_amount",
            render: (text: any) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{`Bs. ${text}`}</span>
            ),
        },
        {
            title: "Concepto",
            dataIndex: "concepto",
            key: "finance_flux_concept",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{text}</span>
            ),
        },
        {
            title: "Vendedor",
            dataIndex: "vendedor",
            key: "finance_flux_seller",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{text}</span>
            ),
        },
        {
            title: "¿Es deuda?",
            dataIndex: "esDeuda",
            key: "finance_flux_isDebt",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{text}</span>
            ),
        },
        {
            title: "Encargado",
            dataIndex: "encargado",
            key: "finance_flux_worker",
            render: (text: string) => (
                <span className="text-mobile-sm xl:text-desktop-sm">{text}</span>
            ),
        },
    ];
    

    return (
        <div>
            <div>

                <Select
                    className="mr-2 w-2/3 xl:w-1/5"
                    placeholder="Filtrar por tipo"
                    onChange={(value) => setSelectedType(value || '')}
                    options={Object.entries(financeFluxTypes).map(([key, value]) => ({
                        value: key,
                        label: value
                    }))}
                    allowClear
                />
                <RangePicker
                    className="w-full xl:w-1/5"
                    onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                            setDateRange([dates[0].toDate(), dates[1].toDate()]);
                        } else {
                            setDateRange([null, null]);
                        }
                    }}
                    style={{ marginRight: 8 }}
                />
            </div>
            <Table
                columns={columns}
                dataSource={filteredData}
                pagination={false}
                scroll={{ x: "max-content" }}
            />
        </div>
    )
}

export default FinanceFluxTable