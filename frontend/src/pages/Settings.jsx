import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { User, Building2, Copy, Check, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorDisplay from '../components/Common/ErrorDisplay';

const Settings = () => {
    const { user, company } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await api.get('/auth/profile');
            setProfile(response.data.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCompanyCode = (code) => {
        if (!code || code.length !== 16) return code;
        // Format: XXXX XXXX XXXX XXXX
        return `${code.substring(0, 4)} ${code.substring(4, 8)} ${code.substring(8, 12)} ${code.substring(12, 16)}`;
    };

    // Get API Base URL from environment or use default
    const getApiBaseUrl = () => {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
        // Remove /api suffix if present for display
        return apiUrl.replace(/\/api$/, '');
    };

    const apiBaseUrl = getApiBaseUrl();

    if (loading) {
        return <LoadingSpinner size="lg" text="Loading settings..." />;
    }

    if (error) {
        return (
            <ErrorDisplay 
                error={error} 
                onRetry={loadProfile}
                title="Failed to Load Settings"
            />
        );
    }

    const companyData = profile?.Company || company;
    const planData = companyData?.Plan;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and company information</p>
            </div>

            {/* User Profile Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Profile</h2>
                    </div>
                </div>
                <div className="p-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">First Name</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.first_name || user?.first_name || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.last_name || user?.last_name || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.email || user?.email || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                            <dd className="mt-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {profile?.role || user?.role || 'N/A'}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Company Information Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Company Information</h2>
                    </div>
                </div>
                <div className="p-6">
                    <dl className="space-y-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-500 mb-2">Company Name</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{companyData?.name || 'N/A'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 mb-2">Company Code (16-digit)</dt>
                            <dd className="flex items-center gap-2">
                                <span className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border">
                                    {formatCompanyCode(companyData?.company_code || company?.company_code) || 'N/A'}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(companyData?.company_code || company?.company_code || '')}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                    title="Copy Company Code"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </dd>
                            <p className="mt-1 text-xs text-gray-500">
                                Format: STATE (4) + COUNTRY (4) + RANDOM (8). Use this code when installing agents.
                            </p>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 mb-2">Internal Company ID</dt>
                            <dd className="text-sm text-gray-500 font-mono">{companyData?.id || company?.id || 'N/A'}</dd>
                            <p className="mt-1 text-xs text-gray-400">Internal system ID (for reference only)</p>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500 mb-2">Company Status</dt>
                            <dd className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    companyData?.status === 'active' 
                                        ? 'bg-green-100 text-green-800'
                                        : companyData?.status === 'trial'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {companyData?.status || 'N/A'}
                                </span>
                            </dd>
                        </div>
                        {companyData?.trial_ends_at && (
                            <div>
                                <dt className="text-sm font-medium text-gray-500 mb-2">Trial Ends At</dt>
                                <dd className="text-sm text-gray-900 dark:text-white">
                                    {new Date(companyData.trial_ends_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>

            {/* Plan Information Section */}
            {planData && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan Information</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500 mb-2">Plan Name</dt>
                                <dd className="text-sm text-gray-900 dark:text-white">{planData.name || 'N/A'}</dd>
                            </div>
                            {planData.description && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500 mb-2">Description</dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">{planData.description}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>
            )}

            {/* Agent Installation Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Install Agent on Windows</h3>
                <p className="text-sm text-gray-700 mb-4">
                    Download the pre-configured installer files for your company. These files already include your Company Code and API URL.
                </p>
                
                {/* Download Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <a
                        href={`${apiBaseUrl}/api/agent/download/ps1`}
                        download="Install-Agent.ps1"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await api.get('/agent/download/ps1', {
                                    responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Install-Agent-${companyData?.company_code || company?.company_code}.ps1`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                toast.success('Download started!');
                            } catch (err) {
                                toast.error('Failed to download installer');
                                console.error(err);
                            }
                        }}
                    >
                        <Download className="w-5 h-5" />
                        Download PowerShell Installer (.ps1)
                    </a>
                    <a
                        href={`${apiBaseUrl}/api/agent/download/bat`}
                        download="Install-Agent.bat"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await api.get('/agent/download/bat', {
                                    responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Install-Agent-${companyData?.company_code || company?.company_code}.bat`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                toast.success('Download started!');
                            } catch (err) {
                                toast.error('Failed to download installer');
                                console.error(err);
                            }
                        }}
                    >
                        <Download className="w-5 h-5" />
                        Download Batch Installer (.bat)
                    </a>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium mb-2">📋 Installation Steps:</p>
                    <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                        <li>Download the installer file (.ps1 or .bat)</li>
                        <li>Right-click the file → "Run as Administrator"</li>
                        <li>The installer will automatically configure and install the agent</li>
                        <li>Check the dashboard to verify the device appears</li>
                    </ol>
                </div>

                <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span>Manual Installation Command:</span>
                        <button
                            onClick={() => {
                                const apiUrl = `${apiBaseUrl}/api`;
                                const cmd = `cd agent\\installer\n.\\Install-Agent.ps1 -ApiBaseUrl "${apiUrl}" -CompanyCode "${companyData?.company_code || company?.company_code}"`;
                                copyToClipboard(cmd);
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-400" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <pre className="whitespace-pre-wrap">
{`cd agent\\installer
.\\Install-Agent.ps1 -ApiBaseUrl "${apiBaseUrl}/api" -CompanyCode "${companyData?.company_code || company?.company_code}"`}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default Settings;