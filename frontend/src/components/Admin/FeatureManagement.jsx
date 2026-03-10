import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';

const FeatureManagement = () => {
    const { companyId } = useParams();
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState(null);

    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [companyId]);

    const loadData = async () => {
        try {
            const [featuresRes, planRes] = await Promise.all([
                api.get(`/admin/companies/${companyId}/features`),
                api.get(`/admin/companies/${companyId}`)
            ]);
            
            setFeatures(featuresRes.data.data);
            setPlan(planRes.data.data?.Plan);
        } catch (error) {
            toast.error('Failed to load features');
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = async (featureId, enabled) => {
        try {
            await api.put(`/admin/companies/${companyId}/features/${featureId}`, {
                is_enabled: enabled
            });
            
            setFeatures(features.map(f => 
                f.id === featureId 
                    ? { ...f, is_enabled: enabled, source: 'company_override' }
                    : f
            ));
            
            toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            toast.error('Failed to update feature');
        }
    };

    const groupByCategory = (features) => {
        return features.reduce((acc, feature) => {
            const category = feature.category || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(feature);
            return acc;
        }, {});
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const groupedFeatures = groupByCategory(features);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Feature Management</h2>
                <p className="text-gray-600 mt-1">
                    Current Plan: <span className="font-semibold ml-2">{plan?.display_name || 'N/A'}</span>
                </p>
            </div>

            {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                <div key={category} className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                            {category.replace('_', ' ')}
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryFeatures.map((feature) => (
                                <div
                                    key={feature.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{feature.name}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                                        </div>
                                        {feature.is_premium && (
                                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                                Premium
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            {feature.is_enabled ? (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-gray-400" />
                                            )}
                                            <span className={`text-sm ${
                                                feature.is_enabled ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                                {feature.is_enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={feature.is_enabled}
                                                onChange={(e) => toggleFeature(feature.id, e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    {feature.source && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Source: {feature.source === 'company_override' ? 'Custom' : 'Plan Default'}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FeatureManagement;

