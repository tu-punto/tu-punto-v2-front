import React, { useContext, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { UserContext } from "../context/userContext";

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
                                               allowedRoles,
                                               children,
                                             }) => {
  const { user, loading } = useContext(UserContext);

  console.log("🧪 user en RoleGuard:", user);
  console.log("🧪 role:", user?.role);
  console.log("🧪 allowedRoles:", allowedRoles);
  console.log("🧪 match:", allowedRoles.includes(user?.role));

  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center">
          <Spin size="large" />
        </div>
    );
  }

  if (!user) {
    console.warn("⚠️ Usuario no logueado");
    return <Navigate to="/login-admin" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    console.warn("🚫 Rol no permitido:", user.role);
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
export default RoleGuard;
