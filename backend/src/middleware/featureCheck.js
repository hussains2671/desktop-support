const { Company, Plan, Feature, CompanyFeature, PlanFeature } = require('../models');
const logger = require('../utils/logger');

function checkFeature(featureCode) {
    return async (req, res, next) => {
        try {
            const companyId = req.companyId || req.user?.company_id;
            
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID required'
                });
            }

            const isEnabled = await isFeatureEnabled(companyId, featureCode);
            
            if (!isEnabled) {
                return res.status(403).json({
                    success: false,
                    message: `Feature '${featureCode}' is not available in your plan. Please upgrade.`,
                    featureCode: featureCode
                });
            }
            
            next();
        } catch (error) {
            logger.error('Feature check error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };
}

async function isFeatureEnabled(companyId, featureCode) {
    try {
        // First, find the feature by code
        const feature = await Feature.findOne({
            where: { code: featureCode }
        });
        
        if (!feature) {
            return false;
        }
        
        // Check company-specific overrides first
        const companyFeature = await CompanyFeature.findOne({
            where: { 
                company_id: companyId,
                feature_id: feature.id
            }
        });
        
        if (companyFeature) {
            return companyFeature.is_enabled;
        }
        
        // Check plan default features
        const company = await Company.findByPk(companyId, {
            include: [{
                model: Plan,
                as: 'Plan',
                include: [{
                    model: Feature,
                    as: 'Features',
                    where: { code: featureCode },
                    required: false,
                    through: {
                        attributes: ['is_enabled']
                    }
                }]
            }]
        });
        
        if (company?.Plan?.Features?.length > 0) {
            const planFeature = company.Plan.Features[0];
            return planFeature.PlanFeature?.is_enabled ?? false;
        }
        
        return false;
    } catch (error) {
        logger.error('Feature check error:', error);
        return false;
    }
}

module.exports = { checkFeature, isFeatureEnabled };

