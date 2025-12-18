"use strict";
/**
 * CPFI Mobile API Client
 * Core HTTP client with authentication, retry logic, offline support, and error handling
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.apiRequest = exports.processOfflineQueue = exports.initializeApiClient = void 0;
var react_native_1 = require("react-native");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var supabase_1 = require("../supabase");
// Configuration
var API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cpfi.com/api';
var DEFAULT_TIMEOUT = 30000;
var MAX_RETRIES = 3;
var RETRY_DELAY = 1000;
var CACHE_PREFIX = 'cpfi_cache_';
var OFFLINE_QUEUE_KEY = 'cpfi_offline_queue';
// Retry configuration for different error types
var RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
var RETRYABLE_ERRORS = ['NETWORK_ERROR', 'TIMEOUT', 'ECONNRESET', 'ETIMEDOUT'];
var offlineQueue = [];
/**
 * Initialize the API client - load offline queue from storage
 */
function initializeApiClient() {
    return __awaiter(this, void 0, void 0, function () {
        var stored, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.getItem(OFFLINE_QUEUE_KEY)];
                case 1:
                    stored = _a.sent();
                    if (stored) {
                        offlineQueue = JSON.parse(stored);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.warn('Failed to load offline queue:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.initializeApiClient = initializeApiClient;
/**
 * Check if device is online
 */
function isOnline() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (react_native_1.Platform.OS === 'web') {
                return [2 /*return*/, navigator.onLine];
            }
            // For mobile, we'll use the NetInfo package when available
            // For now, return true and handle errors gracefully
            return [2 /*return*/, true];
        });
    });
}
/**
 * Get authentication token from Supabase session
 */
function getAuthToken() {
    return __awaiter(this, void 0, void 0, function () {
        var session, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getSession()];
                case 1:
                    session = (_a.sent()).data.session;
                    return [2 /*return*/, (session === null || session === void 0 ? void 0 : session.access_token) || null];
                case 2:
                    error_2 = _a.sent();
                    console.error('Failed to get auth token:', error_2);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt, baseDelay) {
    if (baseDelay === void 0) { baseDelay = RETRY_DELAY; }
    var exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    var maxDelay = 30000;
    var cappedDelay = Math.min(exponentialDelay, maxDelay);
    // Add jitter (±25%)
    var jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(cappedDelay + jitter);
}
/**
 * Check if error is retryable
 */
function isRetryableError(error, statusCode) {
    var _a, _b;
    if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
        return true;
    }
    if ((error === null || error === void 0 ? void 0 : error.code) && RETRYABLE_ERRORS.includes(error.code)) {
        return true;
    }
    if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('network')) {
        return true;
    }
    if ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('timeout')) {
        return true;
    }
    return false;
}
/**
 * Cache management
 */
function getCachedResponse(key) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, _a, data, expiry, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, async_storage_1.default.getItem("".concat(CACHE_PREFIX).concat(key))];
                case 1:
                    cached = _c.sent();
                    if (!cached)
                        return [2 /*return*/, null];
                    _a = JSON.parse(cached), data = _a.data, expiry = _a.expiry;
                    if (!(Date.now() > expiry)) return [3 /*break*/, 3];
                    return [4 /*yield*/, async_storage_1.default.removeItem("".concat(CACHE_PREFIX).concat(key))];
                case 2:
                    _c.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/, data];
                case 4:
                    _b = _c.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function setCachedResponse(key, data, ttlMs) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.setItem("".concat(CACHE_PREFIX).concat(key), JSON.stringify({
                            data: data,
                            expiry: Date.now() + ttlMs,
                        }))];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.warn('Failed to cache response:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Add request to offline queue
 */
function queueOfflineRequest(request) {
    return __awaiter(this, void 0, void 0, function () {
        var queuedRequest;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    queuedRequest = __assign(__assign({}, request), { id: "".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9)), timestamp: Date.now() });
                    offlineQueue.push(queuedRequest);
                    return [4 /*yield*/, async_storage_1.default.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Process offline queue when back online
 */
function processOfflineQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var processed, failed, remaining, _i, offlineQueue_1, request, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (offlineQueue.length === 0)
                        return [2 /*return*/, { processed: 0, failed: 0 }];
                    processed = 0;
                    failed = 0;
                    remaining = [];
                    _i = 0, offlineQueue_1 = offlineQueue;
                    _b.label = 1;
                case 1:
                    if (!(_i < offlineQueue_1.length)) return [3 /*break*/, 6];
                    request = offlineQueue_1[_i];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, apiRequest(request.endpoint, {
                            method: request.method,
                            body: request.body,
                        })];
                case 3:
                    _b.sent();
                    processed++;
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    // Keep failed requests for later retry if they're less than 24 hours old
                    if (Date.now() - request.timestamp < 24 * 60 * 60 * 1000) {
                        remaining.push(request);
                    }
                    failed++;
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    offlineQueue = remaining;
                    return [4 /*yield*/, async_storage_1.default.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue))];
                case 7:
                    _b.sent();
                    return [2 /*return*/, { processed: processed, failed: failed }];
            }
        });
    });
}
exports.processOfflineQueue = processOfflineQueue;
/**
 * Create API error from response
 */
