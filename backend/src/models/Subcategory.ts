import mongoose, { Schema, Document } from 'mongoose';

export interface ISubcategory extends Document {
  name: string;
  category: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema: Schema<ISubcategory> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Subcategory name is required'],
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Parent category is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for unique subcategory names per category
SubcategorySchema.index({ name: 1, category: 1 }, { unique: true });

export default mongoose.model<ISubcategory>('Subcategory', SubcategorySchema);
