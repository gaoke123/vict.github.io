import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class UserService {
  // 用户注册
  async register(username: string, password: string, phone?: string) {
    const client = getSupabaseClient();
    
    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 创建新用户，默认30天使用时长
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30);

    const { data, error } = await client
      .from('users')
      .insert({
        username,
        password,
        phone: phone || null,
        role: 'user',
        expire_at: expireAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error('注册失败: ' + error.message);
    }

    return {
      id: data.id,
      username: data.username,
      phone: data.phone,
      role: data.role,
      expireAt: data.expire_at
    };
  }

  // 用户登录
  async login(username: string, password: string) {
    const client = getSupabaseClient();
    
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      throw new Error('用户名或密码错误');
    }

    // 检查是否过期
    if (user.expire_at && new Date(user.expire_at) < new Date()) {
      throw new Error('账号已过期，请联系管理员续费');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      expireAt: user.expire_at
    };
  }

  // 获取用户列表（管理员功能）
  async getUserList() {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('users')
      .select('id, username, phone, role, expire_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('获取用户列表失败');
    }

    return data.map(user => ({
      id: user.id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      expireAt: user.expire_at,
      createdAt: user.created_at,
      daysLeft: user.expire_at ? Math.max(0, Math.ceil((new Date(user.expire_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
    }));
  }

  // 添加用户（管理员功能）
  async addUser(username: string, password: string, days: number, phone?: string, role?: string) {
    const client = getSupabaseClient();
    
    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + days);

    const { data, error } = await client
      .from('users')
      .insert({
        username,
        password,
        phone: phone || null,
        role: role || 'user',
        expire_at: role === 'admin' ? null : expireAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error('添加用户失败');
    }

    return {
      id: data.id,
      username: data.username,
      phone: data.phone,
      role: data.role,
      expireAt: data.expire_at
    };
  }

  // 更新用户信息（管理员功能）
  async updateUser(userId: number, username?: string, password?: string, phone?: string) {
    const client = getSupabaseClient();
    
    // 构建更新对象
    const updateData: Record<string, string | null> = {};
    if (username) {
      // 检查新用户名是否已被其他用户使用
      const { data: existingUser } = await client
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single();

      if (existingUser) {
        throw new Error('用户名已存在');
      }
      updateData.username = username;
    }
    if (password) {
      updateData.password = password;
    }
    if (phone !== undefined) {
      updateData.phone = phone || null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('没有要更新的内容');
    }

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('更新失败');
    }

    return {
      id: data.id,
      username: data.username,
      phone: data.phone,
      role: data.role
    };
  }

  // 延长用户时长（管理员功能）
  async extendUser(userId: number, days: number) {
    const client = getSupabaseClient();
    
    // 先获取当前用户信息
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('expire_at')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new Error('用户不存在');
    }

    // 计算新的过期时间
    let newExpireAt: Date;
    const currentExpire = user.expire_at ? new Date(user.expire_at) : new Date();
    
    if (currentExpire > new Date()) {
      // 如果未过期，在当前基础上延长
      newExpireAt = new Date(currentExpire);
    } else {
      // 如果已过期，从现在开始计算
      newExpireAt = new Date();
    }
    newExpireAt.setDate(newExpireAt.getDate() + days);

    const { data, error } = await client
      .from('users')
      .update({ expire_at: newExpireAt.toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('延长失败');
    }

    return {
      id: data.id,
      expireAt: data.expire_at
    };
  }

  // 删除用户（管理员功能）
  async deleteUser(userId: number) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error('删除失败');
    }
  }

  // 检查用户名是否存在
  async checkUsernameExists(username: string): Promise<boolean> {
    const client = getSupabaseClient();
    
    const { data } = await client
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    return !!data;
  }
}
