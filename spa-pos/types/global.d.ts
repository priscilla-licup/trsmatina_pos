import mongoose from "mongoose";

declare global {
  // Important: "var", not "let" or "const"
  // This defines a global variable on the Node.js global object.
  // It is used to cache the mongoose connection between hot reloads.
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

export {};
