"use strict";
/**
 * CPFI Mobile Financial API Service
 * Handles banking, budgets, transactions, goals, and debt management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.billsApi = exports.debtApi = exports.financialGoalsApi = exports.budgetApi = exports.transactionApi = exports.bankAccountApi = exports.financialOverviewApi = void 0;
var client_1 = require("./client");
// Financial Overview
exports.financialOverviewApi = {
    /**
     * Get financial dashboard overview
     */
    getDashboard: function () {
        return client_1.api.get('/financial/dashboard');
    },
    /**
     * Get spending insights
     */
    getSpendingInsights: function (period) {
        return client_1.api.get("/financial/insights/spending".concat(period ? "?period=".concat(period) : ''));
    },
    /**
     * Get cash flow analysis
     */
    getCashFlow: function (months) {
        return client_1.api.get("/financial/insights/cashflow".concat(months ? "?months=".concat(months) : ''));
    },
};
// Bank Account Endpoints
exports.bankAccountApi = {
    /**
     * Get all connected bank accounts
     */
    getAccounts: function () {
        return client_1.api.get('/financial/accounts');
    },
    /**
     * Get single account details
     */
    getAccount: function (accountId) {
        return client_1.api.get("/financial/accounts/".concat(accountId));
    },
    /**
     * Get Plaid link token for connecting new accounts
     */
    getPlaidLinkToken: function () {
        return client_1.api.post('/financial/plaid/link-token');
    },
    /**
     * Exchange Plaid public token for access
     */
    exchangePlaidToken: function (publicToken, metadata) {
        return client_1.api.post('/financial/plaid/exchange', { publicToken: publicToken, metadata: metadata });
    },
    /**
     * Refresh account data
     */
    refreshAccount: function (accountId) {
        return client_1.api.post("/financial/accounts/".concat(accountId, "/refresh"));
    },
    /**
     * Disconnect bank account
     */
    disconnectAccount: function (accountId) {
        return client_1.api.delete("/financial/accounts/".concat(accountId));
    },
};
// Transaction Endpoints
exports.transactionApi = {
    /**
     * Get all transactions
     */
    getAll: function (params) {
        var queryParams = new URLSearchParams();
        if (params === null || params === void 0 ? void 0 : params.page)
            queryParams.append('page', params.page.toString());
        if (params === null || params === void 0 ? void 0 : params.limit)
            queryParams.append('limit', params.limit.toString());
        if (params === null || params === void 0 ? void 0 : params.accountId)
            queryParams.append('accountId', params.accountId);
        if (params === null || params === void 0 ? void 0 : params.category)
            queryParams.append('category', params.category);
        if (params === null || params === void 0 ? void 0 : params.startDate)
            queryParams.append('startDate', params.startDate);
        if (params === null || params === void 0 ? void 0 : params.endDate)
            queryParams.append('endDate', params.endDate);
        if (params === null || params === void 0 ? void 0 : params.type)
            queryParams.append('type', params.type);
        var query = queryParams.toString();
        return client_1.api.get("/financial/transactions".concat(query ? "?".concat(query) : ''));
    },
    /**
     * Get transaction categories
     */
    getCategories: function () {
        return client_1.api.get('/financial/transactions/categories', { enableCache: true });
    },
    /**
     * Update transaction category
     */
    updateCategory: function (transactionId, category) {
        return client_1.api.patch("/financial/transactions/".concat(transactionId), { category: category });
    },
    /**
     * Search transactions
     */
    search: function (query) {
        return client_1.api.get("/financial/transactions/search?q=".concat(encodeURIComponent(query)));
    },
};
// Budget Endpoints
exports.budgetApi = {
    /**
     * Get all budgets
     */
    getAll: function () {
        return client_1.api.get('/financial/budgets');
    },
    /**
     * Get budget by category
     */
    getByCategory: function (category) {
        return client_1.api.get("/financial/budgets/".concat(encodeURIComponent(category)));
    },
    /**
     * Create or update budget
     */
    upsert: function (budget) {
        return client_1.api.post('/financial/budgets', budget);
    },
    /**
     * Delete budget
     */
    delete: function (category) {
        return client_1.api.delete("/financial/budgets/".concat(encodeURIComponent(category)));
    },
    /**
     * Get budget alerts
     */
    getAlerts: function () {
        return client_1.api.get('/financial/budgets/alerts');
    },
};
// Financial Goals Endpoints
exports.financialGoalsApi = {
    /**
     * Get all financial goals
     */
    getAll: function () {
        return client_1.api.get('/financial/goals');
    },
    /**
     * Get single goal
     */
    getById: function (goalId) {
        return client_1.api.get("/financial/goals/".concat(goalId));
    },
    /**
     * Create new goal
     */
    create: function (goal) {
        return client_1.api.post('/financial/goals', goal);
    },
    /**
     * Update goal
     */
    update: function (goalId, updates) {
        return client_1.api.patch("/financial/goals/".concat(goalId), updates);
    },
    /**
     * Add contribution to goal
     */
    addContribution: function (goalId, amount) {
        return client_1.api.post("/financial/goals/".concat(goalId, "/contribute"), { amount: amount });
    },
    /**
     * Delete goal
     */
    delete: function (goalId) {
        return client_1.api.delete("/financial/goals/".concat(goalId));
    },
};
// Debt Management Endpoints
exports.debtApi = {
    /**
     * Get debt overview
     */
    getOverview: function () {
        return client_1.api.get('/financial/debt');
    },
    /**
     * Calculate payoff strategy
     */
    calculatePayoff: function (strategy, extraPayment) {
        return client_1.api.post('/financial/debt/calculate', { strategy: strategy, extraPayment: extraPayment });
    },
    /**
     * Add debt
     */
    addDebt: function (debt) {
        return client_1.api.post('/financial/debt', debt);
    },
    /**
     * Update debt
     */
    updateDebt: function (debtId, updates) {
        return client_1.api.patch("/financial/debt/".concat(debtId), updates);
    },
    /**
     * Delete debt
     */
    deleteDebt: function (debtId) {
        return client_1.api.delete("/financial/debt/".concat(debtId));
    },
};
// Bills & Payments Endpoints
exports.billsApi = {
    /**
     * Get upcoming bills
     */
    getUpcoming: function () {
        return client_1.api.get('/financial/bills');
    },
    /**
     * Add bill reminder
     */
    addReminder: function (bill) {
        return client_1.api.post('/financial/bills', bill);
    },
    /**
     * Update bill
     */
    updateBill: function (billId, updates) {
        return client_1.api.patch("/financial/bills/".concat(billId), updates);
    },
    /**
     * Delete bill
     */
    deleteBill: function (billId) {
        return client_1.api.delete("/financial/bills/".concat(billId));
    },
};
exports.default = {
    overview: exports.financialOverviewApi,
    accounts: exports.bankAccountApi,
    transactions: exports.transactionApi,
    budgets: exports.budgetApi,
    goals: exports.financialGoalsApi,
    debt: exports.debtApi,
    bills: exports.billsApi,
};
