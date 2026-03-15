import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Body, 
  UseInterceptors,
  UploadedFile,
  HttpCode
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers() {
    console.log('获取用户列表');
    try {
      const users = await this.adminService.getUsers();
      console.log('用户列表:', users);
      return { code: 200, msg: 'success', data: users };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Delete('users/:id')
  @HttpCode(200)
  async deleteUser(@Param('id') id: string) {
    console.log('删除用户:', id);
    try {
      await this.adminService.deleteUser(Number(id));
      return { code: 200, msg: '删除成功', data: null };
    } catch (error) {
      console.error('删除用户失败:', error);
      return { code: 400, msg: error.message || '删除失败', data: null };
    }
  }

  @Get('uploads')
  async getUploads() {
    console.log('获取上传列表');
    try {
      const uploads = await this.adminService.getUploads();
      console.log('上传列表:', uploads);
      return { code: 200, msg: 'success', data: uploads };
    } catch (error) {
      console.error('获取上传列表失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Post('upload')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string,
  ) {
    console.log('上传文件:', { filename: file?.originalname, category });
    
    if (!file) {
      return { code: 400, msg: '请选择文件', data: null };
    }

    if (!category) {
      return { code: 400, msg: '请选择数据类别', data: null };
    }

    try {
      const result = await this.adminService.uploadFile(file, category, 1); // TODO: 从token获取用户ID
      console.log('上传成功:', result);
      return { code: 200, msg: '上传成功', data: result };
    } catch (error) {
      console.error('上传失败:', error);
      return { code: 400, msg: error.message || '上传失败', data: null };
    }
  }

  @Delete('uploads/:id')
  @HttpCode(200)
  async deleteUpload(@Param('id') id: string) {
    console.log('删除上传数据:', id);
    try {
      await this.adminService.deleteUpload(Number(id));
      return { code: 200, msg: '删除成功', data: null };
    } catch (error) {
      console.error('删除失败:', error);
      return { code: 400, msg: error.message || '删除失败', data: null };
    }
  }
}
