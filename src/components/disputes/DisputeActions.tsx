"use client";

import { useState } from "react";
import {
  Dispute,
  DisputeStatus,
  DisputeOutcome,
} from "@/lib/disputes/dispute-service";

type DisputeActionType = "send" | "update_status" | "resolve" | "add_note";

type DisputeActionPayload =
  | { status: DisputeStatus; description: string }
  | { outcome: DisputeOutcome; note: string }
  | { note: string }
  | undefined;

interface DisputeActionsProps {
  dispute: Dispute;
  onAction: (
    action: DisputeActionType,
    payload?: DisputeActionPayload,
  ) => Promise<void>;
}

export default function DisputeActions({
  dispute,
  onAction,
}: DisputeActionsProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!confirm("Are you sure you want to send this dispute to the bureau?"))
      return;

    setLoading(true);
    try {
      await onAction("send");
    } finally {
      setLoading(false);
    }
  };

  const canSend = dispute.status === "draft";
  const canUpdateStatus = ["sent", "under_review"].includes(dispute.status);
  const canResolve = ["sent", "under_review", "escalated"].includes(
    dispute.status,
  );

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Actions
        </h2>
        <div className="space-y-3">
          {canSend && (
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send to Bureau"}
            </button>
          )}

          {canUpdateStatus && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium"
            >
              Update Status
            </button>
          )}

          {canResolve && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium"
            >
              Mark as Resolved
            </button>
          )}

          <button
            onClick={() => setShowNoteModal(true)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors font-medium"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal
          onClose={() => setShowStatusModal(false)}
          onSubmit={async (status: DisputeStatus, description: string) => {
            setLoading(true);
            try {
              await onAction("update_status", { status, description });
              setShowStatusModal(false);
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
        />
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <ResolveModal
          onClose={() => setShowResolveModal(false)}
          onSubmit={async (outcome: DisputeOutcome, note: string) => {
            setLoading(true);
            try {
              await onAction("resolve", { outcome, note });
              setShowResolveModal(false);
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
        />
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <NoteModal
          onClose={() => setShowNoteModal(false)}
          onSubmit={async (note: string) => {
            setLoading(true);
            try {
              await onAction("add_note", { note });
              setShowNoteModal(false);
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
        />
      )}
    </div>
  );
}

// Status Modal
interface StatusModalProps {
  onClose: () => void;
  onSubmit: (
    status: DisputeStatus,
    description: string,
  ) => Promise<void> | void;
  loading: boolean;
}

function StatusModal({ onClose, onSubmit, loading }: StatusModalProps) {
  const [status, setStatus] = useState<DisputeStatus>("under_review");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Update Status</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              New Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DisputeStatus)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="sent">Sent</option>
              <option value="under_review">Under Review</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add details about this status update..."
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(status, description)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Resolve Modal
interface ResolveModalProps {
  onClose: () => void;
  onSubmit: (outcome: DisputeOutcome, note: string) => Promise<void> | void;
  loading: boolean;
}

function ResolveModal({ onClose, onSubmit, loading }: ResolveModalProps) {
  const [outcome, setOutcome] = useState<DisputeOutcome>("removed");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Mark as Resolved</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Outcome
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as DisputeOutcome)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="removed">Item Removed</option>
              <option value="updated">Item Updated</option>
              <option value="verified">Bureau Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(outcome, note)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Note Modal
interface NoteModalProps {
  onClose: () => void;
  onSubmit: (note: string) => Promise<void> | void;
  loading: boolean;
}

function NoteModal({ onClose, onSubmit, loading }: NoteModalProps) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Note</h3>
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your note..."
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(note)}
            disabled={loading || !note.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
