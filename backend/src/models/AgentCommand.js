module.exports = (sequelize, DataTypes) => {
    return sequelize.define('AgentCommand', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        agent_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'agents',
                key: 'id'
            }
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        command_type: {
            type: DataTypes.ENUM('chkdsk', 'sfc', 'diskpart', 'powershell', 'cmd', 'custom'),
            allowNull: false
        },
        command_text: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        parameters: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        status: {
            type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
            defaultValue: 'pending'
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 5,
            validate: {
                min: 1,
                max: 10
            }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        started_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        result_output: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        result_error: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        exit_code: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        execution_time_ms: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'agent_commands',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false // We don't have updated_at in the schema
    });
};

