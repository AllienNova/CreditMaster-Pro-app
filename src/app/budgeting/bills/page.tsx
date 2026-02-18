"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Bell,
  CreditCard,
  Zap,
  Home,
  Wifi,
  Smartphone,
  Car,
  Shield,
  X,
} from "lucide-react";

interface Bill {
  id: string;
  name: string;
  payee: string;
  amount: number;
  category: string;
  dueDay: number;
  nextDueDate: Date;
  autopayEnabled: boolean;
  status: "pending" | "paid" | "overdue";
  icon: React.ReactNode;
}

interface CalendarDay {
  date: Date;
  bills: Bill[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  housing: <Home className="w-4 h-4" />,
  utilities: <Zap className="w-4 h-4" />,
  internet: <Wifi className="w-4 h-4" />,
  phone: <Smartphone className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  auto: <Car className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
};

const MOCK_BILLS: Bill[] = [
  {
    id: "1",
    name: "Rent",
    payee: "Property Management",
    amount: 1500,
    category: "housing",
    dueDay: 1,
    nextDueDate: new Date(2026, 1, 1),
    autopayEnabled: true,
    status: "pending",
    icon: <Home className="w-4 h-4" />,
  },
  {
    id: "2",
    name: "Electric Bill",
    payee: "Power Company",
    amount: 125,
    category: "utilities",
    dueDay: 15,
    nextDueDate: new Date(2026, 0, 15),
    autopayEnabled: false,
    status: "overdue",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "3",
    name: "Internet",
    payee: "ISP Provider",
    amount: 79.99,
    category: "internet",
    dueDay: 20,
    nextDueDate: new Date(2026, 0, 20),
    autopayEnabled: true,
    status: "pending",
    icon: <Wifi className="w-4 h-4" />,
  },
  {
    id: "4",
    name: "Car Insurance",
    payee: "Insurance Co",
    amount: 145,
    category: "insurance",
    dueDay: 25,
    nextDueDate: new Date(2026, 0, 25),
    autopayEnabled: true,
    status: "pending",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: "5",
    name: "Credit Card",
    payee: "Chase Bank",
    amount: 350,
    category: "credit_card",
    dueDay: 28,
    nextDueDate: new Date(2026, 0, 28),
    autopayEnabled: false,
    status: "pending",
    icon: <CreditCard className="w-4 h-4" />,
  },
];

export default function BillCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bills] = useState<Bill[]>(MOCK_BILLS);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Add days from previous month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        bills: getBillsForDate(d),
        isCurrentMonth: false,
        isToday: d.getTime() === today.getTime(),
      });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        bills: getBillsForDate(d),
        isCurrentMonth: true,
        isToday: d.getTime() === today.getTime(),
      });
    }

    // Add days from next month
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        bills: getBillsForDate(d),
        isCurrentMonth: false,
        isToday: d.getTime() === today.getTime(),
      });
    }

    return days;
  };

  const getBillsForDate = (date: Date): Bill[] => {
    return bills.filter((bill) => {
      const billDate = new Date(bill.nextDueDate);
      return (
        billDate.getDate() === date.getDate() &&
        billDate.getMonth() === date.getMonth() &&
        billDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getMonthStats = () => {
    const monthBills = bills.filter((bill) => {
      const billDate = new Date(bill.nextDueDate);
      return (
        billDate.getMonth() === currentDate.getMonth() &&
        billDate.getFullYear() === currentDate.getFullYear()
      );
    });

    return {
      totalDue: monthBills.reduce((sum, b) => sum + b.amount, 0),
      billCount: monthBills.length,
      overdue: monthBills.filter((b) => b.status === "overdue").length,
      autopay: monthBills.filter((b) => b.autopayEnabled).length,
    };
  };

  const stats = getMonthStats();
  const calendarDays = getDaysInMonth(currentDate);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const upcomingBills = bills
    .filter((b) => b.status !== "paid")
    .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime())
    .slice(0, 5);

  const overdueBills = bills.filter((b) => b.status === "overdue");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Bill Calendar
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Track and manage your recurring bills
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setView("calendar")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "calendar" ? "bg-white dark:bg-slate-700 text-gray-900 shadow-sm" : "text-gray-600 dark:text-slate-400"}`}
              >
                Calendar
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-white dark:bg-slate-700 text-gray-900 shadow-sm" : "text-gray-600 dark:text-slate-400"}`}
              >
                List
              </button>
            </div>
            <button
              onClick={() => setShowAddBillModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Bill
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Total Due
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalDue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Bills This Month
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.billCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${stats.overdue > 0 ? "bg-red-100" : "bg-green-100 dark:bg-green-900"}`}
              >
                {stats.overdue > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Overdue
                </p>
                <p
                  className={`text-xl font-bold ${
                    stats.overdue > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {stats.overdue}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  On Autopay
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.autopay}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar / List View */}
          <div className="lg:col-span-2">
            {view === "calendar" ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateMonth("prev")}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => navigateMonth("next")}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-gray-500 dark:text-slate-400 py-2"
                      >
                        {day}
                      </div>
                    ),
                  )}

                  {/* Calendar Days */}
                  {calendarDays.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day.date)}
                      className={`min-h-[80px] p-2 rounded-lg border transition-all ${day.isToday ? "border-green-500 bg-green-50" : day.isCurrentMonth ? "border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-gray-600" : "border-transparent bg-gray-50 dark:bg-slate-800/50"} ${selectedDate?.getTime() === day.date.getTime() ? "ring-2 ring-green-500" : ""}`}
                    >
                      <div
                        className={`text-sm font-medium ${day.isCurrentMonth ? "text-gray-900" : "text-gray-400 dark:text-slate-600"}`}
                      >
                        {day.date.getDate()}
                      </div>

                      {day.bills.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {day.bills.slice(0, 2).map((bill) => (
                            <div
                              key={bill.id}
                              className={`text-xs px-1 py-0.5 rounded truncate ${bill.status === "overdue" ? "bg-red-100 text-red-700" : bill.status === "paid" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"}`}
                            >
                              {bill.name}
                            </div>
                          ))}
                          {day.bills.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              +{day.bills.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* List View */
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  All Bills
                </h2>
                <div className="space-y-3">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${bill.status === "overdue" ? "bg-red-100 text-red-600" : "bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-slate-300"}`}
                        >
                          {bill.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {bill.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {bill.payee} • Due{" "}
                            {bill.nextDueDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(bill.amount)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {bill.autopayEnabled && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded">
                              Autopay
                            </span>
                          )}
                          {bill.status === "overdue" && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overdue Alert */}
            {overdueBills.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    Overdue Bills
                  </h3>
                </div>
                <div className="space-y-2">
                  {overdueBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-red-700 dark:text-red-300">
                        {bill.name}
                      </span>
                      <span className="font-semibold text-red-800 dark:text-red-200">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                  Pay Now
                </button>
              </div>
            )}

            {/* Upcoming Bills */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Upcoming Bills
                </h3>
              </div>
              <div className="space-y-3">
                {upcomingBills.map((bill) => {
                  const daysUntil = Math.ceil(
                    (bill.nextDueDate.getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gray-100 dark:bg-slate-700 rounded">
                          {bill.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {bill.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {daysUntil <= 0
                              ? "Due today"
                              : `Due in ${daysUntil} days`}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reminders */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-5 h-5" />
                <h3 className="font-semibold">Bill Reminders</h3>
              </div>
              <p className="text-sm text-green-100 mb-4">
                Get notified before bills are due so you never miss a payment.
              </p>
              <button className="w-full py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg font-medium transition-colors">
                Manage Reminders
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Bill Modal */}
      <AnimatePresence>
        {showAddBillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddBillModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New Bill
                </h2>
                <button
                  onClick={() => setShowAddBillModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Bill Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Electric Bill"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Payee
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Power Company"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Due Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="15"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="category-select"
                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="category-select"
                    title="Select bill category"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  >
                    <option value="housing">Housing</option>
                    <option value="utilities">Utilities</option>
                    <option value="internet">Internet</option>
                    <option value="phone">Phone</option>
                    <option value="insurance">Insurance</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autopay"
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor="autopay"
                    className="text-sm text-gray-700 dark:text-slate-300"
                  >
                    Autopay enabled
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddBillModal(false)}
                    className="flex-1 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Add Bill
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
