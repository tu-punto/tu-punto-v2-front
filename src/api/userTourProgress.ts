import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const fallbackError = (error: unknown) => {
  const err = error as AxiosError;
  return {
    success: false,
    message: (err.response?.data as any)?.message || err.message || "Error inesperado",
  };
};

export type TourProgressStatus = "unseen" | "seen";

export type TourProgressMap = Record<
  string,
  {
    status: TourProgressStatus;
    completedAt?: string | null;
    updatedAt?: string;
  }
>;

export const getMyTourProgressAPI = async () => {
  try {
    const res = await apiClient.get("/user-tour-progress/mine");
    return res.data as {
      success: boolean;
      progress?: TourProgressMap;
      knownTourKeys?: string[];
    };
  } catch (error) {
    return fallbackError(error);
  }
};

export const completeTourAPI = async (tourKey: string) => {
  try {
    const res = await apiClient.post("/user-tour-progress/complete", { tourKey });
    return res.data as {
      success: boolean;
      progress?: {
        tourKey: string;
        status: TourProgressStatus;
        completedAt?: string | null;
      };
    };
  } catch (error) {
    return fallbackError(error);
  }
};
