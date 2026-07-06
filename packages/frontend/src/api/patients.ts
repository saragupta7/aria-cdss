import api from "./client";
import type { Patient } from "@aria/shared";

export interface PatientNote {
  _id?: string;
  text: string;
  authorName?: string;
  authorRole?: string;
  createdAt: string;
}

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
  },

  discharge: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/patients/${id}`);
    return res.data;
  },

  getNotes: async (id: string): Promise<PatientNote[]> => {
    const res = await api.get(`/patients/${id}/notes`);
    return res.data.notes;
  },

  addNote: async (id: string, text: string): Promise<PatientNote> => {
    const res = await api.post(`/patients/${id}/notes`, { text });
    return res.data.note;
  }
};