function createApiError(message, code, details) {
    return {
        code: code,
        message: message,
        details: details,
        retryable: RETRYABLE_ERRORS.includes(code),
    };
}
/**
 * Core API request function with retry logic
 */
function apiRequest(endpoint, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var _a, timeout, _b, retryCount, _c, retryDelay, _d, enableCache, _e, cacheTime, _f, offlineSupport, fetchOptions, cacheKey, cached, online, token, headers, lastError, _loop_1, attempt, state_1;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _a = options.timeout, timeout = _a === void 0 ? DEFAULT_TIMEOUT : _a, _b = options.retryCount, retryCount = _b === void 0 ? MAX_RETRIES : _b, _c = options.retryDelay, retryDelay = _c === void 0 ? RETRY_DELAY : _c, _d = options.enableCache, enableCache = _d === void 0 ? false : _d, _e = options.cacheTime, cacheTime = _e === void 0 ? 5 * 60 * 1000 : _e, _f = options.offlineSupport, offlineSupport = _f === void 0 ? true : _f, fetchOptions = __rest(options, ["timeout", "retryCount", "retryDelay", "enableCache", "cacheTime", "offlineSupport"]);
                    cacheKey = "".concat(fetchOptions.method || 'GET', "_").concat(endpoint);
                    if (!(enableCache && (!fetchOptions.method || fetchOptions.method === 'GET'))) return [3 /*break*/, 2];
                    return [4 /*yield*/, getCachedResponse(cacheKey)];
                case 1:
                    cached = _g.sent();
                    if (cached) {
                        return [2 /*return*/, { success: true, data: cached, timestamp: new Date().toISOString() }];
                    }
                    _g.label = 2;
                case 2: return [4 /*yield*/, isOnline()];
                case 3:
                    online = _g.sent();
                    if (!(!online && offlineSupport && fetchOptions.method && fetchOptions.method !== 'GET')) return [3 /*break*/, 5];
                    return [4 /*yield*/, queueOfflineRequest({
                            endpoint: endpoint,
                            method: fetchOptions.method,
                            body: fetchOptions.body,
                        })];
                case 4:
                    _g.sent();
                    return [2 /*return*/, {
                            success: false,
                            error: createApiError('Request queued for when online', 'OFFLINE_QUEUED'),
                            message: 'You appear to be offline. This request will be processed when you reconnect.',
                        }];
                case 5: return [4 /*yield*/, getAuthToken()];
                case 6:
                    token = _g.sent();
                    headers = __assign({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Client-Platform': react_native_1.Platform.OS, 'X-Client-Version': process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0' }, (options.headers || {}));
                    if (token) {
                        headers['Authorization'] = "Bearer ".concat(token);
                    }
                    lastError = null;
                    _loop_1 = function (attempt) {
                        var controller, timeoutId, response, responseData, error, delay_1, error_4, delay_2, delay_3;
                        return __generator(this, function (_h) {
                            switch (_h.label) {
                                case 0:
                                    controller = new AbortController();
                                    timeoutId = setTimeout(function () { return controller.abort(); }, timeout);
                                    _h.label = 1;
                                case 1:
                                    _h.trys.push([1, 9, , 15]);
                                    return [4 /*yield*/, fetch("".concat(API_BASE_URL).concat(endpoint), __assign(__assign({}, fetchOptions), { headers: headers, signal: controller.signal }))];
                                case 2:
                                    response = _h.sent();
                                    clearTimeout(timeoutId);
                                    return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                                case 3:
                                    responseData = _h.sent();
                                    if (!!response.ok) return [3 /*break*/, 6];
                                    error = createApiError(responseData.message || responseData.error || "HTTP ".concat(response.status), "HTTP_".concat(response.status), responseData);
                                    if (!(attempt <= retryCount && isRetryableError(error, response.status))) return [3 /*break*/, 5];
                                    delay_1 = calculateRetryDelay(attempt, retryDelay);
                                    console.warn("API retry attempt ".concat(attempt, "/").concat(retryCount, " in ").concat(delay_1, "ms:"), error.message);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 4:
                                    _h.sent();
                                    return [2 /*return*/, "continue"];
                                case 5: return [2 /*return*/, { value: {
                                            success: false,
                                            error: error,
                                            message: error.message,
                                            timestamp: new Date().toISOString(),
                                        } }];
                                case 6:
                                    if (!(enableCache && (!fetchOptions.method || fetchOptions.method === 'GET'))) return [3 /*break*/, 8];
                                    return [4 /*yield*/, setCachedResponse(cacheKey, responseData, cacheTime)];
                                case 7:
                                    _h.sent();
                                    _h.label = 8;
                                case 8: return [2 /*return*/, { value: {
                                            success: true,
                                            data: responseData,
                                            timestamp: new Date().toISOString(),
                                        } }];
                                case 9:
                                    error_4 = _h.sent();
                                    clearTimeout(timeoutId);
                                    lastError = error_4;
                                    if (!(error_4.name === 'AbortError')) return [3 /*break*/, 12];
                                    if (!(attempt <= retryCount)) return [3 /*break*/, 11];
                                    delay_2 = calculateRetryDelay(attempt, retryDelay);
                                    console.warn("API timeout, retry attempt ".concat(attempt, "/").concat(retryCount, " in ").concat(delay_2, "ms"));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_2); })];
                                case 10:
                                    _h.sent();
                                    return [2 /*return*/, "continue"];
                                case 11: return [2 /*return*/, { value: {
                                            success: false,
                                            error: createApiError('Request timed out', 'TIMEOUT'),
                                            timestamp: new Date().toISOString(),
                                        } }];
                                case 12:
                                    if (!(isRetryableError(error_4) && attempt <= retryCount)) return [3 /*break*/, 14];
                                    delay_3 = calculateRetryDelay(attempt, retryDelay);
                                    console.warn("API error, retry attempt ".concat(attempt, "/").concat(retryCount, " in ").concat(delay_3, "ms:"), error_4.message);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_3); })];
                                case 13:
                                    _h.sent();
                                    return [2 /*return*/, "continue"];
                                case 14: return [2 /*return*/, { value: {
                                            success: false,
                                            error: createApiError(error_4.message || 'Network error', 'NETWORK_ERROR', { originalError: error_4.toString() }),
                                            timestamp: new Date().toISOString(),
                                        } }];
                                case 15: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 1;
                    _g.label = 7;
                case 7:
                    if (!(attempt <= retryCount + 1)) return [3 /*break*/, 10];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 8:
                    state_1 = _g.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _g.label = 9;
                case 9:
                    attempt++;
                    return [3 /*break*/, 7];
                case 10: 
                // Should not reach here, but handle just in case
                return [2 /*return*/, {
                        success: false,
                        error: createApiError((lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Unknown error', 'UNKNOWN_ERROR'),
                        timestamp: new Date().toISOString(),
                    }];
            }
        });
    });
}
exports.apiRequest = apiRequest;
// Convenience methods
exports.api = {
    get: function (endpoint, config) {
        return apiRequest(endpoint, __assign({ method: 'GET' }, config));
    },
    post: function (endpoint, body, config) {
        return apiRequest(endpoint, __assign({ method: 'POST', body: JSON.stringify(body) }, config));
    },
    put: function (endpoint, body, config) {
        return apiRequest(endpoint, __assign({ method: 'PUT', body: JSON.stringify(body) }, config));
    },
    patch: function (endpoint, body, config) {
        return apiRequest(endpoint, __assign({ method: 'PATCH', body: JSON.stringify(body) }, config));
    },
    delete: function (endpoint, config) {
        return apiRequest(endpoint, __assign({ method: 'DELETE' }, config));
    },
};
exports.default = exports.api;
