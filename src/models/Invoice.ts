import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  saleId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  totalTax: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: Date;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    invoiceNumber: { type: String, required: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true },
    totalTax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    dueDate: { type: Date },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
export default Invoice;
