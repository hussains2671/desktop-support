module.exports = (sequelize, DataTypes) => {
    return sequelize.define('NetworkInfo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        adapter_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        adapter_type: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        mac_address: {
            type: DataTypes.STRING(17),
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        subnet_mask: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        gateway: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        dns_servers: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        is_dhcp_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        connection_status: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        speed_mbps: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        detected_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'network_info',
        timestamps: true,
        underscored: true
    });
};

