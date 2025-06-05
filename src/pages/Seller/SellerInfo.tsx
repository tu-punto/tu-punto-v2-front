import { useContext, useEffect, useState } from "react";
import { getSellerAPI } from "../../api/seller";
import SellerInfoPage from "./components/SellerInfoBase";
import { UserContext } from "../../context/userContext";

const SellerInfoPageWrapper = () => {
    const { user } = useContext(UserContext);
    const [seller, setSeller] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeller = async () => {
            try {
                const sellerData = await getSellerAPI(user.id_vendedor);

                const finish_date = new Date(sellerData.fecha_vigencia);
                const date = new Date(sellerData.fecha);

                // Sumar alquiler, exhibición y delivery desde todas las sucursales
                const totalAlquiler = sellerData.pago_sucursales.reduce((sum:any, s:any) => sum + (s.alquiler || 0), 0);
                const totalExhibicion = sellerData.pago_sucursales.reduce((sum:any, s:any) => sum + (s.exhibicion || 0), 0);
                const totalDelivery = sellerData.pago_sucursales.reduce((sum:any, s:any) => sum + (s.delivery || 0), 0);
                const pagoMensualTotal = totalAlquiler + totalExhibicion + totalDelivery;

                const sellerWithKey = {
                    key: sellerData._id,
                    nombre: `${sellerData.nombre} ${sellerData.apellido}`,
                    deuda: `Bs. ${sellerData.deuda}`,
                    deudaInt: sellerData.deuda,
                    pagoTotalInt: sellerData.deuda - (sellerData.adelanto_servicio || 0),
                    fecha_vigencia: finish_date.toLocaleDateString("es-ES"),
                    fecha: date.toLocaleDateString("es-ES"),
                    pago_mensual: `Bs. ${pagoMensualTotal}`,
                    alquiler: totalAlquiler,
                    exhibicion: totalExhibicion,
                    delivery: totalDelivery,
                    comision_porcentual: `${sellerData.comision_porcentual}%`,
                    comision_fija: `Bs. ${sellerData.comision_fija}`,
                    telefono: sellerData.telefono,
                    mail: sellerData.mail,
                    carnet: sellerData.carnet,
                    adelanto_servicio: sellerData.adelanto_servicio || 0,
                    marca: sellerData.marca,
                    pago_sucursales: sellerData.pago_sucursales || [], 
                };

                setSeller(sellerWithKey);
            } catch (error) {
                console.error("Error al obtener la información del vendedor:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSeller();
    }, [user.id_vendedor]);

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
            onSuccess={() => { }}
        />
    );
};

export default SellerInfoPageWrapper;
