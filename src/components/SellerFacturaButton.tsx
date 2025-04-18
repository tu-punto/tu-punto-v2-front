import { Link } from "react-router-dom";
import sellerIcon from "../assets/sellersIcon.svg";

const SellerFacturaButton = ({ isOpen }: { isOpen: boolean }) => {
    return (
        <Link
            to="/sellerFactura"
            className="flex items-center p-4 bg-blue hover:bg-light-blue/10 transition-colors duration-200"
            key="/sellerFactura"
        >
            <img src={sellerIcon} alt="Vendedores de Factura" className="w-6 h-6 mx-3" />
            {isOpen && (
                <span className="ml-2 text-mobile-sm xl:text-desktop-sm whitespace-normal break-words text-left">
          Vendedores de Factura
        </span>
            )}
        </Link>
    );
};

export default SellerFacturaButton;
