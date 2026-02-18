"use client";

import { useState } from "react";
import type { CreditReport } from "@/types/credit-bureau";

interface CreditReportViewerProps {
  report: CreditReport;
  onDisputeClick?: (
    itemId: string,
    itemType: "account" | "inquiry" | "public_record",
  ) => void;
}

export default function CreditReportViewer({
  report,
  onDisputeClick,
}: CreditReportViewerProps) {
  const [activeTab, setActiveTab] = useState<
    "accounts" | "inquiries" | "public_records"
  >("accounts");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Filter accounts based on search and status
  const filteredAccounts = report.accounts.filter((account) => {
    const matchesSearch =
      searchQuery === "" ||
      account.creditorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || account.paymentStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Filter inquiries
  const filteredInquiries = report.inquiries.filter((inquiry) => {
    return (
      searchQuery === "" ||
      inquiry.creditorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filter public records
  const filteredPublicRecords = report.publicRecords.filter((record) => {
    return (
      searchQuery === "" ||
      record.recordType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "current":
        return "bg-green-100 text-green-800";
      case "late":
        return "bg-red-100 text-red-800";
      case "closed":
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
      case "charged_off":
        return "bg-red-100 text-red-800";
      case "collection":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Credit Report
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {report.bureau.charAt(0).toUpperCase() + report.bureau.slice(1)} •{" "}
              {new Date(report.reportDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export PDF
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">
              Total Accounts
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {report.accounts.length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">
              Open Accounts
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {report.accounts.filter((a) => !a.closedDate).length}
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 font-medium">Inquiries</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">
              {report.inquiries.length}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-red-600 font-medium">
              Public Records
            </div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {report.publicRecords.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <div className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "accounts" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"}`}
          >
            Accounts ({report.accounts.length})
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "inquiries" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"}`}
          >
            Inquiries ({report.inquiries.length})
          </button>
          <button
            onClick={() => setActiveTab("public_records")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "public_records" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"}`}
          >
            Public Records ({report.publicRecords.length})
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or account number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {activeTab === "accounts" && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="current">Current</option>
              <option value="late">Late</option>
              <option value="closed">Closed</option>
              <option value="charged_off">Charged Off</option>
              <option value="collection">Collection</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Accounts Tab */}
        {activeTab === "accounts" && (
          <div className="space-y-4">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                No accounts found matching your criteria.
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {account.creditorName}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.paymentStatus)}`}
                        >
                          {account.paymentStatus
                            .replace("_", " ")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">
                            Account #:
                          </span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            ***{account.accountNumber.slice(-4)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">
                            Balance:
                          </span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            ${account.balance.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">
                            Credit Limit:
                          </span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {account.creditLimit
                              ? `$${account.creditLimit.toLocaleString()}`
                              : "N/A"}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">
                            Opened:
                          </span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {new Date(account.openedDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {onDisputeClick && (
                      <button
                        onClick={() => onDisputeClick(account.id, "account")}
                        className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Inquiries Tab */}
        {activeTab === "inquiries" && (
          <div className="space-y-4">
            {filteredInquiries.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                No inquiries found matching your criteria.
              </div>
            ) : (
              filteredInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {inquiry.creditorName}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">
                            Date:
                          </span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {new Date(inquiry.inquiryDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">
                            Type:
                          </span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {inquiry.inquiryType === "hard"
                              ? "Hard Inquiry"
                              : "Soft Inquiry"}
                          </div>
                        </div>
                      </div>
                    </div>
                    {onDisputeClick && inquiry.inquiryType === "hard" && (
                      <button
                        onClick={() => onDisputeClick(inquiry.id, "inquiry")}
                        className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Public Records Tab */}
        {activeTab === "public_records" && (
          <div className="space-y-4">
            {filteredPublicRecords.length === 0 ? (
              <div className="text-center py-12 text-green-500">
                No public records found. This is good for your credit!
              </div>
            ) : (
              filteredPublicRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-red-200 bg-red-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-900 mb-2">
                        {record.recordType.replace("_", " ").toUpperCase()}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-red-700">Filed Date:</span>
                          <div className="font-medium text-red-900">
                            {record.filingDate
                              ? new Date(record.filingDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )
                              : "N/A"}
                          </div>
                        </div>
                        {record.amount && (
                          <div>
                            <span className="text-red-700">Amount:</span>
                            <div className="font-medium text-red-900">
                              ${record.amount.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {onDisputeClick && (
                      <button
                        onClick={() =>
                          onDisputeClick(record.id, "public_record")
                        }
                        className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
