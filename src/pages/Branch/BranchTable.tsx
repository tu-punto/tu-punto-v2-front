import { useContext, useEffect, useState } from "react";
import { Button, Modal, Table, Tooltip } from "antd";
import { IBranch } from "../../models/branchModel";
import { EditOutlined, WhatsAppOutlined, FileDoneOutlined  } from "@ant-design/icons";
import { UserContext } from "../../context/userContext";
import { getSellerAPI } from "../../api/seller";
import ShippingGuideTable from "../ShippingGuide/ShippingGuideTable";

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
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isOperator = user?.role.toLowerCase() === 'operator';
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<IBranch>();
  const [filteredBranches, setFilteredBranches] = useState<IBranch[]>(branches);
  const [tableColumns, setTableColumns] = useState<any>([]);

  const handleChatBranch = (branch: IBranch) => {
    const phoneNumber = branch.telefono;
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  useEffect(() => {
    if (isAdmin || isOperator) {
      setFilteredBranches(branches);
    } else if (user.role == "seller") {
      filterSellerBranchs();
    }
  }, [branches]);

  const filterSellerBranchs = async () => {
    const sellerData = await getSellerAPI(user.id_vendedor);
    const branchData = sellerData.pago_sucursales;
    const activeBranchIDs: Set<number> = new Set();
    const sellerFinalDate = new Date(sellerData.fecha_vigencia);
    branchData.forEach((branch) => {
      if (isActiveSellerBranch(branch, sellerFinalDate)) {
        activeBranchIDs.add(branch.id_sucursal);
      }
    });

    const filteredBranches: IBranch[] = [];
    branches.forEach((branch: IBranch) => {
      if (activeBranchIDs.has(branch._id)) {
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
    }else if (user.role == "seller") {
      setTableColumns([...cols, ...sellerCols])
    }else {
      setTableColumns(cols)
    }
  },[user]);


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
              icon={<FileDoneOutlined  />}
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
