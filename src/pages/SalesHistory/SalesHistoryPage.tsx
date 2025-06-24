import SalesHistoryTable from "./SalesHistoryTable";

const SalesHistoryPage = () => {
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img
                        src="/historialVentas.png"
                        alt="Historial de Ventas"
                        className="w-8 h-8"
                    />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Historial de Ventas
                    </h1>
                </div>
            </div>

            <SalesHistoryTable />
        </>
    );
};

export default SalesHistoryPage;
