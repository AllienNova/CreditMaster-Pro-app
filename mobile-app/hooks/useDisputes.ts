import { useCallback, useState } from 'react';
import { useDisputeStore, selectDisputes } from '../src/store';
import { disputesAPI } from '../services/api';

interface CreateDisputeData {
  bureau: string;
  type: string;
  creditor: string;
  reason: string;
}

export function useDisputes() {
  const disputes = useDisputeStore(selectDisputes);
  const { setDisputes, createDispute: addDispute, updateDispute } = useDisputeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await disputesAPI.getAll();

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    if (data?.disputes) {
      setDisputes(data.disputes);
    }
    setLoading(false);
  }, [setDisputes]);

  const createDispute = useCallback(async (disputeData: CreateDisputeData) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await disputesAPI.create(disputeData);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return { success: false, error: apiError };
    }

    if (data?.dispute) {
      addDispute(data.dispute);
    }
    setLoading(false);
    return { success: true, error: null, dispute: data?.dispute };
  }, [addDispute]);

  const updateDisputeStatus = useCallback(async (id: string, status: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await disputesAPI.update(id, { status });

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return { success: false, error: apiError };
    }

    updateDispute(id, { status } as any);
    setLoading(false);
    return { success: true, error: null };
  }, [updateDispute]);

  const generateLetter = useCallback(async (disputeId: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await disputesAPI.generateLetter(disputeId);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return { success: false, error: apiError, letter: null };
    }

    setLoading(false);
    return { success: true, error: null, letter: data?.letter };
  }, []);

  // Filter helpers
  const pendingDisputes = disputes.filter((d) => d.status === 'pending' || d.status === 'in_progress');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
  const rejectedDisputes = disputes.filter((d) => d.status === 'rejected');

  // Group by bureau
  const disputesByBureau = disputes.reduce((acc, dispute) => {
    const bureau = dispute.bureau;
    if (!acc[bureau]) acc[bureau] = [];
    acc[bureau].push(dispute);
    return acc;
  }, {} as Record<string, typeof disputes>);

  // Stats
  const stats = {
    total: disputes.length,
    pending: pendingDisputes.length,
    resolved: resolvedDisputes.length,
    rejected: rejectedDisputes.length,
    successRate: disputes.length > 0
      ? Math.round((resolvedDisputes.length / (resolvedDisputes.length + rejectedDisputes.length)) * 100) || 0
      : 0,
  };

  return {
    disputes,
    loading,
    error,
    fetchDisputes,
    createDispute,
    updateDisputeStatus,
    generateLetter,
    pendingDisputes,
    resolvedDisputes,
    rejectedDisputes,
    disputesByBureau,
    stats,
  };
}

