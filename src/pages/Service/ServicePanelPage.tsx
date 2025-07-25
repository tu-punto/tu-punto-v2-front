export const ServicePanelPage: React.FC<{ isFactura: boolean }> = () => {

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
        <img src="/config-icon.png" alt="Vendedores" className="w-8 h-8" />
        <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
          PANEL DE CONTROL DE SERVICIOS
        </h1>
      </div>

    </div>
  );
};

export default ServicePanelPage;
