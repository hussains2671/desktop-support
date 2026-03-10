module.exports = (sequelize, DataTypes) => {
    return sequelize.define('EventLog', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        log_type: {
            type: DataTypes.ENUM('system', 'application', 'security', 'hardware', 'custom'),
            allowNull: false
        },
        event_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        level: {
            type: DataTypes.ENUM('critical', 'error', 'warning', 'information', 'verbose'),
            allowNull: false
        },
        source: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        user_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        computer_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        time_generated: {
            type: DataTypes.DATE,
            allowNull: false
        },
        raw_data: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {}
        }
    }, {
        tableName: 'event_logs',
        timestamps: true,
        underscored: true
    });
};

