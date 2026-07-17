import { useEffect } from "react";

export const PUBLIC_PAGE_TITLE = "Tu Punto | Panel de gestión";

export const usePublicPageTitle = () => {
  useEffect(() => {
    document.title = PUBLIC_PAGE_TITLE;
  }, []);
};
