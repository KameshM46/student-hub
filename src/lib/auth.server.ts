// Server-only auth: replaces Supabase Auth entirely.
// Sessions are a signed JWT (jose) stored in an httpOnly cookie. Passwords
// (the student's DOB, or an admin's DOB) are hashed with bcrypt — we never
// store or compare them in plain text.

import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { ObjectId } from "mongodb";
import {
  createMiddleware,
  createServerOnlyFn,
} from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

import { getDb } from "./mongo.server";

export const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type PortalRole = "student" | "admin";
export type SessionPayload = {
  sub: string;
  role: PortalRole;
};

function getSecretKey() {
  const secret = process.env["SESSION_SECRET"];

  if (!secret || secret.length < 16) {
    throw new Error(
      "Missing or too-short SESSION_SECRET environment variable (needs to be at least 16 characters). Set it in your .env file.",
    );
  }

  return new TextEncoder().encode(secret);
}

async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    const sub = payload["sub"];
    const role = payload["role"];

    if (
      typeof sub !== "string" ||
      (role !== "student" && role !== "admin")
    ) {
      return null;
    }

    return {
      sub,
      role,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the signed session JWT in an httpOnly cookie.
 *
 * This function MUST only run on the server because it uses
 * @tanstack/react-start/server.
 */
export const setSessionCookie = createServerOnlyFn(
  async (payload: SessionPayload) => {
    const token = await createSessionToken(payload);

    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  },
);

/**
 * Clears the current session cookie.
 *
 * Server-only because it uses deleteCookie().
 */
export const clearSessionCookie = createServerOnlyFn(() => {
  deleteCookie(SESSION_COOKIE, {
    path: "/",
  });
});

/**
 * Reads and verifies the current session cookie.
 *
 * Returns null when the user is signed out or the token is invalid.
 */
export const readSession = createServerOnlyFn(
  async (): Promise<SessionPayload | null> => {
    const token = getCookie(SESSION_COOKIE);

    if (!token) {
      return null;
    }

    return verifySessionToken(token);
  },
);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
) {
  return bcrypt.compare(password, hash);
}

type AuthContext = {
  userId: string;
  role: PortalRole;
  user: Record<string, unknown>;
};

/**
 * Resolves the currently authenticated user.
 *
 * This accesses the session cookie and MongoDB, so it must only
 * execute on the server.
 */
const resolveAuthContext = createServerOnlyFn(
  async (): Promise<AuthContext> => {
    const session = await readSession();

    if (!session) {
      throw new Error("Unauthorized: not signed in");
    }

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

    return {
      userId: session.sub,
      role: session.role,
      user,
    };
  },
);

/**
 * Server-function middleware: require any signed-in user.
 */
export const requireAuth = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const context = await resolveAuthContext();

  return next({
    context,
  });
});

/**
 * Server-function middleware: require a signed-in admin.
 */
export const requireAdmin = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const context = await resolveAuthContext();

  if (context.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  return next({
    context,
  });
});