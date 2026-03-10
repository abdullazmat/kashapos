import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentMethod: "cash" | "card" | "mobile_money" | "bank_transfer";
  reference?: string;
  vendorId?: mongoose.Types.ObjectId;
  receiptUrl?: string;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    category: {
      type: String,
      required: true,
      enum: [
        "rent",
        "utilities",
        "salaries",
        "supplies",
        "transport",
        "marketing",
        "maintenance",
        "taxes",
        "insurance",
        "other",
      ],
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_money", "bank_transfer"],
      default: "cash",
    },
    reference: { type: String },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    receiptUrl: { type: String },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

ExpenseSchema.index({ tenantId: 1, date: -1 });
ExpenseSchema.index({ tenantId: 1, category: 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
export default Expense;
