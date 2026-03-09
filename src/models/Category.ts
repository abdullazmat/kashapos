import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  parentId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
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
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);
export default Category;
