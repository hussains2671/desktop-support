module.exports = (sequelize, DataTypes) => {
    return sequelize.define('AgentConfiguration', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        config_key: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        config_value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'agent_configurations',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['company_id', 'config_key']
            }
        ]
    });
};

