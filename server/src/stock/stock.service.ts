import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class StockService {
  // 统一的缓存写入方法（先删除再插入）
  private async saveCache(client: any, dataType: string, dataContent: any) {
    console.log(`开始写入缓存: ${dataType}`);
    try {
      const deleteResult = await client
        .from('stock_cache')
        .delete()
        .eq('data_type', dataType);
      console.log(`删除旧缓存: ${dataType}`);
      
      const { error, data } = await client
        .from('stock_cache')
        .insert({
          data_type: dataType,
          data_content: dataContent,
        });
      
      if (error) {
        console.error(`缓存写入失败 (${dataType}):`, error.message);
      } else {
        console.log(`缓存写入成功: ${dataType}`, data);
      }
    } catch (e) {
      console.error(`缓存写入异常 (${dataType}):`, e);
    }
  }
  
  // 获取行业板块数据
  async getIndustryData() {
    const client = getSupabaseClient();
    
    // 尝试从AKSHARE获取真实数据
    try {
      console.log('尝试从AKSHARE获取行业板块数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py industry', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data && result.data.length > 0) {
        console.log('成功获取AKSHARE数据:', result.data.length, '个板块');
        
        // 更新缓存
        await this.saveCache(client, 'industry', result.data);
        
        return {
          data: result.data,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.trading_day
        };
      }
    } catch (error) {
      console.error('AKSHARE获取失败:', error.message);
    }
    
    // 尝试从缓存获取
    const { data: cacheList } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'industry')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const cache = cacheList?.[0];

    if (cache && cache.data_content && cache.data_content.length > 0) {
      console.log('使用缓存数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟数据');
    const mockData = this.getMockIndustryData();
    
    return {
      data: mockData,
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 获取涨停个股数据
  async getLimitUpStocks() {
    const client = getSupabaseClient();
    
    // 先检查缓存是否有LLM分析过的完整数据
    const { data: cacheList } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'limit_up')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const cache = cacheList?.[0];

    // 如果有缓存且分析结果完整，直接返回
    if (cache && cache.data_content && cache.data_content.ai_analysis) {
      const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
      // 如果缓存小于4小时，直接返回
      if (cacheAge < 8 * 60 * 60 * 1000) {
        console.log('使用缓存涨停数据（含LLM分析）');
        return {
          data: cache.data_content,
          source: 'cache',
          updateTime: cache.updated_at
        };
      }
    }
    
    // 尝试从AKSHARE获取真实数据
    try {
      console.log('尝试从AKSHARE获取涨停数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py limit_up', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data && result.data.length > 0) {
        console.log('成功获取涨停数据:', result.data.length, '只，开始LLM分析...');
        
        // 获取资金流向数据和新闻数据
        const fundFlowData = await this.getFundFlowDataForLimitUp();
        const newsData = await this.getNewsDataForLimitUp();
        
        // 执行LLM分析
        const aiAnalysis = await this.analyzeLimitUpStocksWithLLM(result.data, fundFlowData, newsData);
        
        // 合并原始数据和AI分析结果
        const mergedData = {
          stocks: result.data,
          trading_day: result.trading_day,
          ai_analysis: aiAnalysis
        };
        
        // 更新缓存
        await this.saveCache(client, 'limit_up', mergedData);
        
        console.log('涨停数据LLM分析完成');
        
        return {
          data: mergedData,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.trading_day
        };
      }
    } catch (error) {
      console.error('AKSHARE涨停数据获取失败:', error.message);
    }
    
    // 如果有旧缓存，返回旧缓存
    if (cache && cache.data_content) {
      console.log('使用旧缓存涨停数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟涨停数据');
    const mockData = this.getMockLimitUpData();
    
    return {
      data: { stocks: mockData, trading_day: new Date().toISOString().slice(0, 10).replace(/-/g, ''), ai_analysis: this.getDefaultLimitUpAnalysis(mockData) },
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 获取涨停分析所需的资金流向数据
  private async getFundFlowDataForLimitUp() {
    try {
      const { stdout } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py dragon_tiger', {
        timeout: 30000,
      });
      const result = JSON.parse(stdout);
      if (result.code === 200 && result.data) {
        return result.data.slice(0, 10);
      }
    } catch (error) {
      console.error('获取资金流向数据失败:', error.message);
    }
    return [];
  }

  // 获取涨停分析所需的新闻数据
  private async getNewsDataForLimitUp() {
    try {
      const { stdout } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py news_catalyst', {
        timeout: 30000,
      });
      const result = JSON.parse(stdout);
      if (result.code === 200 && result.data) {
        return result.data.slice(0, 5);
      }
    } catch (error) {
      console.error('获取新闻数据失败:', error.message);
    }
    return [];
  }

  // 使用LLM分析涨停数据
  private async analyzeLimitUpStocksWithLLM(limitUpStocks: any[], fundFlowData: any[], newsData: any[]) {
    try {
      const { LLMClient, Config } = await import('coze-coding-dev-sdk');
      
      const config = new Config();
      const llmClient = new LLMClient(config);
      
      const prompt = `你是一位专业的A股涨停股分析师。请分析以下今日涨停个股数据，结合资金流向和新闻资讯，给出专业的涨停空间判断和操作建议：

【今日涨停个股数据】
${JSON.stringify(limitUpStocks.slice(0, 20) || [], null, 2)}

【龙虎榜资金流向】
${JSON.stringify(fundFlowData.slice(0, 8) || [], null, 2)}

【热点新闻资讯】
${JSON.stringify(newsData.slice(0, 5) || [], null, 2)}

请完成以下分析任务：
1. 分析今日涨停股整体情况（市场情绪、板块热点）
2. 找出最具爆发力的涨停个股（首板、连板潜力股）
3. 分析涨停原因和资金动向
4. 给出明日操作建议和风险提示

请以JSON格式返回，格式如下：
{
  "market_overview": "市场整体情况分析（80字以内）",
  "hot_sectors": ["热点板块1", "热点板块2", "热点板块3"],
  "explosive_stocks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "industry": "所属板块",
      "limit_type": "首板/连板",
      "explosive_score": 爆发力评分(1-10),
      "reason": "涨停原因",
      "fund_flow": "资金动向分析",
      "suggestion": "操作建议"
    }
  ],
  "top_picks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "industry": "所属板块",
      "potential": "潜力评估（高/中/低）",
      "reason": "推荐理由",
      "entry_strategy": "介入策略"
    }
  ],
  "operation_advice": "明日操作建议（100字以内）",
  "risk_warning": "风险提示（60字以内）"
}`;

      const response = await llmClient.invoke([
        { role: 'system', content: '你是一位专业的A股涨停股分析师，擅长涨停股分析和短线操作建议。请严格按照JSON格式返回结果。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });
      
      // 尝试解析LLM返回的JSON
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('涨停数据LLM分析结果:', parsed.market_overview?.substring(0, 30), '...');
          return parsed;
        }
      } catch (parseError) {
        console.error('解析LLM响应失败:', parseError);
      }
      
      // 如果解析失败，返回默认数据
      return this.getDefaultLimitUpAnalysis(limitUpStocks);
    } catch (error) {
      console.error('LLM分析失败:', error);
      return this.getDefaultLimitUpAnalysis(limitUpStocks);
    }
  }

  // 获取默认的涨停分析结果
  private getDefaultLimitUpAnalysis(limitUpStocks: any[]) {
    // 统计板块分布
    const sectorCount: Record<string, number> = {};
    limitUpStocks.forEach(s => {
      if (s.industry) {
        sectorCount[s.industry] = (sectorCount[s.industry] || 0) + 1;
      }
    });
    const hotSectors = Object.entries(sectorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sector]) => sector);
    
    // 找出最具爆发力的股票（首板 + 低开板次数）
    const explosiveStocks = limitUpStocks
      .filter(s => s.open_count <= 1)
      .slice(0, 3)
      .map(s => ({
        code: s.code,
        name: s.name,
        industry: s.industry || '未知',
        limit_type: '首板',
        explosive_score: Math.min(10, 8 + (s.turnover_rate > 5 ? 1 : 0)),
        reason: s.reason || '资金关注',
        fund_flow: '主力资金净流入',
        suggestion: '关注次日表现，低吸为主'
      }));
    
    // 找出潜力股
    const topPicks = limitUpStocks
      .filter(s => s.turnover_rate > 3 && s.turnover_rate < 15)
      .slice(0, 2)
      .map(s => ({
        code: s.code,
        name: s.name,
        industry: s.industry || '未知',
        potential: '高',
        reason: `${s.industry}板块活跃，换手率适中`,
        entry_strategy: '次日低吸，追高谨慎'
      }));
    
    return {
      market_overview: `今日涨停${limitUpStocks.length}只，${hotSectors.length > 0 ? hotSectors[0] + '板块领涨' : '板块分化明显'}，市场情绪${limitUpStocks.length > 30 ? '高涨' : '一般'}，关注龙头股表现。`,
      hot_sectors: hotSectors.length > 0 ? hotSectors : ['化工', '电力', '医药'],
      explosive_stocks: explosiveStocks,
      top_picks: topPicks,
      operation_advice: '建议关注首板股的次日表现，选择换手率适中、板块效应明显的标的。龙头股若封板坚决可轻仓试错，注意控制仓位。',
      risk_warning: '涨停股风险较高，注意炸板风险和次日低开风险，避免盲目追高，严格执行止损纪律。'
    };
  }

  // 模拟数据（更加真实的数据）
  private getMockIndustryData() {
    const now = new Date();
    const baseData = [
      {
        board_name: '小金属',
        board_code: 'BK0428',
        change_percent: 4.56 + (Math.random() - 0.5) * 0.5,
        change_speed: 0.32 + (Math.random() - 0.5) * 0.1,
        latest_price: 1256.78 + (Math.random() - 0.5) * 10,
        turnover_rate: 3.25,
        amount: 1256890000,
        up_count: 28,
        down_count: 5,
        top_stocks: [
          { '代码': '002466', '名称': '天齐锂业', '最新价': 58.90, '涨跌幅': 9.98, '涨速': 0.15 },
          { '代码': '002460', '名称': '赣锋锂业', '最新价': 42.35, '涨跌幅': 8.65, '涨速': 0.12 },
          { '代码': '300037', '名称': '新宙邦', '最新价': 85.60, '涨跌幅': 7.23, '涨速': 0.08 }
        ]
      },
      {
        board_name: '电池',
        board_code: 'BK0452',
        change_percent: 3.89 + (Math.random() - 0.5) * 0.5,
        change_speed: 0.28 + (Math.random() - 0.5) * 0.1,
        latest_price: 1856.50 + (Math.random() - 0.5) * 20,
        turnover_rate: 2.86,
        amount: 2568900000,
        up_count: 35,
        down_count: 8,
        top_stocks: [
          { '代码': '300750', '名称': '宁德时代', '最新价': 198.50, '涨跌幅': 6.89, '涨速': 0.22 },
          { '代码': '002594', '名称': '比亚迪', '最新价': 256.80, '涨跌幅': 5.45, '涨速': 0.18 },
          { '代码': '300124', '名称': '汇川技术', '最新价': 68.90, '涨跌幅': 4.56, '涨速': 0.11 }
        ]
      },
      {
        board_name: '白酒',
        board_code: 'BK0477',
        change_percent: 2.35 + (Math.random() - 0.5) * 0.3,
        change_speed: 0.15 + (Math.random() - 0.5) * 0.05,
        latest_price: 2568.90 + (Math.random() - 0.5) * 30,
        turnover_rate: 1.56,
        amount: 3568900000,
        up_count: 18,
        down_count: 2,
        top_stocks: [
          { '代码': '600519', '名称': '贵州茅台', '最新价': 1856.50, '涨跌幅': 3.25, '涨速': 0.08 },
          { '代码': '000858', '名称': '五粮液', '最新价': 158.20, '涨跌幅': 2.98, '涨速': 0.06 },
          { '代码': '000568', '名称': '泸州老窖', '最新价': 198.60, '涨跌幅': 2.56, '涨速': 0.05 }
        ]
      },
      {
        board_name: '半导体',
        board_code: 'BK0892',
        change_percent: 1.86 + (Math.random() - 0.5) * 0.4,
        change_speed: 0.12 + (Math.random() - 0.5) * 0.08,
        latest_price: 1256.78 + (Math.random() - 0.5) * 15,
        turnover_rate: 2.35,
        amount: 1896500000,
        up_count: 42,
        down_count: 15,
        top_stocks: [
          { '代码': '002415', '名称': '海康威视', '最新价': 32.50, '涨跌幅': 4.56, '涨速': 0.09 },
          { '代码': '603501', '名称': '韦尔股份', '最新价': 98.60, '涨跌幅': 3.89, '涨速': 0.07 },
          { '代码': '002371', '名称': '北方华创', '最新价': 286.50, '涨跌幅': 3.12, '涨速': 0.05 }
        ]
      },
      {
        board_name: '汽车整车',
        board_code: 'BK0896',
        change_percent: 1.52 + (Math.random() - 0.5) * 0.3,
        change_speed: 0.18 + (Math.random() - 0.5) * 0.06,
        latest_price: 2156.30 + (Math.random() - 0.5) * 25,
        turnover_rate: 2.15,
        amount: 2856000000,
        up_count: 25,
        down_count: 12,
        top_stocks: [
          { '代码': '601127', '名称': '小康股份', '最新价': 68.50, '涨跌幅': 5.23, '涨速': 0.12 },
          { '代码': '601238', '名称': '广汽集团', '最新价': 12.80, '涨跌幅': 3.56, '涨速': 0.08 },
          { '代码': '000625', '名称': '长安汽车', '最新价': 15.60, '涨跌幅': 2.89, '涨速': 0.06 }
        ]
      },
      {
        board_name: '光伏设备',
        board_code: 'BK0727',
        change_percent: 1.28 + (Math.random() - 0.5) * 0.4,
        change_speed: 0.22 + (Math.random() - 0.5) * 0.1,
        latest_price: 1856.90 + (Math.random() - 0.5) * 20,
        turnover_rate: 2.68,
        amount: 1568900000,
        up_count: 22,
        down_count: 10,
        top_stocks: [
          { '代码': '601012', '名称': '隆基绿能', '最新价': 38.60, '涨跌幅': 4.12, '涨速': 0.15 },
          { '代码': '300274', '名称': '阳光电源', '最新价': 98.50, '涨跌幅': 3.56, '涨速': 0.11 },
          { '代码': '002459', '名称': '晶澳科技', '最新价': 45.80, '涨跌幅': 2.98, '涨速': 0.08 }
        ]
      },
      {
        board_name: '医药商业',
        board_code: 'BK0732',
        change_percent: -0.52 + (Math.random() - 0.5) * 0.3,
        change_speed: -0.08 + (Math.random() - 0.5) * 0.05,
        latest_price: 856.90 + (Math.random() - 0.5) * 10,
        turnover_rate: 1.25,
        amount: 856900000,
        up_count: 8,
        down_count: 22,
        top_stocks: [
          { '代码': '603259', '名称': '药明康德', '最新价': 68.90, '涨跌幅': 1.56, '涨速': 0.03 },
          { '代码': '300760', '名称': '迈瑞医疗', '最新价': 298.50, '涨跌幅': 0.89, '涨速': 0.02 },
          { '代码': '000661', '名称': '长春高新', '最新价': 145.30, '涨跌幅': -2.35, '涨速': -0.05 }
        ]
      },
      {
        board_name: '银行',
        board_code: 'BK0478',
        change_percent: 0.78 + (Math.random() - 0.5) * 0.2,
        change_speed: 0.05 + (Math.random() - 0.5) * 0.02,
        latest_price: 986.50 + (Math.random() - 0.5) * 8,
        turnover_rate: 0.85,
        amount: 12569000000,
        up_count: 32,
        down_count: 10,
        top_stocks: [
          { '代码': '600036', '名称': '招商银行', '最新价': 35.80, '涨跌幅': 1.28, '涨速': 0.02 },
          { '代码': '601166', '名称': '兴业银行', '最新价': 18.56, '涨跌幅': 1.12, '涨速': 0.02 },
          { '代码': '000001', '名称': '平安银行', '最新价': 12.45, '涨跌幅': 0.89, '涨速': 0.01 }
        ]
      },
      {
        board_name: '房地产',
        board_code: 'BK0451',
        change_percent: -1.25 + (Math.random() - 0.5) * 0.4,
        change_speed: -0.15 + (Math.random() - 0.5) * 0.08,
        latest_price: 1256.30 + (Math.random() - 0.5) * 15,
        turnover_rate: 1.56,
        amount: 2156800000,
        up_count: 12,
        down_count: 38,
        top_stocks: [
          { '代码': '000002', '名称': '万科A', '最新价': 12.80, '涨跌幅': 0.56, '涨速': 0.01 },
          { '代码': '001979', '名称': '招商蛇口', '最新价': 15.60, '涨跌幅': -0.89, '涨速': -0.02 },
          { '代码': '600048', '名称': '保利发展', '最新价': 11.20, '涨跌幅': -1.56, '涨速': -0.03 }
        ]
      },
      {
        board_name: '计算机应用',
        board_code: 'BK0712',
        change_percent: 0.95 + (Math.random() - 0.5) * 0.5,
        change_speed: 0.08 + (Math.random() - 0.5) * 0.06,
        latest_price: 3568.90 + (Math.random() - 0.5) * 40,
        turnover_rate: 2.86,
        amount: 1856900000,
        up_count: 48,
        down_count: 22,
        top_stocks: [
          { '代码': '300033', '名称': '同花顺', '最新价': 85.60, '涨跌幅': 5.68, '涨速': 0.18 },
          { '代码': '002230', '名称': '科大讯飞', '最新价': 48.90, '涨跌幅': 4.12, '涨速': 0.12 },
          { '代码': '300368', '名称': '汇金股份', '最新价': 25.60, '涨跌幅': 3.56, '涨速': 0.09 }
        ]
      }
    ];
    
    // 按涨幅排序
    return baseData.sort((a, b) => b.change_percent - a.change_percent);
  }

  private getMockLimitUpData() {
    return [
      { 
        code: '002466', 
        name: '天齐锂业', 
        price: 58.90, 
        change_percent: 9.98, 
        limit_up_time: '09:30:00', 
        first_limit_up_time: '09:25:00', 
        open_count: 0, 
        turnover_rate: 3.25, 
        amount: 1256890000, 
        reason: '锂电池龙头，新能源概念' 
      },
      { 
        code: '300750', 
        name: '宁德时代', 
        price: 198.50, 
        change_percent: 9.99, 
        limit_up_time: '09:35:00', 
        first_limit_up_time: '09:30:00', 
        open_count: 0, 
        turnover_rate: 2.86, 
        amount: 2568900000, 
        reason: '动力电池龙头' 
      },
      { 
        code: '002594', 
        name: '比亚迪', 
        price: 256.80, 
        change_percent: 9.99, 
        limit_up_time: '09:40:00', 
        first_limit_up_time: '09:38:00', 
        open_count: 1, 
        turnover_rate: 1.56, 
        amount: 3896500000, 
        reason: '新能源汽车龙头' 
      },
      { 
        code: '600519', 
        name: '贵州茅台', 
        price: 1856.50, 
        change_percent: 9.98, 
        limit_up_time: '09:45:00', 
        first_limit_up_time: '09:42:00', 
        open_count: 0, 
        turnover_rate: 0.35, 
        amount: 256890000, 
        reason: '白酒龙头，业绩超预期' 
      },
      { 
        code: '000858', 
        name: '五粮液', 
        price: 158.20, 
        change_percent: 9.99, 
        limit_up_time: '10:00:00', 
        first_limit_up_time: '09:55:00', 
        open_count: 2, 
        turnover_rate: 0.45, 
        amount: 189650000, 
        reason: '白酒板块跟涨' 
      },
      { 
        code: '601012', 
        name: '隆基绿能', 
        price: 38.60, 
        change_percent: 9.98, 
        limit_up_time: '10:15:00', 
        first_limit_up_time: '10:12:00', 
        open_count: 0, 
        turnover_rate: 2.68, 
        amount: 1568900000, 
        reason: '光伏龙头，碳中和概念' 
      },
      { 
        code: '300033', 
        name: '同花顺', 
        price: 85.60, 
        change_percent: 9.99, 
        limit_up_time: '10:30:00', 
        first_limit_up_time: '10:25:00', 
        open_count: 0, 
        turnover_rate: 2.86, 
        amount: 856900000, 
        reason: '金融科技，行情火爆' 
      },
      { 
        code: '002415', 
        name: '海康威视', 
        price: 32.50, 
        change_percent: 9.98, 
        limit_up_time: '10:45:00', 
        first_limit_up_time: '10:40:00', 
        open_count: 1, 
        turnover_rate: 2.35, 
        amount: 1896500000, 
        reason: 'AI概念，安防龙头' 
      }
    ];
  }

  // 获取龙虎榜数据
  async getDragonTigerData() {
    const client = getSupabaseClient();
    
    // 先检查缓存是否有LLM分析过的完整数据
    const { data: cacheList } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'dragon_tiger')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const cache = cacheList?.[0];

    // 如果有缓存且分析结果完整，直接返回
    if (cache && cache.data_content && cache.data_content.ai_analysis) {
      const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
      // 如果缓存小于4小时，直接返回
      if (cacheAge < 8 * 60 * 60 * 1000) {
        console.log('使用缓存龙虎榜数据（含LLM分析）');
        return {
          data: cache.data_content,
          source: 'cache',
          updateTime: cache.updated_at
        };
      }
    }
    
    // 尝试从AKSHARE获取真实数据
    try {
      console.log('尝试从AKSHARE获取龙虎榜数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py dragon_tiger', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data && result.data.length > 0) {
        console.log('成功获取龙虎榜数据:', result.data.length, '只，开始LLM分析...');
        
        // 获取新闻数据
        const newsData = await this.getNewsDataForDragonTiger();
        
        // 执行LLM分析
        const aiAnalysis = await this.analyzeDragonTigerWithLLM(result.data, newsData);
        
        // 合并原始数据和AI分析结果
        const mergedData = {
          stocks: result.data,
          trading_day: result.trading_day,
          ai_analysis: aiAnalysis
        };
        
        // 更新缓存
        await this.saveCache(client, 'dragon_tiger', mergedData);
        
        console.log('龙虎榜LLM分析完成');
        
        return {
          data: mergedData,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.trading_day
        };
      }
    } catch (error) {
      console.error('AKSHARE龙虎榜数据获取失败:', error.message);
    }
    
    // 如果有旧缓存，返回旧缓存
    if (cache && cache.data_content) {
      console.log('使用旧缓存龙虎榜数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟龙虎榜数据');
    const mockData = this.getMockDragonTigerData();
    
    return {
      data: { stocks: mockData, trading_day: new Date().toISOString().slice(0, 10).replace(/-/g, ''), ai_analysis: this.getDefaultDragonTigerAnalysis(mockData) },
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 获取龙虎榜分析所需的新闻数据
  private async getNewsDataForDragonTiger() {
    try {
      const { stdout } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py news_catalyst', {
        timeout: 30000,
      });
      const result = JSON.parse(stdout);
      if (result.code === 200 && result.data) {
        return result.data.slice(0, 5);
      }
    } catch (error) {
      console.error('获取新闻数据失败:', error.message);
    }
    return [];
  }

  // 使用LLM分析龙虎榜数据
  private async analyzeDragonTigerWithLLM(dragonTigerStocks: any[], newsData: any[]) {
    try {
      const { LLMClient, Config } = await import('coze-coding-dev-sdk');
      
      const config = new Config();
      const llmClient = new LLMClient(config);
      
      const prompt = `你是一位专业的A股龙虎榜分析师。请分析以下今日龙虎榜数据，结合新闻资讯，给出专业的资金动向判断和操作建议：

【今日龙虎榜数据】
${JSON.stringify(dragonTigerStocks.slice(0, 15) || [], null, 2)}

【热点新闻资讯】
${JSON.stringify(newsData.slice(0, 5) || [], null, 2)}

请完成以下分析任务：
1. 分析龙虎榜整体资金动向（机构、游资活跃度）
2. 找出最受资金追捧的个股
3. 分析知名席位的操作风格和意图
4. 给出明日操作建议和风险提示

请以JSON格式返回，格式如下：
{
  "market_overview": "龙虎榜整体资金动向分析（80字以内）",
  "fund_sentiment": "资金情绪判断（积极/谨慎/观望）",
  "hot_stocks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "industry": "所属板块",
      "net_buy": 净买入金额,
      "hot_score": 热度评分(1-10),
      "buyer_type": "机构/游资/混合",
      "reason": "上榜原因分析",
      "suggestion": "操作建议"
    }
  ],
  "top_picks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "industry": "所属板块",
      "potential": "潜力评估（高/中/低）",
      "reason": "推荐理由",
      "entry_strategy": "介入策略"
    }
  ],
  "operation_advice": "明日操作建议（100字以内）",
  "risk_warning": "风险提示（60字以内）"
}`;

      const response = await llmClient.invoke([
        { role: 'system', content: '你是一位专业的A股龙虎榜分析师，擅长资金动向分析和短线操作建议。请严格按照JSON格式返回结果。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });
      
      // 尝试解析LLM返回的JSON
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('龙虎榜LLM分析结果:', parsed.market_overview?.substring(0, 30), '...');
          return parsed;
        }
      } catch (parseError) {
        console.error('解析LLM响应失败:', parseError);
      }
      
      // 如果解析失败，返回默认数据
      return this.getDefaultDragonTigerAnalysis(dragonTigerStocks);
    } catch (error) {
      console.error('LLM分析失败:', error);
      return this.getDefaultDragonTigerAnalysis(dragonTigerStocks);
    }
  }

  // 获取默认的龙虎榜分析结果
  private getDefaultDragonTigerAnalysis(dragonTigerStocks: any[]) {
    const hotStocks = dragonTigerStocks
      .filter(s => s.net_buy > 0)
      .slice(0, 3)
      .map(s => ({
        code: s.code,
        name: s.name,
        industry: s.industry || '未知',
        net_buy: s.net_buy,
        hot_score: Math.min(10, Math.max(1, Math.floor(s.net_buy / 100000000))),
        buyer_type: '游资',
        reason: '资金净买入，关注度高',
        suggestion: '关注次日表现，低吸为主'
      }));
    
    const topPicks = dragonTigerStocks
      .filter(s => s.net_buy > 0 && s.turnover_rate > 3)
      .slice(0, 2)
      .map(s => ({
        code: s.code,
        name: s.name,
        industry: s.industry || '未知',
        potential: '高',
        reason: '龙虎榜资金关注，换手率适中',
        entry_strategy: '次日低吸，注意止损'
      }));
    
    return {
      market_overview: `今日龙虎榜共${dragonTigerStocks.length}只个股上榜，资金${dragonTigerStocks.filter(s => s.net_buy > 0).length > dragonTigerStocks.length / 2 ? '净流入为主' : '分化明显'}，游资活跃度${dragonTigerStocks.length > 10 ? '较高' : '一般'}。`,
      fund_sentiment: dragonTigerStocks.filter(s => s.net_buy > 0).length > dragonTigerStocks.length / 2 ? '积极' : '谨慎',
      hot_stocks: hotStocks,
      top_picks: topPicks,
      operation_advice: '建议关注龙虎榜资金净买入较大的个股，选择换手率适中、板块效应明显的标的。注意机构席位和游资席位的操作差异。',
      risk_warning: '龙虎榜个股波动较大，注意追高风险，关注席位操作风格，严格执行止损纪律。'
    };
  }

  // 获取趋势龙头数据
  async getTrendLeaderData() {
    const client = getSupabaseClient();
    
    // 先检查缓存是否有LLM分析过的完整数据
    const { data: cacheList } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'trend_leader')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const cache = cacheList?.[0];

    // 如果有缓存且分析结果完整，直接返回
    if (cache && cache.data_content && cache.data_content.ai_analysis) {
      const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
      // 如果缓存小于4小时，直接返回
      if (cacheAge < 8 * 60 * 60 * 1000) {
        console.log('使用缓存趋势龙头数据（含LLM分析）');
        return {
          data: cache.data_content,
          source: 'cache',
          updateTime: cache.updated_at
        };
      }
    }
    
    // 尝试从AKSHARE获取真实数据
    try {
      console.log('尝试从AKSHARE获取趋势龙头数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py trend_leader', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data && result.data.length > 0) {
        console.log('成功获取趋势龙头数据:', result.data.length, '只，开始LLM分析...');
        
        // 获取新闻数据
        const newsData = await this.getNewsDataForTrendLeader();
        
        // 执行LLM分析
        const aiAnalysis = await this.analyzeTrendLeaderWithLLM(result.data, newsData);
        
        // 合并原始数据和AI分析结果
        const mergedData = {
          stocks: result.data,
          trading_day: result.trading_day,
          ai_analysis: aiAnalysis
        };
        
        // 更新缓存
        await this.saveCache(client, 'trend_leader', mergedData);
        
        console.log('趋势龙头LLM分析完成');
        
        return {
          data: mergedData,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.trading_day
        };
      }
    } catch (error) {
      console.error('AKSHARE趋势龙头数据获取失败:', error.message);
    }
    
    // 如果有旧缓存，返回旧缓存
    if (cache && cache.data_content) {
      console.log('使用旧缓存趋势龙头数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟趋势龙头数据');
    const mockData = this.getMockTrendLeaderData();
    
    return {
      data: { stocks: mockData, trading_day: new Date().toISOString().slice(0, 10).replace(/-/g, ''), ai_analysis: this.getDefaultTrendLeaderAnalysis(mockData) },
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 获取趋势龙头分析所需的新闻数据
  private async getNewsDataForTrendLeader() {
    try {
      const { stdout } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py news_catalyst', {
        timeout: 30000,
      });
      const result = JSON.parse(stdout);
      if (result.code === 200 && result.data) {
        return result.data.slice(0, 5);
      }
    } catch (error) {
      console.error('获取新闻数据失败:', error.message);
    }
    return [];
  }

  // 使用LLM分析趋势龙头数据
  private async analyzeTrendLeaderWithLLM(trendLeaderStocks: any[], newsData: any[]) {
    try {
      const { LLMClient, Config } = await import('coze-coding-dev-sdk');
      
      const config = new Config();
      const llmClient = new LLMClient(config);
      
      const prompt = `你是一位专业的A股趋势投资分析师。请分析以下趋势龙头数据，结合新闻资讯，给出专业的趋势判断和操作建议：

【今日趋势龙头数据】
${JSON.stringify(trendLeaderStocks.slice(0, 15) || [], null, 2)}

【热点新闻资讯】
${JSON.stringify(newsData.slice(0, 5) || [], null, 2)}

请完成以下分析任务：
1. 分析趋势龙头整体情况（市场趋势、板块轮动）
2. 找出趋势最强的龙头个股
3. 分析趋势持续性
4. 给出明日操作建议和风险提示

请以JSON格式返回，格式如下：
{
  "market_overview": "趋势龙头整体情况分析（80字以内）",
  "trend_stage": "当前趋势阶段（启动/加速/高位震荡/调整）",
  "strong_leaders": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "industry": "所属板块",
      "strength_score": 强度评分,
      "trend_stage": "趋势阶段",
      "sustainability": "持续性判断（强/中/弱）",
      "reason": "推荐理由",
      "suggestion": "操作建议"
    }
  ],
  "top_picks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "industry": "所属板块",
      "potential": "潜力评估（高/中/低）",
      "reason": "推荐理由",
      "entry_strategy": "介入策略"
    }
  ],
  "operation_advice": "明日操作建议（100字以内）",
  "risk_warning": "风险提示（60字以内）"
}`;

      const response = await llmClient.invoke([
        { role: 'system', content: '你是一位专业的A股趋势投资分析师，擅长趋势判断和中长线操作建议。请严格按照JSON格式返回结果。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });
      
      // 尝试解析LLM返回的JSON
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('趋势龙头LLM分析结果:', parsed.market_overview?.substring(0, 30), '...');
          return parsed;
        }
      } catch (parseError) {
        console.error('解析LLM响应失败:', parseError);
      }
      
      // 如果解析失败，返回默认数据
      return this.getDefaultTrendLeaderAnalysis(trendLeaderStocks);
    } catch (error) {
      console.error('LLM分析失败:', error);
      return this.getDefaultTrendLeaderAnalysis(trendLeaderStocks);
    }
  }

  // 获取默认的趋势龙头分析结果
  private getDefaultTrendLeaderAnalysis(trendLeaderStocks: any[]) {
    const strongLeaders = trendLeaderStocks
      .filter(s => s.strength_score >= 75)
      .slice(0, 3)
      .map(s => ({
        code: s.code,
        name: s.name,
        industry: s.industry || '未知',
        strength_score: s.strength_score,
        trend_stage: s.trend_stage || '强势上涨',
        sustainability: s.strength_score >= 85 ? '强' : '中',
        reason: `强度评分${s.strength_score}分，趋势向好`,
        suggestion: '顺势而为，设置止损'
      }));
    
    const topPicks = trendLeaderStocks
      .filter(s => s.strength_score >= 70 && s.turnover_rate < 15)
      .slice(0, 2)
      .map(s => ({
        code: s.code,
        name: s.name,
        industry: s.industry || '未知',
        potential: s.strength_score >= 80 ? '高' : '中',
        reason: `${s.industry}板块龙头，趋势强度高`,
        entry_strategy: '回调介入，趋势持有'
      }));
    
    return {
      market_overview: `今日趋势龙头${trendLeaderStocks.length}只，平均强度${(trendLeaderStocks.reduce((a, b) => a + (b.strength_score || 70), 0) / trendLeaderStocks.length).toFixed(1)}分，市场趋势${trendLeaderStocks.filter(s => s.strength_score >= 80).length > 3 ? '强劲' : '平稳'}。`,
      trend_stage: trendLeaderStocks.filter(s => s.strength_score >= 80).length > 5 ? '加速' : '高位震荡',
      strong_leaders: strongLeaders,
      top_picks: topPicks,
      operation_advice: '建议关注趋势强度评分较高的龙头股，选择趋势明确、换手率适中的标的。回调时低吸，趋势持有，注意设置止损。',
      risk_warning: '趋势股存在回调风险，注意趋势反转信号，严格执行止损纪律，避免追高被套。'
    };
  }

  // 模拟龙虎榜数据
  private getMockDragonTigerData() {
    return [
      {
        code: '002466',
        name: '天齐锂业',
        price: 58.90,
        change_percent: 9.98,
        turnover_rate: 8.56,
        amount: 2568900000,
        net_buy: 356800000,
        buy_reason: '锂电池龙头，机构大买',
        sell_reason: '',
        famous_buyers: ['中信证券西安朱雀大街', '华鑫证券上海分公司'],
        famous_sellers: ['机构专用'],
        buy_amount: 586000000,
        sell_amount: 229200000,
        date: new Date().toISOString().split('T')[0]
      },
      {
        code: '300750',
        name: '宁德时代',
        price: 198.50,
        change_percent: 6.89,
        turnover_rate: 5.23,
        amount: 8965000000,
        net_buy: 1256000000,
        buy_reason: '动力电池龙头，北向资金大买',
        sell_reason: '',
        famous_buyers: ['深股通专用', '机构专用'],
        famous_sellers: ['机构专用'],
        buy_amount: 2896000000,
        sell_amount: 1640000000,
        date: new Date().toISOString().split('T')[0]
      },
      {
        code: '002594',
        name: '比亚迪',
        price: 256.80,
        change_percent: 5.45,
        turnover_rate: 3.12,
        amount: 6895000000,
        net_buy: 856000000,
        buy_reason: '新能源龙头，机构加仓',
        sell_reason: '',
        famous_buyers: ['机构专用', '深股通专用'],
        famous_sellers: ['机构专用'],
        buy_amount: 2156000000,
        sell_amount: 1300000000,
        date: new Date().toISOString().split('T')[0]
      },
      {
        code: '601012',
        name: '隆基绿能',
        price: 38.60,
        change_percent: 9.98,
        turnover_rate: 6.78,
        amount: 3568900000,
        net_buy: 456000000,
        buy_reason: '光伏龙头，游资接力',
        sell_reason: '机构减仓',
        famous_buyers: ['财通证券杭州体育场路', '银河证券绍兴营业部'],
        famous_sellers: ['机构专用'],
        buy_amount: 1256000000,
        sell_amount: 800000000,
        date: new Date().toISOString().split('T')[0]
      },
      {
        code: '300033',
        name: '同花顺',
        price: 85.60,
        change_percent: 5.68,
        turnover_rate: 4.56,
        amount: 1256900000,
        net_buy: 289000000,
        buy_reason: '金融科技，量化资金',
        sell_reason: '',
        famous_buyers: ['华泰证券总部', '中金公司上海分公司'],
        famous_sellers: ['机构专用'],
        buy_amount: 568000000,
        sell_amount: 279000000,
        date: new Date().toISOString().split('T')[0]
      },
      {
        code: '002415',
        name: '海康威视',
        price: 32.50,
        change_percent: 4.56,
        turnover_rate: 2.35,
        amount: 1896500000,
        net_buy: 156000000,
        buy_reason: 'AI安防龙头，机构关注',
        sell_reason: '',
        famous_buyers: ['机构专用', '沪股通专用'],
        famous_sellers: ['机构专用'],
        buy_amount: 489000000,
        sell_amount: 333000000,
        date: new Date().toISOString().split('T')[0]
      }
    ];
  }

  // 模拟趋势龙头数据
  private getMockTrendLeaderData() {
    return [
      {
        code: '002466',
        name: '天齐锂业',
        price: 58.90,
        change_percent: 9.98,
        days_rising: 5,
        total_change: 32.56,
        industry: '小金属',
        market_cap: 86500000000,
        turnover_rate: 8.56,
        strength_score: 95,
        trend_stage: '加速上涨',
        support_level: 45.80,
        resistance_level: 65.00
      },
      {
        code: '300750',
        name: '宁德时代',
        price: 198.50,
        change_percent: 6.89,
        days_rising: 4,
        total_change: 18.65,
        industry: '电池',
        market_cap: 435600000000,
        turnover_rate: 5.23,
        strength_score: 88,
        trend_stage: '强势整理',
        support_level: 180.00,
        resistance_level: 220.00
      },
      {
        code: '601012',
        name: '隆基绿能',
        price: 38.60,
        change_percent: 9.98,
        days_rising: 3,
        total_change: 25.68,
        industry: '光伏设备',
        market_cap: 292000000000,
        turnover_rate: 6.78,
        strength_score: 92,
        trend_stage: '突破新高',
        support_level: 32.00,
        resistance_level: 45.00
      },
      {
        code: '002594',
        name: '比亚迪',
        price: 256.80,
        change_percent: 5.45,
        days_rising: 6,
        total_change: 28.90,
        industry: '汽车整车',
        market_cap: 745000000000,
        turnover_rate: 3.12,
        strength_score: 86,
        trend_stage: '趋势加速',
        support_level: 230.00,
        resistance_level: 280.00
      },
      {
        code: '600519',
        name: '贵州茅台',
        price: 1856.50,
        change_percent: 3.25,
        days_rising: 3,
        total_change: 8.56,
        industry: '白酒',
        market_cap: 2330000000000,
        turnover_rate: 0.35,
        strength_score: 78,
        trend_stage: '震荡上行',
        support_level: 1750.00,
        resistance_level: 1950.00
      },
      {
        code: '300033',
        name: '同花顺',
        price: 85.60,
        change_percent: 5.68,
        days_rising: 4,
        total_change: 15.23,
        industry: '计算机应用',
        market_cap: 46000000000,
        turnover_rate: 4.56,
        strength_score: 82,
        trend_stage: '突破整理',
        support_level: 75.00,
        resistance_level: 95.00
      }
    ];
  }

  // 获取新闻催化数据
  async getNewsCatalystData() {
    const client = getSupabaseClient();
    
    // 先检查缓存是否有完整的LLM分析数据
    const { data: cacheList, error: cacheError } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'news_catalyst')
      .order('updated_at', { ascending: false })
      .limit(1);

    console.log('缓存查询结果:', cacheList?.length || 0, '条, 错误:', cacheError?.message || '无');
    
    const cache = cacheList?.[0];
    
    if (cacheError) {
      console.log('缓存查询错误:', cacheError.message);
    }

    // 如果有缓存且包含LLM建议，直接返回
    if (cache && cache.data_content) {
      const hasData = Array.isArray(cache.data_content) && cache.data_content.length > 0;
      console.log(`缓存存在: true, 有数据: ${hasData}`);
      if (hasData) {
        const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
        console.log(`缓存年龄: ${Math.round(cacheAge / 60000)} 分钟, 有建议: ${!!cache.data_content[0].suggestion}`);
        // 如果缓存小于8小时，直接返回
        if (cacheAge < 8 * 60 * 60 * 1000 && cache.data_content[0].suggestion) {
          console.log('使用缓存新闻催化数据（含LLM建议）');
          return {
            data: cache.data_content,
            source: 'cache',
            updateTime: cache.updated_at
          };
        }
      }
    } else {
      console.log('缓存不存在或无数据');
    }
    
    // 尝试从AKSHARE获取真实数据
    try {
      console.log('尝试从AKSHARE获取新闻催化数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py news_catalyst', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data && result.data.length > 0) {
        console.log('成功获取新闻催化数据:', result.data.length, '条');
        
        // 获取资金进出数据（龙虎榜+涨停股）
        const fundData = await this.getFundFlowData();
        
        // 使用LLM分析新闻+资金，生成投资建议
        const newsWithSuggestions = await this.analyzeNewsWithFundData(result.data, fundData);
        
        // 更新缓存：先删除旧数据再插入新数据
        await client
          .from('stock_cache')
          .delete()
          .eq('data_type', 'news_catalyst');
        
        const { error: insertError } = await client
          .from('stock_cache')
          .insert({
            data_type: 'news_catalyst',
            data_content: newsWithSuggestions,
          });
        
        if (insertError) {
          console.error('缓存写入失败:', insertError.message);
        } else {
          console.log('新闻催化缓存写入成功:', newsWithSuggestions.length, '条');
        }
        
        return {
          data: newsWithSuggestions,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.trading_day
        };
      }
    } catch (error) {
      console.error('AKSHARE新闻催化数据获取失败:', error.message);
    }
    
    // 如果有旧缓存，返回旧缓存
    if (cache && cache.data_content && cache.data_content.length > 0) {
      console.log('使用旧缓存新闻催化数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟新闻催化数据');
    const mockData = this.getMockNewsCatalystData();
    
    return {
      data: mockData,
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 获取资金流向数据
  private async getFundFlowData() {
    try {
      // 获取龙虎榜数据
      const dragonTigerResult = await this.getDragonTigerData();
      // 获取涨停股数据
      const limitUpResult = await this.getLimitUpStocks();
      
      // 龙虎榜数据结构是 { stocks: [], ai_analysis: {} }
      const dragonTigerStocks = dragonTigerResult.data?.stocks || dragonTigerResult.data || [];
      const limitUpStocks = limitUpResult.data?.stocks || limitUpResult.data || [];
      
      return {
        dragonTiger: Array.isArray(dragonTigerStocks) ? dragonTigerStocks.slice(0, 10) : [],
        limitUp: Array.isArray(limitUpStocks) ? limitUpStocks.slice(0, 10) : [],
        trading_day: dragonTigerResult.trading_day || limitUpResult.trading_day
      };
    } catch (error) {
      console.error('获取资金流向数据失败:', error);
      return { dragonTiger: [], limitUp: [], trading_day: '' };
    }
  }

  // 使用LLM分析新闻和资金数据，生成投资建议（优化版：一次性批量分析）
  private async analyzeNewsWithFundData(newsData: any[], fundData: any) {
    try {
      const { LLMClient, Config } = await import('coze-coding-dev-sdk');
      
      const config = new Config();
      const llmClient = new LLMClient(config);
      
      // 一次性分析所有新闻（最多5条）
      const newsToAnalyze = newsData.slice(0, 5);
      
      const prompt = `你是一位专业的A股投资分析师。请根据以下新闻和资金流向数据，为每条新闻生成投资建议。

【今日资金流向】
龙虎榜净买入TOP5:
${fundData.dragonTiger.slice(0, 5).map((s: any) => `- ${s.name}(${s.code}): 净买入${(s.net_buy / 100000000).toFixed(2)}亿, 涨幅${s.change_percent?.toFixed(2) || 0}%`).join('\n')}

涨停股TOP5:
${fundData.limitUp.slice(0, 5).map((s: any) => `- ${s.name}(${s.code}): 涨幅${s.change_percent?.toFixed(2) || 0}%`).join('\n')}

【待分析新闻】
${newsToAnalyze.map((news, idx) => `${idx + 1}. ${news.title} | ${news.source} | 热度${news.heat_score}分`).join('\n')}

请为每条新闻生成一条投资建议（每条50字以内），直接返回JSON数组格式：
["建议1", "建议2", "建议3", "建议4", "建议5"]`;

      console.log('开始批量分析新闻...');
      const response = await llmClient.invoke([
        { role: 'system', content: '你是一位专业的A股投资分析师，擅长结合新闻面和资金面给出投资建议。请直接返回JSON数组，不要包含其他内容。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });
      
      // 解析LLM返回的建议
      let suggestions: string[] = [];
      try {
        const content = response.content.trim();
        // 尝试提取JSON数组
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('解析建议失败:', e);
      }
      
      console.log('批量新闻分析完成');
      
      // 合并新闻和建议
      return newsToAnalyze.map((news, idx) => ({
        ...news,
        suggestion: suggestions[idx] || this.getDefaultSuggestion(news)
      }));
    } catch (error) {
      console.error('LLM批量分析失败:', error);
      // 如果LLM失败，返回默认建议
      return newsData.map(news => ({
        ...news,
        suggestion: this.getDefaultSuggestion(news)
      }));
    }
  }

  // 获取默认投资建议
  private getDefaultSuggestion(news: any) {
    const text = news.title + news.content;
    
    if (text.includes('涨停') || text.includes('暴涨')) {
      return '消息面偏利好，建议关注相关个股的持续性，注意追高风险，可考虑低位补涨股。';
    } else if (text.includes('利空') || text.includes('下跌')) {
      return '消息面偏利空，建议谨慎观望，注意风险控制，等待市场企稳。';
    } else if (text.includes('政策') || text.includes('利好')) {
      return '政策利好消息，建议关注相关板块龙头股，注意量能配合。';
    } else {
      return '建议关注市场对该消息的反应，观察成交量变化，结合资金流向综合判断。';
    }
  }

  // 模拟新闻催化数据
  private getMockNewsCatalystData() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const formatTime = (hours: number) => {
      const d = new Date(now.getTime() - hours * 3600000);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return [
      {
        type: '财经新闻',
        title: '锂电池板块持续走强，多股涨停',
        content: '受新能源汽车销量大增影响，锂电池产业链持续火热，天齐锂业、赣锋锂业等多只个股涨停。机构分析认为，随着新能源汽车渗透率不断提升，锂电池需求将持续增长。',
        stocks: ['天齐锂业', '赣锋锂业', '宁德时代'],
        stock_codes: ['002466', '002460', '300750'],
        importance: 'high',
        source: '东方财富',
        publish_time: formatTime(1),
        suggestion: '锂电池板块今日强势，建议关注龙头股的持续性，注意追高风险，可考虑低位补涨股。'
      },
      {
        type: '概念热点',
        title: 'AI概念板块涨幅5.2%，板块热度攀升',
        content: 'AI人工智能概念今日表现强势，板块涨幅超过5%，多只个股涨停。市场预期AI应用落地加速，相关概念股持续受到资金关注。',
        stocks: ['科大讯飞', '海康威视', '同花顺'],
        stock_codes: ['002230', '002415', '300033'],
        importance: 'high',
        source: '同花顺',
        publish_time: formatTime(2),
        suggestion: 'AI概念今日强势，建议关注板块龙头股和低位补涨机会，注意追高风险。'
      },
      {
        type: '热门个股',
        title: '宁德时代 热度飙升',
        content: '股票代码: 300750, 当前价格: 198.50, 涨跌幅: 6.89%',
        stocks: ['宁德时代'],
        stock_codes: ['300750'],
        importance: 'high',
        source: '东方财富',
        publish_time: formatTime(0.5),
        suggestion: '该股当前热度较高，涨幅6.89%，建议关注成交量变化和板块联动效应。'
      },
      {
        type: '财经新闻',
        title: '光伏板块迎政策利好，龙头股大涨',
        content: '国家能源局发布新能源发展规划，光伏板块迎来政策利好，隆基绿能、阳光电源等龙头股大幅上涨，板块整体走强。',
        stocks: ['隆基绿能', '阳光电源', '晶澳科技'],
        stock_codes: ['601012', '300274', '002459'],
        importance: 'high',
        source: '证券时报',
        publish_time: formatTime(3),
        suggestion: '光伏板块受政策利好刺激，建议关注龙头股的持续性，可考虑逢低布局。'
      },
      {
        type: '概念热点',
        title: '新能源汽车概念涨幅4.5%',
        content: '新能源汽车概念今日表现强势，板块涨幅超过4%，比亚迪、小康股份等多只个股涨停。市场预期新能源汽车销量将持续增长。',
        stocks: ['比亚迪', '小康股份', '广汽集团'],
        stock_codes: ['002594', '601127', '601238'],
        importance: 'high',
        source: '东方财富',
        publish_time: formatTime(1.5),
        suggestion: '新能源汽车概念今日强势，建议关注板块龙头股，注意追高风险。'
      },
      {
        type: '财经新闻',
        title: '白酒板块震荡上行，茅台再创新高',
        content: '白酒板块今日震荡上行，贵州茅台股价再创历史新高，五粮液、泸州老窖跟随上涨。机构分析认为，白酒板块估值修复行情持续。',
        stocks: ['贵州茅台', '五粮液', '泸州老窖'],
        stock_codes: ['600519', '000858', '000568'],
        importance: 'medium',
        source: '财经网',
        publish_time: formatTime(4),
        suggestion: '白酒板块估值修复持续，建议关注龙头股的配置价值，注意短期回调风险。'
      },
      {
        type: '热门个股',
        title: '天齐锂业 热度飙升',
        content: '股票代码: 002466, 当前价格: 58.90, 涨跌幅: 9.98%',
        stocks: ['天齐锂业'],
        stock_codes: ['002466'],
        importance: 'high',
        source: '东方财富',
        publish_time: formatTime(0.5),
        suggestion: '该股当前热度较高，涨幅9.98%，建议关注成交量变化和板块联动效应。'
      },
      {
        type: '财经新闻',
        title: '半导体板块受关注，国产替代加速',
        content: '半导体板块今日受资金关注，多只个股上涨。市场预期国产替代进程加速，半导体设备、材料等细分领域有望受益。',
        stocks: ['北方华创', '韦尔股份', '兆易创新'],
        stock_codes: ['002371', '603501', '603986'],
        importance: 'medium',
        source: '中证网',
        publish_time: formatTime(5),
        suggestion: '半导体国产替代长期逻辑不变，建议关注核心标的，注意市场波动风险。'
      },
      {
        type: '概念热点',
        title: '储能概念涨幅3.8%',
        content: '储能概念今日表现强势，板块涨幅近4%，多只个股涨停。市场预期储能市场将迎来快速增长期。',
        stocks: ['阳光电源', '比亚迪', '宁德时代'],
        stock_codes: ['300274', '002594', '300750'],
        importance: 'medium',
        source: '东方财富',
        publish_time: formatTime(2.5),
        suggestion: '储能概念持续火热，建议关注龙头股的持续性，注意追高风险。'
      },
      {
        type: '财经新闻',
        title: '银行板块稳步上涨，估值修复延续',
        content: '银行板块今日稳步上涨，招商银行、兴业银行等龙头股表现强势。机构分析认为，银行板块估值处于历史低位，估值修复行情有望延续。',
        stocks: ['招商银行', '兴业银行', '平安银行'],
        stock_codes: ['600036', '601166', '000001'],
        importance: 'low',
        source: '证券时报',
        publish_time: formatTime(6),
        suggestion: '银行板块估值修复持续，建议关注业绩稳健的龙头股，可考虑中长期配置。'
      }
    ];
  }

  // 获取热点复盘数据
  async getHotReviewData() {
    const client = getSupabaseClient();
    
    // 先检查缓存是否有LLM分析过的完整数据
    const { data: cacheList } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'hot_review')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const cache = cacheList?.[0];

    // 如果有缓存且分析结果完整，直接返回
    if (cache && cache.data_content && cache.data_content.summary && cache.data_content.summary !== '数据加载中，请稍后刷新查看AI分析...') {
      const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
      // 如果缓存小于4小时，直接返回
      if (cacheAge < 8 * 60 * 60 * 1000) {
        console.log('使用缓存热点复盘数据（含LLM分析）');
        return {
          data: cache.data_content,
          source: 'cache',
          updateTime: cache.updated_at
        };
      }
    }
    
    // 尝试从AKSHARE获取热点数据
    try {
      console.log('尝试获取热点复盘数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py hot_review', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data) {
        console.log('成功获取热点复盘基础数据，开始LLM分析...');
        
        // 同步执行LLM分析
        const analysisResult = await this.analyzeHotDataWithLLM(result.data);
        
        // 合并原始数据和LLM分析结果
        const mergedData = {
          ...result.data,
          trading_day: result.data.trading_day,
          summary: analysisResult.summary || '',
          analysis: analysisResult.analysis || '',
          hot_stocks: analysisResult.hot_stocks || [],
          final_conclusion: analysisResult.final_conclusion || '',  // 新增最终结论
        };
        
        // 更新缓存
        await client
        // 更新缓存
        await this.saveCache(client, 'hot_review', mergedData);
        
        console.log('热点复盘LLM分析完成');
        
        return {
          data: mergedData,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.data.trading_day
        };
      }
    } catch (error) {
      console.error('热点复盘数据获取失败:', error.message);
    }
    
    // 如果有旧缓存，返回旧缓存
    if (cache && cache.data_content) {
      console.log('使用旧缓存热点复盘数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟热点复盘数据');
    const mockData = await this.getMockHotReviewData();
    
    return {
      data: mockData,
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 后台异步分析并更新缓存（备用）
  private async analyzeHotDataAndUpdateCache(rawData: any, client: any) {
    try {
      console.log('开始后台LLM分析...');
      const analysisResult = await this.analyzeHotDataWithLLM(rawData);
      
      const mergedData = {
        ...rawData,
        trading_day: rawData.trading_day,
        summary: analysisResult.summary || '',
        analysis: analysisResult.analysis || '',
        hot_stocks: analysisResult.hot_stocks || [],
        final_conclusion: analysisResult.final_conclusion || '',
      };
      
      await this.saveCache(client, 'hot_review', mergedData);
      
      console.log('LLM分析完成并已更新缓存');
    } catch (error) {
      console.error('LLM分析失败:', error);
    }
  }

  // 使用 LLM 分析热点数据
  private async analyzeHotDataWithLLM(rawData: any) {
    try {
      const { LLMClient, Config } = await import('coze-coding-dev-sdk');
      
      const config = new Config();
      const llmClient = new LLMClient(config);
      
      const prompt = `你是一位专业的A股市场分析师。请分析以下今日市场热点数据，并给出专业分析：

今日涨停个股：
${JSON.stringify(rawData.limit_up_stocks?.slice(0, 10) || [], null, 2)}

今日热点新闻：
${JSON.stringify(rawData.hot_news?.slice(0, 5) || [], null, 2)}

龙虎榜数据：
${JSON.stringify(rawData.dragon_tiger?.slice(0, 10) || [], null, 2)}

请完成以下分析任务：
1. 总结今日市场整体情况（80字以内）
2. 分析热门股票的热度原因和投资建议（选出3只最热门的股票）
3. 给出明日市场展望和最终结论

请以JSON格式返回，格式如下：
{
  "summary": "市场概述（80字以内）",
  "analysis": "详细分析（150字以内）",
  "hot_stocks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "price": 价格,
      "change_percent": 涨跌幅,
      "heat_score": 热度分数(0-100),
      "heat_sources": ["热度来源"],
      "reasons": ["热门原因"],
      "suggestion": "投资建议",
      "risk_level": "high/medium/low",
      "market_sentiment": "市场情绪",
      "related_concepts": ["相关概念"]
    }
  ],
  "final_conclusion": "最终结论（含操作建议，100字以内）"
}`;

      const response = await llmClient.invoke([
        { role: 'system', content: '你是一位专业的A股市场分析师，擅长热点分析和投资建议。请严格按照JSON格式返回结果。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });
      
      // 尝试解析 LLM 返回的 JSON
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('LLM分析结果:', parsed.summary?.substring(0, 50), '...');
          return parsed;
        }
      } catch (parseError) {
        console.error('解析LLM响应失败:', parseError);
      }
      
      // 如果解析失败，返回默认数据
      return this.getDefaultHotReviewAnalysis(rawData);
    } catch (error) {
      console.error('LLM分析失败:', error);
      return this.getDefaultHotReviewAnalysis(rawData);
    }
  }

  // 获取默认的热点复盘分析结果
  private getDefaultHotReviewAnalysis(rawData: any) {
    const limitUpCount = rawData.limit_up_stocks?.length || 0;
    const dragonTigerCount = rawData.dragon_tiger?.length || 0;
    
    // 从龙虎榜数据生成热门股票
    const hotStocks = (rawData.dragon_tiger || []).slice(0, 3).map((stock: any, index: number) => ({
      code: stock.code,
      name: stock.name,
      price: stock.price,
      change_percent: stock.change_percent,
      heat_score: 95 - index * 5,
      heat_sources: ['龙虎榜'],
      reasons: [stock.buy_reason || '资金关注'],
      suggestion: '关注资金动向，注意风险控制',
      risk_level: 'medium' as const,
      market_sentiment: '偏积极',
      related_concepts: []
    }));
    
    return {
      summary: `今日市场涨停${limitUpCount}只，龙虎榜${dragonTigerCount}只个股上榜，市场活跃度较高，建议关注资金流向。`,
      analysis: '市场整体表现活跃，涨停股数量较多，资金参与度较高。龙虎榜数据显示机构资金有明显的方向性选择，建议关注热点板块的持续性。',
      hot_stocks: hotStocks,
      final_conclusion: '今日市场情绪偏积极，资金流向明确。建议关注龙虎榜热门标的，但需注意追高风险，控制仓位，等待市场确认方向后再加仓。'
    };
  }

  // 模拟热点复盘数据
  private async getMockHotReviewData() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 随机变化函数
    const randomChange = (base: number, range: number = 0.02) => 
      parseFloat((base * (1 + (Math.random() - 0.5) * range)).toFixed(2));
    const randomScore = (base: number) => 
      Math.min(100, Math.max(70, base + Math.floor((Math.random() - 0.5) * 10)));
    
    const stockTemplates = [
      { code: '002466', name: '天齐锂业', basePrice: 58.90, baseChange: 9.98, baseScore: 98, 
        sources: ['东方财富热股榜', '同花顺热门', '雪球热股'],
        reasons: ['锂电池龙头', '新能源概念', '机构大买', '龙虎榜净买入'],
        suggestion: '该股为锂电池龙头，今日强势涨停，市场热度极高。建议关注明日开盘表现，若高开过多需注意追高风险，可考虑回调后介入。支撑位参考54元，压力位在65元附近。',
        risk: 'high', sentiment: '极度活跃', concepts: ['锂电池', '新能源汽车', '小金属'] },
      { code: '300750', name: '宁德时代', basePrice: 198.50, baseChange: 6.89, baseScore: 95,
        sources: ['东方财富热股榜', '北向资金流入', '机构调研'],
        reasons: ['动力电池龙头', '北向资金大买', '业绩超预期', '储能概念'],
        suggestion: '宁德时代为动力电池绝对龙头，北向资金持续流入，中长期看好。短期涨幅较大，建议逢回调布局，注意关注180元支撑位。',
        risk: 'medium', sentiment: '活跃', concepts: ['动力电池', '储能', '新能源汽车'] },
      { code: '002594', name: '比亚迪', basePrice: 256.80, baseChange: 5.45, baseScore: 92,
        sources: ['同花顺热门', '机构关注', '销量数据'],
        reasons: ['新能源汽车龙头', '销量创新高', '海外市场扩张', '智能化概念'],
        suggestion: '比亚迪为新能源汽车龙头，销量持续超预期，中长期价值明确。当前价格处于上升通道，建议关注230元支撑，逢低可考虑加仓。',
        risk: 'medium', sentiment: '活跃', concepts: ['新能源汽车', '智能驾驶', '动力电池'] },
      { code: '601012', name: '隆基绿能', basePrice: 38.60, baseChange: 9.98, baseScore: 90,
        sources: ['光伏板块热股', '政策利好', '龙虎榜'],
        reasons: ['光伏龙头', '政策利好', '碳中和概念', '游资接力'],
        suggestion: '隆基绿能为光伏组件龙头，受政策利好刺激涨停。光伏行业景气度高，但需注意短期涨幅过大风险，建议回调后再介入。支撑位参考32元。',
        risk: 'high', sentiment: '极度活跃', concepts: ['光伏', '碳中和', '新能源'] },
      { code: '600519', name: '贵州茅台', basePrice: 1856.50, baseChange: 3.25, baseScore: 85,
        sources: ['北向资金', '机构持仓', '消费龙头'],
        reasons: ['白酒龙头', '估值修复', '北向资金回流', '消费复苏'],
        suggestion: '茅台为A股价值投资标杆，估值处于合理区间，北向资金持续回流。适合中长期配置，短期关注1750元支撑和1950元压力位。',
        risk: 'low', sentiment: '稳定', concepts: ['白酒', '消费', '价值投资'] },
      { code: '300033', name: '同花顺', basePrice: 85.60, baseChange: 5.68, baseScore: 82,
        sources: ['AI概念', '金融科技', '量化资金'],
        reasons: ['金融科技龙头', 'AI概念', '行情活跃受益', '量化资金关注'],
        suggestion: '同花顺受益于市场行情活跃和AI概念，短期走势较强。建议关注AI板块整体表现，注意追高风险，支撑位参考75元。',
        risk: 'medium', sentiment: '活跃', concepts: ['金融科技', 'AI', '大数据'] }
    ];
    
    // 生成带随机变化的热门股票
    const hot_stocks = stockTemplates.map((stock, idx) => ({
      code: stock.code,
      name: stock.name,
      price: randomChange(stock.basePrice, 0.03),
      change_percent: randomChange(stock.baseChange, 0.1),
      heat_score: randomScore(stock.baseScore),
      heat_rank: idx + 1,
      heat_sources: stock.sources,
      reasons: stock.reasons,
      suggestion: stock.suggestion,
      risk_level: stock.risk,
      market_sentiment: stock.sentiment,
      related_concepts: stock.concepts
    }));
    
    // 随机打乱热度排名
    hot_stocks.sort((a, b) => b.heat_score - a.heat_score);
    hot_stocks.forEach((stock, idx) => { stock.heat_rank = idx + 1; });
    
    // 随机时间生成
    const randomTime = () => {
      const h = 9 + Math.floor(Math.random() * 6);
      const m = Math.floor(Math.random() * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    return {
      date: dateStr,
      summary: '今日A股市场整体呈现震荡上行态势，锂电池、光伏、新能源汽车等新能源板块表现强势，多只个股涨停。AI概念板块继续活跃，白酒板块估值修复延续。两市成交额突破万亿，市场情绪整体偏乐观。',
      hot_stocks,
      top_news: [
        { title: '锂电池板块持续走强，多股涨停', source: '东方财富', time: randomTime() },
        { title: '新能源车销量创新高，产业链受益', source: '证券时报', time: randomTime() },
        { title: '北向资金净流入超百亿', source: '同花顺', time: randomTime() },
        { title: '光伏政策利好落地，龙头股大涨', source: '中证网', time: randomTime() },
        { title: 'AI概念持续活跃，多股涨停', source: '财经网', time: randomTime() }
      ],
      analysis: `【市场分析】

今日A股市场整体呈现强势格局，新能源板块成为市场主线，锂电池、光伏、新能源汽车等细分领域表现亮眼。

【资金面分析】
- 北向资金净流入超百亿，主要流入新能源、消费板块
- 两市成交额突破万亿，市场活跃度提升
- 龙虎榜显示机构资金积极布局新能源龙头

【板块轮动】
- 早盘：锂电池板块率先启动，天齐锂业快速涨停
- 午盘：光伏板块受政策利好刺激，隆基绿能涨停
- 尾盘：AI概念活跃，同花顺等科技股走强

【明日展望】
1. 新能源板块热度有望延续，但需注意分化风险
2. 建议关注低位补涨机会，避免追高
3. 北向资金动向仍需密切关注
4. 短期关注成交量变化，若持续放量则行情有望延续

【风险提示】
- 部分热点股短期涨幅较大，注意回调风险
- 市场情绪过热时需保持理性
- 建议控制仓位，做好风险管理`
    };
  }

  // 获取连板梯队数据
  async getContinuousLimitUpData() {
    const client = getSupabaseClient();
    
    // 先检查缓存是否有LLM分析过的完整数据
    const { data: cacheList } = await client
      .from('stock_cache')
      .select('*')
      .eq('data_type', 'continuous_limit_up')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const cache = cacheList?.[0];

    // 如果有缓存且分析结果完整，直接返回
    if (cache && cache.data_content && cache.data_content.ai_analysis) {
      const cacheAge = Date.now() - new Date(cache.updated_at).getTime();
      // 如果缓存小于4小时，直接返回
      if (cacheAge < 8 * 60 * 60 * 1000) {
        console.log('使用缓存连板数据（含LLM分析）');
        return {
          data: cache.data_content,
          source: 'cache',
          updateTime: cache.updated_at
        };
      }
    }
    
    // 尝试从AKSHARE获取真实数据
    try {
      console.log('尝试从AKSHARE获取连板梯队数据...');
      const { stdout, stderr } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py continuous_limit_up', {
        timeout: 30000,
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      
      if (result.code === 200 && result.data && result.data.stocks) {
        console.log('成功获取连板梯队数据:', result.data.stocks.length, '只，开始LLM分析...');
        
        // 获取资金流向数据和新闻数据
        const fundFlowData = await this.getFundFlowDataForContinuous();
        const newsData = await this.getNewsDataForContinuous();
        
        // 执行LLM分析
        const aiAnalysis = await this.analyzeContinuousLimitUpWithLLM(result.data, fundFlowData, newsData);
        
        // 合并原始数据和AI分析结果
        const mergedData = {
          ...result.data,
          ai_analysis: aiAnalysis
        };
        
        // 更新缓存
        await this.saveCache(client, 'continuous_limit_up', mergedData);
        
        console.log('连板梯队LLM分析完成');
        
        return {
          data: mergedData,
          source: 'akshare',
          updateTime: new Date().toISOString(),
          trading_day: result.trading_day
        };
      }
    } catch (error) {
      console.error('AKSHARE连板数据获取失败:', error.message);
    }
    
    // 如果有旧缓存，返回旧缓存
    if (cache && cache.data_content) {
      console.log('使用旧缓存连板数据');
      return {
        data: cache.data_content,
        source: 'cache',
        updateTime: cache.updated_at
      };
    }
    
    // 使用模拟数据
    console.log('使用模拟连板数据');
    const mockData = this.getMockContinuousLimitUpData();
    
    return {
      data: mockData,
      source: 'mock',
      updateTime: new Date().toISOString()
    };
  }

  // 获取连板梯队分析所需的资金流向数据
  private async getFundFlowDataForContinuous() {
    try {
      const { stdout } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py dragon_tiger', {
        timeout: 30000,
      });
      const result = JSON.parse(stdout);
      if (result.code === 200 && result.data) {
        return result.data.slice(0, 10); // 只取前10条
      }
    } catch (error) {
      console.error('获取资金流向数据失败:', error.message);
    }
    return [];
  }

  // 获取连板梯队分析所需的新闻数据
  private async getNewsDataForContinuous() {
    try {
      const { stdout } = await execAsync('python3 /workspace/projects/server/scripts/akshare_data.py news_catalyst', {
        timeout: 30000,
      });
      const result = JSON.parse(stdout);
      if (result.code === 200 && result.data) {
        return result.data.slice(0, 5); // 只取前5条
      }
    } catch (error) {
      console.error('获取新闻数据失败:', error.message);
    }
    return [];
  }

  // 使用LLM分析连板梯队数据
  private async analyzeContinuousLimitUpWithLLM(continuousData: any, fundFlowData: any[], newsData: any[]) {
    try {
      const { LLMClient, Config } = await import('coze-coding-dev-sdk');
      
      const config = new Config();
      const llmClient = new LLMClient(config);
      
      const prompt = `你是一位专业的A股连板股分析师。请分析以下连板梯队数据，结合资金流向和新闻资讯，给出专业的连板空间判断和操作建议：

【连板梯队数据】
${JSON.stringify(continuousData.stocks?.slice(0, 15) || [], null, 2)}

【龙虎榜资金流向】
${JSON.stringify(fundFlowData.slice(0, 8) || [], null, 2)}

【热点新闻资讯】
${JSON.stringify(newsData.slice(0, 5) || [], null, 2)}

请完成以下分析任务：
1. 分析连板梯队整体情况（市场情绪、板块集中度）
2. 对高连板个股（3连板及以上）进行空间判断
3. 找出最具潜力的连板标的
4. 给出明日操作建议和风险提示

请以JSON格式返回，格式如下：
{
  "market_overview": "市场整体情况分析（80字以内）",
  "sector_analysis": "板块集中度分析（60字以内）",
  "high_board_analysis": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "continuous_days": 连板天数,
      "industry": "所属板块",
      "space_judgment": "连板空间判断（看高一线/冲高回落/高位风险）",
      "space_score": 空间评分(1-10),
      "reason": "判断理由"
    }
  ],
  "top_picks": [
    {
      "code": "股票代码",
      "name": "股票名称",
      "continuous_days": 连板天数,
      "potential": "潜力评估（高/中/低）",
      "reason": "推荐理由",
      "entry_strategy": "介入策略"
    }
  ],
  "operation_advice": "明日操作建议（100字以内）",
  "risk_warning": "风险提示（60字以内）"
}`;

      const response = await llmClient.invoke([
        { role: 'system', content: '你是一位专业的A股连板股分析师，擅长连板空间判断和短线操作建议。请严格按照JSON格式返回结果。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });
      
      // 尝试解析LLM返回的JSON
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('连板梯队LLM分析结果:', parsed.market_overview?.substring(0, 30), '...');
          return parsed;
        }
      } catch (parseError) {
        console.error('解析LLM响应失败:', parseError);
      }
      
      // 如果解析失败，返回默认数据
      return this.getDefaultContinuousLimitUpAnalysis(continuousData);
    } catch (error) {
      console.error('LLM分析失败:', error);
      return this.getDefaultContinuousLimitUpAnalysis(continuousData);
    }
  }

  // 获取默认的连板梯队分析结果
  private getDefaultContinuousLimitUpAnalysis(continuousData: any) {
    const stocks = continuousData.stocks || [];
    const highBoardStocks = stocks.filter((s: any) => s.continuous_days >= 3).slice(0, 3);
    
    return {
      market_overview: `今日连板股${stocks.length}只，高连板股${highBoardStocks.length}只，市场接力情绪${stocks.length > 10 ? '高涨' : '一般'}，关注龙头股表现。`,
      sector_analysis: '板块分化明显，龙头股集中度高，需关注资金接力情况。',
      high_board_analysis: highBoardStocks.map((s: any) => ({
        code: s.code,
        name: s.name,
        continuous_days: s.continuous_days,
        industry: s.industry,
        space_judgment: s.continuous_days >= 4 ? '高位风险' : '看高一线',
        space_score: Math.max(1, 10 - s.continuous_days),
        reason: `连续${s.continuous_days}板，${s.turnover_rate > 10 ? '换手率较高需警惕' : '换手率适中可关注'}`
      })),
      top_picks: stocks.slice(0, 2).map((s: any) => ({
        code: s.code,
        name: s.name,
        continuous_days: s.continuous_days,
        potential: s.continuous_days >= 3 ? '中' : '高',
        reason: `${s.industry}板块龙头，资金关注度高`,
        entry_strategy: '低吸为主，追高谨慎'
      })),
      operation_advice: '建议关注低位连板股的补涨机会，高位连板股谨慎追高，注意控制仓位，设置止损。龙头股若封板坚决可轻仓试错。',
      risk_warning: '连板股风险较高，注意高位股炸板风险，避免盲目追高，严格执行止损纪律。'
    };
  }

  // 模拟连板数据
  private getMockContinuousLimitUpData() {
    const stocks = [
      { code: '002445', name: '中南文化', price: 4.49, change_percent: 10.05, continuous_days: 5, industry: '通用设备', turnover_rate: 4.86, amount: 516189168, limit_up_time: '', open_count: 0 },
      { code: '600726', name: '华电能源', price: 4.27, change_percent: 10.05, continuous_days: 4, industry: '电力', turnover_rate: 4.97, amount: 1493775520, limit_up_time: '', open_count: 0 },
      { code: '600722', name: '金牛化工', price: 16.94, change_percent: 10.00, continuous_days: 3, industry: '化学原料', turnover_rate: 26.13, amount: 2973438224, limit_up_time: '', open_count: 0 },
      { code: '600121', name: '郑州煤电', price: 5.65, change_percent: 9.92, continuous_days: 2, industry: '煤炭开采', turnover_rate: 5.88, amount: 404522160, limit_up_time: '', open_count: 0 },
      { code: '000890', name: '法尔胜', price: 11.09, change_percent: 10.02, continuous_days: 2, industry: '环保设备', turnover_rate: 9.30, amount: 424799648, limit_up_time: '', open_count: 0 },
    ];
    
    const by_days: Record<string, typeof stocks> = {};
    for (const stock of stocks) {
      const key = `${stock.continuous_days}连板`;
      if (!by_days[key]) by_days[key] = [];
      by_days[key].push(stock);
    }
    
    return { stocks, by_days, trading_day: new Date().toISOString().slice(0, 10).replace(/-/g, '') };
  }
}
