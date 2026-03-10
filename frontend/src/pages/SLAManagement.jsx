import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Eye, BarChart3, AlertTriangle, CheckCircle,
  Calendar, Clock, AlertCircle, Loader, X
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import './SLAManagement.css';

export default function SLAManagement() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('policies');
  const [slas, setSLAs] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSLA, setEditingSLA] = useState(null);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority_level: 'medium',
    first_response_hours: 4,
    resolution_hours: 24,
  });

  useEffect(() => {
    loadSLAs();
    loadMetrics();
  }, []);

  const loadSLAs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/slas', {
        params: { page, limit: 10 }
      });
      setSLAs(response.data.data || []);
    } catch (error) {
      console.error('Error loading SLAs:', error);
      toast.error('Failed to load SLA policies');
    } finally {
      setLoading(false);
    }
  };

  const loadBreaches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/slas/breaches/list', {
        params: { page, limit: 10 }
      });
      setBreaches(response.data.data || []);
    } catch (error) {
      console.error('Error loading breaches:', error);
      toast.error('Failed to load SLA breaches');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await api.get('/slas/metrics/current');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleCreateSLA = async () => {
    try {
      if (!formData.name) {
        toast.error('Please enter SLA name');
        return;
      }
      
      if (editingSLA) {
        await api.put(`/slas/${editingSLA.id}`, formData);
        toast.success('SLA policy updated successfully');
      } else {
        await api.post('/slas', formData);
        toast.success('SLA policy created successfully');
      }
      
      resetForm();
      setShowModal(false);
      loadSLAs();
      loadMetrics();
    } catch (error) {
      console.error('Error creating SLA:', error);
      toast.error(error.response?.data?.message || 'Error creating SLA');
    }
  };

  const handleDeleteSLA = async (id) => {
    if (window.confirm('Are you sure you want to delete this SLA policy?')) {
      try {
        await api.delete(`/slas/${id}`);
        toast.success('SLA policy deleted successfully');
        loadSLAs();
        loadMetrics();
      } catch (error) {
        console.error('Error deleting SLA:', error);
        toast.error('Error deleting SLA');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority_level: 'medium',
      first_response_hours: 4,
      resolution_hours: 24,
    });
    setEditingSLA(null);
  };

  const handleEditSLA = (sla) => {
    setEditingSLA(sla);
    setFormData({
      name: sla.name,
      description: sla.description,
      priority_level: sla.priority_level,
      first_response_hours: sla.first_response_hours,
      resolution_hours: sla.resolution_hours,
    });
    setShowModal(true);
  };

  return (
    <div className="sla-container">
      {/* Header */}
      <div className="sla-header">
        <div>
          <h1>SLA Management</h1>
          <p>Manage Service Level Agreements and track compliance</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus size={20} /> New SLA Policy
        </button>
      </div>

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon accuracy">
              <CheckCircle size={32} />
            </div>
            <div className="metric-content">
              <h3>Compliance Rate</h3>
              <p className="metric-value">{metrics.percentage?.toFixed(1) || 0}%</p>
              <small>{metrics.compliant || 0}/{metrics.total || 0} tickets</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon info">
              <BarChart3 size={32} />
            </div>
            <div className="metric-content">
              <h3>Total Tickets</h3>
              <p className="metric-value">{metrics.total || 0}</p>
              <small>SLA tracked</small>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon warning">
              <AlertTriangle size={32} />
            </div>
            <div className="metric-content">
              <h3>Breached</h3>
              <p className="metric-value">{metrics.breached || 0}</p>
              <small>SLA violations</small>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sla-tabs">
        <button
          className={`tab ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          SLA Policies
        </button>
        <button
          className={`tab ${activeTab === 'breaches' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('breaches');
            loadBreaches();
          }}
        >
          Breaches
        </button>
        <button
          className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Reports
        </button>
      </div>

      {/* Content */}
      {activeTab === 'policies' && (
        <div className="sla-policies">
          {loading ? (
            <div className="loading"><Loader size={20} className="spinner" /> Loading policies...</div>
          ) : slas.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} />
              <h3>No SLA Policies Yet</h3>
              <p>Create your first SLA policy to get started</p>
            </div>
          ) : (
            <div className="sla-list">
              {slas.map(sla => (
                <div key={sla.id} className="sla-card">
                  <div className="sla-card-header">
                    <h3>{sla.name}</h3>
                    {sla.priority_level && (
                      <span className={`priority-badge ${sla.priority_level}`}>
                        {sla.priority_level.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {sla.description && (
                    <p className="sla-description">{sla.description}</p>
                  )}
                  <div className="sla-targets">
                    <div className="target">
                      <Clock size={16} />
                      <span>First Response: {sla.first_response_hours}h</span>
                    </div>
                    <div className="target">
                      <Calendar size={16} />
                      <span>Resolution: {sla.resolution_hours}h</span>
                    </div>
                  </div>
                  <div className="sla-actions">
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => handleEditSLA(sla)}
                      title="Edit SLA Policy"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => handleDeleteSLA(sla.id)}
                      title="Delete SLA Policy"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'breaches' && (
        <div className="sla-breaches">
          {loading ? (
            <div className="loading"><Loader size={20} className="spinner" /> Loading breaches...</div>
          ) : breaches.length === 0 ? (
            <div className="empty-state success">
              <CheckCircle size={48} />
              <h3>No SLA Breaches</h3>
              <p>All tickets are within SLA targets ✓</p>
            </div>
          ) : (
            <div className="breach-table-wrapper">
              <table className="breach-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>SLA Policy</th>
                    <th>Breach Type</th>
                    <th>Minutes Over</th>
                    <th>Breached At</th>
                  </tr>
                </thead>
                <tbody>
                  {breaches.map(breach => (
                    <tr key={breach.id} className="breach-row">
                      <td className="ticket-cell">
                        {breach.ticket?.ticket_number || 'N/A'}
                      </td>
                      <td>{breach.sla?.name || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${breach.breach_type}`}>
                          {breach.breach_type === 'first_response' ? 'First Response' : 'Resolution'}
                        </span>
                      </td>
                      <td className="minutes-cell">{breach.minutes_over || 0}</td>
                      <td>{new Date(breach.breach_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="sla-reports">
          {metrics ? (
            <div className="report-card">
              <div className="report-header">
                <BarChart3 size={24} />
                <h3>SLA Compliance Report</h3>
              </div>
              <div className="report-content">
                <div className="report-section">
                  <h4>Summary</h4>
                  <div className="report-grid">
                    <div className="report-item">
                      <span className="report-label">Compliance Rate</span>
                      <span className="report-value">{metrics.percentage?.toFixed(2) || 0}%</span>
                    </div>
                    <div className="report-item">
                      <span className="report-label">Compliant Tickets</span>
                      <span className="report-value">{metrics.compliant || 0}</span>
                    </div>
                    <div className="report-item">
                      <span className="report-label">Breached Tickets</span>
                      <span className="report-value">{metrics.breached || 0}</span>
                    </div>
                    <div className="report-item">
                      <span className="report-label">Total Tickets</span>
                      <span className="report-value">{metrics.total || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="loading"><Loader size={20} className="spinner" /> Loading report...</div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSLA ? 'Edit SLA Policy' : 'Create New SLA Policy'}</h2>
              <button
                className="btn-close"
                onClick={() => setShowModal(false)}
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Policy Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Support"
                  maxLength={255}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="SLA description..."
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority Level</label>
                  <select
                    value={formData.priority_level}
                    onChange={e => setFormData({ ...formData, priority_level: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>First Response (hours) *</label>
                  <input
                    type="number"
                    value={formData.first_response_hours}
                    onChange={e => setFormData({ ...formData, first_response_hours: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="999"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Resolution Time (hours) *</label>
                <input
                  type="number"
                  value={formData.resolution_hours}
                  onChange={e => setFormData({ ...formData, resolution_hours: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="999"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateSLA}
              >
                {editingSLA ? 'Update SLA' : 'Create SLA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
