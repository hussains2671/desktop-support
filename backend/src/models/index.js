const sequelize = require('../config/database.postgresql');
// Note: File is named database.postgresql.js but we can also create database.js as alias
const { DataTypes } = require('sequelize');

// Import all models
const Company = require('./Company')(sequelize, DataTypes);
const Plan = require('./Plan')(sequelize, DataTypes);
const Feature = require('./Feature')(sequelize, DataTypes);
const PlanFeature = require('./PlanFeature')(sequelize, DataTypes);
const CompanyFeature = require('./CompanyFeature')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const Agent = require('./Agent')(sequelize, DataTypes);
const AgentCommand = require('./AgentCommand')(sequelize, DataTypes);
const RemoteSession = require('./RemoteSession')(sequelize, DataTypes);
const FileTransfer = require('./FileTransfer')(sequelize, DataTypes);
const Device = require('./Device')(sequelize, DataTypes);
const HardwareInventory = require('./HardwareInventory')(sequelize, DataTypes);
const SoftwareInventory = require('./SoftwareInventory')(sequelize, DataTypes);
const EventLog = require('./EventLog')(sequelize, DataTypes);
const PerformanceMetric = require('./PerformanceMetric')(sequelize, DataTypes);
const NetworkInfo = require('./NetworkInfo')(sequelize, DataTypes);
const SecurityStatus = require('./SecurityStatus')(sequelize, DataTypes);
const Alert = require('./Alert')(sequelize, DataTypes);
const AIInsight = require('./AIInsight')(sequelize, DataTypes);
const Ticket = require('./Ticket')(sequelize, DataTypes);
const TicketComment = require('./TicketComment')(sequelize, DataTypes);
const TicketHistory = require('./TicketHistory')(sequelize, DataTypes);
const SLA = require('./SLA')(sequelize, DataTypes);
const SLABreach = require('./SLABreach')(sequelize, DataTypes);
const SLAMetric = require('./SLAMetric')(sequelize, DataTypes);
const AgentConfiguration = require('./AgentConfiguration')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);

// Define relationships
Company.belongsTo(Plan, { foreignKey: 'plan_id', as: 'Plan' });
Plan.hasMany(Company, { foreignKey: 'plan_id' });

Plan.belongsToMany(Feature, { through: PlanFeature, foreignKey: 'plan_id', as: 'Features' });
Feature.belongsToMany(Plan, { through: PlanFeature, foreignKey: 'feature_id', as: 'Plans' });

Company.belongsToMany(Feature, { through: CompanyFeature, foreignKey: 'company_id', as: 'Features' });
Feature.belongsToMany(Company, { through: CompanyFeature, foreignKey: 'feature_id', as: 'Companies' });

