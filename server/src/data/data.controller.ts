import { Controller, Get } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';

@Controller('data')
export class DataController {
  constructor(private readonly adminService: AdminService) {}

  @Get('uploaded')
  async getUploadedData() {
    console.log('获取所有上传数据');
    try {
      const uploads = await this.adminService.getUploads();
      console.log('上传数据:', uploads);
      return { code: 200, msg: 'success', data: uploads };
    } catch (error) {
      console.error('获取数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }
}
