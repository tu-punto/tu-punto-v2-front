import { Link } from "react-router-dom";

const UnauthorizedPage = () => {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-5xl font-bold text-red-600">403</h1>
      <p className="text-mobile-lg xl:text-desktop-lg mt-2 text-gray-800">Acceso denegado</p>
      <p className="text-mobile-base xl:text-desktop-base mt-4 text-gray-600">
        No tienes permisos para ver esta pagina o tu acceso ya no esta habilitado.
      </p>
      <Link to="/" className="text-mobile-lg xl:text-desktop-lg mt-6 text-blue-500 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
};

export default UnauthorizedPage;

