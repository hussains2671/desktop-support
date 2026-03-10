module.exports = (sequelize, DataTypes) => {
    return sequelize.define('HardwareInventory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        component_type: {
            type: DataTypes.ENUM('cpu', 'ram', 'hdd', 'ssd', 'gpu', 'display', 'keyboard', 'touchpad', 'motherboard', 'battery', 'network_adapter'),
            allowNull: false
        },
        manufacturer: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        model: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        serial_number: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        part_number: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        capacity: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        type: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        interface: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        health_status: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        firmware_version: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        additional_data: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {}
        },
        detected_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'hardware_inventory',
        timestamps: true,
        underscored: true
    });
};

