import { Button, Table, Space, Popconfirm, Tag, Input, Select } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "../../stores/userStore";
import { includesNormalized } from "../../utils/search";

interface UsersTableProps {
  onEdit: (user: any) => void;
}

const UsersTable = ({ onEdit }: UsersTableProps) => {
  const users = useUserStore((state) => state.users);
  const loading = useUserStore((state) => state.loading);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const deleteUser = useUserStore((state) => state.deleteUser);
  const [emailSearch, setEmailSearch] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [branchFilters, setBranchFilters] = useState<string[]>([]);

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, []);

  const handleDelete = async (id: string) => {
    await deleteUser(id);
  };

  const roleOptions = useMemo(
    () => Array.from(new Set(users.map((user: any) => String(user?.role || "").trim()).filter(Boolean))).sort().map((role) => ({
      label: role,
      value: role,
    })),
    [users]
  );

  const branchOptions = useMemo(() => {
    const labels = new Set<string>();
    users.forEach((user: any) => {
      const branchLabel = user?.role === "admin" || user?.is_superadmin
        ? "Todas"
        : user?.role === "seller"
          ? "-"
          : String(user?.sucursal?.nombre || "Sin asignar").trim();
      if (branchLabel) labels.add(branchLabel);
    });

    return Array.from(labels).sort().map((label) => ({ label, value: label }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = emailSearch.trim();
    return users.filter((user: any) => {
      if (normalizedSearch && !includesNormalized(user?.email || "", normalizedSearch)) return false;
      if (roleFilters.length > 0 && !roleFilters.includes(String(user?.role || ""))) return false;

      if (branchFilters.length > 0) {
        const branchLabel = user?.role === "admin" || user?.is_superadmin
          ? "Todas"
          : user?.role === "seller"
            ? "-"
            : String(user?.sucursal?.nombre || "Sin asignar").trim();
        if (!branchFilters.includes(branchLabel)) return false;
      }

      return true;
    });
  }, [branchFilters, emailSearch, roleFilters, users]);

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 260,
      ellipsis: true,
    },
    {
      title: "Rol",
      dataIndex: "role",
      key: "role",
      width: 120,
    },
    {
      title: "Sucursal",
      key: "sucursal",
      width: 160,
      render: (_: any, record: any) => {
        if (record.role === "admin" || record.is_superadmin) return "Todas";
        if (record.role === "seller") return "-";
        return record.sucursal?.nombre || "Sin asignar";
      },
    },
    {
      title: "Contrasena",
      key: "passwordStatus",
      width: 160,
      render: (_: any, record: any) =>
        record.must_change_password === true ? (
          <Tag color="warning">Cambio pendiente</Tag>
        ) : (
          <Tag color="success">Actualizada</Tag>
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            size="small"
          />
          <Popconfirm
            title={
              <>
                <div>¿Estás seguro de eliminar este usuario?</div>
                <div
                  style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
                >
                  <strong>{record.email}</strong>
                </div>
              </>
            }
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDelete(record._id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okType="danger"
            placement="topRight"
          >
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space wrap className="mb-4" style={{ width: "100%" }}>
        <Input.Search
          allowClear
          placeholder="Buscar por email"
          value={emailSearch}
          onChange={(event) => setEmailSearch(event.target.value)}
          style={{ width: 260 }}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Filtrar por rol"
          value={roleFilters}
          onChange={setRoleFilters}
          options={roleOptions}
          style={{ minWidth: 220 }}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Filtrar por sucursal"
          value={branchFilters}
          onChange={setBranchFilters}
          options={branchOptions}
          style={{ minWidth: 240 }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />
    </>
  );
};

export default UsersTable;
