import { useContext, useEffect, useState } from "react";
import { Table } from "antd";
import { EditOutlined, WhatsAppOutlined, FileDoneOutlined } from "@ant-design/icons";
import { getSellerAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";
import { useUserRole } from "../../hooks/useUserRole";
import { IBranch } from "../../models/branchModel";
import { openChat } from "../../utils/whatsAppUtils";
import TableActionButton from "../../components/TableActionButton";

interface BranchTableProps {
  refreshKey: number;
  branches: IBranch[];
  showEditModal: (branch: IBranch) => void;
  showGuideModal: (branch: IBranch) => void
}

const BranchTable = ({ refreshKey, branches, showEditModal, showGuideModal }: BranchTableProps) => {
  const { user } = useContext(UserContext);
  const { isAdmin, isOperator, isSeller } = useUserRole();
  const [filteredBranches, setFilteredBranches] = useState<IBranch[]>(branches);
  const [tableColumns, setTableColumns] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin || isOperator) {
      setFilteredBranches(branches);
    } else if (isSeller) {
      filterSellerBranchs();
    }
  }, [branches, isAdmin, isOperator, isSeller]);

  const filterSellerBranchs = async () => {
    const sellerData = await getSellerAPI(user.id_vendedor);
    const branchData = sellerData.pago_sucursales;
    const activeBranchIDs: Set<string> = new Set();
    const sellerFinalDate = new Date(sellerData.fecha_vigencia);

    branchData.forEach((branch: Partial<IBranch>) => {
      if (isActiveSellerBranch(branch, sellerFinalDate) && branch.id_sucursal) {
        activeBranchIDs.add(branch.id_sucursal + '');
      }
    });

    const filteredBranches: IBranch[] = [];
    branches.forEach((branch: IBranch) => {
      if (branch._id && activeBranchIDs.has(branch._id)) {
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

  useEffect(() => {
    if (isAdmin || isOperator) {
      setTableColumns([...cols, ...adminCols]);
    } else if (isSeller) {
      setTableColumns([...cols, ...sellerCols])
    } else {
      setTableColumns(cols)
    }
  }, [user, isAdmin, isOperator, isSeller]);

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
    }
  ];

  const adminCols = [
    {
      title: "Acciones",
      key: "actions",
      width: "10%",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (_: any, branch: IBranch) => (
        <>
          <TableActionButton
            title="Editar sucursal"
            onClick={(e) => {
              e.stopPropagation();
              showEditModal(branch);
            }}
            icon={<EditOutlined />}
          />
          <TableActionButton
            title="Ver Guías de Envío"
            onClick={() => { showGuideModal(branch) }}
            icon={<FileDoneOutlined />}
          />
        </>
      )
    }
  ];

  const sellerCols = [
    {
      title: "Contactar",
      key: "contact",
      width: "10%",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (_: any, branch: IBranch) => (
        <TableActionButton
          title="Escribir por WhatsApp"
          onClick={() => handleChatBranch(branch)}
          icon={<WhatsAppOutlined />}
          backgroundColor="#25D366"
          color="white"
        />
      )
    }
  ];

  const handleChatBranch = (branch: IBranch) => {
    const phoneNumber = branch.telefono;
    openChat(phoneNumber)
  }

  return (
    <Table
      key={refreshKey}
      columns={tableColumns}
      dataSource={filteredBranches}
      pagination={{ pageSize: 10 }}
      scroll={{ x: "max-content" }}
    />
  );
};

export default BranchTable;
