module.exports = (sequelize, DataTypes) => {
    return sequelize.define('PerformanceMetric', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        cpu_usage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true
        },
        memory_usage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true
        },
        memory_total_gb: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        memory_available_gb: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        disk_usage_c: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true
        },
        disk_free_c_gb: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        disk_total_c_gb: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        network_sent_mb: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        network_received_mb: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        temperature_cpu: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true
        },
        uptime_seconds: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        boot_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        recorded_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'performance_metrics',
        timestamps: true,
        underscored: true
    });
};

