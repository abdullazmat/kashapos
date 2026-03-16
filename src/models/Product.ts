import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductVariant {
  name: string;
  sku: string;
  barcode: string;
  imei?: string;
  price: number;
  costPrice: number;
  stock: number;
}

export interface IProduct extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  categoryAttributes?: Record<string, unknown>;
  sku: string;
  barcode: string;
  barcodeFormat?: string;
  categoryId: mongoose.Types.ObjectId;
  price: number;
  costPrice: number;
  taxRate: number;
  unit: string;
  image?: string;
  hasVariants: boolean;
  variants: IProductVariant[];
  trackStock: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  barcode: { type: String, default: "" },
  imei: { type: String, default: "" },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
});

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    categoryAttributes: { type: Schema.Types.Mixed, default: {} },
    sku: { type: String, required: true },
    barcode: { type: String, default: "" },
    barcodeFormat: { type: String, default: "Code 128" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    price: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    unit: { type: String, default: "pcs" },
    image: { type: String },
    hasVariants: { type: Boolean, default: false },
    variants: [ProductVariantSchema],
    trackStock: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, barcode: 1 });
ProductSchema.index({ tenantId: 1, name: "text" });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
