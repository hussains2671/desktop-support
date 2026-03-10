import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

const ErrorDisplay = ({ 
    error, 
    onRetry, 
    onDismiss,
    title = 'Error',
    showRetry = true,
    className = '' 
}) => {
    if (!error) return null;

    const errorMessage = typeof error === 'string' 
        ? error 
        : error.message || 'An unexpected error occurred';

    return (
        <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                        {title}
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-400">
                        {errorMessage}
                    </p>
                    {showRetry && onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </button>
                    )}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorDisplay;

