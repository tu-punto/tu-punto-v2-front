import SalesHistoryTable from "./SalesHistoryTable";
import PageTemplate from "../../components/PageTemplate";

const SalesHistoryPage = () => {
    return (
        <PageTemplate
            title="Historial de Ventas"
            iconSrc="/historialVentas.png"
        >
            <SalesHistoryTable />
        </PageTemplate>
    );
};

export default SalesHistoryPage;
