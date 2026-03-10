module.exports = (sequelize, DataTypes) => {
    return sequelize.define('SoftwareInventory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        version: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        publisher: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        install_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        install_location: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        size_bytes: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        detected_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'software_inventory',
        timestamps: true,
        underscored: true
    });
};

