import { create } from 'zustand';
import api from '../services/api';

const useFeatureStore = create((set, get) => ({
    features: [],
    companyFeatures: [],
    loading: false,

    loadFeatures: async (companyId) => {
        set({ loading: true });
        try {
            const response = await api.get(`/admin/companies/${companyId}/features`);
            set({
                features: response.data.data,
                loading: false
            });
        } catch (error) {
            set({ loading: false });
        }
    },

    isFeatureEnabled: (featureCode) => {
        const { features } = get();
        const feature = features.find(f => f.code === featureCode);
        return feature?.is_enabled ?? false;
    }
}));

export default useFeatureStore;

