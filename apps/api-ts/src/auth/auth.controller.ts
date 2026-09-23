import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { loginSchema, passwordSchema, type User } from '@freshphones/contracts';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CONFIG, type Config } from '../config';
import { Validate } from '../http';
import { CurrentUser, Public } from './access';
import { AuthService, refreshSeconds } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}
  private cookies(response: Response, tokens: { access: string; refresh: string }) {
    const options = {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };
    response.cookie('fp_access', tokens.access, { ...options, path: '/api', maxAge: 15 * 60_000 });
    response.cookie('fp_refresh', tokens.refresh, {
      ...options,
      path: '/api/auth',
      maxAge: refreshSeconds * 1000,
    });
    response.setHeader('Cache-Control', 'no-store');
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new Validate(loginSchema)) body: z.infer<typeof loginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body.email, body.password, req.ip ?? 'unknown');
    this.cookies(res, result);
    return result.user;
  }
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(
      typeof req.cookies?.fp_refresh === 'string' ? req.cookies.fp_refresh : '',
    );
    this.cookies(res, result);
    return result.user;
  }
  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(
      typeof req.cookies?.fp_refresh === 'string' ? req.cookies.fp_refresh : undefined,
    );
    res.clearCookie('fp_access', { path: '/api' });
    res.clearCookie('fp_refresh', { path: '/api/auth' });
    return { ok: true };
  }
  @Get('me') me(@CurrentUser() user: User) {
    return user;
  }
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgot(
    @Body(
      new Validate(
        z
          .object({
            email: z
              .string()
              .email()
              .transform((v) => v.toLowerCase()),
          })
          .strict(),
      ),
    )
    body: { email: string },
    @Req() req: Request,
  ) {
    await this.auth.forgot(body.email, req.ip ?? 'unknown');
    return { message: 'If an active account exists, a reset link will be sent.' };
  }
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async reset(
    @Body(
      new Validate(
        z.object({ token: z.string().min(32).max(128), password: passwordSchema }).strict(),
      ),
    )
    body: { token: string; password: string },
    @Req() req: Request,
  ) {
    await this.auth.limit(`reset-use:${req.ip}`, 20);
    await this.auth.reset(body.token, body.password);
    return { ok: true };
  }
}
