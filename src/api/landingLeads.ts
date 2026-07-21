import { AxiosError } from "axios";
import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const getLandingLeadsAPI = async () => {
  try {
    const res = await apiClient.get("/landing-leads");
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};

export const updateLandingLeadContactStatusAPI = async (id: string, contactado: boolean) => {
  try {
    const res = await apiClient.patch(`/landing-leads/${id}/contact-status`, { contactado });
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
  }
};
