import { Button, Drawer, Table, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { getSellersAPI } from "../../api/seller";
import DebtModal from "./DebtModal";
import { EditOutlined } from "@ant-design/icons";
import PayDebtButton from "./components/PayDebtButton";
import { getSellerAdvancesById } from "../../helpers/sellerHelpers";
import SellerInfoModalTry from "./SellerInfoModal";
import { ISeller } from "../../models/sellerModels";

const SellerTable = ({ refreshKey, setRefreshKey, isFactura }: any) => {
  const [pendingPaymentData, setPendingPaymentData] = useState<ISeller[]>([]);
  const [onTimePaymentData, setOnTimePaymentData] = useState<ISeller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSellerModalVisible, setIsSellerModalVisible] = useState(false);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSucursalData, setSelectedSucursalData] = useState<any[]>([]);

  const columns = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      className: "text-mobile-sm xl:text-desktop-sm",
      fixed: "left" as const,
    },
    {
      title: "Pago total",
      dataIndex: "deuda",
      key: "deuda",
      className: "text-mobile-sm xl:text-desktop-sm",
      render: (_: any, record: any) => (
          <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                openSucursalDrawer(record);
              }}
          >
            {record.deuda}
          </Button>
      ),
    },
    {
      title: "Fecha Vigencia",
      dataIndex: "fecha_vigencia",
      key: "fecha_vigencia",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Pago Mensual",
      dataIndex: "pago_mensual",
      key: "pago_mensual",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Comisión Porcentual",
      dataIndex: "comision_porcentual",
      key: "comision_porcentual",
      className: "text-mobile-sm xl:text-desktop-sm",
    },
    {
      title: "Acciones",
      key: "actions",
      className: "text-mobile-sm flex xl:text-desktop-sm",
      render: (_: any, seller: any) => (
          <div className="flex items-center gap-2 justify-end">
            <PayDebtButton seller={seller} />
            <Tooltip title="Renovar vendedor">
              <Button
                  type="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    showModal(seller);
                  }}
                  icon={<EditOutlined />}
                  className="text-mobile-sm xl:text-desktop-sm"
              />
            </Tooltip>
          </div>
      ),
    },
  ];

  async function fetchSellers() {
    try {
      const response = await getSellersAPI();
      const sellersData = response.data || response;

      if (!Array.isArray(sellersData)) {
        console.error("Los datos de vendedores no son un array:", sellersData);
        return;
      }

      const formattedData = await Promise.all(
          sellersData.map(async (seller: any) => {
            const finish_date = new Date(seller.fecha_vigencia);
            const advances = await getSellerAdvancesById(seller.id_vendedor);
            const date = new Date(seller.fecha);
            return {
              key: seller.id_vendedor.toString(),
              nombre: `${seller.nombre} ${seller.apellido}`,
              deuda: `Bs. ${seller.deuda}`,
              deudaInt: seller.deuda,
              pagoTotalInt: seller.deuda - parseInt(advances),
              fecha_vigencia: finish_date.toLocaleDateString("es-ES"),
              fecha: date.toLocaleDateString("es-ES"),
              pago_mensual: `Bs. ${
                  seller.alquiler + seller.exhibicion + seller.delivery
              }`,
              alquiler: seller.alquiler,
              exhibicion: seller.exhibicion,
              delivery: seller.delivery,
              comision_porcentual: `${seller.comision_porcentual}%`,
              comision_fija: `Bs. ${seller.comision_fija}`,
              telefono: seller.telefono,
              mail: seller.mail,
              carnet: seller.carnet,
              adelanto_servicio: seller.adelanto_servicio,
              marca: seller.marca,
              emite_factura: seller.emite_factura,
            };
          })
      );

      const pendingPayments = formattedData.filter(
          (seller: any) => seller.pagoTotalInt > 0
      );
      const onTimePayments = formattedData.filter(
          (seller: any) => seller.pagoTotalInt === 0
      );

      setPendingPaymentData(pendingPayments);
      setOnTimePaymentData(onTimePayments);
    } catch (error) {
      console.error("Error al obtener los vendedores:", error);
    }
  }

  const showModal = (seller: any) => {
    setSelectedSeller(seller);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setIsSellerModalVisible(false);
    setDrawerVisible(false);
    setSelectedSeller(null);
  };

  const handleSuccess = () => {
    setIsModalVisible(false);
    setSelectedSeller(null);
    setRefreshKey((prev: number) => prev + 1);
  };

  const handleRowClick = (seller: any) => {
    setSelectedSeller(seller);
    setIsSellerModalVisible(true);
  };

  const openSucursalDrawer = (seller: any) => {
    setSelectedSeller(seller);
    // 🔥 Datos mock por sucursal
    const data = [
      { key: "1", sucursal: "Sucursal 1", monto: "Bs. 300" },
      { key: "2", sucursal: "Sucursal 2", monto: "Bs. 450" },
      { key: "3", sucursal: "Sucursal 3", monto: "Bs. 250" },
    ];
    setSelectedSucursalData(data);
    setDrawerVisible(true);
  };

  useEffect(() => {
    fetchSellers();
  }, [refreshKey]);

  const filteredSellers = (data: ISeller[]) => {
    return isFactura
        ? data.filter((seller) => seller.emite_factura)
        : data.filter((seller) => !seller.emite_factura);
  };

  return (
      <div>
        <Table
            columns={columns}
            dataSource={filteredSellers(pendingPaymentData)}
            scroll={{ x: "max-content" }}
            title={() => (
                <h2 className="text-2xl font-bold justify-center">
                  Pago pendiente Bs.
                  {filteredSellers(pendingPaymentData).reduce(
                      (acc: number, seller: any) => acc + seller.pagoTotalInt,
                      0
                  )}
                </h2>
            )}
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
            })}
        />

        <Table
            columns={columns}
            scroll={{ x: "max-content" }}
            dataSource={filteredSellers(onTimePaymentData)}
            title={() => <h2 className="text-2xl font-bold">Pago al día</h2>}
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
            })}
        />

        {/* Modal de renovación */}
        {selectedSeller && (
            <DebtModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
                seller={selectedSeller}
            />
        )}

        {/* Modal de info de vendedor */}
        {selectedSeller && (
            <SellerInfoModalTry
                visible={isSellerModalVisible && !isModalVisible}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
                seller={selectedSeller}
            />
        )}

        {/* Drawer para pagos por sucursal */}
        <Drawer
            title={`Detalle de pagos por sucursal - ${selectedSeller?.nombre}`}
            placement="right"
            width={400}
            onClose={handleCancel}
            open={drawerVisible}
        >
          <Table
              dataSource={selectedSucursalData}
              columns={[
                {
                  title: "Sucursal",
                  dataIndex: "sucursal",
                  key: "sucursal",
                },
                {
                  title: "Monto",
                  dataIndex: "monto",
                  key: "monto",
                },
              ]}
              pagination={false}
          />
        </Drawer>
      </div>
  );
};

export default SellerTable;
