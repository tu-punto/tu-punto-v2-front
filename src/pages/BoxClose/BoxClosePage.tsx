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
import BoxCloseForm from "./BoxCloseForm";
import BoxCloseView from "./BoxCloseView";

function round(num: number) {
  return Math.round(num * 100) / 100;
}

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const BoxClosePage = () => {
  const [boxClosings, setBoxClosings] = useState<IBoxClose[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<IBoxClose | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());

  const fetchBoxClosings = async () => {
    setLoading(true);
    try {
      const boxCloses = await getBoxClosesAPI();

      const formattedData = boxCloses.map((boxClose: IBoxClose | any) => {
        const efectivo = boxClose.efectivo_diario || [];

        const total_coins = efectivo
            .filter((item: any) => item.corte < 10)
            .reduce((sum: number, item: any) => sum + item.corte * item.cantidad, 0);

        const total_bills = efectivo
            .filter((item: any) => item.corte >= 10)
            .reduce((sum: number, item: any) => sum + item.corte * item.cantidad, 0);

        return {
          ...boxClose,
          responsible: boxClose.responsable?.nombre ?? "", // <- clave
          total_coins,
          total_bills,
        };
      });

      setBoxClosings(formattedData);
    } catch (error) {
      console.error("Error fetching boxClosings:", error);
      message.error("Error al cargar los cierres de caja");
    } finally {
      setLoading(false);
    }
  };

  const filterBoxCloses = () => {
    if (!selectedDate) return boxClosings;

    return boxClosings.filter((boxClose) => {
      const currDate = dayjs(boxClose.created_at);
      return currDate.isSame(selectedDate, "day");
    });
  };
  useEffect(() => {
    fetchBoxClosings();
  }, []);

  const columns = [
    {
      title: "Fecha",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Responsable",
      dataIndex: "responsible",
      key: "responsible",
    },
    {
      title: "Efectivo",
      children: [
        {
          title: "Inicial",
          dataIndex: "efectivo_inicial",
          key: "efectivo_inicial",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Ingresos",
          dataIndex: "ventas_efectivo",
          key: "ventas_efectivo",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Final",
          dataIndex: "efectivo_esperado",
          key: "efectivo_esperado",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Diferencia",
          dataIndex: "diferencia_efectivo",
          key: "diferencia_efectivo",
          render: (amount: number) => {
            const color = amount === 0 ? "success" : amount > 0 ? "warning" : "error";
            const icon = amount === 0 ? <CheckCircleOutlined /> : <WarningOutlined />;
            return (
                <Tooltip title={amount === 0 ? "Cuadrado" : "Descuadre"}>
                  <Tag icon={icon} color={color}>Bs. {round(amount)}</Tag>
                </Tooltip>
            );
          },
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
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Ingresos",
          dataIndex: "ventas_qr",
          key: "ventas_qr",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Final",
          dataIndex: "bancario_real",
          key: "bancario_real",
          render: (amount: number) => `Bs. ${round(amount)}`,
        },
        {
          title: "Diferencia",
          dataIndex: "diferencia_bancario",
          key: "diferencia_bancario",
          render: (amount: number) => {
            const color = amount === 0 ? "success" : amount > 0 ? "warning" : "error";
            const icon = amount === 0 ? <CheckCircleOutlined /> : <WarningOutlined />;
            return (
                <Tooltip title={amount === 0 ? "Cuadrado" : "Descuadre"}>
                  <Tag icon={icon} color={color}>Bs. {round(amount)}</Tag>
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
      ellipsis: true,
    },
  ];

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedReconciliation(null);
    fetchBoxClosings();
  };

  return (
      <>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
            <img src="/cierre-caja-icon.png" alt="Cierre de Caja" className="w-8 h-8" />
            <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
              Cierre de Caja
            </h1>
          </div>
        </div>

        <Card>
          <Row gutter={16} className="mb-4">
            <Col xs={24} sm={12}>
              <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  format="DD/MM/YYYY"
                  allowClear
                  style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Button onClick={() => setShowForm(true)} type="primary" icon={<PlusOutlined />} block>
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
            {selectedReconciliation ? (
                <BoxCloseView boxClose={selectedReconciliation} />
            ) : (
                <BoxCloseForm
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                      setShowForm(false);
                      setSelectedReconciliation(null);
                    }}
                    lastClosingBalance={boxClosings[boxClosings.length - 1] || {}}
                    selectedDate={selectedDate}
                />
            )}
          </Modal>

          <Table
              columns={columns}
              dataSource={filterBoxCloses()}
              loading={loading}
              rowKey="_id"
              onRow={(record) => ({
                onClick: () => {
                  setSelectedReconciliation(record);
                  setShowForm(true);
                },
                style: { cursor: "pointer" },
              })}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} registros`,
              }}
              scroll={{ x: "max-content" }}
          />
        </Card>
      </>
  );
};

export default BoxClosePage;
