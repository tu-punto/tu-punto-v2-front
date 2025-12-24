import { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/userContext";
import { roles } from "../constants/roles";

export const useUserRole = () => {
    const { user } = useContext(UserContext);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isOperator, setIsOperator] = useState(false);
    const [isSeller, setIsSeller] = useState(false);

    useEffect(() => {
        if (!user) return;
        const userRole = user.role.toLowerCase();
        
        setIsAdmin(userRole === roles.ADMIN);
        setIsOperator(userRole === roles.OPERATOR);
        setIsSeller(userRole === roles.SELLER);
    }, [user]);

    return {
        isAdmin,
        isOperator,
        isSeller,
    };
};