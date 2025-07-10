import { useEffect, useState } from "react";
import { Button, Row, Col, Typography, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import UsersTable from "./UsersTable";
import UserFormModal from "./UserFormModal";
import { useUserStore } from "../../stores/userStore";

const { Title } = Typography;

const UsersPage = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const createUser = useUserStore((state) => state.createUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const fetchUsers = useUserStore((state) => state.fetchUsers);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    if (editingUser) {
      return await updateUser(editingUser._id, values);
    } else {
      return await createUser(values);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setIsModalVisible(true);
  };

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Card style={{ padding: "12px 24px" }}>
            <Title level={2} style={{ margin: 0, color: "#1f2937" }}>
              Gestión de Usuarios
            </Title>
          </Card>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewUser}
            size="large"
          >
            Nuevo Usuario
          </Button>
        </Col>
      </Row>

      <UsersTable onEdit={handleEdit} />

      <UserFormModal
        visible={isModalVisible}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        editingUser={editingUser}
      />
    </>
  );
};

export default UsersPage;
