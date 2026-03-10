import React from 'react';
import { Trash2, Edit, MoreVertical, X } from 'lucide-react';

const BulkActions = ({ 
    selectedItems, 
    onBulkDelete, 
    onBulkEdit, 
    onClearSelection,
    availableActions = ['delete', 'edit']
}) => {
    if (selectedItems.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </div>
                
                <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                    {availableActions.includes('edit') && onBulkEdit && (
                        <button
                            onClick={onBulkEdit}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center gap-1"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                    
                    {availableActions.includes('delete') && onBulkDelete && (
                        <button
                            onClick={onBulkDelete}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-1"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                    
                    <button
                        onClick={onClearSelection}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActions;

