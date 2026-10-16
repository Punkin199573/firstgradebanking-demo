export type EmailDeliveryResult = {
  sent: boolean;
  reason?: string;
};

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return {
      sent: false,
      reason: "Email isn't configured. Set RESEND_API_KEY and EMAIL_FROM.",
    };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown network error.";
    return { sent: false, reason: `Email provider request failed: ${reason}` };
  }

  if (!response.ok) {
    return {
      sent: false,
      reason: `Email provider rejected the message (HTTP ${response.status}).`,
    };
  }

  return { sent: true };
}

export function formatTransactionEmail(input: {
  name: string;
  amount: number;
  direction: "debit" | "credit";
  status: string;
  notice: string;
  reference: string;
  transferType?: string;
}) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(input.amount);
  const details = [
    "FIRST GRADE FINANCE · PROTOTYPE ACTIVITY",
    "",
    `Activity: ${input.name}`,
    `Amount: ${input.direction === "debit" ? "-" : "+"}${amount}`,
    `Status: ${input.status.replaceAll("_", " ")}`,
    input.transferType ? `Transfer type: ${input.transferType}` : "",
    `Reference: ${input.reference}`,
    input.notice ? `Message: ${input.notice}` : "",
    "",
    "This is simulated activity. First Grade Finance is not a bank and this message does not confirm a real payment or movement of funds.",
    "Synthetic account information only. Do not reply with passwords, verification codes, or sensitive financial details.",
  ].filter(Boolean);
  return details.join("\n");
}
