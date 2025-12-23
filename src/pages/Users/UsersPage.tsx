import { useEffect, useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import UsersTable from "./UsersTable";
import UserFormModal from "./UserFormModal";
import { useUserStore } from "../../stores/userStore";
import PageTemplate, { FunctionButtonProps } from "../../components/PageTemplate";

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

  const actions: FunctionButtonProps[] = [
    {
      visible: true,
      title: "Nuevo Usuario",
      onClick: handleNewUser
    }
  ];

  return (
    <PageTemplate
      title="Gestión de Usuarios"
      actions={actions}
    >
      <UsersTable onEdit={handleEdit} />

      <UserFormModal
        visible={isModalVisible}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        editingUser={editingUser}
      />
    </PageTemplate>
  );
};

export default UsersPage;
