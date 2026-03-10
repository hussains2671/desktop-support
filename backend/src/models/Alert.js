module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Alert', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        alert_type: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        severity: {
            type: DataTypes.ENUM('critical', 'high', 'medium', 'low', 'info'),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('open', 'acknowledged', 'resolved', 'closed'),
            defaultValue: 'open'
        },
        acknowledged_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        acknowledged_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        resolved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
        tableName: 'alerts',
        timestamps: true,
        underscored: true
    });
};

