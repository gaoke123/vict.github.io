import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string; phone?: string }) {
    console.log('用户注册:', body.username, body.phone);
    try {
      const result = await this.userService.register(body.username, body.password, body.phone);
      return { code: 200, msg: '注册成功', data: result };
    } catch (error) {
      console.error('注册失败:', error);
      return { code: 400, msg: error.message || '注册失败', data: null };
    }
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    console.log('用户登录:', body.username);
    try {
      const result = await this.userService.login(body.username, body.password);
      return { code: 200, msg: '登录成功', data: result };
    } catch (error) {
      console.error('登录失败:', error);
      return { code: 400, msg: error.message || '登录失败', data: null };
    }
  }

  @Get('list')
  async getUserList() {
    console.log('获取用户列表');
    try {
      const result = await this.userService.getUserList();
      return { code: 200, msg: 'success', data: result };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Post('add')
  async addUser(@Body() body: { username: string; password: string; phone?: string; days?: number; role?: string }) {
    console.log('添加用户:', body.username, body.phone, body.role);
    try {
      const result = await this.userService.addUser(body.username, body.password, body.days || 30, body.phone, body.role);
      return { code: 200, msg: '添加成功', data: result };
    } catch (error) {
      console.error('添加用户失败:', error);
      return { code: 400, msg: error.message || '添加失败', data: null };
    }
  }

  @Post('update')
  async updateUser(@Body() body: { userId: number; username?: string; password?: string; phone?: string }) {
    console.log('更新用户信息:', body.userId, body.username);
    try {
      const result = await this.userService.updateUser(body.userId, body.username, body.password, body.phone);
      return { code: 200, msg: '更新成功', data: result };
    } catch (error) {
      console.error('更新用户失败:', error);
      return { code: 400, msg: error.message || '更新失败', data: null };
    }
  }

  @Post('extend')
  async extendUser(@Body() body: { userId: number; days: number }) {
    console.log('延长用户时长:', body.userId, body.days, '天');
    try {
      const result = await this.userService.extendUser(body.userId, body.days);
      return { code: 200, msg: '延长成功', data: result };
    } catch (error) {
      console.error('延长用户时长失败:', error);
      return { code: 400, msg: error.message || '延长失败', data: null };
    }
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    console.log('删除用户:', id);
    try {
      await this.userService.deleteUser(parseInt(id));
      return { code: 200, msg: '删除成功', data: null };
    } catch (error) {
      console.error('删除用户失败:', error);
      return { code: 400, msg: error.message || '删除失败', data: null };
    }
  }

  @Get('check-username/:username')
  async checkUsername(@Param('username') username: string) {
    console.log('检查用户名:', username);
    try {
      const exists = await this.userService.checkUsernameExists(username);
      return { code: 200, msg: 'success', data: { exists } };
    } catch (error) {
      console.error('检查用户名失败:', error);
      return { code: 400, msg: error.message || '检查失败', data: null };
    }
  }
}
