const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/featureCheck');

router.use(authenticate);
router.use(checkFeature('ai_insights'));

router.post('/analyze-logs', aiController.analyzeLogs);
router.get('/insights', aiController.getInsights);

module.exports = router;

