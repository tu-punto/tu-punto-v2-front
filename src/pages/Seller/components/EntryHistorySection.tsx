import useEditableTable from '../../../hooks/useEditableTable';
import EntryProductSellerTable from './EntryProductSellerTable';

interface Props {
  initialEntries: any[];
}

const EntryHistorySection: React.FC<Props> = ({
  initialEntries,
}) => {
  const [
    entryData,
  ] = useEditableTable(initialEntries);



  return (
    <section className="mb-4 overflow-x-auto">
      <h4 className="font-bold text-mobile-sm xl:text-desktop-sm">
        Historial de ingreso
      </h4>
      <EntryProductSellerTable
        data={entryData}
      />
    </section>
  );
};

export default EntryHistorySection;
