// lib/log.ts
import { connectToDatabase } from "./db";
import { Log } from "@/models/Log";

export async function writeLog(params: {
  userId?: string;
  type: "auth" | "navigation" | "action" | "system";
  message: string;
  path?: string;
  meta?: Record<string, unknown>;
}) {
  await connectToDatabase();

  await Log.create({
    userId: params.userId,
    type: params.type,
    message: params.message,
    path: params.path,
    meta: params.meta,
  });
}