Company.hasMany(User, { foreignKey: 'company_id', as: 'Users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Company.hasMany(Agent, { foreignKey: 'company_id', as: 'Agents' });
Agent.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Company.hasMany(AgentCommand, { foreignKey: 'company_id', as: 'AgentCommands' });
AgentCommand.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Agent.hasMany(AgentCommand, { foreignKey: 'agent_id', as: 'Commands' });
AgentCommand.belongsTo(Agent, { foreignKey: 'agent_id', as: 'Agent' });

User.hasMany(AgentCommand, { foreignKey: 'created_by', as: 'CreatedCommands' });
AgentCommand.belongsTo(User, { foreignKey: 'created_by', as: 'CreatedBy' });

// Remote Session relationships
Company.hasMany(RemoteSession, { foreignKey: 'company_id', as: 'RemoteSessions' });
RemoteSession.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Agent.hasMany(RemoteSession, { foreignKey: 'agent_id', as: 'RemoteSessions' });
RemoteSession.belongsTo(Agent, { foreignKey: 'agent_id', as: 'Agent' });

User.hasMany(RemoteSession, { foreignKey: 'user_id', as: 'RemoteSessions' });
RemoteSession.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// File Transfer relationships
Company.hasMany(FileTransfer, { foreignKey: 'company_id', as: 'FileTransfers' });
FileTransfer.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Agent.hasMany(FileTransfer, { foreignKey: 'agent_id', as: 'FileTransfers' });
FileTransfer.belongsTo(Agent, { foreignKey: 'agent_id', as: 'Agent' });

User.hasMany(FileTransfer, { foreignKey: 'user_id', as: 'FileTransfers' });
FileTransfer.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

Agent.hasOne(Device, { foreignKey: 'agent_id', as: 'Device' });
Device.belongsTo(Agent, { foreignKey: 'agent_id', as: 'Agent' });

Company.hasMany(Device, { foreignKey: 'company_id', as: 'Devices' });
Device.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Device.hasMany(HardwareInventory, { foreignKey: 'device_id', as: 'Hardware' });
HardwareInventory.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Device.hasMany(SoftwareInventory, { foreignKey: 'device_id', as: 'Software' });
SoftwareInventory.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Device.hasMany(EventLog, { foreignKey: 'device_id', as: 'EventLogs' });
EventLog.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Device.hasMany(PerformanceMetric, { foreignKey: 'device_id', as: 'PerformanceMetrics' });
PerformanceMetric.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Device.hasMany(NetworkInfo, { foreignKey: 'device_id', as: 'NetworkInfo' });
NetworkInfo.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Device.hasOne(SecurityStatus, { foreignKey: 'device_id', as: 'SecurityStatus' });
SecurityStatus.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Company.hasMany(Alert, { foreignKey: 'company_id', as: 'Alerts' });
Alert.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Device.hasMany(Alert, { foreignKey: 'device_id', as: 'Alerts' });
Alert.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

User.hasMany(Alert, { foreignKey: 'acknowledged_by', as: 'AcknowledgedAlerts' });
Alert.belongsTo(User, { foreignKey: 'acknowledged_by', as: 'AcknowledgedBy' });

Company.hasMany(AIInsight, { foreignKey: 'company_id', as: 'AIInsights' });
AIInsight.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Device.hasMany(AIInsight, { foreignKey: 'device_id', as: 'AIInsights' });
AIInsight.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

Company.hasMany(Ticket, { foreignKey: 'company_id', as: 'Tickets' });
Ticket.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Device.hasMany(Ticket, { foreignKey: 'device_id', as: 'Tickets' });
Ticket.belongsTo(Device, { foreignKey: 'device_id', as: 'Device' });

User.hasMany(Ticket, { foreignKey: 'created_by', as: 'CreatedTickets' });
Ticket.belongsTo(User, { foreignKey: 'created_by', as: 'CreatedBy' });

User.hasMany(Ticket, { foreignKey: 'assigned_to', as: 'AssignedTickets' });
Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'AssignedTo' });

Company.hasMany(AgentConfiguration, { foreignKey: 'company_id', as: 'Configurations' });
AgentConfiguration.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

Company.hasMany(AuditLog, { foreignKey: 'company_id', as: 'AuditLogs' });
AuditLog.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'AuditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// Ticket relationships
Ticket.hasMany(TicketComment, { foreignKey: 'ticket_id', as: 'Comments' });
TicketComment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'Ticket' });

User.hasMany(TicketComment, { foreignKey: 'created_by', as: 'TicketComments' });
TicketComment.belongsTo(User, { foreignKey: 'created_by', as: 'CreatedBy' });

Ticket.hasMany(TicketHistory, { foreignKey: 'ticket_id', as: 'History' });
TicketHistory.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'Ticket' });

User.hasMany(TicketHistory, { foreignKey: 'changed_by', as: 'TicketHistories' });
TicketHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'ChangedBy' });

// SLA relationships
Company.hasMany(SLA, { foreignKey: 'company_id', as: 'SLAs' });
SLA.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

User.hasMany(SLA, { foreignKey: 'created_by', as: 'CreatedSLAs' });
SLA.belongsTo(User, { foreignKey: 'created_by', as: 'CreatedBy' });

SLA.hasMany(SLABreach, { foreignKey: 'sla_id', as: 'Breaches', onDelete: 'CASCADE' });
SLABreach.belongsTo(SLA, { foreignKey: 'sla_id', as: 'SLA' });

Ticket.hasMany(SLABreach, { foreignKey: 'ticket_id', as: 'Breaches', onDelete: 'CASCADE' });
SLABreach.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'Ticket' });

Company.hasMany(SLAMetric, { foreignKey: 'company_id', as: 'SLAMetrics' });
SLAMetric.belongsTo(Company, { foreignKey: 'company_id', as: 'Company' });

module.exports = {
    sequelize,
    Company,
    Plan,
    Feature,
    PlanFeature,
    CompanyFeature,
    User,
    Agent,
    AgentCommand,
    RemoteSession,
    FileTransfer,
    Device,
    HardwareInventory,
    SoftwareInventory,
    EventLog,
    PerformanceMetric,
    NetworkInfo,
    SecurityStatus,
    Alert,
    AIInsight,
    Ticket,
    TicketComment,
    TicketHistory,
    SLA,
    SLABreach,
    SLAMetric,
    AgentConfiguration,
    AuditLog
};

