module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Company', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        company_code: {
            type: DataTypes.STRING(16),
            unique: true,
            allowNull: true
        },
        domain: {
            type: DataTypes.STRING(255),
            unique: true,
            allowNull: true
        },
        subdomain: {
            type: DataTypes.STRING(100),
            unique: true,
            allowNull: true
        },
        plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('active', 'suspended', 'trial', 'cancelled'),
            defaultValue: 'trial'
        },
        max_agents: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        max_devices: {
            type: DataTypes.INTEGER,
            defaultValue: 50
        },
        trial_ends_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at'
        }
    }, {
        tableName: 'companies',
        timestamps: true,
        underscored: true
    });
};

