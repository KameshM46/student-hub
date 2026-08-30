import { createMiddleware } from "@tanstack/react-start";

export const requireAuth = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const { readSession } = await import("./auth.server");

  const session = await readSession();

  if (!session) {
    throw new Error("Unauthorized: not signed in");
  }

  const { getDb } = await import("./mongo.server");
  const { ObjectId } = await import("mongodb");

  const db = await getDb();

  const user = await db
    .collection("users")
    .findOne(
      {
        _id: new ObjectId(session.sub),
      },
      {
        projection: {
          passwordHash: 0,
        },
      },
    );

  if (!user) {
    throw new Error("Unauthorized: account no longer exists");
  }

  return next({
    context: {
      userId: session.sub,
      role: session.role,
      user,
    },
  });
});

export const requireAdmin = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const { readSession } = await import("./auth.server");

  const session = await readSession();

  if (!session) {
    throw new Error("Unauthorized: not signed in");
  }

  if (session.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  const { getDb } = await import("./mongo.server");
  const { ObjectId } = await import("mongodb");

  const db = await getDb();

  const user = await db
    .collection("users")
    .findOne(
      {
        _id: new ObjectId(session.sub),
      },
      {
        projection: {
          passwordHash: 0,
        },
      },
    );

  if (!user) {
    throw new Error("Unauthorized: account no longer exists");
  }

  return next({
    context: {
      userId: session.sub,
      role: session.role,
      user,
    },
  });
});