import { useEffect } from 'react';
import useEditableTable from '../../../hooks/useEditableTable';
import EntryProductSellerTable from './EntryProductSellerTable';

interface Props {
  initialEntries: any[];
  onEntriesChange: (data: any[]) => void;
  onDeletedEntriesChange: (deleted: any[]) => void;
  isSeller: boolean;
}

const EntryHistorySection: React.FC<Props> = ({
  initialEntries,
  onEntriesChange,
  onDeletedEntriesChange,
  isSeller,
}) => {
  const [
    entryData,
    setEntryData,
    handleValueChange,
  ] = useEditableTable(initialEntries);

  const handleDelete = (key: any) => {
    setEntryData(prev => {
      const updated = prev.filter(p => p.key !== key);
      const deleted = prev.find(p => p.key === key);
      if (deleted?.id_ingreso) {
        onDeletedEntriesChange(d => [
          ...d,
          { id_ingreso: deleted.id_ingreso, id_producto: deleted.id_producto },
        ]);
      }
      return updated;
    });
  };

  useEffect(() => { onEntriesChange(entryData); }, [entryData]);

  return (
    <section className="mb-4 overflow-x-auto">
      <h4 className="font-bold text-mobile-sm xl:text-desktop-sm">
        Historial de ingreso
      </h4>
      <EntryProductSellerTable
        data={entryData}
        handleValueChange={handleValueChange}
        onDeleteProduct={(k) => handleDelete(k)}
        isAdmin={!isSeller}
      />
    </section>
  );
};

export default EntryHistorySection;
