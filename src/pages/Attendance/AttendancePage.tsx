import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { SearchOutlined } from "@ant-design/icons";
import { getAttendanceReportAPI } from "../../api/attendance";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

type AttendanceRow = {
  id: string;
  fullName: string;
  email: string;
  roleLabel: string;
  groupId: string;
  groupName: string;
  status: string;
  date: string;
  isRestDay: boolean;
  expectedStartTime: string | null;
  expectedEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  expectedMinutes: number;
  workedMinutes: number;
  differenceMinutes: number;
  missingMinutes: number;
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
    missingMinutes: number;
    overtimeMinutes: number;
  };
  meta: {
    configured: boolean;
    connected: boolean;
    timezone: string;
    schedule: {
      weekday: { expectedMinutes: number; label: string };
      saturday: { expectedMinutes: number; label: string };
    };
    people: Array<{ value: string; label: string; email: string; groupId: string; groupName: string; status: string }>;
    groups: Array<{ value: string; label: string }>;
    integration: { configured: boolean; matchedPeople: number; unmatchedPeople: number; message: string };
  };
};

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "normal", label: "Cumplió" },
  { value: "missing-hours", label: "Faltan horas" },
  { value: "overtime", label: "Horas extra" },
  { value: "missing", label: "Sin marcacion" },
  { value: "rest", label: "Descanso" },
  { value: "rest-worked", label: "Descanso trabajado" },
  { value: "problematic", label: "Con incidencias" },
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

const formatExpectedHours = (minutes: number) => formatMinutes(minutes);

type DatePreset = "today" | "yesterday" | "last7" | "last30" | "custom";

