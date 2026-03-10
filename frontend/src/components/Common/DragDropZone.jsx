import React, { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';

const DragDropZone = ({ 
    onFilesSelected, 
    accept = '*/*', 
    maxFiles = 1,
    maxSize = 10 * 1024 * 1024, // 10MB default
    className = ''
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);

    const validateFile = (file) => {
        if (file.size > maxSize) {
            return `File ${file.name} exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
        }
        return null;
    };

    const handleFiles = useCallback((fileList) => {
        const fileArray = Array.from(fileList);
        const errors = [];
        const validFiles = [];

        fileArray.slice(0, maxFiles).forEach((file) => {
            const error = validateFile(file);
            if (error) {
                errors.push(error);
            } else {
                validFiles.push(file);
            }
        });

        if (errors.length > 0) {
            setError(errors.join(', '));
        } else {
            setError(null);
            setFiles(validFiles);
            if (onFilesSelected) {
                onFilesSelected(validFiles);
            }
        }
    }, [maxFiles, maxSize, onFilesSelected]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const fileList = e.dataTransfer.files;
        if (fileList.length > 0) {
            handleFiles(fileList);
        }
    };

    const handleFileInput = (e) => {
        const fileList = e.target.files;
        if (fileList.length > 0) {
            handleFiles(fileList);
        }
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (onFilesSelected) {
            onFilesSelected(newFiles);
        }
    };

    return (
        <div className={className}>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                    }
                    hover:border-blue-400 dark:hover:border-blue-500
                `}
            >
                <input
                    type="file"
                    accept={accept}
                    multiple={maxFiles > 1}
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                />
                
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                >
                    <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    <div>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            Click to upload
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {maxFiles > 1 ? `Up to ${maxFiles} files` : 'Single file'} • Max {((maxSize / 1024 / 1024).toFixed(0))}MB
                    </p>
                </label>
            </div>

            {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <File className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(index)}
                                className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DragDropZone;

