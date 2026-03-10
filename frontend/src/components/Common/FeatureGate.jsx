import React from 'react';
import useFeatureStore from '../../store/featureStore';
import { AlertCircle } from 'lucide-react';

const FeatureGate = ({ featureCode, children, fallback }) => {
    const isEnabled = useFeatureStore(state => state.isFeatureEnabled(featureCode));

    if (!isEnabled) {
        if (fallback) {
            return fallback;
        }
        
        return (
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Feature Not Available
                    </h3>
                    <p className="text-gray-500 mb-4">
                        This feature is not available in your current plan.
                    </p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Upgrade Plan
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default FeatureGate;

