module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Plan', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        display_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        max_agents: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        max_devices: {
            type: DataTypes.INTEGER,
            defaultValue: 50
        },
        is_custom: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'plans',
        timestamps: true,
        underscored: true
    });
};

