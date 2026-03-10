import React from 'react';
import { X, CheckCircle, XCircle, Loader } from 'lucide-react';

const FileTransferProgress = ({ transfer, onCancel }) => {
    if (!transfer) return null;

    const getStatusIcon = () => {
        switch (transfer.status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'in_progress':
            case 'pending':
                return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
            default:
                return <Loader className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = () => {
        switch (transfer.status) {
            case 'completed':
                return 'bg-green-500';
            case 'failed':
            case 'cancelled':
                return 'bg-red-500';
            case 'in_progress':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatSpeed = (bytes, seconds) => {
        if (!bytes || !seconds) return '0 B/s';
        const speed = bytes / seconds;
        return formatFileSize(speed) + '/s';
    };

    const canCancel = transfer.status === 'pending' || transfer.status === 'in_progress';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon()}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{transfer.file_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {transfer.direction === 'upload' ? 'Uploading' : 'Downloading'} • {formatFileSize(transfer.file_size)}
                        </div>
                    </div>
                </div>
                {canCancel && onCancel && (
                    <button
                        onClick={() => onCancel(transfer.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        title="Cancel"
                    >
                        <X className="w-4 h-4 text-red-500" />
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
                        style={{ width: `${transfer.progress || 0}%` }}
                    />
                </div>
            </div>

            {/* Status Info */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="capitalize">{transfer.status.replace('_', ' ')}</span>
                <span>{transfer.progress || 0}%</span>
            </div>

            {/* Error Message */}
            {transfer.error_message && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                    {transfer.error_message}
                </div>
            )}
        </div>
    );
};

export default FileTransferProgress;

