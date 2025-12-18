"use strict";
/**
 * CPFI Mobile Disputes API Service
 * Handles all dispute-related API calls including AI-powered letter generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.disputeResourcesApi = exports.disputeLetterApi = exports.disputeApi = void 0;
var client_1 = require("./client");
// Dispute CRUD Endpoints
exports.disputeApi = {
    /**
     * Get all disputes for current user
     */
    getAll: function (params) {
        var queryParams = new URLSearchParams();
        if (params === null || params === void 0 ? void 0 : params.page)
            queryParams.append('page', params.page.toString());
        if (params === null || params === void 0 ? void 0 : params.limit)
            queryParams.append('limit', params.limit.toString());
        if (params === null || params === void 0 ? void 0 : params.status)
            queryParams.append('status', params.status);
        if (params === null || params === void 0 ? void 0 : params.bureau)
            queryParams.append('bureau', params.bureau);
        var query = queryParams.toString();
        return client_1.api.get("/disputes".concat(query ? "?".concat(query) : ''));
    },
    /**
     * Get single dispute by ID
     */
    getById: function (disputeId) {
        return client_1.api.get("/disputes/".concat(disputeId));
    },
    /**
     * Create a new dispute
     */
    create: function (dispute) {
        return client_1.api.post('/disputes', dispute);
    },
    /**
     * Update an existing dispute
     */
    update: function (disputeId, updates) {
        return client_1.api.patch("/disputes/".concat(disputeId), updates);
    },
    /**
     * Delete a dispute
     */
    delete: function (disputeId) {
        return client_1.api.delete("/disputes/".concat(disputeId));
    },
    /**
     * Mark dispute as sent
     */
    markAsSent: function (disputeId, sentDate) {
        return client_1.api.patch("/disputes/".concat(disputeId, "/send"), { sentDate: sentDate || new Date().toISOString() });
    },
    /**
     * Get dispute statistics
     */
    getStats: function () {
        return client_1.api.get('/disputes/stats');
    },
};
// AI Letter Generation Endpoints
exports.disputeLetterApi = {
    /**
     * Generate AI-powered dispute letter
     */
    generateAILetter: function (disputeId) {
        return client_1.api.post("/disputes/".concat(disputeId, "/generate"), { mode: 'ai' });
    },
    /**
     * Generate letter from template
     */
    generateFromTemplate: function (templateId, placeholders) {
        return client_1.api.post('/disputes/generate', {
            mode: 'template',
            templateId: templateId,
            placeholders: placeholders,
        });
    },
    /**
     * Generate letter using strategy
     */
    generateFromStrategy: function (strategyId, variables) {
        return client_1.api.post('/disputes/generate', {
            mode: 'strategy',
            strategyId: strategyId,
            variables: variables,
        });
    },
    /**
     * Get strategy recommendations based on scenario
     */
    getStrategyRecommendations: function (scenario) {
        return client_1.api.post('/disputes/recommend-strategy', scenario);
    },
    /**
     * Save generated letter to dispute
     */
    saveLetter: function (disputeId, letterContent) {
        return client_1.api.patch("/disputes/".concat(disputeId), { letterContent: letterContent });
    },
};
// Templates and Strategies Endpoints
exports.disputeResourcesApi = {
    /**
     * Get all available templates
     */
    getTemplates: function (category) {
        return client_1.api.get("/disputes/templates".concat(category ? "?category=".concat(category) : ''), { enableCache: true, cacheTime: 30 * 60 * 1000 } // Cache for 30 minutes
        );
    },
    /**
     * Get single template by ID
     */
    getTemplate: function (templateId) {
        return client_1.api.get("/disputes/templates/".concat(templateId));
    },
    /**
     * Get all available strategies
     */
    getStrategies: function (difficulty) {
        return client_1.api.get("/disputes/strategies".concat(difficulty ? "?difficulty=".concat(difficulty) : ''), { enableCache: true, cacheTime: 30 * 60 * 1000 });
    },
    /**
     * Get single strategy by ID
     */
    getStrategy: function (strategyId) {
        return client_1.api.get("/disputes/strategies/".concat(strategyId));
    },
};
exports.default = {
    disputes: exports.disputeApi,
    letters: exports.disputeLetterApi,
    resources: exports.disputeResourcesApi,
};
