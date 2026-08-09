import { Resend } from "resend";
import { renderToStaticMarkup } from "react-dom/server";
import WelcomeEmail from "@/emails/WelcomeEmail";
import DisputeStatusEmail from "@/emails/DisputeStatusEmail";
import ScoreChangeEmail from "@/emails/ScoreChangeEmail";
import PaymentReceiptEmail from "@/emails/PaymentReceiptEmail";

let _resend: Resend | null = null;
const resend = new Proxy({} as Resend, {
  get(_t, prop, recv) {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    const v = Reflect.get(_resend, prop, recv);
    return typeof v === "function" ? v.bind(_resend) : v;
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || "Fynvita <noreply@fynvita.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fynvita.com";

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<EmailResult> {
  try {
    const html = renderToStaticMarkup(
      WelcomeEmail({
        name,
        loginUrl: `${BASE_URL}/login`,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Fynvita! ",
      html,
    });

    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error) {
    // Failed to send welcome email
    return { success: false, error: String(error) };
  }
}

export async function sendDisputeStatusEmail(
  to: string,
  params: {
    name: string;
    disputeId: string;
    status: "submitted" | "in_review" | "resolved" | "rejected";
    bureau: string;
    itemDescription: string;
  },
): Promise<EmailResult> {
  try {
    const statusLabels = {
      submitted: "Dispute Submitted",
      in_review: "Dispute Under Review",
      resolved: "Dispute Resolved! ",
      rejected: "Dispute Update",
    };

    const html = renderToStaticMarkup(
      DisputeStatusEmail({
        ...params,
        dashboardUrl: `${BASE_URL}/dashboard/disputes/${params.disputeId}`,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: statusLabels[params.status],
      html,
    });

    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error) {
    // Failed to send dispute status email
    return { success: false, error: String(error) };
  }
}

export async function sendScoreChangeEmail(
  to: string,
  params: {
    name: string;
    previousScore: number;
    newScore: number;
    changeDate: string;
  },
): Promise<EmailResult> {
  try {
    const change = params.newScore - params.previousScore;
    const emoji = change > 0 ? "" : "";

    const html = renderToStaticMarkup(
      ScoreChangeEmail({
        ...params,
        dashboardUrl: `${BASE_URL}/dashboard`,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Credit Score Changed ${emoji} ${change > 0 ? "+" : ""}${change} points`,
      html,
    });

    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error) {
    // Failed to send score change email
    return { success: false, error: String(error) };
  }
}

export async function sendPaymentReceiptEmail(
  to: string,
  params: {
    name: string;
    plan: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
    paymentDate: string;
    nextBillingDate: string;
  },
): Promise<EmailResult> {
  try {
    const html = renderToStaticMarkup(
      PaymentReceiptEmail({
        ...params,
        dashboardUrl: BASE_URL,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Payment Receipt - ${params.plan} Plan`,
      html,
    });

    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error) {
    // Failed to send payment receipt email
    return { success: false, error: String(error) };
  }
}
