module.exports = (sequelize, DataTypes) => {
    return sequelize.define('SecurityStatus', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        antivirus_status: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        antivirus_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        antivirus_last_scan: {
            type: DataTypes.DATE,
            allowNull: true
        },
        firewall_status: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        bitlocker_status: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        windows_defender_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        last_security_update: {
            type: DataTypes.DATE,
            allowNull: true
        },
        checked_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'security_status',
        timestamps: true,
        underscored: true
    });
};

