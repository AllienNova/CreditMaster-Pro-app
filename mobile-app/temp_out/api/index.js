"use strict";
/**
 * CPFI Mobile API Service Layer
 *
 * Comprehensive API service with:
 * - Type-safe API calls
 * - Automatic authentication
 * - Retry logic with exponential backoff
 * - Offline support with request queuing
 * - Response caching
 * - Error handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.syncOfflineData = exports.initializeServices = exports.cpfiApi = exports.investmentsApi = exports.settingsApi = exports.documentApi = exports.identityProtectionApi = exports.recommendationApi = exports.notificationApi = exports.subscriptionApi = exports.userProfileApi = exports.billsApi = exports.debtApi = exports.financialGoalsApi = exports.budgetApi = exports.transactionApi = exports.bankAccountApi = exports.financialOverviewApi = exports.disputeResourcesApi = exports.disputeLetterApi = exports.disputeApi = exports.creditReportApi = exports.creditMonitoringApi = exports.creditScoreApi = exports.processOfflineQueue = exports.initializeApiClient = exports.apiRequest = exports.apiClient = exports.api = void 0;
// Core client
var client_1 = require("./client");
Object.defineProperty(exports, "api", { enumerable: true, get: function () { return client_1.api; } });
Object.defineProperty(exports, "apiClient", { enumerable: true, get: function () { return client_1.api; } });
Object.defineProperty(exports, "apiRequest", { enumerable: true, get: function () { return client_1.apiRequest; } });
Object.defineProperty(exports, "initializeApiClient", { enumerable: true, get: function () { return client_1.initializeApiClient; } });
Object.defineProperty(exports, "processOfflineQueue", { enumerable: true, get: function () { return client_1.processOfflineQueue; } });
// API modules
var credit_1 = require("./credit");
Object.defineProperty(exports, "creditScoreApi", { enumerable: true, get: function () { return credit_1.creditScoreApi; } });
Object.defineProperty(exports, "creditMonitoringApi", { enumerable: true, get: function () { return credit_1.creditMonitoringApi; } });
Object.defineProperty(exports, "creditReportApi", { enumerable: true, get: function () { return credit_1.creditReportApi; } });
var disputes_1 = require("./disputes");
Object.defineProperty(exports, "disputeApi", { enumerable: true, get: function () { return disputes_1.disputeApi; } });
Object.defineProperty(exports, "disputeLetterApi", { enumerable: true, get: function () { return disputes_1.disputeLetterApi; } });
Object.defineProperty(exports, "disputeResourcesApi", { enumerable: true, get: function () { return disputes_1.disputeResourcesApi; } });
var financial_1 = require("./financial");
Object.defineProperty(exports, "financialOverviewApi", { enumerable: true, get: function () { return financial_1.financialOverviewApi; } });
Object.defineProperty(exports, "bankAccountApi", { enumerable: true, get: function () { return financial_1.bankAccountApi; } });
Object.defineProperty(exports, "transactionApi", { enumerable: true, get: function () { return financial_1.transactionApi; } });
Object.defineProperty(exports, "budgetApi", { enumerable: true, get: function () { return financial_1.budgetApi; } });
Object.defineProperty(exports, "financialGoalsApi", { enumerable: true, get: function () { return financial_1.financialGoalsApi; } });
Object.defineProperty(exports, "debtApi", { enumerable: true, get: function () { return financial_1.debtApi; } });
Object.defineProperty(exports, "billsApi", { enumerable: true, get: function () { return financial_1.billsApi; } });
var user_1 = require("./user");
Object.defineProperty(exports, "userProfileApi", { enumerable: true, get: function () { return user_1.userProfileApi; } });
Object.defineProperty(exports, "subscriptionApi", { enumerable: true, get: function () { return user_1.subscriptionApi; } });
Object.defineProperty(exports, "notificationApi", { enumerable: true, get: function () { return user_1.notificationApi; } });
Object.defineProperty(exports, "recommendationApi", { enumerable: true, get: function () { return user_1.recommendationApi; } });
Object.defineProperty(exports, "identityProtectionApi", { enumerable: true, get: function () { return user_1.identityProtectionApi; } });
Object.defineProperty(exports, "documentApi", { enumerable: true, get: function () { return user_1.documentApi; } });
Object.defineProperty(exports, "settingsApi", { enumerable: true, get: function () { return user_1.settingsApi; } });
var investments_1 = require("./investments");
Object.defineProperty(exports, "investmentsApi", { enumerable: true, get: function () { return investments_1.investmentsApi; } });
// Type exports
__exportStar(require("./types"), exports);
// Default exports for convenience
var credit_2 = require("./credit");
var disputes_2 = require("./disputes");
var financial_2 = require("./financial");
var user_2 = require("./user");
var investments_2 = require("./investments");
/**
 * Unified API object for easy access to all services
 */
exports.cpfiApi = {
    // Credit services
    credit: credit_2.default,
    // Dispute services
    disputes: disputes_2.default,
    // Financial services
    financial: financial_2.default,
    // User services
    user: user_2.default,
    // Investment services
    investments: investments_2.default,
};
exports.default = exports.cpfiApi;
/**
 * API Service initialization
 * Call this on app startup to initialize offline queue and other features
 */
function initializeServices() {
    return __awaiter(this, void 0, void 0, function () {
        var initializeApiClient;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./client'); })];
                case 1:
                    initializeApiClient = (_a.sent()).initializeApiClient;
                    return [4 /*yield*/, initializeApiClient()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.initializeServices = initializeServices;
/**
 * Hook to sync offline requests when connectivity is restored
 */
function syncOfflineData() {
    return __awaiter(this, void 0, void 0, function () {
        var processOfflineQueue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./client'); })];
                case 1:
                    processOfflineQueue = (_a.sent()).processOfflineQueue;
                    return [2 /*return*/, processOfflineQueue()];
            }
        });
    });
}
exports.syncOfflineData = syncOfflineData;
