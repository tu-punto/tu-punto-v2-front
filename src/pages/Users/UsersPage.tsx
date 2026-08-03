import { useContext, useEffect, useState } from "react";
import { Button, Row, Col, Typography, Card } from "antd";
import { HistoryOutlined, PlusOutlined } from "@ant-design/icons";
import UsersTable from "./UsersTable";
import UserFormModal from "./UserFormModal";
import { useUserStore } from "../../stores/userStore";
import { UserContext } from "../../context/userContext";
import { isSuperadminUser, normalizeRole } from "../../utils/role";
import { useNavigate } from "react-router-dom";
import "./UsersPage.css";

const { Title } = Typography;

const UsersPage = () => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const createUser = useUserStore((state) => state.createUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const { user } = useContext(UserContext)!;
  const canAssignRoles = isSuperadminUser(user);
  const canSeeAttendance = normalizeRole(user?.role) === "admin";

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
    <div className="users-page">
      <Row className="users-page-header" justify="space-between" align="middle">
        <Col className="users-page-title-col">
          <Card className="users-page-title-card">
            <Title level={2} className="users-page-title">
              Gestión de Usuarios
            </Title>
          </Card>
        </Col>
        <Col>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {canSeeAttendance && (
              <Button
                icon={<HistoryOutlined />}
                onClick={() => navigate("/attendance")}
                size="large"
              >
                Asistencia
              </Button>
            )}
            {canAssignRoles && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewUser}
              size="large"
            >
              Nuevo Usuario
            </Button>
            )}
          </div>
        </Col>
      </Row>

      <UsersTable onEdit={handleEdit} />

      <UserFormModal
        visible={isModalVisible}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        editingUser={editingUser}
        canAssignRoles={canAssignRoles}
      />
    </div>
  );
};

export default UsersPage;
