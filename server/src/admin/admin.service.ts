import { Injectable, BadRequestException } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';
import * as xlsx from 'xlsx';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

@Injectable()
export class AdminService {
  // 获取所有用户
  async getUsers() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户列表失败:', error);
      throw new BadRequestException('获取用户列表失败');
    }

    return data || [];
  }

  // 删除用户
  async deleteUser(userId: number) {
    const client = getSupabaseClient();
    
    // 检查是否是管理员
    const { data: user } = await client
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (user?.is_admin) {
      throw new BadRequestException('不能删除管理员账号');
    }

    const { error } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('删除用户失败:', error);
      throw new BadRequestException('删除用户失败');
    }

    return true;
  }

  // 获取上传的数据列表
  async getUploads() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('data_uploads')
      .select('id, category, title, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取上传列表失败:', error);
      throw new BadRequestException('获取上传列表失败');
    }

    return data || [];
  }

  // 上传文件
  async uploadFile(file: Express.Multer.File, category: string, uploadedBy: number) {
    let content: any = null;
    let title = file.originalname;

    // 解析文件内容
    if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      // 解析Excel文件
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      content = xlsx.utils.sheet_to_json(sheet);
      
      // 尝试从第一行获取标题
      if (content && content.length > 0) {
        title = content[0].title || content[0].标题 || file.originalname;
      }
    } else if (file.originalname.endsWith('.txt') || file.originalname.endsWith('.csv')) {
      // 解析文本文件
      const textContent = file.buffer.toString('utf-8');
      content = { text: textContent };
      title = textContent.split('\n')[0].substring(0, 100) || file.originalname;
    }

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: file.buffer,
      fileName: `uploads/${category}/${Date.now()}_${file.originalname}`,
      contentType: file.mimetype,
    });

    const fileUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400 * 30, // 30天有效期
    });

    // 保存到数据库
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('data_uploads')
      .insert({
        category,
        title,
        content,
        file_key: fileKey,
        file_url: fileUrl,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) {
      console.error('保存上传记录失败:', error);
      throw new BadRequestException('保存上传记录失败');
    }

    return data;
  }

  // 删除上传的数据
  async deleteUpload(uploadId: number) {
    const client = getSupabaseClient();
    
    // 获取文件key
    const { data: upload } = await client
      .from('data_uploads')
      .select('file_key')
      .eq('id', uploadId)
      .single();

    // 删除对象存储中的文件
    if (upload?.file_key) {
      try {
        await storage.deleteFile({ fileKey: upload.file_key });
      } catch (error) {
        console.error('删除存储文件失败:', error);
      }
    }

    // 删除数据库记录
    const { error } = await client
      .from('data_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      console.error('删除上传记录失败:', error);
      throw new BadRequestException('删除上传记录失败');
    }

    return true;
  }

  // 获取指定类别的上传数据
  async getUploadsByCategory(category: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('data_uploads')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取数据失败:', error);
      throw new BadRequestException('获取数据失败');
    }

    return data || [];
  }
}
