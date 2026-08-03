import { Schema, model } from "mongoose";

const paymentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDay: { type: Number, required: true, min: 1, max: 31 },
  status: { type: String, enum: ["activo", "pagado", "pausado"], default: "activo" },
  lastPaidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default model("Payment", paymentSchema);