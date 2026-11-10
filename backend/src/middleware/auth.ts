import type { UserRole } from '@medipath/shared';
import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthSessionUser, MediPathStore } from '../services/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthSessionUser;
    }
  }
}

export function signSessionToken(user: AuthSessionUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.devJwtSecret,
    { expiresIn: '7d' },
  );
}

async function resolveUserFromToken(token: string, store: MediPathStore): Promise<AuthSessionUser | null> {
  // 1. Verify local / backend-issued JWT first
  try {
    const decoded = jwt.verify(token, env.devJwtSecret) as { sub?: string };
    if (decoded.sub) {
      const user = await store.findUserById(decoded.sub);
      if (user) return user;
    }
  } catch {
    // Fall through to Supabase JWT verification if configured
  }

  // 2. Verify Supabase JWT when Supabase is active
  if (env.hasValidSupabaseConfig) {
    if (env.supabaseJwtSecret) {
      try {
        const decoded = jwt.verify(token, env.supabaseJwtSecret) as { sub?: string };
        if (decoded.sub) {
          const user = await store.findUserById(decoded.sub);
          if (user) return user;
        }
      } catch {
        // Continue to Supabase getUser verification
      }
    }
    try {
      const sb = createClient(env.supabaseUrl, env.supabaseAnonKey || env.supabaseServiceRoleKey, {
        auth: { persistSession: false },
      });
      const { data } = await sb.auth.getUser(token);
      if (data.user) {
        const profile = await store.findUserById(data.user.id);
        if (profile) return profile;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function createAuthMiddleware(store: MediPathStore) {
  const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice(7).trim();
      if (token) {
        const user = await resolveUserFromToken(token, store);
        if (user) req.user = user;
      }
    }
    next();
  };

  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const header = req.headers.authorization;
      if (header?.startsWith('Bearer ')) {
        const user = await resolveUserFromToken(header.slice(7).trim(), store);
        if (user) req.user = user;
      }
    }
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  };

  const requireRole =
    (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions for this operation' });
        return;
      }
      next();
    };

  return { optionalAuth, requireAuth, requireRole };
}

