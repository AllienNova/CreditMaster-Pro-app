"use strict";
/**
 * CPFI Mobile Investment API Service
 * Handles all investment-related API calls using the core API client
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.investmentsApi = void 0;
var client_1 = require("./client");
// Investment API Methods
exports.investmentsApi = {
    /**
     * Get user's portfolio with summary, holdings, and allocations
     */
    getPortfolio: function (period, config) {
        return client_1.default.get("/investments/portfolio".concat(period ? "?period=".concat(period) : ''), __assign({ enableCache: true, cacheTime: 60000 }, config));
    },
    /**
     * Get all holdings for the user
     */
    getHoldings: function (params, config) {
        var queryParams = new URLSearchParams();
        if (params === null || params === void 0 ? void 0 : params.sortBy)
            queryParams.append('sortBy', params.sortBy);
        if (params === null || params === void 0 ? void 0 : params.sortOrder)
            queryParams.append('sortOrder', params.sortOrder);
        if (params === null || params === void 0 ? void 0 : params.type)
            queryParams.append('type', params.type);
        var query = queryParams.toString();
        return client_1.default.get("/investments/holdings".concat(query ? "?".concat(query) : ''), config);
    },
    /**
     * Get a single holding by ID
     */
    getHolding: function (id, config) {
        return client_1.default.get("/investments/holdings/".concat(id), config);
    },
    /**
     * Create a new holding
     */
    createHolding: function (data, config) {
        return client_1.default.post('/investments/holdings', data, config);
    },
    /**
     * Update an existing holding
     */
    updateHolding: function (id, data, config) {
        return client_1.default.patch("/investments/holdings/".concat(id), data, config);
    },
    /**
     * Delete a holding
     */
    deleteHolding: function (id, config) {
        return client_1.default.delete("/investments/holdings/".concat(id), config);
    },
    /**
     * Get stock analysis for a symbol
     */
    analyzeStock: function (symbol, config) {
        return client_1.default.get("/investments/analyze/".concat(symbol), __assign({ enableCache: true, cacheTime: 300000 }, config));
    },
    /**
     * Get AI-powered investment recommendation
     */
    getRecommendation: function (symbol, includePrice, config) {
        return client_1.default.post('/investments/recommendations', {
            symbol: symbol,
            includePrice: includePrice !== null && includePrice !== void 0 ? includePrice : true,
        }, config);
    },
    /**
     * Scan for chart patterns on a symbol
     */
    scanPatterns: function (symbol, timeframe, config) {
        return client_1.default.post('/investments/patterns', {
            symbol: symbol,
            timeframe: timeframe !== null && timeframe !== void 0 ? timeframe : '1d',
        }, config);
    },
    /**
     * Get pattern information
     */
    getPatternInfo: function (patternType, config) {
        return client_1.default.get("/investments/patterns".concat(patternType ? "?type=".concat(patternType) : ''), config);
    },
    /**
     * Analyze portfolio with risk metrics
     */
    analyzePortfolio: function (holdings, options, config) {
        return client_1.default.post('/investments/portfolio/analyze', __assign({ holdings: holdings }, options), config);
    },
    /**
     * Get user's portfolio analysis
     */
    getUserPortfolioAnalysis: function (config) {
        return client_1.default.get('/investments/portfolio/analyze', __assign({ enableCache: true, cacheTime: 60000 }, config));
    },
};
exports.default = exports.investmentsApi;
