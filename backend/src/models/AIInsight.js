module.exports = (sequelize, DataTypes) => {
    return sequelize.define('AIInsight', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        insight_type: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        summary: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        analysis: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        recommendations: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: []
        },
        confidence_score: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true
        },
        related_log_ids: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: []
        },
        status: {
            type: DataTypes.ENUM('new', 'reviewed', 'applied', 'dismissed'),
            defaultValue: 'new'
        },
        created_by_ai: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'ai_insights',
        timestamps: true,
        underscored: true
    });
};

