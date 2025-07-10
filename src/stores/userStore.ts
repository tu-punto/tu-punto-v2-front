import { create } from "zustand";
import {
  getUsersAPI,
  registerUserAPI,
  updateUserAPI,
  deleteUserAPI,
} from "../api/user";
import { message } from "antd";
import { IUser } from "../schemas/IUser";

interface UserStore {
  users: IUser[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  createUser: (userData: any) => Promise<boolean>;
  updateUser: (id: string, userData: any) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  loading: false,

  fetchUsers: async () => {
    set({ loading: true });
    try {
      const response = await getUsersAPI();
      if (response?.success) {
        set({ users: response.data });
      }
    } catch (error) {
      message.error("Error al cargar usuarios");
    } finally {
      set({ loading: false });
    }
  },

  createUser: async (userData: IUser) => {
    try {
      const response = await registerUserAPI(userData);
      if (response?.success) {
        const newUser = response.data.user._doc;
        console.log("Nuevo usuario creado:", newUser);
        set((state) => ({
          users: [...state.users, newUser],
        }));

        message.success("Usuario creado");
        return true;
      }
      return false;
    } catch (error) {
      message.error("Error al crear usuario");
      return false;
    }
  },

  updateUser: async (id: string, userData: any) => {
    try {
      const response = await updateUserAPI(id, userData);
      if (response?.success) {
        set((state) => ({
          users: state.users.map((user) =>
            user._id === id ? { ...user, ...userData } : user
          ),
        }));

        message.success("Usuario actualizado");
        return true;
      }
      return false;
    } catch (error) {
      message.error("Error al actualizar usuario");
      return false;
    }
  },

  deleteUser: async (id: string) => {
    try {
      const response = await deleteUserAPI(id);
      if (response?.success) {
        set((state) => ({
          users: state.users.filter((user) => user._id !== id),
        }));

        message.success("Usuario eliminado");
        return true;
      }
      return false;
    } catch (error) {
      message.error("Error al eliminar usuario");
      return false;
    }
  },
}));
