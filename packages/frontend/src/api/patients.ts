import api from "./client";
import type { Patient } from "@aria/shared";

export const patientsApi = {
  getAll: async (): Promise<Patient[]> => {
    const res = await api.get("/patients");
    return res.data.patients;
  },

  getById: async (id: string): Promise<Patient> => {
    const res = await api.get(`/patients/${id}`);
    return res.data.patient;
  },

  create: async (data: any): Promise<Patient> => {
    const res = await api.post('/patients', data);
    return res.data.patient;
  }
};