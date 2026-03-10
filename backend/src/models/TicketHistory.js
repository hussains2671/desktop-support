module.exports = (sequelize, DataTypes) => {
    return sequelize.define('TicketHistory', {
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
        change_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['status_change', 'assigned', 'priority_change', 'ticket_created', 'ticket_resolved']]
            }
        },
        old_value: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        new_value: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        changed_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        }
    }, {
        tableName: 'ticket_history',
        timestamps: false,
        underscored: true,
        indexes: [
            { fields: ['ticket_id'] },
            { fields: ['company_id'] },
            { fields: ['change_type'] },
            { fields: ['created_at'] }
        ]
    });
};
