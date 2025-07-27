import { create } from "zustand";
import { message } from "antd";
import { IFinanceFluxCategory } from "../schemas/IFinanceFluxCategory";
import {
  deleteFinanceFluxCategoryAPI,
  getFinanceFluxCategoriesAPI,
  registerFinanceFluxCategoryAPI,
} from "../api/financeFlux";

interface FinanceFluxCategoryStore {
  fluxCategories: IFinanceFluxCategory[];
  loading: boolean;
  fetchFluxCategory: () => Promise<void>;
  createFluxCategory: (fluxCategoryData: any) => Promise<boolean>;
  deleteFluxCategory: (id: string) => Promise<boolean>;
}

export const useFinanceFluxCategoryStore = create<FinanceFluxCategoryStore>(
  (set) => ({
    fluxCategories: [],
    loading: false,

    fetchFluxCategory: async () => {
      set({ loading: true });
      try {
        const response = await getFinanceFluxCategoriesAPI();
        if (response?.status) {
          set({ fluxCategories: response.categories });
        }
      } catch (error) {
        message.error("Error al cargar categorías de flujo financiero");
      } finally {
        set({ loading: false });
      }
    },

    createFluxCategory: async (fluxCategoryData: IFinanceFluxCategory) => {
      set({ loading: true });
      try {
        const response = await registerFinanceFluxCategoryAPI(fluxCategoryData);
        if (response?.status) {
          const newCategory = response.newCategory;
          set((state) => ({
            fluxCategories: [...state.fluxCategories, newCategory],
          }));
          message.success("Categoria de flujo financiero creada");
          return true;
        }
        return false;
      } catch (error) {
        message.error("Error al crear categoria de flujo financiero");
        return false;
      } finally {
        set({ loading: false });
      }
    },

    deleteFluxCategory: async (id: string) => {
      set({ loading: true });
      try {
        const response = await deleteFinanceFluxCategoryAPI(id);
        if (response?.success) {
          set((state) => ({
            fluxCategories: state.fluxCategories.filter(
              (fluxCategory) => fluxCategory._id !== id
            ),
          }));

          message.success("Categoria de flujo financiero eliminada");
          return true;
        }
        return false;
      } catch (error) {
        message.error("Error al eliminar categoria de flujo financiero");
        return false;
      } finally {
        set({ loading: false });
      }
    },
  })
);
