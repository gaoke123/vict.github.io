import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  async register(@Body() body: { phone: string; username: string }) {
    console.log('注册请求:', body);
    
    if (!body.phone || !body.username) {
      return { code: 400, msg: '手机号和用户名不能为空', data: null };
    }

    if (body.phone.length !== 11) {
      return { code: 400, msg: '手机号格式不正确', data: null };
    }

    if (body.username.length < 2 || body.username.length > 20) {
      return { code: 400, msg: '用户名长度应为2-20个字符', data: null };
    }

    try {
      const user = await this.authService.register(body.phone, body.username);
      console.log('注册成功:', user);
      return { code: 200, msg: '注册成功', data: user };
    } catch (error) {
      console.error('注册失败:', error);
      return { code: 400, msg: error.message || '注册失败', data: null };
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { phone: string; username: string }) {
    console.log('登录请求:', body);
    
    if (!body.phone || !body.username) {
      return { code: 400, msg: '手机号和用户名不能为空', data: null };
    }

    try {
      const user = await this.authService.login(body.phone, body.username);
      console.log('登录成功:', user);
      return { code: 200, msg: '登录成功', data: user };
    } catch (error) {
      console.error('登录失败:', error);
      return { code: 400, msg: error.message || '登录失败', data: null };
    }
  }
}
