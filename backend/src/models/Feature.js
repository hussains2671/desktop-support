module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Feature', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        is_premium: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        }
        // Note: features table only has created_at, not updated_at
    }, {
        tableName: 'features',
        timestamps: false, // Disable timestamps since only created_at exists
        underscored: true
    });
};

