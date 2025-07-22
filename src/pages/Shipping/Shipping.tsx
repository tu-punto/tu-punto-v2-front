import { useState } from "react";
import ShippingTable from "./ShippingTable";

const Shipping = () => {
    const [refreshKey, setRefreshKey] = useState(0)

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

            <ShippingTable refreshKey={refreshKey} />
        </div>
    );
};

export default Shipping;
