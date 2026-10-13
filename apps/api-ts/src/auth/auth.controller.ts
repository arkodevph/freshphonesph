import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { loginSchema, passwordSchema, type User } from '@freshphones/contracts';
import { Validate } from '../http';
import { CurrentUser, LegalExempt, MfaExempt, Public } from './access';
import { AuthService } from './auth.service';
import { AbusePolicy, addressGroup } from '../abuse/policies';
const passwordBody = z.object({ password: z.string().min(1).max(128) }).strict();
const codeBody = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
@LegalExempt()
@MfaExempt()
@Controller('auth')
@AbusePolicy('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('login') @Public() @HttpCode(200)
  login(@Body(new Validate(loginSchema)) body: z.infer<typeof loginSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(body.email, body.password, req, res);
  }
  @Post('refresh') @Public() @HttpCode(200)
  refresh(@Req() req: Request) { return this.auth.refresh(req); }
  @Post('logout') @Public() @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { await this.auth.logout(req, res); return { ok: true }; }
  @Get('me') me(@CurrentUser() user: User) { return user; }
  @Get('security') security(@Req() req: Request) { return this.auth.security(req); }
  @Post('change-password') @HttpCode(200)
  changePassword(@CurrentUser() user: User, @Req() req: Request, @Res({ passthrough: true }) res: Response,
    @Body(new Validate(z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }).strict())) body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(user.id, body.currentPassword, body.newPassword, req, res);
  }
  @Post('forgot-password') @Public() @HttpCode(200)
  async forgot(@Body(new Validate(z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()) }).strict())) body: { email: string }, @Req() req: Request) {
    await this.auth.forgot(body.email, addressGroup(req.ip), req); return { message: 'If an active account exists, a reset link will be sent.' };
  }
  @Post('reset-password') @Public() @HttpCode(200)
  async reset(@Body(new Validate(z.object({ token: z.string().min(24).max(128), password: passwordSchema }).strict())) body: { token: string; password: string }, @Req() req: Request) {
    await this.auth.reset(body.token, body.password, req); return { ok: true };
  }
  @Post('mfa/enable') @HttpCode(200)
  enable(@Body(new Validate(passwordBody)) body: { password: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.mfa('enable', body, req, res); }
  @Post('mfa/verify') @Public() @HttpCode(200)
  verify(@Body(new Validate(codeBody)) body: { code: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.mfa('verify', body, req, res); }
  @Post('mfa/backup') @Public() @HttpCode(200)
  backup(@Body(new Validate(z.object({ code: z.string().min(6).max(40) }).strict())) body: { code: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.mfa('backup', body, req, res); }
  @Post('mfa/disable') @HttpCode(200)
  disable(@Body(new Validate(passwordBody)) body: { password: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.mfa('disable', body, req, res); }
  @Post('mfa/recovery-codes') @HttpCode(200)
  codes(@Body(new Validate(passwordBody)) body: { password: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.mfa('regenerate', body, req, res); }
  @Post('sessions/revoke') @HttpCode(200)
  revoke(@Body(new Validate(z.object({ sessionId: z.string().uuid().optional() }).strict())) body: { sessionId?: string }, @Req() req: Request) { return this.auth.revokeSessions(req, body.sessionId); }
}
