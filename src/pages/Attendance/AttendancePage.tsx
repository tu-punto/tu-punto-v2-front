import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { getAttendanceReportAPI } from "../../api/attendance";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

type AttendanceRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  roleLabel: string;
  sucursalName: string;
  date: string;
  expectedStartTime: string | null;
  expectedEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  expectedMinutes: number;
  workedMinutes: number;
  differenceMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  statusKey: string;
  statusLabel: string;
  issueTags: string[];
  sourceStatus: string;
  jibbleMatched: boolean;
};

type AttendanceResponse = {
  rows: AttendanceRow[];
  pagination: { page: number; pageSize: number; total: number };
  summary: {
    people: number;
    matchedPeople: number;
    rows: number;
    expectedMinutes: number;
    workedMinutes: number;
    differenceMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    overtimeMinutes: number;
  };
  meta: {
    configured: boolean;
    timezone: string;
    schedule: {
      weekday: { start: string; end: string };
      saturday: { start: string; end: string };
    };
    people: Array<{ value: string; label: string; role: string; sucursalId: string; sucursalName: string; email: string; jibbleMatched: boolean }>;
    sucursales: Array<{ value: string; label: string }>;
    integration: { configured: boolean; matchedPeople: number; unmatchedPeople: number; message: string };
  };
};

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "normal", label: "A tiempo" },
  { value: "late", label: "Tarde" },
  { value: "early", label: "Salida temprana" },
  { value: "overtime", label: "Horas extra" },
  { value: "missing", label: "Sin marcacion" },
  { value: "rest", label: "Descanso" },
  { value: "rest-worked", label: "Descanso trabajado" },
  { value: "problematic", label: "Con incidencias" },
];

const roleOptions = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operario" },
  { value: "superadmin", label: "Superadmin" },
];

const formatMinutes = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "-";
  const value = Math.abs(Math.round(minutes));
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  const sign = Number(minutes) < 0 ? "-" : "";
  if (!hours) return `${sign}${mins}m`;
  if (!mins) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Sin datos";
  if (start && end) return `${start} - ${end}`;
  return start || end || "Sin datos";
};

const AttendancePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [query, setQuery] = useState<any>({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
    search: "",
    personId: "",
    role: "all",
    sucursalId: "",
    status: "all",
  });

  const loadReport = async (extra?: Record<string, any>) => {
    try {
      setLoading(true);
      const params = {
        ...query,
        page,
        pageSize,
        ...(extra || {}),
      };
      const response = await getAttendanceReportAPI(params);
      if (response?.success) {
        setData(response.data);
      } else {
        message.error("No se pudo cargar el reporte de asistencia");
      }
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar el reporte de asistencia");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sucursalOptions = useMemo(
    () => (data?.meta.sucursales || []).map((item) => ({ value: item.value, label: item.label })),
    [data]
  );

  const columns = [
    {
      title: "Fecha",
      dataIndex: "date",
      width: 120,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      sorter: (a: AttendanceRow, b: AttendanceRow) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
    },
    {
      title: "Persona",
      key: "person",
      width: 220,
      render: (_: unknown, record: AttendanceRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.fullName}</Text>
          <Text type="secondary">{record.email}</Text>
        </Space>
      ),
    },
    {
      title: "Rol",
      dataIndex: "roleLabel",
      width: 110,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Sucursal",
      dataIndex: "sucursalName",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Esperado",
      width: 140,
      render: (_: unknown, record: AttendanceRow) => formatTimeRange(record.expectedStartTime, record.expectedEndTime),
    },
    {
      title: "Real",
      width: 140,
      render: (_: unknown, record: AttendanceRow) => formatTimeRange(record.actualStartTime, record.actualEndTime),
    },
    {
      title: "Trabajado",
      width: 110,
      render: (_: unknown, record: AttendanceRow) => formatMinutes(record.workedMinutes),
    },
    {
      title: "Dif.",
      width: 95,
      render: (_: unknown, record: AttendanceRow) => {
        const value = record.differenceMinutes;
        return <Tag color={value >= 0 ? "green" : "red"}>{formatMinutes(value)}</Tag>;
      },
    },
    {
      title: "Tarde",
      width: 90,
      render: (_: unknown, record: AttendanceRow) => <Tag color={record.lateMinutes > 0 ? "orange" : "default"}>{formatMinutes(record.lateMinutes)}</Tag>,
    },
    {
      title: "Salida temprana",
      width: 120,
      render: (_: unknown, record: AttendanceRow) => <Tag color={record.earlyLeaveMinutes > 0 ? "volcano" : "default"}>{formatMinutes(record.earlyLeaveMinutes)}</Tag>,
    },
    {
      title: "Extra",
      width: 90,
      render: (_: unknown, record: AttendanceRow) => <Tag color={record.overtimeMinutes > 0 ? "gold" : "default"}>{formatMinutes(record.overtimeMinutes)}</Tag>,
    },
    {
      title: "Estado",
      width: 180,
      render: (_: unknown, record: AttendanceRow) => (
        <Space wrap>
          {record.issueTags.map((tag) => (
            <Tag key={tag} color={tag === "Sin marcacion" ? "red" : tag === "A tiempo" ? "green" : tag === "Descanso" ? "default" : "blue"}>
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  const handleApply = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    const nextQuery = {
      from: values.range?.[0]?.format("YYYY-MM-DD"),
      to: values.range?.[1]?.format("YYYY-MM-DD"),
      search: values.search || "",
      personId: values.personId || "",
      role: values.role || "all",
      sucursalId: values.sucursalId || "",
      status: values.status || "all",
    };

    setPage(1);
    setQuery(nextQuery);
    const response = await getAttendanceReportAPI({ ...nextQuery, page: 1, pageSize });
    if (response?.success) {
      setData(response.data);
    }
  };

  const handleReset = async () => {
    const nextQuery = {
      from: dayjs().startOf("month").format("YYYY-MM-DD"),
      to: dayjs().format("YYYY-MM-DD"),
      search: "",
      personId: "",
      role: "all",
      sucursalId: "",
      status: "all",
    };
    form.setFieldsValue({
      range: [dayjs().startOf("month"), dayjs()],
      search: "",
      personId: undefined,
      role: "all",
      sucursalId: undefined,
      status: "all",
    });
    setPage(1);
    setQuery(nextQuery);
    const response = await getAttendanceReportAPI({ ...nextQuery, page: 1, pageSize });
    if (response?.success) {
      setData(response.data);
    }
  };

  const pagination = data?.pagination || { page, pageSize, total: 0 };

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Space direction="vertical" size={4}>
          <Title level={2} style={{ margin: 0 }}>Asistencia</Title>
          <Text type="secondary">Horas trabajadas vs horario esperado, con tardanzas, salidas tempranas y horas extra.</Text>
        </Space>
      </Card>

      {data?.meta.integration && (
        <Alert
          showIcon
          type={data.meta.integration.configured ? (data.meta.integration.unmatchedPeople > 0 ? "warning" : "success") : "warning"}
          message={data.meta.integration.configured ? "Jibble conectado" : "Jibble aun no configurado"}
          description={data.meta.integration.message}
        />
      )}

      <Row gutter={[12, 12]}>
        <Col xs={24} md={6}><Card><Statistic title="Personas" value={data?.summary.people || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Horas trabajadas" value={formatMinutes(data?.summary.workedMinutes || 0)} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Tardanzas" value={formatMinutes(data?.summary.lateMinutes || 0)} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Horas extra" value={formatMinutes(data?.summary.overtimeMinutes || 0)} /></Card></Col>
      </Row>

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            range: [dayjs().startOf("month"), dayjs()],
            search: "",
            personId: undefined,
            role: "all",
            sucursalId: undefined,
            status: "all",
          }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item name="range" label="Rango de fechas" rules={[{ required: true, message: "Selecciona un rango" }]}>
                <RangePicker style={{ width: "100%" }} allowClear={false} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="search" label="Buscar">
                <Input prefix={<SearchOutlined />} placeholder="Nombre, email o sucursal" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="personId" label="Persona">
                <Select allowClear showSearch optionFilterProp="label" options={(data?.meta.people || []).map((item) => ({ value: item.value, label: item.label }))} placeholder="Todas" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="role" label="Rol">
                <Select options={roleOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="sucursalId" label="Sucursal">
                <Select allowClear options={sucursalOptions} placeholder="Todas" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="status" label="Estado">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleApply} loading={loading}>Aplicar</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset} loading={loading}>Limpiar</Button>
                <Button icon={<ReloadOutlined />} onClick={() => loadReport()} loading={loading}>Actualizar</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns as any}
          dataSource={data?.rows || []}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "25", "50", "100"],
          }}
          onChange={(paginationState) => {
            const nextPage = paginationState.current || 1;
            const nextPageSize = paginationState.pageSize || 25;
            setPage(nextPage);
            setPageSize(nextPageSize);
            loadReport({ page: nextPage, pageSize: nextPageSize });
          }}
          scroll={{ x: 1600 }}
        />
      </Card>
    </Space>
  );
};

export default AttendancePage;
