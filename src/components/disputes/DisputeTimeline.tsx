'use client';

import { DisputeTimelineEvent } from '@/lib/disputes/dispute-service';

interface DisputeTimelineProps {
  timeline: DisputeTimelineEvent[];
}

export default function DisputeTimeline({ timeline }: DisputeTimelineProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return '📝';
      case 'sent':
        return '📤';
      case 'under_review':
        return '🔍';
      case 'resolved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'escalated':
        return '⚠️';
      default:
        return '📌';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Timeline</h2>
      </div>
      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {timeline.map((event, eventIdx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== timeline.length - 1 ? (
                    <span
                      className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div>
                      <div className="relative px-1">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                          {getStatusIcon(event.status)}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {event.description}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {formatDate(event.date)}
                          {event.automated && (
                            <span className="ml-2 text-xs text-gray-400">(Automated)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

