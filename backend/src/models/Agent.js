module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Agent', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        device_id: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        agent_key: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        hostname: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        os_version: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        agent_version: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        last_heartbeat: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('online', 'offline', 'error'),
            defaultValue: 'offline'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        }
    }, {
        tableName: 'agents',
        timestamps: true,
        underscored: true
    });
};

