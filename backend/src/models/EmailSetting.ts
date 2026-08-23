import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailSetting extends Document {
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSettingSchema: Schema = new Schema(
  {
    smtpHost: { type: String, required: true, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, required: true, default: 465 },
    secure: { type: Boolean, required: true, default: true },
    smtpUser: { type: String, required: true, default: '' },
    smtpPass: { type: String, required: true, default: '' },
    fromName: { type: String, required: true, default: 'Abhyuday Management System' },
    fromEmail: { type: String, required: true, default: '' },
    replyTo: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IEmailSetting>('EmailSetting', EmailSettingSchema);
