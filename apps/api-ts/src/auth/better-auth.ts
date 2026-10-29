import { randomUUID } from "node:crypto";
import type { Config } from "../config";
import type { Database } from "../database";
import { hashPassword, tokenHash, verifyPassword } from "./password";

export async function createIdentity(
  db: Pick<Database, "user">,
  config: Config,
  sendReset: (userId: string, token: string) => Promise<void>,
  ownTransactions = true,
) {
  // Native imports preserve Better Auth's ESM entry points in the NestJS CommonJS build.
  const [
    { betterAuth },
    { prismaAdapter },
    { twoFactor },
    { createAuthEndpoint },
    { setSessionCookie },
  ] = await Promise.all([
    import("better-auth"),
    import("better-auth/adapters/prisma"),
    import("better-auth/plugins"),
    import("better-auth/api"),
    import("better-auth/cookies"),
  ]);

  return betterAuth({
    appName: "Fresh Phones PH",
    baseURL: config.BETTER_AUTH_URL ?? `${config.WEB_ORIGIN}/api/auth`,
    basePath: "/api/auth",
    secret: config.BETTER_AUTH_SECRET ?? config.JWT_SECRET!,
    trustedOrigins: [config.WEB_ORIGIN],
    database: prismaAdapter(db, {
      provider: "postgresql",
      transaction: ownTransactions,
    }),
    user: { modelName: "User" },
    account: { modelName: "AuthAccount" },
    verification: {
      modelName: "AuthVerification",
      storeIdentifier: {
        default: "plain",
        overrides: {
          "reset-password:": {
            hash: async (value) => {
              return tokenHash(value);
            },
          },
        },
      },
    },
    session: {
      modelName: "AuthSession",
      expiresIn: 7 * 24 * 3600,
      freshAge: 15 * 60,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
      additionalFields: {
        mfaVerified: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => {
          return verifyPassword(password, hash);
        },
      },
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, token }) => {
        return sendReset(user.id, token);
      },
    },
    advanced: {
      useSecureCookies: config.NODE_ENV === "production",
      database: {
        generateId: () => {
          return randomUUID();
        },
      },
      cookiePrefix: "fp_identity",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/api",
      },
      cookies: {
        session_token: {
          name:
            config.NODE_ENV === "production"
              ? "__Secure-fp_session"
              : "fp_session",
        },
      },
    },
    // Only the validated NestJS facade is exposed. It uses distributed PostgreSQL limits.
    rateLimit: { enabled: false },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await db.user.findUnique({
              where: { id: session.userId },
            });

            return user?.active && !user.retentionErasedAt
              ? { data: session }
              : false;
          },
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: "Fresh Phones PH",
        twoFactorTable: "AuthTwoFactor",
        skipVerificationOnEnable: false,
        accountLockout: {
          enabled: true,
          maxFailedAttempts: 10,
          durationSeconds: 900,
        },
      }),
      {
        id: "fresh-local-demo",
        endpoints: {
          localDemoSession: createAuthEndpoint(
            "/local-demo-session",
            { method: "POST" },
            async (ctx) => {
              const user = await ctx.context.internalAdapter.findUserById(
                (ctx.body as { userId: string }).userId,
              );

              const current =
                user && (await db.user.findUnique({ where: { id: user.id } }));

              if (!user || !current?.active || current.twoFactorEnabled) {
                throw new Error("Demo session is unavailable.");
              }

              const session = await ctx.context.internalAdapter.createSession(
                user.id,
              );

              if (!session) {
                throw new Error("Demo session is unavailable.");
              }

              await setSessionCookie(ctx, { session, user });

              return ctx.json({ ok: true });
            },
          ),
        },
      },
    ],
  });
}
