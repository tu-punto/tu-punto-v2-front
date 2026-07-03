import React, { useContext, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { UserContext } from "../context/userContext";
import { normalizeRole } from "../utils/role";

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login-admin" replace />;
  }

  const userRole = normalizeRole(user?.role);
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
