import { useState, useContext } from "react";
import { UserContext } from "../../context/userContext.tsx";

import ShippingTable from "./ShippingTable";
import ShippingQRScannerModal from "./ShippingQRScannerModal.tsx";
import PageTemplate from "../../components/PageTemplate";


const Shipping = () => {
	const refreshKey = 0;
	const [isQRModalOpen, setIsQRModalOpen] = useState(false);

	const { user }: any = useContext(UserContext);
	const canScanOrders = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'operator';


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

			<ShippingTable
				refreshKey={refreshKey}
				onOpenQR={canScanOrders ? () => setIsQRModalOpen(true) : undefined}
			/>
			<ShippingQRScannerModal
				open={isQRModalOpen}
				onClose={() => setIsQRModalOpen(false)}
			/>
		</div >
	);
};

export default Shipping;
