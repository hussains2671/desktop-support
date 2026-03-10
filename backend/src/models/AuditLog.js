module.exports = (sequelize, DataTypes) => {
    return sequelize.define('AuditLog', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        action: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        entity_type: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        old_values: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        new_values: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'audit_logs',
        timestamps: false,
        underscored: true
    });
};

