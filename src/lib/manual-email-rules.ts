type TenantEmailPayload = {
  tenantId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type EmailPreparationSuccess = {
  ok: true;
  email: TenantEmailPayload;
};

type EmailPreparationFailure = {
  ok: false;
  status: 400;
  error: string;
};

export type EmailPreparationResult =
  | EmailPreparationSuccess
  | EmailPreparationFailure;

export function prepareReceiptEmail(input: {
  tenantId: string;
  customerName?: string;
  customerEmail?: string;
  orderNumber: string;
  total: number;
  amountPaid: number;
  remainingBalance: number;
}): EmailPreparationResult {
  const recipient = String(input.customerEmail || "").trim();
  if (!recipient) {
    return {
      ok: false,
      status: 400,
      error: "Customer email is required to send receipt",
    };
  }

  const customerName = input.customerName || "Customer";

  return {
    ok: true,
    email: {
      tenantId: input.tenantId,
      to: recipient,
      subject: `Receipt ${input.orderNumber}`,
      text: `Dear ${customerName},\n\nReceipt for order ${input.orderNumber}.\nTotal: ${Number(input.total || 0).toLocaleString()}\nAmount paid: ${Number(input.amountPaid || 0).toLocaleString()}\nRemaining balance: ${Number(input.remainingBalance || 0).toLocaleString()}\n\nThank you for your business.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Sale Receipt</h2><p>Dear ${customerName},</p><p>Order: <strong>${input.orderNumber}</strong></p><p>Total: ${Number(input.total || 0).toLocaleString()}</p><p>Amount paid: ${Number(input.amountPaid || 0).toLocaleString()}</p><p>Remaining balance: ${Number(input.remainingBalance || 0).toLocaleString()}</p><p>Thank you for your business.</p></div>`,
    },
  };
}

export function prepareBalanceReminderEmail(input: {
  tenantId: string;
  customerName: string;
  customerEmail?: string;
  outstandingBalance: number;
  openSales: Array<{
    orderNumber: string;
    dueDate?: Date | string | null;
    remainingBalance: number;
  }>;
  now?: Date;
}): EmailPreparationResult & {
  overdueCount?: number;
  openSalesCount?: number;
} {
  const recipient = String(input.customerEmail || "").trim();
  if (!recipient) {
    return {
      ok: false,
      status: 400,
      error: "Customer email is required to send a reminder",
    };
  }

  const now = input.now || new Date();
  const overdueCount = input.openSales.filter(
    (sale) => sale.dueDate && new Date(sale.dueDate) < now,
  ).length;

  const topLines = input.openSales.slice(0, 5).map((sale) => {
    const dueText = sale.dueDate
      ? new Date(sale.dueDate).toLocaleDateString("en-UG")
      : "No due date";
    return `<li><strong>${sale.orderNumber}</strong> - Balance ${Number(sale.remainingBalance || 0).toLocaleString()} (Due: ${dueText})</li>`;
  });

  return {
    ok: true,
    overdueCount,
    openSalesCount: input.openSales.length,
    email: {
      tenantId: input.tenantId,
      to: recipient,
      subject: `Balance reminder for ${input.customerName}`,
      text: `Dear ${input.customerName},\n\nThis is a reminder that your outstanding balance is ${Number(input.outstandingBalance || 0).toLocaleString()}.\nOpen credit sales: ${input.openSales.length}.\nOverdue sales: ${overdueCount}.\n\nPlease contact us if you have any questions.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Balance Reminder</h2><p>Dear ${input.customerName},</p><p>Your outstanding balance is <strong>${Number(input.outstandingBalance || 0).toLocaleString()}</strong>.</p><p>Open credit sales: ${input.openSales.length}<br/>Overdue sales: ${overdueCount}</p>${topLines.length > 0 ? `<p>Open balances:</p><ul>${topLines.join("")}</ul>` : ""}<p>Please contact us if you have any questions.</p></div>`,
    },
  };
}
