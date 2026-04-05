import { AxiosError } from "axios";

import { apiClient } from "./apiClient";
import { parseError } from "./util";

export const getRecurringExpensesAPI = async () => {
  try {
    const res = await apiClient.get("/recurringExpense");
    return res.data;
  } catch (error) {
    parseError(error as AxiosError);
    return [];
  }
};

export const createRecurringExpenseAPI = async (payload: any) => {
  try {
    const res = await apiClient.post("/recurringExpense", payload);
    return res.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const updateRecurringExpenseAPI = async (id: string, payload: any) => {
  try {
    const res = await apiClient.put(`/recurringExpense/${id}`, payload);
    return res.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const deleteRecurringExpenseAPI = async (id: string) => {
  try {
    const res = await apiClient.delete(`/recurringExpense/${id}`);
    return res.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};

export const payRecurringExpenseAPI = async (id: string) => {
  try {
    const res = await apiClient.post(`/recurringExpense/${id}/pay`);
    return res.data;
  } catch (error) {
    return parseError(error as AxiosError);
  }
};
