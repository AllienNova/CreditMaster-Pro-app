"use strict";
/**
 * CPFI Mobile Credit API Service
 * Handles all credit score, monitoring, and bureau-related API calls
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditReportApi = exports.creditMonitoringApi = exports.creditScoreApi = void 0;
var client_1 = require("./client");
// Credit Score Endpoints
exports.creditScoreApi = {
    /**
     * Get all current credit scores from connected bureaus
     */
    getScores: function () {
        return client_1.api.get('/credit/scores', { enableCache: true, cacheTime: 5 * 60 * 1000 });
    },
    /**
     * Get credit score from specific bureau
     */
    getScoreByBureau: function (bureau) {
        return client_1.api.get("/credit/scores/".concat(bureau));
    },
    /**
     * Get credit score history
     */
    getHistory: function (months) {
        return client_1.api.get("/credit/scores/history".concat(months ? "?months=".concat(months) : ''));
    },
    /**
     * Get credit score factors analysis
     */
    getFactors: function () {
        return client_1.api.get('/credit/factors');
    },
    /**
     * Simulate score impact for potential actions
     */
    simulateImpact: function (scenarios) {
        return client_1.api.post('/credit/simulate', scenarios);
    },
    /**
     * Request a fresh credit score pull
     */
    refreshScores: function () {
        return client_1.api.post('/credit/scores/refresh');
    },
};
// Credit Monitoring Endpoints
exports.creditMonitoringApi = {
    /**
     * Get monitoring status and connection info
     */
    getStatus: function () {
        return client_1.api.get('/credit/monitoring/status');
    },
    /**
     * Enable/disable monitoring for a bureau
     */
    toggleBureauMonitoring: function (bureau, enabled) {
        return client_1.api.patch("/credit/monitoring/bureaus/".concat(bureau), { enabled: enabled });
    },
    /**
     * Get all monitoring alerts
     */
    getAlerts: function (params) {
        var queryParams = new URLSearchParams();
        if (params === null || params === void 0 ? void 0 : params.page)
            queryParams.append('page', params.page.toString());
        if (params === null || params === void 0 ? void 0 : params.limit)
            queryParams.append('limit', params.limit.toString());
        if (params === null || params === void 0 ? void 0 : params.unreadOnly)
            queryParams.append('unread', 'true');
        if (params === null || params === void 0 ? void 0 : params.severity)
            queryParams.append('severity', params.severity);
        var query = queryParams.toString();
        return client_1.api.get("/credit/monitoring/alerts".concat(query ? "?".concat(query) : ''));
    },
    /**
     * Get single alert by ID
     */
    getAlert: function (alertId) {
        return client_1.api.get("/credit/monitoring/alerts/".concat(alertId));
    },
    /**
     * Acknowledge an alert
     */
    acknowledgeAlert: function (alertId) {
        return client_1.api.patch("/credit/monitoring/alerts/".concat(alertId, "/acknowledge"));
    },
    /**
     * Acknowledge all alerts
     */
    acknowledgeAllAlerts: function () {
        return client_1.api.post('/credit/monitoring/alerts/acknowledge-all');
    },
    /**
     * Update monitoring preferences
     */
    updatePreferences: function (preferences) {
        return client_1.api.patch('/credit/monitoring/preferences', preferences);
    },
    /**
     * Connect to a credit bureau
     */
    connectBureau: function (bureau, credentials) {
        return client_1.api.post("/credit/monitoring/bureaus/".concat(bureau, "/connect"), credentials);
    },
    /**
     * Disconnect from a credit bureau
     */
    disconnectBureau: function (bureau) {
        return client_1.api.delete("/credit/monitoring/bureaus/".concat(bureau));
    },
};
// Credit Report Endpoints
exports.creditReportApi = {
    /**
     * Get list of credit reports
     */
    getReports: function () {
        return client_1.api.get('/credit/reports');
    },
    /**
     * Get single credit report
     */
    getReport: function (reportId) {
        return client_1.api.get("/credit/reports/".concat(reportId));
    },
    /**
     * Upload and analyze a credit report
     */
    uploadReport: function (file) { return __awaiter(void 0, void 0, void 0, function () {
        var supabase, session, formData, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('../supabase'); })];
                case 1:
                    supabase = (_a.sent()).supabase;
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_a.sent()).data.session;
                    formData = new FormData();
                    formData.append('file', {
                        uri: file.uri,
                        name: file.name,
                        type: file.type,
                    });
                    return [4 /*yield*/, fetch("".concat(process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api', "/credit/reports/upload"), {
                            method: 'POST',
                            headers: {
                                Authorization: "Bearer ".concat(session === null || session === void 0 ? void 0 : session.access_token),
                            },
                            body: formData,
                        })];
                case 3:
                    response = _a.sent();
                    return [2 /*return*/, response.json()];
            }
        });
    }); },
    /**
     * Request AI analysis of a report
     */
    analyzeReport: function (reportId) {
        return client_1.api.post("/credit/reports/".concat(reportId, "/analyze"));
    },
};
exports.default = {
    scores: exports.creditScoreApi,
    monitoring: exports.creditMonitoringApi,
    reports: exports.creditReportApi,
};
