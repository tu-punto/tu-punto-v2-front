import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Button,
  DatePicker,
  Tag,
  Tooltip,
  Modal,
  Col,
  Row,
  Select,
  message,
} from "antd";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  PlusOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { getBoxClosesAPI } from "../../api/boxClose";
import { IBoxClose } from "../../models/boxClose";
import { IDailyEffective } from "../../models/dailyEffective";
import { getDailyEffectivesAPI } from "../../api/dailyEffective";
import BoxCloseForm from "./BoxCloseForm";
import { IBranch } from "../../models/branchModel";
import { getSucursalsAPI } from "../../api/sucursal";

function round(num: number) {
  return Math.round(num * 100) / 100;
}

const BoxClosePage = () => {
  const [boxClosings, setBoxClosings] = useState<IBoxClose[]>([]);
  const [sucursals, setSucursals] = useState<IBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectBranchId, setSelectedBranchId] = useState<number | null>();
  const [selectedReconciliation, setSelectedReconciliation] =
    useState<IBoxClose | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    [dayjs().startOf("month"), dayjs().endOf("month")]
  );

  dayjs.extend(isSameOrAfter);
  dayjs.extend(isSameOrBefore);

  const fetchBoxClosings = async () => {
    setLoading(true);
    try {
      const boxCloses = await getBoxClosesAPI();
      const dailyEffective: IDailyEffective[] = await getDailyEffectivesAPI();
      const formattedData = boxCloses.map((boxClose: IBoxClose) => {
        const currDailyEffective = dailyEffective.find(
          (daily) =>
            boxClose.id_efectivo_diario.id_efectivo_diario ===
            daily.id_efectivo_diario
        );
        return {
          ...boxClose,
          total_coins: currDailyEffective!.total_coins,
          total_bills: currDailyEffective!.total_bills,
        };
      });

      setBoxClosings(formattedData);
    } catch (error) {
      console.error("Error fetching boxClosings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterBoxCloses = () => {
    let filteredData = boxClosings;

    if (selectBranchId) {
      filteredData = filteredData.filter(
        (boxClose) => selectBranchId === boxClose.id_sucursal.id_sucursal
      );
    }

    if (dateRange) {
      filteredData = filteredData.filter((boxClose) => {
        const currDate = dayjs(boxClose.created_at);
        return (
          currDate.isSameOrAfter(dateRange[0], "day") &&
          currDate.isSameOrBefore(dateRange[1], "day")
        );
      });
    }

    return filteredData;
  };

  const fetchSucursals = async () => {
    try {
      const response = await getSucursalsAPI();
      setSucursals(response);
    } catch (error) {
      message.error("Error al obtener las sucursales");
    }
  };

  useEffect(() => {
    filterBoxCloses();
  }, [dateRange, selectBranchId]);

  useEffect(() => {
    fetchBoxClosings();
    fetchSucursals();
  }, []);

  const columns = [
    {
      title: "Fecha",
      dataIndex: "created_at",
      key: "created_at",
      className: "text-mobile-base xl:text-desktop-sm ",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
      sorter: (a: any, b: any) => dayjs(a.fecha).unix() - dayjs(b.fecha).unix(),
    },
    {
      title: "Sucursal",
      dataIndex: "id_sucursal",
      key: "id_sucursal",
      className: "text-mobile-base xl:text-desktop-sm ",
      render: (sucursal: IBranch) => sucursal ? sucursal.nombre : "Otro",
    },
    {
      title: "Responsable",
      dataIndex: "responsible",
      key: "responsible",
      className: "text-mobile-base xl:text-desktop-sm ",
    },
    {
      title: "Efectivo",
      children: [
        {
          title: "Inicial",
          dataIndex: "efectivo_inicial",
          key: "efectivo_inicial",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Ingresos",
          dataIndex: "ventas_efectivo",
          key: "ventas_efectivo",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Final",
          dataIndex: "efectivo_esperado",
          key: "efectivo_esperado",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Diferencia",
          dataIndex: "diferencia_efectivo",
          key: "diferencia_efectivo",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => {
            const color =
              amount === 0 ? "success" : amount > 0 ? "warning" : "error";
            const icon =
              amount === 0 ? <CheckCircleOutlined /> : <WarningOutlined />;
            return (
              <Tooltip title={amount === 0 ? "Cuadrado" : "Descuadre"}>
                <Tag icon={icon} color={color}>
                  Bs. {round(amount)}
                </Tag>
              </Tooltip>
            );
          },
        },
      ],
    },
    {
      title: "Desglose",
      children: [
        {
          title: "Monedas",
          dataIndex: "total_coins",
          key: "total_coins",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${amount}`,
        },
        {
          title: "Billetes",
          dataIndex: "total_bills",
          key: "total_bills",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${amount}`,
        },
      ],
    },
    {
      title: "Bancario",
      children: [
        {
          title: "Inicial",
          dataIndex: "bancario_inicial",
          key: "bancario_inicial",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Ingresos",
          dataIndex: "ventas_qr",
          key: "ventas_qr",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Final",
          dataIndex: "bancario_real",
          key: "bancario_real",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Diferencia",
          dataIndex: "diferencia_bancario",
          key: "diferencia_bancario",
          className: "text-mobile-base xl:text-desktop-sm ",
          render: (amount: number) => {
            const color =
              amount === 0 ? "success" : amount > 0 ? "warning" : "error";
            const icon =
              amount === 0 ? <CheckCircleOutlined /> : <WarningOutlined />;
            return (
              <Tooltip title={amount === 0 ? "Cuadrado" : "Descuadre"}>
                <Tag icon={icon} color={color}>
                  Bs. {round(amount)}
                </Tag>
              </Tooltip>
            );
          },
        },
      ],
    },
    {
      title: "Observaciones",
      dataIndex: "observaciones",
      key: "observaciones",
      className: "text-mobile-base xl:text-desktop-sm ",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || "-"}</span>
        </Tooltip>
      ),
    },
  ];

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedReconciliation(null);
    fetchBoxClosings();
  };

  const handleRowClick = (record: any) => {
    setSelectedReconciliation(record);
    setShowForm(true);
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-3">Cierre de Caja</h1>
      <Card>
        <Row justify="center" align="middle" gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Selecciona una sucursal"
              options={sucursals.map((branch: IBranch) => ({
                value: branch.id_sucursal,
                label: branch.nombre,
              }))}
              filterOption={(input, option: any) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              style={{ minWidth: 200 }}
              onChange={(value) => setSelectedBranchId(value)}
              showSearch
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
              }
              format="DD/MM/YYYY"
              allowClear={true}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              onClick={() => {
                setDateRange(null);
                setSelectedBranchId(null);
              }}
              type="default"
              block
            >
              Ver Todo
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={() => {
                setSelectedReconciliation(null);
                setShowForm(true);
              }}
            >
              Nuevo Cierre
            </Button>
          </Col>
        </Row>
        <Modal
          title={selectedReconciliation ? "Ver Cierre" : "Nuevo Cierre"}
          open={showForm}
          onCancel={() => {
            setShowForm(false);
            setSelectedReconciliation(null);
          }}
          footer={null}
          width={1000}
        >
          <BoxCloseForm
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setSelectedReconciliation(null);
            }}
            lastClosingBalance={boxClosings[boxClosings.length - 1] || []}
            // initialData={selectedReconciliation}
          />
        </Modal>

        <Table
          columns={columns}
          dataSource={filterBoxCloses()}
          loading={loading}
          rowKey="id_reconciliation"
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: "pointer" },
          })}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} registros`,
          }}
          scroll={{ x: "max-content" }}
          summary={(pageData) => {
            const totals = pageData.reduce(
              (acc, curr) => {
                return {
                  ingresos_efectivo:
                    acc.ingresos_efectivo +
                    parseFloat(curr.ventas_efectivo as any),
                  diferencia_efectivo:
                    acc.diferencia_efectivo +
                    parseFloat(curr.diferencia_efectivo as any),
                  total_coins: acc.total_coins + parseFloat(curr.total_coins),
                  total_bills: acc.total_bills + parseFloat(curr.total_bills),
                  ingresos_bancario:
                    acc.ingresos_bancario + parseFloat(curr.ventas_qr as any),
                  diferencia_bancario:
                    acc.diferencia_bancario +
                    parseFloat(curr.diferencia_bancario as any),
                };
              },
              {
                ingresos_efectivo: 0,
                diferencia_efectivo: 0,
                total_coins: 0,
                total_bills: 0,
                ingresos_bancario: 0,
                diferencia_bancario: 0,
              }
            );

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <strong>Totales</strong>
                </Table.Summary.Cell>

                <Table.Summary.Cell index={1} colSpan={2}>
                  Bs. {totals.ingresos_efectivo}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={2}>
                  <Tag
                    color={
                      totals.diferencia_efectivo === 0 ? "success" : "error"
                    }
                  >
                    Bs. {totals.diferencia_efectivo}
                  </Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={2}>
                  Bs. {totals.total_coins}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} colSpan={2}>
                  Bs. {totals.total_bills}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={2}>
                  Bs. {totals.ingresos_bancario}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2}>
                  <Tag
                    color={
                      totals.diferencia_bancario === 0 ? "success" : "error"
                    }
                  >
                    Bs. {totals.diferencia_bancario}
                  </Tag>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </>
  );
};

export default BoxClosePage;
