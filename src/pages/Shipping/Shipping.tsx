import { useState, useContext } from "react";
import { UserContext } from "../../context/userContext.tsx";
import { Button, Tooltip } from "antd";
import { SettingOutlined } from "@ant-design/icons";

import ShippingTable from "./ShippingTable";
import ShippingQRScannerModal from "./ShippingQRScannerModal.tsx";
import PackageEscalationControlModal from "./PackageEscalationControlModal";
import "./ShippingTable.css";
import { isSuperadminUser } from "../../utils/role";


const Shipping = () => {
	const refreshKey = 0;
	const [isQRModalOpen, setIsQRModalOpen] = useState(false);
	const [isEscalationControlVisible, setIsEscalationControlVisible] = useState(false);

	const { user }: any = useContext(UserContext);
	const canScanOrders =
		user?.role?.toLowerCase() === 'admin' ||
		user?.role?.toLowerCase() === 'operator' ||
		user?.role?.toLowerCase() === 'seller';


	return (
		<div className="shipping-page p-4">
			<div className="shipping-page-header flex justify-between items-center mb-4">
				<div className="shipping-page-title flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
					<img src="/box-icon.png" alt="Pedidos" className="w-8 h-8" />
					<h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">
						Pedidos
					</h1>
				</div>
				{isSuperadminUser(user) && (
					<Tooltip title="Control de Escalonamiento">
						<Button
							type="default"
							icon={<SettingOutlined />}
							onClick={() => setIsEscalationControlVisible(true)}
							style={{ height: 42, borderRadius: 10, fontWeight: 700 }}
						>
							Escalonamiento
						</Button>
					</Tooltip>
				)}
			</div>

			<ShippingTable
				refreshKey={refreshKey}
				onOpenQR={canScanOrders ? () => setIsQRModalOpen(true) : undefined}
			/>
			<ShippingQRScannerModal
				open={isQRModalOpen}
				onClose={() => setIsQRModalOpen(false)}
			/>
			<PackageEscalationControlModal
				visible={isEscalationControlVisible}
				onClose={() => setIsEscalationControlVisible(false)}
			/>
		</div >
	);
};

export default Shipping;
