'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SLABreach = sequelize.define('SLABreach', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tickets',
        key: 'id',
      },
    },
    sla_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'slas',
        key: 'id',
      },
    },
    breach_type: {
      type: DataTypes.ENUM('first_response', 'resolution'),
      allowNull: false,
      defaultValue: 'resolution',
    },
    target_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    breach_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    minutes_over: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    escalated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'sla_breaches',
    timestamps: true,
    underscored: true,
  });

  return SLABreach;
};
