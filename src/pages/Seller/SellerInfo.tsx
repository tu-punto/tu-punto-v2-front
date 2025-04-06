import { useContext, useEffect, useState } from "react";
import { getSellerAPI } from "../../api/seller"; 
import SellerInfoPage from "./components/SellerInfoBase";
import { UserContext } from "../../context/userContext";

const SellerInfoPageWrapper = () => {
    const { user } = useContext(UserContext);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true); 

    useEffect(() => {
        const fetchSeller = async () => {
            try {
                const sellerData = await getSellerAPI(user.id);
                const finish_date = new Date(sellerData.fecha_vigencia);
                const date = new Date(sellerData.fecha);
                const sellerWithKey = {
                    key: sellerData.id_vendedor.toString(),
                    nombre: `${sellerData.nombre} ${sellerData.apellido}`,
                    deuda: `Bs. ${sellerData.deuda}`,
                    deudaInt: sellerData.deuda,
                    pagoTotalInt: sellerData.deuda - sellerData.adelanto_servicio,
                    fecha_vigencia: finish_date.toLocaleDateString("es-ES"),
                    fecha: date.toLocaleDateString("es-ES"),
                    pago_mensual: `Bs. ${sellerData.alquiler + sellerData.exhibicion + sellerData.delivery}`,
                    alquiler: sellerData.alquiler,
                    exhibicion: sellerData.exhibicion,
                    delivery: sellerData.delivery,
                    comision_porcentual: `${sellerData.comision_porcentual}%`,
                    comision_fija: `Bs. ${sellerData.comision_fija}`,
                    telefono: sellerData.telefono,
                    mail: sellerData.mail,
                    carnet: sellerData.carnet,
                    adelanto_servicio: sellerData.adelanto_servicio,
                    marca: sellerData.marca,
                };
                setSeller(sellerWithKey);
            } catch (error) {
                console.error("Error al obtener la información del vendedor:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSeller();
    }, [user.id]);

    if (loading) {
        return <div className="text-mobile-sm xl:text-desktop-sm">Cargando...</div>; 
    }

    if (!seller) {
        return <div className="text-mobile-sm xl:text-desktop-sm">No se encontró información del vendedor.</div>; 
    }

    return (
        <SellerInfoPage 
            isModal={false} 
            seller={seller} 
            onSuccess={() => {}} 
        />
    );
};

export default SellerInfoPageWrapper;
