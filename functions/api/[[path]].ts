import { handle } from 'hono/cloudflare-pages';
import { app } from '../_lib/app';

export const onRequest = handle(app);
