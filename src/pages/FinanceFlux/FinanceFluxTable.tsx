import { Button, Table, Select, DatePicker, Input, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { getFinancesFluxAPI } from "../../api/financeFlux";
import { FLUX_TYPES } from "../../constants/fluxes";

const { RangePicker } = DatePicker;

function FinanceFluxTable({ refreshKey, onEdit }: any) {
  const [dataWithKey, setDataWithKey] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedType, setSelectedType] = useState();
  const [dateRange, setDateRange] = useState([null, null]);

  const [searchVendedor, setSearchVendedor] = useState("");
  const [searchCategoria, setSearchCategoria] = useState("");
  const [searchConcepto, setSearchConcepto] = useState("");

  const fetchFinances = async () => {
    try {
      const apiData = await getFinancesFluxAPI();
      const dataWithKeys = apiData.map((financeFlux: any) => ({
        ...financeFlux,
        key: financeFlux._id,
        id_flujo_financiero: financeFlux._id,
        vendedor: financeFlux.id_vendedor
          ? `${financeFlux.id_vendedor.nombre} ${financeFlux.id_vendedor.apellido}`
          : "N/A",
        encargado: financeFlux.id_trabajador?.nombre || "N/A",
        sucursal: financeFlux.id_sucursal?.nombre || "N/A",
        esDeuda: financeFlux.esDeuda ? "SI" : "NO",
      }));

      setDataWithKey(dataWithKeys);
      setFilteredData(dataWithKeys);
    } catch (error) {
      console.error("Error fetching financeFlux data:", error);
    }
  };

  useEffect(() => {
    fetchFinances();
  }, [refreshKey]);

  useEffect(() => {
    const filterData = (data: any) => {
      return data.filter((financeFlux: any) => {
        // Filtro por tipo
        const matchesType =
          !selectedType ||
          selectedType === "" ||
          financeFlux.tipo === selectedType;

        // Filtro por fecha
        const matchesDateRange =
          dateRange[0] && dateRange[1]
            ? new Date(financeFlux.fecha) >= dateRange[0] &&
              new Date(financeFlux.fecha) <= dateRange[1]
            : true;

        const matchesVendedor =
          !searchVendedor ||
          financeFlux.vendedor
            .toLowerCase()
            .includes(searchVendedor.toLowerCase());

        const matchesCategoria =
          !searchCategoria ||
          financeFlux.categoria
            .toLowerCase()
            .includes(searchCategoria.toLowerCase());

        const matchesConcepto =
          !searchConcepto ||
          financeFlux.concepto
            .toLowerCase()
            .includes(searchConcepto.toLowerCase());

        return (
          matchesType &&
          matchesDateRange &&
          matchesVendedor &&
          matchesCategoria &&
          matchesConcepto
        );
      });
    };
    setFilteredData(filterData(dataWithKey));
  }, [
    selectedType,
    dateRange,
    dataWithKey,
    searchVendedor,
    searchCategoria,
    searchConcepto,
  ]);

  const columns = [
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "finance_flux_type",
      className: "text-mobile-sm xl:text-desktop-sm",
      sorter: (a: any, b: any) => a.tipo.localeCompare(b.tipo),
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "finance_flux_date",
      render: (text: string) => (
        <span className="text-mobile-sm xl:text-desktop-sm">
          {new Date(text).toLocaleDateString("es-ES")}
        </span>
      ),
      sorter: (a: any, b: any) =>
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Sucursal",
      dataIndex: "sucursal",
      key: "finance_flux_sucursal",
      className: "text-mobile-sm xl:text-desktop-sm",
      sorter: (a: any, b: any) => a.sucursal.localeCompare(b.sucursal),
    },
    {
      title: "Categoría",
      dataIndex: "categoria",
      key: "finance_flux_category",
      className: "text-mobile-sm xl:text-desktop-sm",
      sorter: (a: any, b: any) => a.categoria.localeCompare(b.categoria),
    },
    {
      title: "Monto",
      dataIndex: "monto",
      key: "finance_flux_amount",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (monto: number) =>
        `Bs. ${monto.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      sorter: (a: any, b: any) => a.monto - b.monto,
    },
    {
      title: "Concepto",
      dataIndex: "concepto",
      key: "finance_flux_concept",
      className: "text-mobile-sm xl:text-desktop-sm",
      sorter: (a: any, b: any) => a.concepto.localeCompare(b.concepto),
    },
    {
      title: "Vendedor",
      dataIndex: "vendedor",
      key: "finance_flux_seller",
      className: "text-mobile-sm xl:text-desktop-sm",
      sorter: (a: any, b: any) => a.vendedor.localeCompare(b.vendedor),
    },
    {
      title: "¿Es deuda?",
      dataIndex: "esDeuda",
      key: "finance_flux_isDebt",
      className: "text-mobile-sm xl:text-desktop-sm",
      filters: [
        { text: "Sí", value: "SI" },
        { text: "No", value: "NO" },
      ],
      onFilter: (value: any, record: any) => record.esDeuda === value,
    },
    {
      title: "Founder",
      dataIndex: "founder",
      key: "finance_flux_worker",
      className: "text-mobile-sm xl:text-desktop-sm",
      sorter: (a: any, b: any) => a.encargado.localeCompare(b.encargado),
    },
    {
      title: "Acciones",
      key: "actions",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (_: any, record: any) => (
        <Button onClick={() => onEdit(record)} type="primary" size="small">
          Editar
        </Button>
      ),
      width: 100,
      fixed: "right" as const,
    },
  ];

  return (
    <div>
      {/* Barra de búsqueda y filtros */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select
            placeholder="Filtrar por tipo"
            value={selectedType}
            onChange={setSelectedType}
            options={Object.entries(FLUX_TYPES).map(([_, value]) => ({
              value: value,
              label: value,
            }))}
            allowClear
            style={{ width: 200 }}
          />

          {/* Filtro por fecha */}
          <RangePicker
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0].toDate(), dates[1].toDate()]);
              } else {
                setDateRange([null, null]);
              }
            }}
            style={{ width: 250 }}
            placeholder={["Fecha inicio", "Fecha fin"]}
          />
        </Space>

        {/* Búsquedas específicas */}
        <div style={{ marginTop: 12 }}>
          <Space wrap size="middle">
            <Input
              placeholder="Buscar vendedor..."
              prefix={<SearchOutlined />}
              value={searchVendedor}
              onChange={(e) => setSearchVendedor(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Input
              placeholder="Buscar categoría..."
              prefix={<SearchOutlined />}
              value={searchCategoria}
              onChange={(e) => setSearchCategoria(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Input
              placeholder="Buscar concepto..."
              prefix={<SearchOutlined />}
              value={searchConcepto}
              onChange={(e) => setSearchConcepto(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        scroll={{ x: "max-content" }}
        pagination={{
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} de ${total} registros`,
          pageSize: 10,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
      />
    </div>
  );
}

export default FinanceFluxTable;
