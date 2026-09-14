import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      primaryOrgSlug: string;
      rememberMe: boolean;
      orgs: Array<{
        orgId: string;
        slug: string;
        role: string;
      }>;
    } & DefaultSession['user'];
  }

  interface User {
    rememberMe?: boolean;
    primaryOrgSlug?: string;
    orgs?: Array<{
      orgId: string;
      slug: string;
      role: string;
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    primaryOrgSlug?: string;
    rememberMe?: boolean;
    orgs?: Array<{
      orgId: string;
      slug: string;
      role: string;
    }>;
  }
}
