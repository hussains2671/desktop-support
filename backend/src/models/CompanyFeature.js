module.exports = (sequelize, DataTypes) => {
    return sequelize.define('CompanyFeature', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
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
        tableName: 'company_features',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['company_id', 'feature_id']
            }
        ]
    });
};

