module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Device', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        agent_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        device_id: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        hostname: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        username: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        domain_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        os_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        os_version: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        os_build: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        os_architecture: {
            type: DataTypes.STRING(20),
            allowNull: true
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
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
            defaultValue: 'active'
        },
        last_seen: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'devices',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['company_id', 'device_id']
            }
        ]
    });
};

