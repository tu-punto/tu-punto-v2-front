import { useState, useContext } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { Switch } from 'antd';
import ShippingTable from "./ShippingTable";
import ExternalSalesTable from "./ExternalSalesTable.tsx";
import PageTemplate from "../../components/PageTemplate";

const Shipping = () => {
    const [refreshKey, setRefreshKey] = useState(0)
    const [isExternalSalesMode, setIsExternalSalesMode] = useState(false);

    const { user }: any = useContext(UserContext);
    const isAdmin = user?.role?.toLowerCase() === 'admin';
    const isOperator = user?.role.toLowerCase() === 'operator';

    return (
        <PageTemplate
            title="Pedidos"
            iconSrc="/box-icon.png"
        >
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
        </PageTemplate>
    );
};

export default Shipping;
