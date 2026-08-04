import { Schema, model, models } from "mongoose";

export const PAYMENT_FREQUENCIES = [
  "diario",
  "semanal",
  "quincenal",
  "mensual",
  "personalizado",
] as const;

export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

const paymentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  frequency: { type: String, enum: PAYMENT_FREQUENCIES, default: "mensual" },
  intervalDays: { type: Number, min: 1, max: 365 },
  dueDay: { type: Number, min: 1, max: 31 },
  startDate: { type: Date, required: true },
  status: { type: String, enum: ["activo", "pagado", "pausado"], default: "activo" },
  lastPaidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default models.Payment || model("Payment", paymentSchema);