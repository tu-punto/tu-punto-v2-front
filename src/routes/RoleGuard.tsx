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

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
