import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';

interface ClientErrorReport {
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

/**
 * POST /api/monitoring/errors
 * Receives client-side error reports from ErrorBoundary
 */
export async function POST(request: NextRequest) {
  try {
    const body: ClientErrorReport = await request.json();

    // Validate required fields
    if (!body.name || !body.message) {
      return NextResponse.json(
        { success: false, error: 'Invalid error report' },
        { status: 400 }
      );
    }

    // Log the error using the structured logger
    logger.error(`Client Error: ${body.name}`, new Error(body.message), {
      url: body.url,
      userAgent: body.userAgent,
      componentStack: body.componentStack,
      clientTimestamp: body.timestamp,
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown',
    });

    // If SENTRY_DSN is configured, forward to Sentry
    const sentryDsn = process.env.SENTRY_DSN;
    if (sentryDsn) {
      await forwardToSentry(body, sentryDsn);
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    // ErrorsRoute error: Failed to process error report
    void _error;
    return NextResponse.json(
      { success: false, error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

/**
 * Forward error to Sentry if configured
 */
async function forwardToSentry(errorReport: ClientErrorReport, dsn: string): Promise<void> {
  try {
    // Parse DSN to get project ID and public key
    const dsnMatch = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(\d+)/);
    if (!dsnMatch) {
      // forwardToSentry warning: Invalid Sentry DSN format
      return;
    }

    const [, publicKey, host, projectId] = dsnMatch;
    const sentryUrl = `https://${host}/api/${projectId}/store/`;

    const sentryPayload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date(errorReport.timestamp).toISOString(),
      platform: 'javascript',
      level: 'error',
      logger: 'javascript',
      exception: {
        values: [
          {
            type: errorReport.name,
            value: errorReport.message,
            stacktrace: errorReport.stack ? {
              frames: parseStackTrace(errorReport.stack),
            } : undefined,
          },
        ],
      },
      request: {
        url: errorReport.url,
        headers: {
          'User-Agent': errorReport.userAgent,
        },
      },
      extra: {
        componentStack: errorReport.componentStack,
      },
    };

    await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=fynvita/1.0.0, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(sentryPayload),
    });
  } catch (_error) {
    // forwardToSentry error: Failed to forward error to Sentry
    void _error;
  }
}

/**
 * Parse stack trace string into Sentry frames format
 */
function parseStackTrace(stack: string): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  const lines = stack.split('\n').slice(1); // Skip the error message line
  const frames: Array<{ filename: string; function: string; lineno?: number; colno?: number }> = [];

  for (const line of lines) {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      frames.push({
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      });
    } else {
      // Handle anonymous functions
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (simpleMatch) {
        frames.push({
          function: '<anonymous>',
          filename: simpleMatch[1],
          lineno: parseInt(simpleMatch[2], 10),
          colno: parseInt(simpleMatch[3], 10),
        });
      }
    }
  }

  return frames.reverse(); // Sentry expects frames in reverse order
}
