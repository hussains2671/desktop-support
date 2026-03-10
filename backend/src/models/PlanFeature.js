module.exports = (sequelize, DataTypes) => {
    return sequelize.define('PlanFeature', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        feature_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'plan_features',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['plan_id', 'feature_id']
            }
        ]
    });
};

