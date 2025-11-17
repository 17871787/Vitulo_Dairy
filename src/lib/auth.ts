import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    farmId: string;
    farmName: string;
    role: string;
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      farmId: string;
      farmName: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    farmId: string;
    farmName: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        // TODO: Authentication disabled - schema doesn't have passwordHash field
        // Need to add password_hash, farm_id, name columns to users table

        // For now, just return the user data
        return {
          id: user.id,
          email: user.email,
          name: 'Dairy Supplier', // TODO: Get from user.name when field exists
          farmId: '', // TODO: Get from user.farmId when field exists
          farmName: 'Test Farm', // TODO: Look up from farm table when farmId exists
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.farmId = user.farmId;
        token.farmName = user.farmName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: session.user?.email || '',
        name: session.user?.name || '',
        farmId: token.farmId as string,
        farmName: token.farmName as string,
        role: token.role as string,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
