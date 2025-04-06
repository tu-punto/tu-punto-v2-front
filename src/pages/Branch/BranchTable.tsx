import { Button, Table, Tooltip } from "antd";
import { IBranch } from "../../models/branchModel";
import { EditOutlined } from "@ant-design/icons";

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
      render: (_: any, branch: IBranch) => (
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
      ),
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
