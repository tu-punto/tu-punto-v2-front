import { createContext, ReactNode, useState, useEffect } from "react";
import { getUserByCookieAPI } from "../api/user";
import { normalizeRole } from "../utils/role";

export const UserContext = createContext<any>(null);

export const UserContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserByCookieAPI();
        if (res?.success) {
          setUser({
            ...res.data,
            role: normalizeRole(res.data?.role),
          });
        }
      } catch (e) {
        console.error("Error fetching user:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};
