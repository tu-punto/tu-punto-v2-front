import { useContext, useEffect, useState } from "react";
import { Button, Table, Tooltip } from "antd";
import { IBranch } from "../../models/branchModel";
import { EditOutlined, MessageFilled } from "@ant-design/icons";
import { UserContext } from "../../context/userContext";
import { getSellerAPI } from "../../api/seller";

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
  const [filteredBranches, setFilteredBranches] = useState<IBranch[]>(branches);

  const handleChatBranch = (branch: IBranch) => {
    const phoneNumber = branch.telefono;
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  useEffect(() => {
    if (user.role == "admin") {
      setFilteredBranches(branches);
    } else if (user.role == "seller") {
      filterSellerBranchs();
    }
  },[branches]);

  const filterSellerBranchs = async () => {
    const sellerData = await getSellerAPI(user.id_vendedor);
    const branchData = sellerData.pago_sucursales;
    const activeBranchIDs: Set<number> = new Set();
    const sellerFinalDate = new Date(sellerData.fecha_vigencia);
    branchData.forEach((branch) => {
      if(isActiveSellerBranch(branch, sellerFinalDate)) {
        activeBranchIDs.add(branch.id_sucursal);
      }
    });

    const filteredBranches: IBranch[] = [];
    branches.forEach((branch: IBranch) => {
      if(activeBranchIDs.has(branch._id)) {
        filteredBranches.push(branch);
      }
    })
    setFilteredBranches(filteredBranches);
  }

  const isActiveSellerBranch = (branch: any, finalDate: Date) => {
    const actualDate = new Date();
    let branchFinalDate: Date;
    if (branch.fecha_salida) {
      branchFinalDate = new Date(branch.fecha_salida);
    } else {
      branchFinalDate = finalDate;
    }
    return branchFinalDate > actualDate
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
                onClick={() => handleChatBranch(branch)}
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
      dataSource={filteredBranches}
      pagination={{ pageSize: 10 }}
      scroll={{ x: "max-content" }}
    />
  );
};

export default BranchTable;
