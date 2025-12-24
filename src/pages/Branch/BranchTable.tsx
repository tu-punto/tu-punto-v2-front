import { useContext, useEffect, useState } from "react";
import { Button, Modal, Table, Tooltip } from "antd";
import { EditOutlined, WhatsAppOutlined, FileDoneOutlined } from "@ant-design/icons";
import ShippingGuideTable from "../ShippingGuide/ShippingGuideTable";
import { getSellerAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";
import { IBranch } from "../../models/branchModel";
import { useUserRole } from "../../hooks/useUserRole";
import { openChat } from "../../utils/whatsAppUtils";

interface BranchTableProps {
  refreshKey: number;
  branches: IBranch[];
  showEditModal: (branch: IBranch) => void;
}

const BranchTable = ({ refreshKey, branches, showEditModal }: BranchTableProps) => {
  const { user } = useContext(UserContext);
  const { isAdmin, isOperator, isSeller } = useUserRole();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<IBranch>();
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

    branchData.forEach((branch : Partial<IBranch>) => {
      if (isActiveSellerBranch(branch, sellerFinalDate) && branch.id_sucursal) {
        activeBranchIDs.add(branch.id_sucursal+'');
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
          <Tooltip title="Mostrar Guías de Envío">
            <Button
              type="default"
              onClick={() => {
                setSelectedBranch(branch);
                setShowGuideModal(true);
              }}
              icon={<FileDoneOutlined />}
              className="text-mobile-sm xl:text-desktop-sm"
            />
          </Tooltip>
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
        <Tooltip title="Escribir por WhatsApp">
          <Button
            type="default"
            onClick={() => handleChatBranch(branch)}
            icon={<WhatsAppOutlined />}
            style={{
              backgroundColor: '#25D366',
              color: 'white'
            }}
          />
        </Tooltip>
      )
    }
  ];

  const handleChatBranch = (branch: IBranch) => {
    const phoneNumber = branch.telefono;
    openChat(phoneNumber)
  }

  return (
    <>
      <Table
        key={refreshKey}
        columns={tableColumns}
        dataSource={filteredBranches}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />
      {showGuideModal && (
        <Modal
          title='Guías de Envío'
          footer={false}
          open={showGuideModal}
          width={1000}
          onCancel={() => {
            setShowGuideModal(false);
          }}>
          <ShippingGuideTable
            refreshKey={refreshKey}
            user={user}
            isFilterByBranch
            search_id={selectedBranch?._id || ""}
          />
        </Modal>
      )}
    </>
  );
};

export default BranchTable;
