import { Card, Empty, Select, Space, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { getSellersBasicAPI } from "../../api/seller";

type BranchSeller = {
  _id: string;
  nombre: string;
  apellido: string;
  fecha_vigencia: string | Date;
  pago_sucursales?: Array<{
    id_sucursal: string;
    sucursalName?: string;
    comentario?: string;
    activo?: boolean;
    fecha_ingreso?: string | Date;
    fecha_salida?: string | Date;
  }>;
};

const getBranchPayment = (seller: BranchSeller, branchId?: string) => {
  if (!branchId) return null;
  return (seller.pago_sucursales || []).find((payment) => {
    const paymentBranchId = String((payment as any)?.id_sucursal?._id || payment?.id_sucursal || "");
    return paymentBranchId === String(branchId);
  }) || null;
};

export default function BranchSellerInfoPanel({
  branchId,
  branchName,
}: {
  branchId?: string;
  branchName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<BranchSeller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | undefined>();

  useEffect(() => {
    const fetchSellers = async () => {
      if (!branchId) {
        setSellers([]);
        return;
      }

      setLoading(true);
      try {
        const response = await getSellersBasicAPI({ sucursalId: branchId, onlyActiveOrRenewal: true });
        const rows = Array.isArray(response) ? response : [];
        const activeRows = rows.filter((seller: BranchSeller) => {
          const payment = getBranchPayment(seller, branchId);
          return payment?.activo !== false;
        });
        setSellers(activeRows);
        setSelectedSellerId((current) => current && activeRows.some((seller) => seller._id === current) ? current : activeRows[0]?._id);
      } catch (error) {
        setSellers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, [branchId]);

  const selectedSeller = useMemo(
    () => sellers.find((seller) => seller._id === selectedSellerId) || null,
    [sellers, selectedSellerId]
  );

  const currentPayment = selectedSeller ? getBranchPayment(selectedSeller, branchId) : null;

  if (!branchId) {
    return null;
  }

  return (
    <Card title={`Vendedores de ${branchName || "tu sucursal"}`} className="mt-6 shadow-sm">
      <Space direction="vertical" size="middle" className="w-full">
        <Typography.Text type="secondary">
          Solo se muestran vendedores activos o por renovar con la sucursal activa.
        </Typography.Text>

        <Select
          showSearch
          allowClear
          placeholder="Busca un vendedor"
          loading={loading}
          value={selectedSellerId}
          onChange={setSelectedSellerId}
          options={sellers.map((seller) => ({
            value: seller._id,
            label: `${seller.nombre} ${seller.apellido}`,
          }))}
          filterOption={(input, option: any) => String(option?.label || "").toLowerCase().includes(input.toLowerCase())}
        />

        {!selectedSeller ? (
          <Empty description="Selecciona un vendedor para ver su comentario y vigencia" />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Typography.Title level={5} style={{ margin: 0 }}>
                {selectedSeller.nombre} {selectedSeller.apellido}
              </Typography.Title>
              <Tag color={currentPayment?.activo === false ? "red" : "green"}>
                {currentPayment?.activo === false ? "Inactivo" : "Activo"}
              </Tag>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              <strong>Comentario:</strong> {currentPayment?.comentario || "Sin comentario"}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Vigencia:</strong>{" "}
              {selectedSeller.fecha_vigencia ? dayjs(selectedSeller.fecha_vigencia).format("DD/MM/YYYY") : "Sin fecha"}
            </p>
          </div>
        )}
      </Space>
    </Card>
  );
}
