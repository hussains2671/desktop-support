import React, { useState, useEffect } from 'react';
import { Folder, File, Upload, Download, RefreshCw, ChevronRight, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFileList } from '../../services/fileTransferService';

const FileBrowser = ({ agentId, onFileSelect, onUpload, onDownload }) => {
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('C:\\Users\\Public\\Documents');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (agentId) {
            loadFiles();
        }
    }, [agentId, currentPath]);

    const loadFiles = async () => {
        if (!agentId) return;

        try {
            setLoading(true);
            const result = await getFileList(agentId, currentPath);
            if (result.success) {
                setFiles(result.data || []);
            } else {
                toast.error(result.message || 'Failed to load files');
            }
        } catch (error) {
            console.error('Failed to load files:', error);
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const handleFileClick = (file) => {
        if (file.type === 'directory') {
            setCurrentPath(file.path);
        } else {
            setSelectedFile(file);
            if (onFileSelect) {
                onFileSelect(file);
            }
        }
    };

    const handleUpload = () => {
        if (onUpload) {
            onUpload(currentPath);
        }
    };

    const handleDownload = () => {
        if (selectedFile && onDownload) {
            onDownload(selectedFile);
        }
    };

    const goToHome = () => {
        setCurrentPath('C:\\Users\\Public\\Documents');
    };

    const goUp = () => {
        const parts = currentPath.split(/[\\/]/);
        if (parts.length > 1) {
            parts.pop();
            setCurrentPath(parts.join('\\'));
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <button
                        onClick={goToHome}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Home"
                    >
                        <Home className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goUp}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Go Up"
                    >
                        <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                    <div className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                        {currentPath}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadFiles}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleUpload}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1"
                        title="Upload File"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload</span>
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                        <p>No files found</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                onClick={() => handleFileClick(file)}
                                className={`p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                                    selectedFile?.path === file.path ? 'bg-blue-100 dark:bg-blue-900' : ''
                                }`}
                            >
                                {file.type === 'directory' ? (
                                    <Folder className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <File className="w-5 h-5 text-gray-400" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    {file.type === 'file' && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatFileSize(file.size)} • {formatDate(file.modified_at)}
                                        </div>
                                    )}
                                </div>
                                {file.type === 'directory' && (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            {selectedFile && selectedFile.type === 'file' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleDownload}
                        className="w-full p-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Download {selectedFile.name}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileBrowser;

