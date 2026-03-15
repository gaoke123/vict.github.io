import { Injectable, BadRequestException } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class AuthService {
  async register(phone: string, username: string) {
    const client = getSupabaseClient();

    // 检查手机号是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      throw new BadRequestException('该手机号已注册');
    }

    // 创建新用户（默认使用期1年）
    const now = new Date();
    const usageEndTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const { data, error } = await client
      .from('users')
      .insert({
        phone,
        username,
        is_admin: false,
        usage_start_time: now.toISOString(),
        usage_end_time: usageEndTime.toISOString(),
        login_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('注册失败:', error);
      throw new BadRequestException('注册失败: ' + error.message);
    }

    return {
      id: data.id,
      phone: data.phone,
      username: data.username,
      isAdmin: data.is_admin,
    };
  }

  async login(phone: string, username: string) {
    const client = getSupabaseClient();

    // 查询用户
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('username', username)
      .single();

    if (error || !user) {
      throw new BadRequestException('手机号或用户名错误');
    }

    // 检查使用期限
    if (user.usage_end_time) {
      const endTime = new Date(user.usage_end_time);
      if (endTime < new Date()) {
        throw new BadRequestException('账号已过期，请联系管理员续费');
      }
    }

    // 更新登录次数和最后登录时间
    const now = new Date();
    await client
      .from('users')
      .update({
        login_count: (user.login_count || 0) + 1,
        last_login_at: now.toISOString(),
      })
      .eq('id', user.id);

    return {
      id: user.id,
      phone: user.phone,
      username: user.username,
      isAdmin: user.is_admin,
      usageEndTime: user.usage_end_time,
      loginCount: (user.login_count || 0) + 1,
    };
  }
}
