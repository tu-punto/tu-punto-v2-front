import { useState, useContext } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { Switch } from 'antd';
import ShippingTable from "./ShippingTable";
import ExternalSalesTable from "./ExternalSalesTable.tsx";

const Shipping = () => {
    const [refreshKey, setRefreshKey] = useState(0)
    const [isExternalSalesMode, setIsExternalSalesMode] = useState(false);

    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isOperator = user?.role.toLowerCase() === 'operator';

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
                    <img src="/box-icon.png" alt="Pedidos" className="w-8 h-8" />
                    <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
                        Pedidos
                    </h1>
                </div>
            </div>

            {isAdmin || isOperator && (
                <div className="px-5 py-4">
                    <Switch
                        checked={isExternalSalesMode}
                        onChange={(checked: boolean) => { setIsExternalSalesMode(checked) }}
                        checkedChildren="Ventas externas" 
                        unCheckedChildren="Ventas internas"
                    />
                </div>
            )}
            {!isExternalSalesMode && (
                <ShippingTable refreshKey={refreshKey} />
            )}
            {isExternalSalesMode && (
                <ExternalSalesTable refreshKey={refreshKey} />
            )}

        </div>
    );
};

export default Shipping;
