// auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from './app/database';
import { loginSchema } from './lib/validations/auth';
import { users, orgMemberships, organizations } from './app/database/schema';
import { verifyPassword } from './lib/auth/password';
import { InvalidCredentialsError, OAuthAccountError, NoOrganizationError } from './lib/auth/errors';

const FIFTEEN_MINUTES = 15 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: THIRTY_DAYS, // Max session upper bound
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      authorize: async (credentials) => {
        // --- 1. Payload Parsing & Sanitization ---
        const payload = {
          email:
            typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '',
          password: typeof credentials?.password === 'string' ? credentials.password : '',
          rememberMe: credentials?.rememberMe === 'true' || credentials?.rememberMe === true,
        };

        const credentialsOnlySchema = loginSchema.pick({
          email: true,
          password: true,
        });

        const parsed = credentialsOnlySchema.safeParse(payload);
        if (!parsed.success) {
          throw new InvalidCredentialsError();
        }

        const { email, password } = parsed.data;

        // --- 2. User Lookup ---
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            password: users.password,
            image: users.image,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          throw new InvalidCredentialsError();
        }

        // --- 3. OAuth Account Security Guard ---
        if (!user.password) {
          throw new OAuthAccountError();
        }

        // --- 4. Secure Password Verification ---
        const passwordsMatch = await verifyPassword(password, user.password);
        if (!passwordsMatch) {
          throw new InvalidCredentialsError();
        }

        // --- 5. Tenant / Organization Membership Check ---
        const userOrgs = await db
          .select({
            orgId: organizations.id,
            slug: organizations.slug,
            role: orgMemberships.role,
          })
          .from(orgMemberships)
          .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
          .where(eq(orgMemberships.userId, user.id));

        if (!userOrgs || userOrgs.length === 0) {
          throw new NoOrganizationError();
        }

        // --- Non-blocking last login timestamp update ---
        db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id))
          .catch((err) => {
            console.error('[AUTH_ERROR] Failed to update lastLoginAt:', err);
          });

        const displayName = user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

        // Pass sanitized payload including rememberMe to the JWT callback
        return {
          id: user.id,
          name: displayName || null,
          email: user.email,
          image: user.image ?? null,
          rememberMe: payload.rememberMe,
          orgs: userOrgs,
          primaryOrgSlug: userOrgs[0].slug,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Runs on initial sign in
      if (user) {
        const customUser = user as typeof user & {
          rememberMe?: boolean;
          orgs?: Array<{ orgId: string; slug: string; role: string }>;
          primaryOrgSlug?: string;
        };

        token.id = customUser.id;
        token.orgs = customUser.orgs;
        token.primaryOrgSlug = customUser.primaryOrgSlug;
        token.rememberMe = Boolean(customUser.rememberMe);

        // Calculate dynamic expiration window based on rememberMe status
        const duration = token.rememberMe ? THIRTY_DAYS : FIFTEEN_MINUTES;
        token.exp = Math.floor(Date.now() / 1000) + duration;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.primaryOrgSlug = token.primaryOrgSlug as string;
        session.user.orgs = token.orgs as Array<{ orgId: string; slug: string; role: string }>;
        session.user.rememberMe = token.rememberMe as boolean;
      }
      return session;
    },
  },
});
