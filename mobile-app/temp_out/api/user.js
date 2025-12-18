"use strict";
/**
 * CPFI Mobile User API Service
 * Handles user profile, subscriptions, notifications, and settings
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
exports.settingsApi = exports.documentApi = exports.identityProtectionApi = exports.recommendationApi = exports.notificationApi = exports.subscriptionApi = exports.userProfileApi = void 0;
var client_1 = require("./client");
// User Profile Endpoints
exports.userProfileApi = {
    /**
     * Get current user profile
     */
    getProfile: function () {
        return client_1.api.get('/user/profile');
    },
    /**
     * Update user profile
     */
    updateProfile: function (updates) {
        return client_1.api.patch('/user/profile', updates);
    },
    /**
     * Upload avatar
     */
    uploadAvatar: function (file) { return __awaiter(void 0, void 0, void 0, function () {
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
                    formData.append('avatar', {
                        uri: file.uri,
                        name: file.name,
                        type: file.type,
                    });
                    return [4 /*yield*/, fetch("".concat(process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api', "/user/avatar"), {
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
     * Delete account
     */
    deleteAccount: function (confirmation) {
        return client_1.api.post('/user/delete-account', { confirmation: confirmation });
    },
    /**
     * Get onboarding status
     */
    getOnboardingStatus: function () {
        return client_1.api.get('/user/onboarding');
    },
    /**
     * Update onboarding progress
     */
    updateOnboarding: function (step, data) {
        return client_1.api.patch('/user/onboarding', { step: step, data: data });
    },
    /**
     * Complete onboarding
     */
    completeOnboarding: function () {
        return client_1.api.post('/user/onboarding/complete');
    },
};
// Subscription Endpoints
exports.subscriptionApi = {
    /**
     * Get current subscription
     */
    getCurrent: function () {
        return client_1.api.get('/user/subscription');
    },
    /**
     * Get available plans
     */
    getPlans: function () {
        return client_1.api.get('/subscription/plans', { enableCache: true, cacheTime: 60 * 60 * 1000 });
    },
    /**
     * Create checkout session
     */
    createCheckout: function (priceId) {
        return client_1.api.post('/payment/checkout', { priceId: priceId });
    },
    /**
     * Upgrade subscription
     */
    upgrade: function (planId) {
        return client_1.api.post('/user/subscription/upgrade', { planId: planId });
    },
    /**
     * Cancel subscription
     */
    cancel: function () {
        return client_1.api.post('/user/subscription/cancel');
    },
    /**
     * Reactivate subscription
     */
    reactivate: function () {
        return client_1.api.post('/user/subscription/reactivate');
    },
    /**
     * Get billing history
     */
    getBillingHistory: function () {
        return client_1.api.get('/user/billing/history');
    },
    /**
     * Update payment method
     */
    updatePaymentMethod: function (paymentMethodId) {
        return client_1.api.post('/user/billing/payment-method', { paymentMethodId: paymentMethodId });
    },
};
// Notification Endpoints
exports.notificationApi = {
    /**
     * Get all notifications
     */
    getAll: function (params) {
        var queryParams = new URLSearchParams();
        if (params === null || params === void 0 ? void 0 : params.page)
            queryParams.append('page', params.page.toString());
        if (params === null || params === void 0 ? void 0 : params.limit)
            queryParams.append('limit', params.limit.toString());
        if (params === null || params === void 0 ? void 0 : params.unreadOnly)
            queryParams.append('unread', 'true');
        var query = queryParams.toString();
        return client_1.api.get("/notifications".concat(query ? "?".concat(query) : ''));
    },
    /**
     * Mark notification as read
     */
    markAsRead: function (notificationId) {
        return client_1.api.patch("/notifications/".concat(notificationId, "/read"));
    },
    /**
     * Mark all as read
     */
    markAllAsRead: function () {
        return client_1.api.post('/notifications/read-all');
    },
    /**
     * Get notification preferences
     */
    getPreferences: function () {
        return client_1.api.get('/notifications/preferences');
    },
    /**
     * Update notification preferences
     */
    updatePreferences: function (preferences) {
        return client_1.api.patch('/notifications/preferences', preferences);
    },
    /**
     * Register push token
     */
    registerPushToken: function (token, platform) {
        return client_1.api.post('/notifications/push-token', { token: token, platform: platform });
    },
    /**
     * Delete notification
     */
    delete: function (notificationId) {
        return client_1.api.delete("/notifications/".concat(notificationId));
    },
};
// Recommendations Endpoints
exports.recommendationApi = {
    /**
     * Get personalized recommendations
     */
    getAll: function () {
        return client_1.api.get('/user/recommendations');
    },
    /**
     * Get recommendations by type
     */
    getByType: function (type) {
        return client_1.api.get("/user/recommendations?type=".concat(type));
    },
    /**
     * Dismiss recommendation
     */
    dismiss: function (recommendationId) {
        return client_1.api.patch("/user/recommendations/".concat(recommendationId, "/dismiss"));
    },
    /**
     * Track recommendation click
     */
    trackClick: function (recommendationId) {
        return client_1.api.post("/user/recommendations/".concat(recommendationId, "/click"));
    },
};
// Identity Protection Endpoints
exports.identityProtectionApi = {
    /**
     * Get identity protection status
     */
    getStatus: function () {
        return client_1.api.get('/identity/status');
    },
    /**
     * Enable dark web monitoring
     */
    enableDarkWebMonitoring: function (personalInfo) {
        return client_1.api.post('/identity/dark-web/enable', personalInfo);
    },
    /**
     * Disable dark web monitoring
     */
    disableDarkWebMonitoring: function () {
        return client_1.api.post('/identity/dark-web/disable');
    },
    /**
     * Get identity alerts
     */
    getAlerts: function () {
        return client_1.api.get('/identity/alerts');
    },
    /**
     * Mark alert as resolved
     */
    resolveAlert: function (alertId) {
        return client_1.api.patch("/identity/alerts/".concat(alertId, "/resolve"));
    },
    /**
     * Request manual scan
     */
    requestScan: function () {
        return client_1.api.post('/identity/scan');
    },
};
// Document Endpoints
exports.documentApi = {
    /**
     * Get all documents
     */
    getAll: function () {
        return client_1.api.get('/documents');
    },
    /**
     * Get document by ID
     */
    getById: function (documentId) {
        return client_1.api.get("/documents/".concat(documentId));
    },
    /**
     * Upload document
     */
    upload: function (file, docType) { return __awaiter(void 0, void 0, void 0, function () {
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
                    formData.append('type', docType);
                    return [4 /*yield*/, fetch("".concat(process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api', "/documents/upload"), {
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
     * Analyze document
     */
    analyze: function (documentId) {
        return client_1.api.post("/documents/".concat(documentId, "/analyze"));
    },
    /**
     * Delete document
     */
    delete: function (documentId) {
        return client_1.api.delete("/documents/".concat(documentId));
    },
    /**
     * Get document download URL
     */
    getDownloadUrl: function (documentId) {
        return client_1.api.get("/documents/".concat(documentId, "/download"));
    },
};
// Settings Endpoints
exports.settingsApi = {
    /**
     * Get user settings
     */
    getAll: function () {
        return client_1.api.get('/user/settings');
    },
    /**
     * Update settings
     */
    update: function (settings) {
        return client_1.api.patch('/user/settings', settings);
    },
    /**
     * Enable two-factor authentication
     */
    enable2FA: function () {
        return client_1.api.post('/user/settings/2fa/enable');
    },
    /**
     * Verify two-factor authentication
     */
    verify2FA: function (code) {
        return client_1.api.post('/user/settings/2fa/verify', { code: code });
    },
    /**
     * Disable two-factor authentication
     */
    disable2FA: function (code) {
        return client_1.api.post('/user/settings/2fa/disable', { code: code });
    },
    /**
     * Export user data
     */
    exportData: function () {
        return client_1.api.post('/user/data-export');
    },
};
exports.default = {
    profile: exports.userProfileApi,
    subscription: exports.subscriptionApi,
    notifications: exports.notificationApi,
    recommendations: exports.recommendationApi,
    identityProtection: exports.identityProtectionApi,
    documents: exports.documentApi,
    settings: exports.settingsApi,
};