const datePresetOptions: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last7", label: "Ultimos 7 dias" },
  { value: "last30", label: "Ultimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

const getPresetRange = (preset: DatePreset) => {
  const today = dayjs();
  if (preset === "today") return [today, today] as const;
  if (preset === "yesterday") {
    const yesterday = today.subtract(1, "day");
    return [yesterday, yesterday] as const;
  }
  if (preset === "last30") return [today.subtract(29, "day"), today] as const;
  return [today.subtract(6, "day"), today] as const;
};

const getCustomRange = () => [dayjs().startOf("month"), dayjs()] as const;

const initialFilters = {
  from: getPresetRange("last7")[0].format("YYYY-MM-DD"),
  to: getPresetRange("last7")[1].format("YYYY-MM-DD"),
  search: "",
  personId: "",
  groupId: "joined",
  status: "all",
  datePreset: "last7" as DatePreset,
};

const AttendancePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [query, setQuery] = useState(initialFilters);
  const [datePreset, setDatePreset] = useState<DatePreset>("last7");

  useEffect(() => {
    form.setFieldsValue({
      datePreset: "last7",
      range: getCustomRange(),
      search: "",
      personId: undefined,
      groupId: "joined",
      status: "all",
    });
  }, [form]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await getAttendanceReportAPI({ ...query, page, pageSize });
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
    }, 250);

    return () => window.clearTimeout(timer);
  }, [page, pageSize, query]);

  const groupOptions = useMemo(
    () => {
      const options = (data?.meta.groups || []).map((item) => ({ value: item.value, label: item.label }));
      return options.length ? options : [{ value: "joined", label: "Joined" }];
    },
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
      title: "Grupo",
      dataIndex: "groupName",
      width: 110,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Estado Jibble",
      dataIndex: "status",
      width: 160,
      ellipsis: true,
      render: (value: string) => value || "Sin estado",
    },
    {
      title: "Jornada",
      width: 120,
      render: (_: unknown, record: AttendanceRow) => (
        <Tag color={record.isRestDay ? "default" : "blue"}>{record.isRestDay ? "Descanso" : formatExpectedHours(record.expectedMinutes)}</Tag>
      ),
    },
    {
      title: "Marcación",
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
      title: "Estado",
      width: 180,
      render: (_: unknown, record: AttendanceRow) => (
        <Space wrap>
          {record.issueTags.map((tag) => (
            <Tag
              key={tag}
              color={tag === "Sin marcacion" ? "red" : tag === "Faltan horas" ? "orange" : tag === "Extra" ? "gold" : tag === "Descanso" ? "default" : "green"}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  const updateQueryFromForm = (_: unknown, allValues: any) => {
    const preset = (allValues.datePreset || "last7") as DatePreset;
    const [fromDate, toDate] = preset === "custom" && allValues.range?.[0] && allValues.range?.[1]
      ? [allValues.range[0], allValues.range[1]]
      : getPresetRange(preset);
    const nextQuery = {
      from: fromDate.format("YYYY-MM-DD"),
      to: toDate.format("YYYY-MM-DD"),
      search: allValues.search || "",
      personId: allValues.personId || "",
      groupId: allValues.groupId || "",
      status: allValues.status || "all",
      datePreset: preset,
    };

    setPage(1);
    setQuery(nextQuery);
    setDatePreset(preset);
  };

  const handleReset = () => {
    form.setFieldsValue({
      datePreset: "last7",
      range: getCustomRange(),
      search: "",
      personId: undefined,
      groupId: "joined",
      status: "all",
    });
    setPage(1);
    setQuery(initialFilters);
    setDatePreset("last7");
  };

  const pagination = data?.pagination || { page, pageSize, total: 0 };
  const missingMinutes = Math.max(0, (data?.summary.expectedMinutes || 0) - (data?.summary.workedMinutes || 0));

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card className="shadow-sm border border-slate-200/70" bodyStyle={{ padding: 20, background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)" }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]} style={{ minHeight: 88 }}>
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={2} style={{ margin: 0, lineHeight: 1.1 }}>Asistencia</Title>
              <Text type="secondary">Horas trabajadas vs jornada esperada por día, sin depender de horarios fijos de entrada/salida.</Text>
            </Space>
          </Col>
          <Col>
            <Tag color={data?.meta.connected ? "green" : "red"} style={{ margin: 0, borderRadius: 999, paddingInline: 12 }}>
              {data?.meta.connected ? "Conectado" : "No conectado"}
            </Tag>
          </Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={6}><Card><Statistic title="Personas" value={data?.summary.people || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Horas trabajadas" value={formatMinutes(data?.summary.workedMinutes || 0)} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Horas faltantes" value={formatMinutes(missingMinutes)} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Horas extra" value={formatMinutes(data?.summary.overtimeMinutes || 0)} /></Card></Col>
      </Row>

      <Card className="shadow-sm border border-slate-200/70" bodyStyle={{ padding: 20 }}>
        <Form form={form} layout="vertical" onValuesChange={updateQueryFromForm} initialValues={{
          datePreset: "last7",
          range: getCustomRange(),
          search: "",
          personId: undefined,
          groupId: "joined",
          status: "all",
        }}>
          <Row gutter={[16, 12]} align="bottom">
            <Col xs={24} md={6} lg={5}>
              <Form.Item name="datePreset" label="Rango de fechas" rules={[{ required: true, message: "Selecciona un rango" }]}> 
                <Select options={datePresetOptions} />
              </Form.Item>
            </Col>
            {datePreset === "custom" && (
              <Col xs={24} md={8} lg={7}>
                <Form.Item name="range" label=" ">
                  <RangePicker style={{ width: "100%" }} allowClear={false} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={6} lg={6}>
              <Form.Item name="search" label="Buscar">
                <Input prefix={<SearchOutlined />} placeholder="Nombre, email o grupo" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5} lg={4}>
              <Form.Item name="personId" label="Persona">
                <Select allowClear showSearch optionFilterProp="label" options={(data?.meta.people || []).map((item) => ({ value: item.value, label: item.label }))} placeholder="Todas" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5} lg={4}>
              <Form.Item name="groupId" label="Grupo">
                <Select options={groupOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4} lg={3}>
              <Form.Item name="status" label="Estado">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3} lg={2}>
              <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                <Button onClick={handleReset} loading={loading} className="w-full">
                  Limpiar
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card className="shadow-sm">
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
          }}
          scroll={{ x: 1280 }}
        />
      </Card>
    </Space>
  );
};

export default AttendancePage;
