import { useContext } from "react";
import { Button, Table, Tooltip } from "antd";
import { IBranch } from "../../models/branchModel";
import { EditOutlined, MessageFilled } from "@ant-design/icons";
import { UserContext } from "../../context/userContext";

interface BranchTableProps {
  refreshKey: number;
  branches: IBranch[];
  showEditModal: (branch: IBranch) => void;
}

const BranchTable: React.FC<BranchTableProps> = ({
  refreshKey,
  branches,
  showEditModal,
}) => {
  const { user } = useContext(UserContext);

  const handleChatBranch = (branch: IBranch) => {
    const phoneNumber = branch.telefono;
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  const cols = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Dirección",
      dataIndex: "direccion",
      key: "direccion",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Ciudad",
      dataIndex: "ciudad",
      key: "ciudad",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Telefono",
      dataIndex: "telefono",
      key: "telefono",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Acciones",
      key: "actions",
      width: "10%",
      className: "text-mobile-sm flex xl:text-desktop-sm",
      render: (_: any, branch: IBranch) => {
        if (user.role == "admin") {
          return (
            <Tooltip title="Editar sucursal">
              <Button
                type="default"
                onClick={(e) => {
                  e.stopPropagation();
                  showEditModal(branch);
                }}
                icon={<EditOutlined />}
                className="text-mobile-sm xl:text-desktop-sm"
              />
            </Tooltip>
          )
        } else if (user.role == "seller") {
          return (
            <Tooltip title="Contactar sucursal">
              <Button
                type="default"
                onClick={()=>handleChatBranch(branch)}
                icon={<MessageFilled />}
                className="text-mobile-sm xl:text-desktop-sm"
              />
            </Tooltip>
          )
        }
      }
    },
  ];

  return (
    <Table
      key={refreshKey}
      columns={cols}
      dataSource={branches}
      pagination={{ pageSize: 10 }}
      scroll={{ x: "max-content" }}
    />
  );
};

export default BranchTable;
