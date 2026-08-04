import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function findUserByEmail(email: string) {
  await connectDB();
  return User.findOne({ email });
}

export async function findUserById(id: string) {
  await connectDB();
  return User.findById(id);
}

export async function createUser(data: { email: string; password: string; name: string; role?: string }) {
  await connectDB();
  return User.create(data);
}

export async function findAllUsers() {
  await connectDB();
  return User.find().lean();
}
