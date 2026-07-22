import { Badge, Button, DatePicker, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { getSellersAPI } from "../../api/seller";
import { ISeller } from "../../models/sellerModels";

const { RangePicker } = DatePicker;

const DECLINE_REASON_LABELS: Record<string, string> = {
  no_lo_que_necesitaba: "El servicio no es lo que necesitaba ahora.",
  costo_alto: "No vendo lo suficiente para justificar el costo.",
  mejor_alternativa: "Encontró una alternativa mejor.",
  entregas_propia: "Prefiere hacer las entregas por su cuenta.",
  poco_uso: "No utilizaba el servicio lo suficiente.",
  problemas_servicio: "Tuvo problemas con el servicio o la atención.",
  problemas_plataforma: "Tuvo problemas con la plataforma o la aplicación.",
  pausa_temporal: "Necesita una pausa temporal.",
  cerrar_negocio: "Cerrará su negocio.",
  otro: "Otro",
};

const DECLINE_RETURN_LABELS: Record<string, string> = {
  muy_probable: "Muy probable",
  probable: "Probable",
  no_estoy_seguro: "No está seguro",
  poco_probable: "Poco probable",
  nunca: "Nunca",
};

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

type DeclineRow = ISeller & { key: string };

export default function DeclineResponsesModal({
  open,
  onClose,
  onCountChange,
}: {
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeclineRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [originFilter, setOriginFilter] = useState<"todos" | "seller" | "admin">("todos");
  const [reasonFilter, setReasonFilter] = useState("todos");
  const [returnFilter, setReturnFilter] = useState("todos");
  const [branchFilter, setBranchFilter] = useState("todas");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await getSellersAPI();
      const sellers = Array.isArray(response) ? response : Array.isArray((response as any)?.data) ? (response as any).data : [];
      const declined = sellers
        .filter((seller: ISeller) => Boolean(seller?.declinacion_servicio_fecha))
        .map((seller: ISeller) => ({
          ...seller,
          key: String(seller?._id || ""),
        }));
      setRows(declined);
      onCountChange?.(declined.length);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar las respuestas de declinación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadRows();
  }, [open]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(searchText);

    return rows.filter((row) => {
      if (originFilter !== "todos" && String(row?.declinacion_servicio_origen || "") !== originFilter) {
        return false;
      }

      if (reasonFilter !== "todos") {
        const rowReason =
          row?.declinacion_servicio_motivo_principal_otro
            ? "otro"
            : String(row?.declinacion_servicio_motivo_principal || "");
        if (rowReason !== reasonFilter) return false;
      }

      if (
        returnFilter !== "todos" &&
        String(row?.declinacion_servicio_probabilidad_retorno || "") !== returnFilter
      ) {
        return false;
      }

      if (branchFilter !== "todas") {
        const branchNames = Array.isArray(row?.pago_sucursales)
          ? row.pago_sucursales
              .map((branch: any) => String(branch?.sucursalName || "").trim())
              .filter(Boolean)
          : [];
        if (!branchNames.includes(branchFilter)) return false;
      }

      if (dateRange?.[0] || dateRange?.[1]) {
        const declineDate = row?.declinacion_servicio_fecha ? dayjs(row.declinacion_servicio_fecha) : null;
        if (!declineDate?.isValid()) return false;

        const start = dateRange?.[0]?.startOf("day");
        const end = dateRange?.[1]?.endOf("day");

        if (start && declineDate.isBefore(start)) return false;
        if (end && declineDate.isAfter(end)) return false;
      }

      if (!query) return true;

      const haystack = [
        row?.nombre,
        row?.apellido,
        row?.telefono,
        row?.declinacion_servicio_motivo_principal_otro,
      ]
        .map((value) => String(value || ""))
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [branchFilter, dateRange, originFilter, reasonFilter, returnFilter, rows, searchText]);

  const buildReasonLabel = (row: DeclineRow) =>
    row?.declinacion_servicio_motivo_principal_otro ||
    DECLINE_REASON_LABELS[row?.declinacion_servicio_motivo_principal || ""] ||
    (row?.declinacion_servicio_omitir_motivo_principal ? "Pregunta omitida" : "-");

  const buildReturnLabel = (row: DeclineRow) => {
    const value = row?.declinacion_servicio_probabilidad_retorno;
    if (!value && row?.declinacion_servicio_omitir_probabilidad_retorno) {
      return "Pregunta omitida";
    }
    return DECLINE_RETURN_LABELS[value || ""] || value || "-";
  };

  const branchOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        rows.flatMap((row) =>
          Array.isArray(row?.pago_sucursales)
            ? row.pago_sucursales
                .map((branch: any) => String(branch?.sucursalName || "").trim())
                .filter(Boolean)
            : []
        )
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { label: "Todas las sucursales", value: "todas" },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [rows]);

  const reasonOptions = useMemo(
    () => [
      { label: "Todos los motivos", value: "todos" },
      ...Object.entries(DECLINE_REASON_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    []
  );

  const exportToExcel = () => {
    if (!filteredRows.length) {
      message.info("No hay respuestas para exportar");
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");

    const tableRows = filteredRows
      .map((row) => {
        const fullName = `${String(row?.nombre || "").trim()} ${String(row?.apellido || "").trim()}`.trim();
        const origin = row?.declinacion_servicio_origen === "seller" ? "Cliente" : "Encargado/Admin";
        const branches = Array.isArray(row?.pago_sucursales)
          ? row.pago_sucursales
              .map((branch: any) => String(branch?.sucursalName || "").trim())
              .filter(Boolean)
              .join(", ")
          : "";

        return `
          <tr>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(row?.telefono)}</td>
            <td>${escapeHtml(row?.mail)}</td>
            <td>${escapeHtml(origin)}</td>
            <td>${escapeHtml(buildReasonLabel(row))}</td>
            <td>${escapeHtml(buildReturnLabel(row))}</td>
            <td>${escapeHtml(branches || "-")}</td>
            <td>${escapeHtml(row?.declinacion_servicio_fecha ? dayjs(row.declinacion_servicio_fecha).format("DD/MM/YYYY HH:mm") : "-")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <xml>
            <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Declinaciones</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
          </xml>
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Origen</th>
                <th>Motivo principal</th>
                <th>Retorno en 6 meses</th>
                <th>Sucursales</th>
                <th>Fecha declinacion</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `respuestas_declinacion_${dayjs().format("YYYYMMDD_HHmmss")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: "Vendedor",
      key: "seller",
      render: (_: unknown, row: DeclineRow) => (
        <div>
          <div style={{ fontWeight: 700, color: "#111827" }}>
            {String(row?.nombre || "").trim()} {String(row?.apellido || "").trim()}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{row?.mail || "-"}</div>
        </div>
      ),
    },
    {
      title: "Telefono",
      dataIndex: "telefono",
      key: "telefono",
    },
    {
      title: "Origen",
      key: "origen",
      render: (_: unknown, row: DeclineRow) => (
        <Tag color={row?.declinacion_servicio_origen === "seller" ? "blue" : "orange"}>
          {row?.declinacion_servicio_origen === "seller" ? "Cliente" : "Encargado/Admin"}
        </Tag>
      ),
    },
    {
      title: "Motivo principal",
      key: "motivo",
      render: (_: unknown, row: DeclineRow) => {
        return <div style={{ maxWidth: 280, whiteSpace: "normal", color: "#374151" }}>{buildReasonLabel(row)}</div>;
      },
    },
    {
      title: "Retorno en 6 meses",
      key: "retorno",
      render: (_: unknown, row: DeclineRow) => {
        return <Tag color="purple">{buildReturnLabel(row)}</Tag>;
      },
    },
    {
      title: "Fecha declinación",
      key: "fecha",
      render: (_: unknown, row: DeclineRow) => (
        <div style={{ color: "#374151" }}>
          {row?.declinacion_servicio_fecha
            ? dayjs(row.declinacion_servicio_fecha).format("DD/MM/YYYY HH:mm")
            : "-"}
        </div>
      ),
    },
  ];

  const totalCount = rows.length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1200}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Respuestas de declinación</span>
          <Badge count={totalCount} style={{ backgroundColor: "#f97316" }} />
        </div>
      }
      destroyOnClose
    >
      <div
        style={{
          marginBottom: 18,
          padding: 18,
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(13,102,160,0.08) 0%, rgba(249,115,22,0.08) 100%)",
          border: "1px solid rgba(148,163,184,0.22)",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nombre, apellido, telefono o texto libre..."
            style={{ flex: "1 1 320px", minWidth: 280, height: 42 }}
          />
          <Select
            value={originFilter}
            onChange={setOriginFilter}
            style={{ width: 200 }}
            options={[
              { label: "Todos los orígenes", value: "todos" },
              { label: "Cliente", value: "seller" },
              { label: "Encargado/Admin", value: "admin" },
            ]}
          />
          <Select
            value={reasonFilter}
            onChange={setReasonFilter}
            style={{ width: 260 }}
            options={reasonOptions}
          />
          <Select
            value={returnFilter}
            onChange={setReturnFilter}
            style={{ width: 220 }}
            options={[
              { label: "Todas las respuestas", value: "todos" },
              { label: "Muy probable", value: "muy_probable" },
              { label: "Probable", value: "probable" },
              { label: "No está seguro", value: "no_estoy_seguro" },
              { label: "Poco probable", value: "poco_probable" },
              { label: "Nunca", value: "nunca" },
            ]}
          />
          <Select
            value={branchFilter}
            onChange={setBranchFilter}
            style={{ width: 220 }}
            options={branchOptions}
          />
          <RangePicker
            value={dateRange}
            onChange={(value) => setDateRange((value as [Dayjs | null, Dayjs | null]) || null)}
            format="DD/MM/YYYY"
          />
          <Button icon={<DownloadOutlined />} onClick={exportToExcel}>
            Descargar Excel
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void loadRows()} loading={loading}>
            Recargar
          </Button>
        </div>
      </div>

      <Table
        rowKey={(row: DeclineRow) => row.key}
        loading={loading}
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: "max-content" }}
      />
    </Modal>
  );
}
