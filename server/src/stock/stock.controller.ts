import { Controller, Get } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('industry')
  async getIndustryData() {
    console.log('获取行业板块数据');
    try {
      const result = await this.stockService.getIndustryData();
      console.log('行业数据返回:', result.data?.length, '个板块, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取行业数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Get('limit-up')
  async getLimitUpStocks() {
    console.log('获取涨停个股数据');
    try {
      const result = await this.stockService.getLimitUpStocks();
      console.log('涨停数据返回:', result.data?.length, '只, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取涨停数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Get('dragon-tiger')
  async getDragonTigerData() {
    console.log('获取龙虎榜数据');
    try {
      const result = await this.stockService.getDragonTigerData();
      console.log('龙虎榜数据返回:', result.data?.length, '只, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取龙虎榜数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Get('trend-leader')
  async getTrendLeaderData() {
    console.log('获取趋势龙头数据');
    try {
      const result = await this.stockService.getTrendLeaderData();
      console.log('趋势龙头数据返回:', result.data?.length, '只, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取趋势龙头数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Get('news-catalyst')
  async getNewsCatalystData() {
    console.log('获取新闻催化数据');
    try {
      const result = await this.stockService.getNewsCatalystData();
      console.log('新闻催化数据返回:', result.data?.length, '条, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取新闻催化数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Get('hot-review')
  async getHotReviewData() {
    console.log('获取热点复盘数据');
    try {
      const result = await this.stockService.getHotReviewData();
      console.log('热点复盘数据返回, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取热点复盘数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }

  @Get('continuous-limit-up')
  async getContinuousLimitUpData() {
    console.log('获取连板梯队数据');
    try {
      const result = await this.stockService.getContinuousLimitUpData();
      console.log('连板梯队数据返回:', result.data?.stocks?.length, '只, 来源:', result.source);
      return { code: 200, msg: 'success', data: result.data, source: result.source, updateTime: result.updateTime, trading_day: result.trading_day };
    } catch (error) {
      console.error('获取连板梯队数据失败:', error);
      return { code: 400, msg: error.message || '获取失败', data: null };
    }
  }
}
