module.exports = (sequelize, DataTypes) => {
    return sequelize.define('RemoteSession', {
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
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        session_type: {
            type: DataTypes.ENUM('vnc', 'rdp', 'ssh'),
            defaultValue: 'vnc'
        },
        status: {
            type: DataTypes.ENUM('active', 'ended', 'timeout', 'error'),
            defaultValue: 'active'
        },
        connection_string: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        vnc_password: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        vnc_port: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        websocket_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        started_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        ended_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        duration_seconds: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        tableName: 'remote_sessions',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
};

