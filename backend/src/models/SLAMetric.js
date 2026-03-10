'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SLAMetric = sequelize.define('SLAMetric', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_tickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    sla_compliant: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    sla_breached: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    compliance_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'sla_metrics',
    timestamps: true,
    underscored: true,
  });

  return SLAMetric;
};
