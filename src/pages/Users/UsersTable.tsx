import { Button, Table, Space, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect } from "react";
import { useUserStore } from "../../stores/userStore";

interface UsersTableProps {
  onEdit: (user: any) => void;
}

const UsersTable = ({ onEdit }: UsersTableProps) => {
  const users = useUserStore((state) => state.users);
  const loading = useUserStore((state) => state.loading);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const deleteUser = useUserStore((state) => state.deleteUser);

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, []);

  const handleDelete = async (id: string) => {
    await deleteUser(id);
  };

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
    <Table
      columns={columns}
      dataSource={users}
      loading={loading}
      rowKey="_id"
      pagination={{ pageSize: 10 }}
      scroll={{ x: "max-content" }}
    />
  );
};

export default UsersTable;
