import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export type AttendanceReportParams = {
  from?: string;
  to?: string;
  search?: string;
  role?: string;
  groupId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export const getAttendanceReportAPI = async (params?: AttendanceReportParams) => {
  try {
    const res = await apiClient.get("/attendance/report", { params });
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};
