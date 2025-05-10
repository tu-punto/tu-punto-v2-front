import { useEffect } from 'react';
import useEditableTable from '../../../hooks/useEditableTable';
import SalesTable from './SalesTable';

interface Props {
  initialSales: any[];
  onSalesChange: (data: any[]) => void;
  onDeletedSalesChange: (deleted: any[]) => void;
  onUpdateNoPagadasTotal: (total: number) => void;
  onUpdateHistorialTotal: (total: number) => void;
  isSeller: boolean;
}

const SalesSection: React.FC<Props> = ({
  initialSales,
  onSalesChange,
  onDeletedSalesChange,
  onUpdateNoPagadasTotal,
  onUpdateHistorialTotal,
  isSeller,
}) => {
  const [
    salesData,
    setSalesData,
    handleValueChange,
  ] = useEditableTable(initialSales);

  /* ─────────── deletions locales ─────────── */
  const handleDelete = (key: any) => {
    setSalesData(prev => {
      const updated = prev.filter(p => p.key !== key);
      const deleted = prev.find(p => p.key === key);
      if (deleted?.id_venta) {
        onDeletedSalesChange(d => [
          ...d,
          { id_venta: deleted.id_venta, id_producto: deleted.id_producto },
        ]);
      }
      return updated;
    });
  };

  /* ──────── sincronizar con el padre ──────── */
  useEffect(() => { onSalesChange(salesData); }, [salesData]);

  /* ─────────── filtrados ─────────── */
  const ventasNoPagadas = salesData.filter(p => !p.deposito_realizado);

  return (
    <>
      {/* Ventas no pagadas */}
      <section className="mb-4 overflow-x-auto">
        <h4 className="font-bold text-mobile-sm xl:text-desktop-sm">
          Ventas no pagadas
        </h4>
        <SalesTable
          data={ventasNoPagadas}
          onUpdateTotalAmount={onUpdateNoPagadasTotal}
          onDeleteProduct={handleDelete}
          handleValueChange={handleValueChange}
          showClient
          isAdmin={!isSeller}
        />
      </section>

      {/* Historial de ventas */}
      <section className="mb-4 overflow-x-auto">
        <h4 className="font-bold text-mobile-sm xl:text-desktop-sm">
          Historial de ventas
        </h4>
        <SalesTable
          data={salesData}
          onUpdateTotalAmount={onUpdateHistorialTotal}
          onDeleteProduct={handleDelete}
          handleValueChange={handleValueChange}
          showClient={false}
          isAdmin={!isSeller}
        />
      </section>
    </>
  );
};

export default SalesSection;
