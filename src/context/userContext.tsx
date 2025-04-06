import { createContext, ReactNode, useEffect, useState } from "react";
import { getUserByCookieAPI } from "../api/user";
interface UserContextType {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
}
export const UserContext = createContext<UserContextType | null>(null);

interface UserContextProviderProps {
  children: ReactNode;
}

export const UserContextProvider = ({ children }: UserContextProviderProps) => {
  const [user, setUser] = useState(null);
  const fetchUser = async () => {
    try {
      const userData = await getUserByCookieAPI();
      if (!userData?.success) {
        return;
      }
      setUser(userData!.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUser(null);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
