import { Link } from "react-router-dom";

const ErrorPage = () => {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-6xl font-bold text-blue-600">404</h1>
      <p className="text-mobile-lg xl:text-desktop-lg mt-2 text-gray-800">Página no encontrada</p>
      <p className="text-mobile-base xl:text-desktop-base mt-4 text-gray-600">
        Lo sentimos, la página que buscas no existe o fue movida.
      </p>
      <Link to="/" className="text-mobile-lg xl:text-desktop-lg mt-6 text-blue-500 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
};

export default ErrorPage;
