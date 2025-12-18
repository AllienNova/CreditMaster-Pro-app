"use strict";
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
exports.getSession = exports.getCurrentUser = exports.resetPassword = exports.signOut = exports.signUp = exports.signIn = exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var SecureStore = require("expo-secure-store");
var react_native_1 = require("react-native");
var supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
var supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
// Custom storage adapter for React Native
var ExpoSecureStoreAdapter = {
    getItem: function (key) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (react_native_1.Platform.OS === 'web') {
                return [2 /*return*/, localStorage.getItem(key)];
            }
            return [2 /*return*/, SecureStore.getItemAsync(key)];
        });
    }); },
    setItem: function (key, value) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (react_native_1.Platform.OS === 'web') {
                        localStorage.setItem(key, value);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, SecureStore.setItemAsync(key, value)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    removeItem: function (key) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (react_native_1.Platform.OS === 'web') {
                        localStorage.removeItem(key);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, SecureStore.deleteItemAsync(key)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
};
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
// Auth helper functions
var signIn = function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, exports.supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                })];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                return [2 /*return*/, { data: data, error: error }];
        }
    });
}); };
exports.signIn = signIn;
var signUp = function (email, password, name) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, exports.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { name: name },
                    },
                })];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                return [2 /*return*/, { data: data, error: error }];
        }
    });
}); };
exports.signUp = signUp;
var signOut = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.supabase.auth.signOut()];
            case 1:
                error = (_a.sent()).error;
                return [2 /*return*/, { error: error }];
        }
    });
}); };
exports.signOut = signOut;
var resetPassword = function (email) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, exports.supabase.auth.resetPasswordForEmail(email)];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                return [2 /*return*/, { data: data, error: error }];
        }
    });
}); };
exports.resetPassword = resetPassword;
var getCurrentUser = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, user, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, exports.supabase.auth.getUser()];
            case 1:
                _a = _b.sent(), user = _a.data.user, error = _a.error;
                return [2 /*return*/, { user: user, error: error }];
        }
    });
}); };
exports.getCurrentUser = getCurrentUser;
var getSession = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, session, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, exports.supabase.auth.getSession()];
            case 1:
                _a = _b.sent(), session = _a.data.session, error = _a.error;
                return [2 /*return*/, { session: session, error: error }];
        }
    });
}); };
exports.getSession = getSession;
