import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export type MaintenanceAllowedRole = "admin" | "operator" | "seller";

export type MaintenanceModeConfig = {
  _id?: string;
  configKey?: string;
  enabled: boolean;
  message: string;
  subtitle?: string;
  allowedRoles: MaintenanceAllowedRole[];
  targetUserScope: "all" | "specific";
  targetUserIds: string[];
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MaintenanceModeStatus = MaintenanceModeConfig & {
  blocked: boolean;
  bypassReason?: "superadmin" | "role" | "user" | null;
};

export const getMaintenanceModeAPI = async () => {
  try {
    const res = await apiClient.get("/maintenance-mode/current");
    return { success: true, data: res.data.data as MaintenanceModeConfig };
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const getMaintenanceModeStatusAPI = async () => {
  try {
    const res = await apiClient.get("/maintenance-mode/status");
    return { success: true, data: res.data.data as MaintenanceModeStatus };
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const updateMaintenanceModeAPI = async (payload: {
  enabled: boolean;
  message: string;
  subtitle?: string;
  allowedRoles: MaintenanceAllowedRole[];
  targetUserScope: "all" | "specific";
  targetUserIds: string[];
}) => {
  try {
    const res = await apiClient.put("/maintenance-mode", payload);
    return { success: true, data: res.data.data as MaintenanceModeConfig };
  } catch (error) {
    return parseError(error as AxiosError);
  }
};
