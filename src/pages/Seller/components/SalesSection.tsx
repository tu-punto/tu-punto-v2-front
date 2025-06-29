import { useEffect } from "react";
import useEditableTable from "../../../hooks/useEditableTable";
import SalesTable from "./SalesTable";

interface Props {
  initialSales: any[];
  onSalesChange: (data: any[]) => void;
  onDeletedSalesChange: (deleted: any[]) => void;
  onUpdateNoPagadasTotal: (total: number) => void;
  onUpdateHistorialTotal: (total: number) => void;
  onUpdateOneSale: (id: string, fields: any) => void;
  onDeleteOneSale: (id: string) => void;
  isSeller: boolean;
}

const SalesSection: React.FC<Props> = ({
  initialSales,
  onSalesChange,
  onDeletedSalesChange,
  onUpdateNoPagadasTotal,
  onUpdateHistorialTotal,
  onUpdateOneSale,
  onDeleteOneSale,
  isSeller,
}) => {
  // 1) Asignamos key = id_venta a cada objeto
  const salesConKey = initialSales.map((sale) => ({
    ...sale,
    key: sale.id_venta, // aquí defines el valor de "key"
  }));

  // 2) Pasamos ese array al hook
  const [salesData, setSalesData, handleValueChange] =
    useEditableTable(salesConKey);

  const handleDelete = (key: any) => {
    setSalesData((prev) => {
      const updated = prev.filter((p) => p.key !== key);
      const deleted = prev.find((p) => p.key === key);
      if (deleted?.id_venta) {
        onDeletedSalesChange((d) => [
          ...d,
          { id_venta: deleted.id_venta, id_producto: deleted.id_producto },
        ]);
      }
      return updated;
    });
  };

  useEffect(() => {
    onSalesChange(salesData);
  }, [salesData]);

  // const sucursalId = localStorage.getItem("sucursalId");
  const ventasNoPagadas = salesData.filter((s) => !s.deposito_realizado);

  return (
    <>
      <section className="mb-4 overflow-x-auto">
        <h4 className="font-bold text-mobile-sm xl:text-desktop-sm">
          Ventas no pagadas
        </h4>
        <SalesTable
          data={ventasNoPagadas}
          onUpdateTotalAmount={onUpdateNoPagadasTotal}
          onDeleteProduct={(key, id) => {
            onDeleteOneSale(id);
            handleDelete(key);
          }}
          onUpdateProduct={(id, fields) => {
            onUpdateOneSale(id, fields);
          }}
          handleValueChange={handleValueChange}
          isAdmin={!isSeller}
          showClient
          allowActions
        />
      </section>

      <section className="mb-4 overflow-x-auto">
        <h4 className="font-bold text-mobile-sm xl:text-desktop-sm">
          Historial de ventas
        </h4>
        <SalesTable
          data={salesData}
          onUpdateTotalAmount={onUpdateHistorialTotal}
          onDeleteProduct={() => {}}
          onUpdateProduct={() => {}}
          handleValueChange={() => {}}
          isAdmin={!isSeller}
          showClient
        />
      </section>
    </>
  );
};

export default SalesSection;
