const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

let genAI = null;

if (config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
}

module.exports = {
    getModel: (modelName = 'gemini-pro') => {
        if (!genAI) {
            throw new Error('Gemini API key not configured');
        }
        return genAI.getGenerativeModel({ model: modelName });
    },
    isConfigured: () => !!config.geminiApiKey
};

