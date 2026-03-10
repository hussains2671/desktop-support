module.exports = (sequelize, DataTypes) => {
    return sequelize.define('TicketComment', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        ticket_id: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        is_internal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        attachment_url: {
            type: DataTypes.STRING(500),
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
        tableName: 'ticket_comments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['ticket_id'] },
            { fields: ['user_id'] },
            { fields: ['company_id'] },
            { fields: ['created_at'] }
        ]
    });
};
