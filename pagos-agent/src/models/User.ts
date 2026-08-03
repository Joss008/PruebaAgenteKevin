import { Schema, model } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["empleado", "admin"], default: "empleado" },
  createdAt: { type: Date, default: Date.now },
});

export default model("User", userSchema);