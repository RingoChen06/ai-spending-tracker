import axios from "axios";
import { auth } from "../firebase";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

const instance = axios.create({
  baseURL: BASE_URL,
});

// Add a request interceptor
instance.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        // Firebase automatically handles token refreshing with force refresh if needed
        const token = await user.getIdToken(true); // Force refresh token
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting auth token: ", error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors and retry with refreshed token
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const user = auth.currentUser;
        if (user) {
          // Force refresh the token
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Retry the original request with new token
          return instance(originalRequest);
        }
      } catch (refreshError) {
        console.error("Error refreshing token: ", refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getTransactions = async () => {
  try {
    const response = await instance.get(`/transactions`);
    return response.data;
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    throw error;
  }
};

export const addTransaction = async (
  date: string,
  merchantName: string,
  category: string,
  amount: number,
  note?: string
) => {
  try {
    const response = await instance.post("/transactions", {
      date,
      merchantName,
      category,
      amount,
      ...(note && { note }),
    });
    return response.data;
  } catch (error) {
    console.error("Error adding transaction: ", error);
    throw error;
  }
};

export const receiptScan = async (image_data: string) => {
  try {
    const response = await instance.post("/receipt", { image_data });
    return response.data;
  } catch (error) {
    console.error("Error scanning receipt: ", error);
    throw error;
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    const response = await instance.delete(`/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting transaction: ", error);
    throw error;
  }
};

export const updateTransaction = async (
  id: string,
  data: { date?: string; merchantName?: string; category?: string; amount?: number; note?: string }
) => {
  try {
    const response = await instance.put(`/transactions/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating transaction: ", error);
    throw error;
  }
};

export const getSpendingSummary = async (period: string) => {
  try {
    const response = await instance.get(`/summary/spending?period=${period}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching spending summary: ", error);
    throw error;
  }
};
