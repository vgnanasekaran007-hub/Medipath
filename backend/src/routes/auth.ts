import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createAuthMiddleware, signSessionToken } from '../middleware/auth.js';
import type { MediPathStore } from '../services/index.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['en', 'ta']).optional().default('en'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  preferredLanguage: z.enum(['en', 'ta']).optional(),
  accessibilityRequired: z.boolean().optional(),
});

export function createAuthRouter(store: MediPathStore): Router {
  const router = Router();
  const { requireAuth } = createAuthMiddleware(store);

  router.post('/register', async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const user = await store.registerUser(parsed.data);
      const token = signSessionToken(user);
      res.status(201).json({ user, token });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed' });
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please provide a valid email and password.' });
        return;
      }

      if (store.mode === 'supabase' && env.hasValidSupabaseConfig) {
        const sb = createClient(env.supabaseUrl, env.supabaseAnonKey || env.supabaseServiceRoleKey, {
          auth: { persistSession: false },
        });
        const { data, error } = await sb.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error || !data.user || !data.session) {
          res.status(401).json({ error: 'Invalid email or password.' });
          return;
        }
        const profile = await store.findUserById(data.user.id);
        if (!profile) {
          res.status(401).json({ error: 'User profile missing.' });
          return;
        }
        res.json({ user: profile, token: data.session.access_token });
        return;
      }

      const record = await store.findUserByEmail(parsed.data.email);
      if (!record || !store.verifyPassword(record, parsed.data.password)) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const { passwordHash: _, ...user } = record;
      const token = signSessionToken(user);
      res.json({ user, token });
    } catch (err) {
      next(err);
    }
  });

  router.post('/forgot-password', async (req, res, next) => {
    try {
      const parsed = forgotSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (store.mode === 'supabase' && env.hasValidSupabaseConfig) {
        const sb = createClient(env.supabaseUrl, env.supabaseAnonKey || env.supabaseServiceRoleKey);
        await sb.auth.resetPasswordForEmail(parsed.data.email, {
          redirectTo: `${env.frontendUrl}/login`,
        });
      }
      res.json({
        ok: true,
        message:
          'If an account exists for that email, password reset instructions have been prepared.',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.patch('/profile', requireAuth, async (req, res, next) => {
    try {
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid profile update payload', details: parsed.error.flatten() });
        return;
      }
      const user = await store.updateProfile(req.user!.id, parsed.data);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

