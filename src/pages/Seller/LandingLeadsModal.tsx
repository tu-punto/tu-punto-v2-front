import { Badge, Button, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import { MessageOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { getLandingLeadsAPI, updateLandingLeadContactStatusAPI } from "../../api/landingLeads";

type LandingLeadRow = {
  _id: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  email: string;
  productos: string;
  sucursales_interes: string[];
  pagina_origen: "inicio" | "vendedores";
  contactado: boolean;
  contactado_at?: string;
  createdAt: string;
};

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const normalizeWhatsappPhone = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("591")) return digits;
  return `591${digits}`;
};

export default function LandingLeadsModal({
  open,
  onClose,
  onCounterChange,
}: {
  open: boolean;
  onClose: () => void;
  onCounterChange?: (count: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [leads, setLeads] = useState<LandingLeadRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "nuevos" | "contactados">("nuevos");
  const [cityFilter, setCityFilter] = useState("todas");

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await getLandingLeadsAPI();
      const rows = Array.isArray(response?.leads) ? response.leads : [];
      setLeads(rows);
      onCounterChange?.(rows.filter((row: LandingLeadRow) => row?.contactado !== true).length);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadLeads();
  }, [open]);

  const cityOptions = useMemo(() => {
    const values = Array.from(
      new Set(leads.map((lead) => String(lead?.ciudad || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return [
      { label: "Todas las ciudades", value: "todas" },
      ...values.map((city) => ({ label: city, value: city })),
    ];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query = normalizeText(searchText);

    return leads.filter((lead) => {
      if (statusFilter === "nuevos" && lead.contactado) return false;
      if (statusFilter === "contactados" && !lead.contactado) return false;
      if (cityFilter !== "todas" && String(lead.ciudad || "").trim() !== cityFilter) return false;
      if (!query) return true;

      const haystack = `${lead.nombre} ${lead.telefono}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [cityFilter, leads, searchText, statusFilter]);

  const handleToggleContactStatus = async (lead: LandingLeadRow) => {
    setSavingId(String(lead._id || ""));
    try {
      const response = await updateLandingLeadContactStatusAPI(String(lead._id || ""), !lead.contactado);
      if (!response?.success) {
        message.error(response?.message || "No se pudo actualizar el lead");
        return;
      }
      const nextRows = leads.map((row) =>
        String(row._id) === String(lead._id)
          ? {
              ...row,
              contactado: !lead.contactado,
              contactado_at: !lead.contactado ? new Date().toISOString() : undefined,
            }
          : row
      );
      setLeads(nextRows);
      onCounterChange?.(nextRows.filter((row) => row.contactado !== true).length);
      message.success(!lead.contactado ? "Lead marcado como contactado" : "Lead marcado como pendiente");
    } catch (error) {
      console.error(error);
      message.error("No se pudo actualizar el lead");
    } finally {
      setSavingId("");
    }
  };

  const columns = [
    {
      title: "Lead",
      key: "lead",
      render: (_: unknown, row: LandingLeadRow) => (
        <div>
          <div style={{ fontWeight: 700, color: "#111827" }}>{row.nombre}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{row.email}</div>
        </div>
      ),
    },
    {
      title: "Telefono",
      dataIndex: "telefono",
      key: "telefono",
    },
    {
      title: "Ciudad",
      dataIndex: "ciudad",
      key: "ciudad",
    },
    {
      title: "Sucursales",
      key: "sucursales_interes",
      render: (_: unknown, row: LandingLeadRow) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(row.sucursales_interes || []).map((branch) => (
            <Tag key={branch} color="blue">
              {branch}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Productos",
      dataIndex: "productos",
      key: "productos",
      render: (value: string) => (
        <div style={{ maxWidth: 240, whiteSpace: "normal", color: "#374151" }}>{value}</div>
      ),
    },
    {
      title: "Origen",
      key: "pagina_origen",
      render: (_: unknown, row: LandingLeadRow) => (
        <Tag color={row.pagina_origen === "vendedores" ? "purple" : "gold"}>
          {row.pagina_origen === "vendedores" ? "Pagina vendedores" : "Pagina inicio"}
        </Tag>
      ),
    },
    {
      title: "Estado",
      key: "estado",
      render: (_: unknown, row: LandingLeadRow) => (
        <div>
          <Tag color={row.contactado ? "green" : "orange"}>
            {row.contactado ? "Contactado" : "Nuevo"}
          </Tag>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {dayjs(row.createdAt).format("DD/MM/YYYY HH:mm")}
          </div>
        </div>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: unknown, row: LandingLeadRow) => {
        const whatsappPhone = normalizeWhatsappPhone(row.telefono);
        const whatsappMessage = encodeURIComponent(
          `Hola ${row.nombre}, te contactamos de Tu Punto por la informacion que registraste.`
        );
        const whatsappHref = whatsappPhone
          ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`
          : "";

        return (
          <Space wrap>
            <Button
              type={row.contactado ? "default" : "primary"}
              loading={savingId === String(row._id)}
              onClick={() => void handleToggleContactStatus(row)}
            >
              {row.contactado ? "Pendiente" : "Contactado"}
            </Button>
            <Button
              icon={<MessageOutlined />}
              disabled={!whatsappHref}
              onClick={() => {
                if (!whatsappHref) return;
                window.open(whatsappHref, "_blank", "noopener,noreferrer");
              }}
            >
              WhatsApp
            </Button>
          </Space>
        );
      },
    },
  ];

  const newCount = leads.filter((row) => row.contactado !== true).length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1280}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Leads registrados</span>
          <Badge count={newCount} style={{ backgroundColor: "#f97316" }} />
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
            placeholder="Buscar por nombre o telefono..."
            style={{ flex: "1 1 320px", minWidth: 280, height: 42 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            options={[
              { label: "Solo nuevos", value: "nuevos" },
              { label: "Todos", value: "todos" },
              { label: "Contactados", value: "contactados" },
            ]}
          />
          <Select
            value={cityFilter}
            onChange={setCityFilter}
            style={{ width: 220 }}
            options={cityOptions}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void loadLeads()} loading={loading}>
            Recargar
          </Button>
        </div>
      </div>

      <Table
        rowKey={(row: LandingLeadRow) => row._id}
        loading={loading}
        columns={columns}
        dataSource={filteredLeads}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: "max-content" }}
        rowClassName={(row: LandingLeadRow) =>
          row.contactado ? "landing-lead-row landing-lead-row-contacted" : "landing-lead-row"
        }
      />
    </Modal>
  );
}
