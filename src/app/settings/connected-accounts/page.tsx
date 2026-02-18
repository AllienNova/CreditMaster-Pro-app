"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface ConnectedAccount {
  id: string;
  type: "bank" | "bureau" | "service";
  name: string;
  status: "connected" | "pending" | "error";
  lastSync?: string;
  icon: string;
}

const initialAccounts: ConnectedAccount[] = [
  {
    id: "1",
    type: "bank",
    name: "Chase Bank",
    status: "connected",
    lastSync: "2 hours ago",
    icon: "building",
  },
  {
    id: "2",
    type: "bank",
    name: "Bank of America",
    status: "connected",
    lastSync: "1 day ago",
    icon: "building",
  },
  {
    id: "3",
    type: "bureau",
    name: "Experian",
    status: "connected",
    lastSync: "3 hours ago",
    icon: "building",
  },
  {
    id: "4",
    type: "bureau",
    name: "Equifax",
    status: "pending",
    icon: "document-chart",
  },
  {
    id: "5",
    type: "bureau",
    name: "TransUnion",
    status: "error",
    icon: "document-chart",
  },
];

export default function ConnectedAccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(initialAccounts);

  const handleDisconnect = (id: string) => {
    if (confirm("Are you sure you want to disconnect this account?")) {
      setAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  const handleReconnect = (id: string) => {
    setAccounts(
      accounts.map((a) =>
        a.id === id ? { ...a, status: "pending" as const } : a,
      ),
    );
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "connected" as const, lastSync: "Just now" }
            : a,
        ),
      );
    }, 2000);
  };

  const getStatusBadge = (status: ConnectedAccount["status"]) => {
    switch (status) {
      case "connected":
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
            Connected
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            Pending
          </span>
        );
      case "error":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
            Error
          </span>
        );
    }
  };

  const bankAccounts = accounts.filter((a) => a.type === "bank");
  const bureauAccounts = accounts.filter((a) => a.type === "bureau");

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Connected Accounts
      </h2>
      <p className="text-gray-600 dark:text-slate-300 mb-8">
        Manage your linked bank accounts and credit bureaus
      </p>

      {/* Bank Accounts */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Bank Accounts
          </h3>
          <button className="text-sm text-emerald-500 hover:text-emerald-600 font-medium">
            + Link New Account
          </button>
        </div>
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Icon name={account.icon} className="text-2xl inline-block" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.name}
                  </p>
                  {account.lastSync && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Last synced: {account.lastSync}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(account.status)}
                <button
                  onClick={() => handleDisconnect(account.id)}
                  className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-500"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Bureaus */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Credit Bureaus
          </h3>
        </div>
        <div className="space-y-3">
          {bureauAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Icon name={account.icon} className="text-2xl inline-block" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.name}
                  </p>
                  {account.lastSync && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Last synced: {account.lastSync}
                    </p>
                  )}
                  {account.status === "error" && (
                    <p className="text-sm text-red-500">
                      Connection failed. Please reconnect.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(account.status)}
                {account.status === "error" ? (
                  <button
                    onClick={() => handleReconnect(account.id)}
                    className="text-sm text-emerald-500 hover:text-emerald-600 font-medium"
                  >
                    Reconnect
                  </button>
                ) : account.status === "connected" ? (
                  <button className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200">
                    Refresh
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-blue-500"></span>
          <div>
            <p className="font-medium text-blue-900">Your data is secure</p>
            <p className="text-sm text-blue-700">
              We use bank-level 256-bit encryption and never store your login
              credentials. All connections are read-only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
