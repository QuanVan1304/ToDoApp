import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(
    prisma as unknown as Parameters<typeof PrismaAdapter>[0],
  ),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

session: {
  strategy: "jwt",
},

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      (token as { id?: string }).id = user.id;
    }

    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      const userId =
        (token as { id?: string }).id ??
        token.sub;

      if (userId) {
        (session.user as { id: string }).id = userId;
      }
    }

    return session;
  },
},

  pages: {
    signIn: "/login",
  },
});