import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import type { FC } from 'react'
import { Network } from '@/network'
import './index.css'

type TabType = 'realtime' | 'heartbeat' | 'dragonTiger' | 'trendLeader' | 'newsCatalyst' | 'hotReview'

// 涨停股数据结构
interface LimitUpStock {
  code: string
  name: string
  price: number
  change_percent: number
  limit_up_time: string
  first_limit_up_time: string
  open_count: number
  turnover_rate: number
  amount: number
  reason: string
  industry: string  // 所属板块
}

// 涨停股AI分析结果
interface LimitUpAIAnalysis {
  market_overview: string  // 市场整体情况
  hot_sectors: string[]  // 热点板块
  explosive_stocks: {  // 最具爆发力个股
    code: string
    name: string
    industry: string
    limit_type: string  // 首板/连板
    explosive_score: number  // 爆发力评分
    reason: string
    fund_flow: string
    suggestion: string
  }[]
  top_picks: {  // 最具潜力标的
    code: string
    name: string
    industry: string
    potential: string
    reason: string
    entry_strategy: string
  }[]
  operation_advice: string  // 操作建议
  risk_warning: string  // 风险提示
}

// 涨停股数据（包含AI分析）
interface LimitUpData {
  stocks: LimitUpStock[]
  trading_day: string
  ai_analysis?: LimitUpAIAnalysis
}

// 龙虎榜数据结构
interface DragonTigerStock {
  code: string
  name: string
  price: number
  change_percent: number
  turnover_rate: number
  amount: number
  net_buy: number
  buy_reason: string
  sell_reason: string
  famous_buyers: string[]
  famous_sellers: string[]
  buy_amount: number
  sell_amount: number
  date: string
  industry: string  // 所属板块
}

// 龙虎榜AI分析结果
interface DragonTigerAIAnalysis {
  market_overview: string  // 市场整体情况
  fund_sentiment: string  // 资金情绪
  hot_stocks: {  // 最受资金追捧个股
    code: string
    name: string
    industry: string
    net_buy: number
    hot_score: number
    buyer_type: string
    reason: string
    suggestion: string
  }[]
  top_picks: {  // 最具潜力标的
    code: string
    name: string
    industry: string
    potential: string
    reason: string
    entry_strategy: string
  }[]
  operation_advice: string
  risk_warning: string
}

// 龙虎榜数据（包含AI分析）
interface DragonTigerData {
  stocks: DragonTigerStock[]
  trading_day: string
  ai_analysis?: DragonTigerAIAnalysis
}

// 趋势龙头数据结构
interface TrendLeaderStock {
  code: string
  name: string
  price: number
  change_percent: number
  days_rising: number
  total_change: number
  industry: string
  market_cap: number
  turnover_rate: number
  strength_score: number
  trend_stage: string
  support_level: number
  resistance_level: number
}

// 趋势龙头AI分析结果
interface TrendLeaderAIAnalysis {
  market_overview: string  // 市场整体情况
  trend_stage: string  // 趋势阶段
  strong_leaders: {  // 最强龙头
    code: string
    name: string
    industry: string
    strength_score: number
    trend_stage: string
    sustainability: string
    reason: string
    suggestion: string
  }[]
  top_picks: {  // 最具潜力标的
    code: string
    name: string
    industry: string
    potential: string
    reason: string
    entry_strategy: string
  }[]
  operation_advice: string
  risk_warning: string
}

// 趋势龙头数据（包含AI分析）
interface TrendLeaderData {
  stocks: TrendLeaderStock[]
  trading_day: string
  ai_analysis?: TrendLeaderAIAnalysis
}

// 新闻催化数据结构
interface NewsCatalyst {
  type: string
  title: string
  content: string
  stocks: string[]
  stock_codes: string[]
  importance: 'high' | 'medium' | 'low'
  source: string
  publish_time: string
  heat_score: number  // 热度分数 0-100
  suggestion: string
}

// 热点复盘数据结构
interface HotStock {
  code: string
  name: string
  price: number
  change_percent: number
  heat_score: number  // 热度分数 0-100
  heat_rank: number   // 热度排名
  heat_sources: string[]  // 热度来源
  reasons: string[]   // 热门原因
  suggestion: string  // 投资建议
  risk_level: 'high' | 'medium' | 'low'  // 风险等级
  market_sentiment: string  // 市场情绪
  related_concepts: string[]  // 相关概念
}

// 连板梯队数据结构
interface ContinuousLimitUpStock {
  code: string
  name: string
  price: number
  change_percent: number
  continuous_days: number  // 连板天数
  industry: string  // 所属题材
  turnover_rate: number
  amount: number
  limit_up_time: string
  open_count: number
}

// 连板梯队AI分析结果
interface ContinuousLimitUpAIAnalysis {
  market_overview: string  // 市场整体情况
  sector_analysis: string  // 板块分析
  high_board_analysis: {  // 高连板分析
    code: string
    name: string
    continuous_days: number
    industry: string
    space_judgment: string  // 空间判断
    space_score: number  // 空间评分
    reason: string
  }[]
  top_picks: {  // 最具潜力标的
    code: string
    name: string
    continuous_days: number
    potential: string  // 潜力评估
    reason: string
    entry_strategy: string
  }[]
  operation_advice: string  // 操作建议
  risk_warning: string  // 风险提示
}

interface ContinuousLimitUpData {
  stocks: ContinuousLimitUpStock[]
  by_days: Record<string, ContinuousLimitUpStock[]>  // 按连板天数分组
  trading_day: string
  ai_analysis?: ContinuousLimitUpAIAnalysis  // AI分析结果
}

interface HotReviewData {
  date: string
  summary: string  // 市场概述
  hot_stocks: HotStock[]  // 热门股票
  top_news: { title: string; source: string; time: string }[]  // 头条新闻
  analysis: string  // AI分析
  final_conclusion: string  // 最终结论
}

const IndexPage: FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('realtime')
  const [continuousLimitUpData, setContinuousLimitUpData] = useState<ContinuousLimitUpData | null>(null)
  const [limitUpData, setLimitUpData] = useState<LimitUpData | null>(null)
  const [dragonTigerData, setDragonTigerData] = useState<DragonTigerData | null>(null)
  const [trendLeaderData, setTrendLeaderData] = useState<TrendLeaderData | null>(null)
  const [newsCatalystData, setNewsCatalystData] = useState<NewsCatalyst[]>([])
  const [hotReviewData, setHotReviewData] = useState<HotReviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // 数据来源和更新时间
  const [hotReviewSource, setHotReviewSource] = useState<string>('')
  const [hotReviewUpdateTime, setHotReviewUpdateTime] = useState<string>('')
  const [continuousLimitUpSource, setContinuousLimitUpSource] = useState<string>('')
  const [limitUpSource, setLimitUpSource] = useState<string>('')
  const [dragonTigerSource, setDragonTigerSource] = useState<string>('')
  const [trendLeaderSource, setTrendLeaderSource] = useState<string>('')
  const [newsCatalystSource, setNewsCatalystSource] = useState<string>('')
  const [newsCatalystUpdateTime, setNewsCatalystUpdateTime] = useState<string>('')

  useDidShow(() => {
    const loggedIn = Taro.getStorageSync('isLoggedIn')
    const userRole = Taro.getStorageSync('userRole')
    if (!loggedIn) {
      Taro.redirectTo({ url: '/pages/login/index' })
    } else {
      setIsLoggedIn(true)
      setIsAdmin(userRole === 'admin')
      loadData()
    }
  })

  const loadData = async () => {
    // 先加载第一个Tab的数据，让用户快速看到内容
    setLoading(true)
    try {
      // 优先加载连板梯队数据（第一个Tab）
      await loadContinuousLimitUpData()
    } catch (error) {
      console.error('加载连板数据错误:', error)
    } finally {
      setLoading(false)
    }
    
    // 异步加载其他Tab的数据，不阻塞页面显示
    Promise.all([
      loadLimitUpStocks(),
      loadDragonTigerData(),
      loadTrendLeaderData(),
      loadNewsCatalystData(),
      loadHotReviewData()
    ]).catch(err => console.error('加载其他数据错误:', err))
  }

  const loadContinuousLimitUpData = async () => {
    try {
      const res = await Network.request({
        url: '/api/stock/continuous-limit-up',
        method: 'GET'
      })
      console.log('连板梯队数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setContinuousLimitUpData(res.data.data)
        setContinuousLimitUpSource(res.data.source || 'unknown')
      }
    } catch (error) {
      console.error('加载连板数据失败:', error)
    }
  }

  const loadLimitUpStocks = async () => {
    try {
      const res = await Network.request({
        url: '/api/stock/limit-up',
        method: 'GET'
      })
      console.log('涨停数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setLimitUpData(res.data.data)
        setLimitUpSource(res.data.source || 'unknown')
      }
    } catch (error) {
      console.error('加载涨停数据失败:', error)
    }
  }

  const loadDragonTigerData = async () => {
    try {
      const res = await Network.request({
        url: '/api/stock/dragon-tiger',
        method: 'GET'
      })
      console.log('龙虎榜数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setDragonTigerData(res.data.data)
        setDragonTigerSource(res.data.source || 'unknown')
      }
    } catch (error) {
      console.error('加载龙虎榜数据失败:', error)
    }
  }

  const loadTrendLeaderData = async () => {
    try {
      const res = await Network.request({
        url: '/api/stock/trend-leader',
        method: 'GET'
      })
      console.log('趋势龙头数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setTrendLeaderData(res.data.data)
        setTrendLeaderSource(res.data.source || 'unknown')
      }
    } catch (error) {
      console.error('加载趋势龙头数据失败:', error)
    }
  }

  const loadNewsCatalystData = async () => {
    try {
      const res = await Network.request({
        url: '/api/stock/news-catalyst',
        method: 'GET'
      })
      console.log('新闻催化数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setNewsCatalystData(res.data.data)
        setNewsCatalystSource(res.data.source || 'unknown')
        setNewsCatalystUpdateTime(res.data.updateTime || '')
      }
    } catch (error) {
      console.error('加载新闻催化数据失败:', error)
    }
  }

  const loadHotReviewData = async () => {
    try {
      const res = await Network.request({
        url: '/api/stock/hot-review',
        method: 'GET'
      })
      console.log('热点复盘数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setHotReviewData(res.data.data)
        setHotReviewSource(res.data.source || 'unknown')
        setHotReviewUpdateTime(res.data.updateTime || '')
      }
    } catch (error) {
      console.error('加载热点复盘数据失败:', error)
    }
  }

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
  }

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case 'akshare': return '实时数据'
      case 'cache': return '缓存数据'
      case 'mock': return '演示数据'
      default: return '未知来源'
    }
  }

  const getSourceColor = (source: string): string => {
    switch (source) {
      case 'akshare': return '#10B981'  // 绿色 - 实时
      case 'cache': return '#F59E0B'    // 橙色 - 缓存
      case 'mock': return '#64748B'     // 灰色 - 演示
      default: return '#64748B'
    }
  }

  const formatAmount = (amount: number): string => {
    if (amount >= 100000000) {
      return (amount / 100000000).toFixed(2) + '亿'
    } else if (amount >= 10000) {
      return (amount / 10000).toFixed(2) + '万'
    }
    return amount.toFixed(2)
  }

  const tabs = [
    { key: 'realtime', name: '连板梯队', icon: '📈' },
    { key: 'heartbeat', name: '心跳时刻', icon: '💓' },
    { key: 'dragonTiger', name: '龙虎榜单', icon: '🐉' },
    { key: 'trendLeader', name: '趋势龙头', icon: '🚀' },
    { key: 'newsCatalyst', name: '新闻催化', icon: '📰' },
    { key: 'hotReview', name: '热点复盘', icon: '🔥' }
  ]

  // 心跳时刻 - 涨停股列表
  const renderLimitUpItem = (item: LimitUpStock, index: number) => (
    <View key={item.code + index} className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
      <View className="flex flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex flex-row items-center mb-1">
            <Text className="block text-base font-semibold text-slate-800 mr-2">{item.name}</Text>
            <View style={{ backgroundColor: '#EF4444', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 4 }}>
              <Text className="block text-xs text-white font-medium">涨停</Text>
            </View>
            {/* 所属板块 - 与连板梯队风格一致 */}
            {item.industry && (
              <View className="bg-slate-100 px-2 py-1 rounded ml-2">
                <Text className="block text-xs text-slate-600">{item.industry}</Text>
              </View>
            )}
          </View>
          <Text className="block text-sm text-slate-500">{item.code}</Text>
          <Text className="block text-xs text-slate-400 mt-1">
            涨停时间: {item.limit_up_time}
            {item.open_count > 0 && ` · 开板${item.open_count}次`}
          </Text>
        </View>
        <View className="text-right">
          <Text className="block text-xl font-bold text-red-500">
            +{item.change_percent.toFixed(2)}%
          </Text>
          <Text className="block text-sm text-slate-600">¥{item.price.toFixed(2)}</Text>
        </View>
      </View>
      
      {/* 涨停原因 */}
      {item.reason && (
        <View className="mt-2 pt-2 border-t border-slate-100">
          <Text className="block text-xs text-slate-500">
            涨停原因: <Text className="text-slate-700">{item.reason}</Text>
          </Text>
          <Text className="block text-xs text-slate-400 mt-1">
            换手率: {item.turnover_rate.toFixed(2)}% · 成交额: {formatAmount(item.amount)}
          </Text>
        </View>
      )}
    </View>
  )

  // 龙虎榜 - 龙虎榜个股列表
  const renderDragonTigerItem = (item: DragonTigerStock, index: number) => {
    const isNetBuy = item.net_buy > 0
    return (
      <View key={item.code + index} className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
        <View className="flex flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex flex-row items-center mb-1">
              <Text className="block text-base font-semibold text-slate-800 mr-2">{item.name}</Text>
              {/* 所属板块 - 与心跳时刻风格一致 */}
              {item.industry && (
                <View className="bg-slate-100 px-2 py-1 rounded ml-1">
                  <Text className="block text-xs text-slate-600">{item.industry}</Text>
                </View>
              )}
            </View>
            <Text className="block text-xs text-slate-400">{item.code}</Text>
            <Text className="block text-xs text-slate-400 mt-1">
              换手: {item.turnover_rate.toFixed(2)}% · 成交: {formatAmount(item.amount)}
            </Text>
          </View>
          <View className="text-right">
            <Text className={`block text-lg font-bold ${item.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
            </Text>
            <Text className="block text-sm text-slate-600">¥{item.price.toFixed(2)}</Text>
          </View>
        </View>
        
        {/* 净买卖 */}
        <View className="mt-3 pt-2 border-t border-slate-100">
          <View className="flex flex-row justify-between items-center mb-2">
            <Text className="block text-xs text-slate-500">净买入:</Text>
            <Text className={`block text-sm font-bold ${isNetBuy ? 'text-red-500' : 'text-green-500'}`}>
              {isNetBuy ? '+' : ''}{formatAmount(item.net_buy)}
            </Text>
          </View>
          
          {/* 买卖金额 */}
          <View className="flex flex-row gap-2 mb-2">
            <View className="flex-1 bg-red-50 rounded-lg p-2">
              <Text className="block text-xs text-slate-500">买入</Text>
              <Text className="block text-sm text-red-500 font-medium">{formatAmount(item.buy_amount)}</Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-lg p-2">
              <Text className="block text-xs text-slate-500">卖出</Text>
              <Text className="block text-sm text-green-500 font-medium">{formatAmount(item.sell_amount)}</Text>
            </View>
          </View>
          
          {/* 知名席位 */}
          {item.famous_buyers && item.famous_buyers.length > 0 && (
            <View className="mb-1">
              <Text className="block text-xs text-slate-500">知名买方:</Text>
              <Text className="block text-xs text-red-600">{item.famous_buyers.join('、')}</Text>
            </View>
          )}
          
          {/* 买卖原因 */}
          {item.buy_reason && (
            <Text className="block text-xs text-slate-400 mt-1">
              {item.buy_reason}
            </Text>
          )}
        </View>
      </View>
    )
  }

  // 趋势龙头 - 趋势龙头个股列表
  const renderTrendLeaderItem = (item: TrendLeaderStock, index: number) => {
    const getStrengthColor = (score: number) => {
      if (score >= 90) return '#EF4444'  // 红色 - 极强
      if (score >= 80) return '#F59E0B'  // 橙色 - 强势
      if (score >= 70) return '#10B981'  // 绿色 - 中等
      return '#64748B'  // 灰色
    }
    
    return (
      <View key={item.code + index} className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
        <View className="flex flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex flex-row items-center mb-1">
              <Text className="block text-base font-semibold text-slate-800 mr-2">{item.name}</Text>
              <View style={{ backgroundColor: getStrengthColor(item.strength_score) + '20', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 4 }}>
                <Text className="block text-xs font-medium" style={{ color: getStrengthColor(item.strength_score) }}>
                  {item.strength_score}分
                </Text>
              </View>
              {/* 所属板块 - 与心跳时刻风格一致 */}
              {item.industry && (
                <View className="bg-slate-100 px-2 py-1 rounded ml-2">
                  <Text className="block text-xs text-slate-600">{item.industry}</Text>
                </View>
              )}
            </View>
            <Text className="block text-xs text-slate-400">{item.code}</Text>
          </View>
          <View className="text-right">
            <Text className={`block text-lg font-bold ${item.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
            </Text>
            <Text className="block text-sm text-slate-600">¥{item.price.toFixed(2)}</Text>
          </View>
        </View>
        
        {/* 趋势指标 */}
        <View className="mt-3 pt-2 border-t border-slate-100">
          <View className="flex flex-row gap-2 mb-2">
            <View className="flex-1 bg-slate-50 rounded-lg p-2 items-center">
              <Text className="block text-xs text-slate-500">连涨天数</Text>
              <Text className="block text-base text-red-500 font-bold">{item.days_rising}天</Text>
            </View>
            <View className="flex-1 bg-slate-50 rounded-lg p-2 items-center">
              <Text className="block text-xs text-slate-500">累计涨幅</Text>
              <Text className="block text-base text-red-500 font-bold">+{item.total_change.toFixed(1)}%</Text>
            </View>
            <View className="flex-1 bg-slate-50 rounded-lg p-2 items-center">
              <Text className="block text-xs text-slate-500">阶段</Text>
              <Text className="block text-xs text-slate-700 font-medium">{item.trend_stage}</Text>
            </View>
          </View>
          
          {/* 支撑/压力位 */}
          <View className="flex flex-row justify-between">
            <View>
              <Text className="block text-xs text-slate-400">支撑位: ¥{item.support_level.toFixed(2)}</Text>
            </View>
            <View>
              <Text className="block text-xs text-slate-400">压力位: ¥{item.resistance_level.toFixed(2)}</Text>
            </View>
          </View>
          
          {/* 市值和换手 */}
          <Text className="block text-xs text-slate-400 mt-2">
            市值: {formatAmount(item.market_cap)} · 换手: {item.turnover_rate.toFixed(2)}%
          </Text>
        </View>
      </View>
    )
  }

  // 新闻催化 - 新闻催化列表
  const renderNewsCatalystItem = (item: NewsCatalyst, index: number) => {
    const getImportanceColor = (importance: string) => {
      switch (importance) {
        case 'high': return '#EF4444'   // 红色 - 重要
        case 'medium': return '#F59E0B' // 橙色 - 一般
        case 'low': return '#64748B'    // 灰色 - 较低
        default: return '#64748B'
      }
    }
    
    const getImportanceLabel = (importance: string) => {
      switch (importance) {
        case 'high': return '重要'
        case 'medium': return '一般'
        case 'low': return '较低'
        default: return '一般'
      }
    }

    const getTypeIcon = (type: string) => {
      switch (type) {
        case '财经新闻': return '📰'
        case '概念热点': return '🔥'
        case '热门个股': return '⭐'
        case '宏观政策': return '🏛️'
        case '深度报道': return '📊'
        case '公告速递': return '📢'
        default: return '📌'
      }
    }
    
    // 获取热度颜色
    const getHeatColor = (score: number) => {
      if (score >= 80) return '#EF4444'  // 红色 - 超热
      if (score >= 60) return '#F59E0B'  // 橙色 - 较热
      return '#64748B'  // 灰色 - 一般
    }
    
    return (
      <View key={index} className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
        {/* 标题行 */}
        <View className="flex flex-row items-start mb-2">
          <Text className="block text-lg mr-2">{getTypeIcon(item.type)}</Text>
          <View className="flex-1">
            <View className="flex flex-row items-center flex-wrap mb-1">
              {/* 热度标签 */}
              {item.heat_score && (
                <View 
                  style={{ backgroundColor: getHeatColor(item.heat_score) + '20', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 4 }}
                  className="mr-2 mb-1"
                >
                  <Text className="block text-xs font-medium" style={{ color: getHeatColor(item.heat_score) }}>
                    🔥 {item.heat_score}分
                  </Text>
                </View>
              )}
              <View 
                style={{ backgroundColor: getImportanceColor(item.importance) + '20', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 4 }}
                className="mr-2 mb-1"
              >
                <Text className="block text-xs font-medium" style={{ color: getImportanceColor(item.importance) }}>
                  {getImportanceLabel(item.importance)}
                </Text>
              </View>
              <View className="bg-slate-100 px-2 py-0.5 rounded mb-1">
                <Text className="block text-xs text-slate-500">{item.type}</Text>
              </View>
            </View>
            <Text className="block text-base font-semibold text-slate-800 leading-snug">
              {item.title}
            </Text>
          </View>
        </View>
        
        {/* 内容 */}
        <Text className="block text-sm text-slate-600 mb-3 leading-relaxed">
          {item.content}
        </Text>
        
        {/* 相关个股 */}
        {item.stocks && item.stocks.length > 0 && (
          <View className="flex flex-row flex-wrap mb-3">
            {item.stocks.map((stock, idx) => (
              <View 
                key={idx}
                className="bg-red-50 px-2 py-1 rounded mr-2 mb-1"
              >
                <Text className="block text-xs text-red-600 font-medium">{stock}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* 建议区 */}
        <View className="bg-amber-50 rounded-lg p-3 mb-2">
          <View className="flex flex-row items-center mb-1">
            <Text className="block text-sm mr-1">💡</Text>
            <Text className="block text-xs font-semibold text-amber-700">投资建议</Text>
          </View>
          <Text className="block text-sm text-amber-800 leading-relaxed">
            {item.suggestion}
          </Text>
        </View>
        
        {/* 底部信息 */}
        <View className="flex flex-row justify-between items-center pt-2 border-t border-slate-100">
          <Text className="block text-xs text-slate-400">{item.source}</Text>
          <Text className="block text-xs text-slate-400">{item.publish_time}</Text>
        </View>
      </View>
    )
  }

  const renderContent = () => {
    if (!isLoggedIn) return null

    switch (activeTab) {
      case 'realtime':
        return (
          <ScrollView scrollY className="h-full">
            <View className="p-4">
              {/* 标题和数据来源 */}
              <View className="flex flex-row justify-between items-center mb-4">
                <View>
                  <Text className="block text-lg font-semibold text-slate-800">连板梯队</Text>
                  <View className="flex flex-row items-center mt-1">
                    <View 
                      className="px-2 py-0.5 rounded mr-2"
                      style={{ backgroundColor: getSourceColor(continuousLimitUpSource) + '20', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}
                    >
                      <Text className="block text-xs" style={{ color: getSourceColor(continuousLimitUpSource) }}>
                        {getSourceLabel(continuousLimitUpSource)}
                      </Text>
                    </View>
                    {continuousLimitUpData?.trading_day && (
                      <Text className="block text-xs text-slate-400">
                        交易日: {continuousLimitUpData.trading_day}
                      </Text>
                    )}
                  </View>
                </View>
                <View 
                  className="bg-orange-50 px-3 py-1 rounded-full"
                  onClick={() => { setLoading(true); loadContinuousLimitUpData().finally(() => setLoading(false)) }}
                >
                  <Text className="block text-xs text-orange-500">刷新</Text>
                </View>
              </View>
              
              {/* 连板统计 */}
              {continuousLimitUpData?.by_days && (
                <View className="flex flex-row flex-wrap gap-2 mb-4">
                  {Object.keys(continuousLimitUpData.by_days)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .map(key => (
                      <View key={key} className="bg-red-50 px-3 py-1 rounded-full">
                        <Text className="block text-xs text-red-600 font-medium">
                          {key} ({continuousLimitUpData.by_days[key].length}只)
                        </Text>
                      </View>
                    ))
                  }
                </View>
              )}
              
              {/* AI分析结果 - 放在连板统计后面 */}
              {continuousLimitUpData?.ai_analysis && (
                <View className="mb-4">
                  {/* 市场概况卡片 */}
                  <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-3 border border-blue-100">
                    <View className="flex flex-row items-center mb-2">
                      <Text className="block text-sm font-semibold text-blue-800">📊 市场概况</Text>
                    </View>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {continuousLimitUpData.ai_analysis.market_overview}
                    </Text>
                    <View className="mt-2 pt-2 border-t border-blue-100">
                      <Text className="block text-xs text-slate-600">
                        📌 板块分析：{continuousLimitUpData.ai_analysis.sector_analysis}
                      </Text>
                    </View>
                  </View>
                  
                  {/* 高连板空间判断 */}
                  {continuousLimitUpData.ai_analysis.high_board_analysis?.length > 0 && (
                    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
                      <Text className="block text-sm font-semibold text-slate-800 mb-3">🎯 高连板空间判断</Text>
                      {continuousLimitUpData.ai_analysis.high_board_analysis.map((item, idx) => (
                        <View key={item.code} className={`flex flex-row items-start py-2 ${idx < continuousLimitUpData.ai_analysis!.high_board_analysis.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <View className="flex-1">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-red-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-red-600 font-medium">{item.continuous_days}连板</Text>
                              </View>
                              <View
                                className={`px-2 py-0.5 rounded ml-2 ${
                                  item.space_judgment === '看高一线' ? 'bg-green-100' : 
                                  item.space_judgment === '高位风险' ? 'bg-red-100' : 'bg-yellow-100'
                                }`}
                              >
                                <Text
                                  className={`block text-xs font-medium ${
                                    item.space_judgment === '看高一线' ? 'text-green-600' : 
                                    item.space_judgment === '高位风险' ? 'text-red-600' : 'text-yellow-600'
                                  }`}
                                >{item.space_judgment}</Text>
                              </View>
                            </View>
                            <Text className="block text-xs text-slate-500 mt-1">{item.industry}</Text>
                            <Text className="block text-xs text-slate-600 mt-1">{item.reason}</Text>
                          </View>
                          <View className="items-center">
                            <Text className="block text-lg font-bold text-blue-500">{item.space_score}</Text>
                            <Text className="block text-xs text-slate-400">空间分</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 最具潜力标的 */}
                  {continuousLimitUpData.ai_analysis.top_picks?.length > 0 && (
                    <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-3 border border-green-100">
                      <Text className="block text-sm font-semibold text-green-800 mb-3">💎 最具潜力标的</Text>
                      {continuousLimitUpData.ai_analysis.top_picks.map((item, idx) => (
                        <View key={item.code} className={`py-2 ${idx < continuousLimitUpData.ai_analysis!.top_picks.length - 1 ? 'border-b border-green-100' : ''}`}>
                          <View className="flex flex-row items-center justify-between">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-red-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-red-600 font-medium">{item.continuous_days}连板</Text>
                              </View>
                            </View>
                            <View
                              className={`px-2 py-0.5 rounded ${
                                item.potential === '高' ? 'bg-green-500' : 
                                item.potential === '中' ? 'bg-yellow-500' : 'bg-slate-400'
                              }`}
                            >
                              <Text className="block text-xs text-white font-medium">潜力: {item.potential}</Text>
                            </View>
                          </View>
                          <Text className="block text-xs text-slate-600 mt-1">📌 {item.reason}</Text>
                          <Text className="block text-xs text-green-700 mt-1">💡 {item.entry_strategy}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 操作建议和风险提示 */}
                  <View className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-3 border border-orange-100">
                    <Text className="block text-sm font-semibold text-orange-800 mb-2">📝 操作建议</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {continuousLimitUpData.ai_analysis.operation_advice}
                    </Text>
                  </View>
                  
                  <View className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                    <Text className="block text-sm font-semibold text-red-800 mb-2">⚠️ 风险提示</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {continuousLimitUpData.ai_analysis.risk_warning}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* 连板股票列表 - 按天数分组 */}
              {continuousLimitUpData?.by_days ? (
                Object.keys(continuousLimitUpData.by_days)
                  .sort((a, b) => parseInt(b) - parseInt(a))
                  .map(daysKey => (
                    <View key={daysKey} className="mb-4">
                      {/* 天数标题 */}
                      <View className="flex flex-row items-center mb-2">
                        <View className="bg-red-500 px-2 py-1 rounded">
                          <Text className="block text-sm font-bold text-white">{daysKey}</Text>
                        </View>
                        <View className="flex-1 h-px bg-slate-200 ml-2" />
                      </View>
                      
                      {/* 该天数的股票列表 */}
                      {continuousLimitUpData.by_days[daysKey].map((stock, idx) => (
                        <View 
                          key={stock.code} 
                          className="flex flex-row items-center bg-white px-4 py-3 border-b border-slate-100"
                        >
                          {/* 排名 */}
                          <View className="w-6 items-center">
                            <Text className={`block text-sm font-bold ${idx < 3 ? 'text-red-500' : 'text-slate-400'}`}>
                              {idx + 1}
                            </Text>
                          </View>
                          
                          {/* 股票名称和代码 */}
                          <View className="flex-1 ml-3">
                            <Text className="block text-base font-semibold text-slate-800">{stock.name}</Text>
                            <Text className="block text-xs text-slate-400">{stock.code}</Text>
                          </View>
                          
                          {/* 所属题材 */}
                          <View className="bg-slate-100 px-2 py-1 rounded mr-3">
                            <Text className="block text-xs text-slate-600">{stock.industry || '未分类'}</Text>
                          </View>
                          
                          {/* 价格和涨幅 */}
                          <View className="items-end w-20">
                            <Text className="block text-base font-bold text-red-500">
                              {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                            </Text>
                            <Text className="block text-xs text-slate-400">¥{stock.price.toFixed(2)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
              ) : (
                <View className="flex items-center justify-center py-16">
                  <Text className="block text-slate-400">暂无连板数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      case 'heartbeat':
        return (
          <ScrollView scrollY className="h-full">
            <View className="p-4">
              <View className="flex flex-row justify-between items-center mb-4">
                <View>
                  <Text className="block text-lg font-semibold text-slate-800">今日涨停个股</Text>
                  <View className="flex flex-row items-center mt-1">
                    <View 
                      className="px-2 py-0.5 rounded mr-2"
                      style={{ backgroundColor: getSourceColor(limitUpSource) + '20', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}
                    >
                      <Text className="block text-xs" style={{ color: getSourceColor(limitUpSource) }}>
                        {getSourceLabel(limitUpSource)}
                      </Text>
                    </View>
                    {limitUpData?.trading_day && (
                      <Text className="block text-xs text-slate-400">
                        交易日: {limitUpData.trading_day}
                      </Text>
                    )}
                  </View>
                </View>
                <View 
                  className="bg-red-50 px-3 py-1 rounded-full"
                  onClick={() => { setLoading(true); loadLimitUpStocks().finally(() => setLoading(false)) }}
                >
                  <Text className="block text-xs text-red-500">刷新</Text>
                </View>
              </View>
              
              {/* AI分析结果 */}
              {limitUpData?.ai_analysis && (
                <View className="mb-4">
                  {/* 市场概况卡片 */}
                  <View className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 mb-3 border border-rose-100">
                    <View className="flex flex-row items-center mb-2">
                      <Text className="block text-sm font-semibold text-rose-800">📊 市场概况</Text>
                    </View>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {limitUpData.ai_analysis.market_overview}
                    </Text>
                    {limitUpData.ai_analysis.hot_sectors?.length > 0 && (
                      <View className="mt-2 pt-2 border-t border-rose-100">
                        <Text className="block text-xs text-slate-500 mb-1">🔥 热点板块：</Text>
                        <View className="flex flex-row flex-wrap gap-1">
                          {limitUpData.ai_analysis.hot_sectors.map((sector, idx) => (
                            <View key={idx} className="bg-rose-100 px-2 py-0.5 rounded">
                              <Text className="block text-xs text-rose-600">{sector}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                  
                  {/* 最具爆发力个股 */}
                  {limitUpData.ai_analysis.explosive_stocks?.length > 0 && (
                    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
                      <Text className="block text-sm font-semibold text-slate-800 mb-3">🚀 最具爆发力个股</Text>
                      {limitUpData.ai_analysis.explosive_stocks.map((item, idx) => (
                        <View key={item.code} className={`flex flex-row items-start py-2 ${idx < limitUpData.ai_analysis!.explosive_stocks.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <View className="flex-1">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-red-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-red-600 font-medium">{item.limit_type}</Text>
                              </View>
                              <View className="bg-slate-100 px-2 py-0.5 rounded ml-1">
                                <Text className="block text-xs text-slate-600">{item.industry}</Text>
                              </View>
                            </View>
                            <Text className="block text-xs text-slate-500 mt-1">📌 {item.reason}</Text>
                            <Text className="block text-xs text-slate-600 mt-0.5">💰 {item.fund_flow}</Text>
                            <Text className="block text-xs text-green-700 mt-0.5">💡 {item.suggestion}</Text>
                          </View>
                          <View className="items-center">
                            <Text className="block text-lg font-bold text-red-500">{item.explosive_score}</Text>
                            <Text className="block text-xs text-slate-400">爆发力</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 最具潜力标的 */}
                  {limitUpData.ai_analysis.top_picks?.length > 0 && (
                    <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-3 border border-green-100">
                      <Text className="block text-sm font-semibold text-green-800 mb-3">💎 最具潜力标的</Text>
                      {limitUpData.ai_analysis.top_picks.map((item, idx) => (
                        <View key={item.code} className={`py-2 ${idx < limitUpData.ai_analysis!.top_picks.length - 1 ? 'border-b border-green-100' : ''}`}>
                          <View className="flex flex-row items-center justify-between">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-slate-600">{item.industry}</Text>
                              </View>
                            </View>
                            <View
                              className={`px-2 py-0.5 rounded ${
                                item.potential === '高' ? 'bg-green-500' : 
                                item.potential === '中' ? 'bg-yellow-500' : 'bg-slate-400'
                              }`}
                            >
                              <Text className="block text-xs text-white font-medium">潜力: {item.potential}</Text>
                            </View>
                          </View>
                          <Text className="block text-xs text-slate-600 mt-1">📌 {item.reason}</Text>
                          <Text className="block text-xs text-green-700 mt-1">💡 {item.entry_strategy}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 操作建议 */}
                  <View className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-3 border border-orange-100">
                    <Text className="block text-sm font-semibold text-orange-800 mb-2">📝 操作建议</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {limitUpData.ai_analysis.operation_advice}
                    </Text>
                  </View>
                  
                  {/* 风险提示 */}
                  <View className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                    <Text className="block text-sm font-semibold text-red-800 mb-2">⚠️ 风险提示</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {limitUpData.ai_analysis.risk_warning}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* 涨停股列表 */}
              {limitUpData?.stocks?.length ? (
                limitUpData.stocks.map((item, idx) => renderLimitUpItem(item, idx))
              ) : (
                <View className="flex items-center justify-center py-16">
                  <Text className="block text-slate-400">暂无涨停数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      case 'dragonTiger':
        return (
          <ScrollView scrollY className="h-full">
            <View className="p-4">
              <View className="flex flex-row justify-between items-center mb-4">
                <View>
                  <Text className="block text-lg font-semibold text-slate-800">今日龙虎榜</Text>
                  <View className="flex flex-row items-center mt-1">
                    <View 
                      className="px-2 py-0.5 rounded mr-2"
                      style={{ backgroundColor: getSourceColor(dragonTigerSource) + '20', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}
                    >
                      <Text className="block text-xs" style={{ color: getSourceColor(dragonTigerSource) }}>
                        {getSourceLabel(dragonTigerSource)}
                      </Text>
                    </View>
                    {dragonTigerData?.trading_day && (
                      <Text className="block text-xs text-slate-400">
                        交易日: {dragonTigerData.trading_day}
                      </Text>
                    )}
                  </View>
                </View>
                <View 
                  className="bg-purple-50 px-3 py-1 rounded-full"
                  onClick={() => { setLoading(true); loadDragonTigerData().finally(() => setLoading(false)) }}
                >
                  <Text className="block text-xs text-purple-500">刷新</Text>
                </View>
              </View>
              
              {/* AI分析结果 */}
              {dragonTigerData?.ai_analysis && (
                <View className="mb-4">
                  {/* 市场概况卡片 */}
                  <View className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 mb-3 border border-purple-100">
                    <View className="flex flex-row items-center mb-2">
                      <Text className="block text-sm font-semibold text-purple-800">📊 资金动向分析</Text>
                    </View>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {dragonTigerData.ai_analysis.market_overview}
                    </Text>
                    <View className="mt-2 pt-2 border-t border-purple-100">
                      <Text className="block text-xs text-purple-600">
                        💰 资金情绪：{dragonTigerData.ai_analysis.fund_sentiment}
                      </Text>
                    </View>
                  </View>
                  
                  {/* 最受资金追捧个股 */}
                  {dragonTigerData.ai_analysis.hot_stocks?.length > 0 && (
                    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
                      <Text className="block text-sm font-semibold text-slate-800 mb-3">🔥 最受资金追捧</Text>
                      {dragonTigerData.ai_analysis.hot_stocks.map((item, idx) => (
                        <View key={item.code} className={`flex flex-row items-start py-2 ${idx < dragonTigerData.ai_analysis!.hot_stocks.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <View className="flex-1">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-slate-600">{item.industry}</Text>
                              </View>
                              <View className="bg-purple-100 px-2 py-0.5 rounded ml-1">
                                <Text className="block text-xs text-purple-600">{item.buyer_type}</Text>
                              </View>
                            </View>
                            <Text className="block text-xs text-slate-500 mt-1">📌 {item.reason}</Text>
                            <Text className="block text-xs text-green-700 mt-0.5">💡 {item.suggestion}</Text>
                          </View>
                          <View className="items-center">
                            <Text className="block text-lg font-bold text-purple-500">{item.hot_score}</Text>
                            <Text className="block text-xs text-slate-400">热度</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 最具潜力标的 */}
                  {dragonTigerData.ai_analysis.top_picks?.length > 0 && (
                    <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-3 border border-green-100">
                      <Text className="block text-sm font-semibold text-green-800 mb-3">💎 最具潜力标的</Text>
                      {dragonTigerData.ai_analysis.top_picks.map((item, idx) => (
                        <View key={item.code} className={`py-2 ${idx < dragonTigerData.ai_analysis!.top_picks.length - 1 ? 'border-b border-green-100' : ''}`}>
                          <View className="flex flex-row items-center justify-between">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-slate-600">{item.industry}</Text>
                              </View>
                            </View>
                            <View
                              className={`px-2 py-0.5 rounded ${
                                item.potential === '高' ? 'bg-green-500' : 
                                item.potential === '中' ? 'bg-yellow-500' : 'bg-slate-400'
                              }`}
                            >
                              <Text className="block text-xs text-white font-medium">潜力: {item.potential}</Text>
                            </View>
                          </View>
                          <Text className="block text-xs text-slate-600 mt-1">📌 {item.reason}</Text>
                          <Text className="block text-xs text-green-700 mt-1">💡 {item.entry_strategy}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 操作建议 */}
                  <View className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-3 border border-orange-100">
                    <Text className="block text-sm font-semibold text-orange-800 mb-2">📝 操作建议</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {dragonTigerData.ai_analysis.operation_advice}
                    </Text>
                  </View>
                  
                  {/* 风险提示 */}
                  <View className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                    <Text className="block text-sm font-semibold text-red-800 mb-2">⚠️ 风险提示</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {dragonTigerData.ai_analysis.risk_warning}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* 龙虎榜个股列表 */}
              {dragonTigerData?.stocks?.length ? (
                dragonTigerData.stocks.map((item, idx) => renderDragonTigerItem(item, idx))
              ) : (
                <View className="flex items-center justify-center py-16">
                  <Text className="block text-slate-400">暂无龙虎榜数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      case 'trendLeader':
        return (
          <ScrollView scrollY className="h-full">
            <View className="p-4">
              <View className="flex flex-row justify-between items-center mb-4">
                <View>
                  <Text className="block text-lg font-semibold text-slate-800">趋势龙头股</Text>
                  <View className="flex flex-row items-center mt-1">
                    <View 
                      className="px-2 py-0.5 rounded mr-2"
                      style={{ backgroundColor: getSourceColor(trendLeaderSource) + '20', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}
                    >
                      <Text className="block text-xs" style={{ color: getSourceColor(trendLeaderSource) }}>
                        {getSourceLabel(trendLeaderSource)}
                      </Text>
                    </View>
                    {trendLeaderData?.trading_day && (
                      <Text className="block text-xs text-slate-400">
                        交易日: {trendLeaderData.trading_day}
                      </Text>
                    )}
                  </View>
                </View>
                <View 
                  className="bg-blue-50 px-3 py-1 rounded-full"
                  onClick={() => { setLoading(true); loadTrendLeaderData().finally(() => setLoading(false)) }}
                >
                  <Text className="block text-xs text-blue-500">刷新</Text>
                </View>
              </View>
              
              {/* AI分析结果 */}
              {trendLeaderData?.ai_analysis && (
                <View className="mb-4">
                  {/* 市场概况卡片 */}
                  <View className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 mb-3 border border-cyan-100">
                    <View className="flex flex-row items-center mb-2">
                      <Text className="block text-sm font-semibold text-cyan-800">📊 趋势分析</Text>
                    </View>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {trendLeaderData.ai_analysis.market_overview}
                    </Text>
                    <View className="mt-2 pt-2 border-t border-cyan-100">
                      <Text className="block text-xs text-cyan-600">
                        📈 趋势阶段：{trendLeaderData.ai_analysis.trend_stage}
                      </Text>
                    </View>
                  </View>
                  
                  {/* 最强龙头 */}
                  {trendLeaderData.ai_analysis.strong_leaders?.length > 0 && (
                    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
                      <Text className="block text-sm font-semibold text-slate-800 mb-3">🏆 最强龙头</Text>
                      {trendLeaderData.ai_analysis.strong_leaders.map((item, idx) => (
                        <View key={item.code} className={`flex flex-row items-start py-2 ${idx < trendLeaderData.ai_analysis!.strong_leaders.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <View className="flex-1">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-slate-600">{item.industry}</Text>
                              </View>
                              <View
                                className={`px-2 py-0.5 rounded ml-1 ${
                                  item.sustainability === '强' ? 'bg-green-100' : 
                                  item.sustainability === '中' ? 'bg-yellow-100' : 'bg-slate-100'
                                }`}
                              >
                                <Text
                                  className={`block text-xs font-medium ${
                                    item.sustainability === '强' ? 'text-green-600' : 
                                    item.sustainability === '中' ? 'text-yellow-600' : 'text-slate-600'
                                  }`}
                                >{item.sustainability}持续性</Text>
                              </View>
                            </View>
                            <Text className="block text-xs text-slate-500 mt-1">📌 {item.reason}</Text>
                            <Text className="block text-xs text-green-700 mt-0.5">💡 {item.suggestion}</Text>
                          </View>
                          <View className="items-center">
                            <Text className="block text-lg font-bold text-cyan-500">{item.strength_score}</Text>
                            <Text className="block text-xs text-slate-400">强度</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 最具潜力标的 */}
                  {trendLeaderData.ai_analysis.top_picks?.length > 0 && (
                    <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-3 border border-green-100">
                      <Text className="block text-sm font-semibold text-green-800 mb-3">💎 最具潜力标的</Text>
                      {trendLeaderData.ai_analysis.top_picks.map((item, idx) => (
                        <View key={item.code} className={`py-2 ${idx < trendLeaderData.ai_analysis!.top_picks.length - 1 ? 'border-b border-green-100' : ''}`}>
                          <View className="flex flex-row items-center justify-between">
                            <View className="flex flex-row items-center">
                              <Text className="block text-sm font-semibold text-slate-800 mr-2">{item.name}</Text>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="block text-xs text-slate-600">{item.industry}</Text>
                              </View>
                            </View>
                            <View
                              className={`px-2 py-0.5 rounded ${
                                item.potential === '高' ? 'bg-green-500' : 
                                item.potential === '中' ? 'bg-yellow-500' : 'bg-slate-400'
                              }`}
                            >
                              <Text className="block text-xs text-white font-medium">潜力: {item.potential}</Text>
                            </View>
                          </View>
                          <Text className="block text-xs text-slate-600 mt-1">📌 {item.reason}</Text>
                          <Text className="block text-xs text-green-700 mt-1">💡 {item.entry_strategy}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* 操作建议 */}
                  <View className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-3 border border-orange-100">
                    <Text className="block text-sm font-semibold text-orange-800 mb-2">📝 操作建议</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {trendLeaderData.ai_analysis.operation_advice}
                    </Text>
                  </View>
                  
                  {/* 风险提示 */}
                  <View className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
                    <Text className="block text-sm font-semibold text-red-800 mb-2">⚠️ 风险提示</Text>
                    <Text className="block text-sm text-slate-700 leading-relaxed">
                      {trendLeaderData.ai_analysis.risk_warning}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* 趋势龙头个股列表 */}
              {trendLeaderData?.stocks?.length ? (
                trendLeaderData.stocks.map((item, idx) => renderTrendLeaderItem(item, idx))
              ) : (
                <View className="flex items-center justify-center py-16">
                  <Text className="block text-slate-400">暂无趋势龙头数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      case 'newsCatalyst':
        return (
          <ScrollView scrollY className="h-full">
            <View className="p-4">
              <View className="flex flex-row justify-between items-center mb-4">
                <View>
                  <Text className="block text-lg font-semibold text-slate-800">新闻催化 Top5</Text>
                  <Text className="block text-xs text-slate-400 mt-1">结合资金流向分析的投资建议</Text>
                  <View className="flex flex-row items-center mt-1">
                    <View 
                      className="px-2 py-0.5 rounded mr-2"
                      style={{ backgroundColor: getSourceColor(newsCatalystSource) + '20', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}
                    >
                      <Text className="block text-xs" style={{ color: getSourceColor(newsCatalystSource) }}>
                        {getSourceLabel(newsCatalystSource)}
                      </Text>
                    </View>
                    {newsCatalystUpdateTime && (
                      <Text className="block text-xs text-slate-400">
                        更新: {formatTime(newsCatalystUpdateTime)}
                      </Text>
                    )}
                  </View>
                </View>
                <View 
                  className="bg-indigo-50 px-3 py-1 rounded-full"
                  onClick={() => { setLoading(true); loadNewsCatalystData().finally(() => setLoading(false)) }}
                >
                  <Text className="block text-xs text-indigo-500">刷新</Text>
                </View>
              </View>
              
              {newsCatalystData.length > 0 ? (
                newsCatalystData.map((item, idx) => renderNewsCatalystItem(item, idx))
              ) : (
                <View className="flex items-center justify-center py-16">
                  <Text className="block text-slate-400">暂无新闻数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      case 'hotReview':
        return (
          <ScrollView scrollY className="h-full">
            <View className="p-4">
              <View className="flex flex-row justify-between items-center mb-4">
                <View>
                  <Text className="block text-lg font-semibold text-slate-800">热点复盘</Text>
                  <View className="flex flex-row items-center mt-1">
                    <View 
                      className="px-2 py-0.5 rounded mr-2"
                      style={{ backgroundColor: getSourceColor(hotReviewSource) + '20', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2 }}
                    >
                      <Text className="block text-xs" style={{ color: getSourceColor(hotReviewSource) }}>
                        {getSourceLabel(hotReviewSource)}
                      </Text>
                    </View>
                    {hotReviewUpdateTime && (
                      <Text className="block text-xs text-slate-400">
                        更新: {formatTime(hotReviewUpdateTime)}
                      </Text>
                    )}
                  </View>
                </View>
                <View 
                  className="bg-red-50 px-3 py-1 rounded-full"
                  onClick={() => { setLoading(true); loadHotReviewData().finally(() => setLoading(false)) }}
                >
                  <Text className="block text-xs text-red-500">刷新</Text>
                </View>
              </View>
              
              {hotReviewData ? (
                <>
                  {/* 市场概述 */}
                  <View className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 mb-4 border border-orange-100">
                    <View className="flex flex-row items-center mb-2">
                      <Text className="block text-lg mr-2">📈</Text>
                      <Text className="block text-base font-semibold text-slate-800">市场概述</Text>
                    </View>
                    <Text className="block text-sm text-slate-600 leading-relaxed">
                      {hotReviewData.summary}
                    </Text>
                    {hotReviewData.date && (
                      <Text className="block text-xs text-slate-400 mt-2">日期: {hotReviewData.date}</Text>
                    )}
                  </View>

                  {/* 热门股票热度榜 */}
                  <View className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
                    <View className="flex flex-row items-center mb-3">
                      <Text className="block text-lg mr-2">🏆</Text>
                      <Text className="block text-base font-semibold text-slate-800">热门股票热度榜</Text>
                    </View>
                    
                    {hotReviewData.hot_stocks && hotReviewData.hot_stocks.length > 0 ? (
                      hotReviewData.hot_stocks.map((stock, idx) => (
                        <View key={stock.code + idx} className="border-b border-slate-100 py-3 last:border-b-0">
                          <View className="flex flex-row justify-between items-start">
                            <View className="flex-1">
                              <View className="flex flex-row items-center">
                                {/* 热度排名 */}
                                <View 
                                  className="w-6 h-6 rounded-full items-center justify-center mr-2"
                                  style={{ backgroundColor: idx < 3 ? '#EF4444' : '#94A3B8' }}
                                >
                                  <Text className="block text-xs text-white font-bold">{idx + 1}</Text>
                                </View>
                                <Text className="block text-base font-semibold text-slate-800 mr-2">{stock.name}</Text>
                                <Text className="block text-xs text-slate-400">{stock.code}</Text>
                              </View>
                              {/* 热度来源 */}
                              <View className="flex flex-row flex-wrap mt-1">
                                {stock.heat_sources && stock.heat_sources.map((source, sIdx) => (
                                  <View key={sIdx} className="bg-orange-50 px-2 py-0.5 rounded mr-1 mb-1">
                                    <Text className="block text-xs text-orange-600">{source}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                            <View className="items-end">
                              <Text className={`block text-lg font-bold ${stock.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                              </Text>
                              <Text className="block text-xs text-slate-500">¥{stock.price.toFixed(2)}</Text>
                              {/* 热度分数 */}
                              <View className="flex flex-row items-center mt-1">
                                <Text className="block text-xs text-orange-500 mr-1">🔥</Text>
                                <Text className="block text-xs font-semibold text-orange-500">{stock.heat_score}分</Text>
                              </View>
                            </View>
                          </View>
                          
                          {/* 热门原因 */}
                          {stock.reasons && stock.reasons.length > 0 && (
                            <View className="mt-2 pt-2 border-t border-slate-50">
                              <Text className="block text-xs text-slate-500 mb-1">热门原因:</Text>
                              {stock.reasons.map((reason, rIdx) => (
                                <Text key={rIdx} className="block text-xs text-slate-600">• {reason}</Text>
                              ))}
                            </View>
                          )}
                          
                          {/* 相关概念 */}
                          {stock.related_concepts && stock.related_concepts.length > 0 && (
                            <View className="flex flex-row flex-wrap mt-2">
                              {stock.related_concepts.map((concept, cIdx) => (
                                <View key={cIdx} className="bg-blue-50 px-2 py-0.5 rounded mr-1 mb-1">
                                  <Text className="block text-xs text-blue-600">{concept}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          {/* 投资建议 */}
                          <View className="mt-2 bg-amber-50 rounded-lg p-2">
                            <View className="flex flex-row items-center justify-between mb-1">
                              <View className="flex flex-row items-center">
                                <Text className="block text-sm mr-1">💡</Text>
                                <Text className="block text-xs font-semibold text-amber-700">投资建议</Text>
                              </View>
                              {/* 风险等级 */}
                              <View 
                                className="px-2 py-0.5 rounded"
                                style={{ 
                                  backgroundColor: stock.risk_level === 'high' ? '#FEE2E2' : stock.risk_level === 'medium' ? '#FEF3C7' : '#D1FAE5'
                                }}
                              >
                                <Text 
                                  className="block text-xs font-medium"
                                  style={{ 
                                    color: stock.risk_level === 'high' ? '#DC2626' : stock.risk_level === 'medium' ? '#D97706' : '#059669'
                                  }}
                                >
                                  {stock.risk_level === 'high' ? '高风险' : stock.risk_level === 'medium' ? '中风险' : '低风险'}
                                </Text>
                              </View>
                            </View>
                            <Text className="block text-sm text-amber-800 leading-relaxed">{stock.suggestion}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="flex items-center justify-center py-8">
                        <Text className="block text-slate-400">暂无热门股票数据</Text>
                      </View>
                    )}
                  </View>

                  {/* 头条新闻 */}
                  {hotReviewData.top_news && hotReviewData.top_news.length > 0 && (
                    <View className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
                      <View className="flex flex-row items-center mb-3">
                        <Text className="block text-lg mr-2">📰</Text>
                        <Text className="block text-base font-semibold text-slate-800">财经头条</Text>
                      </View>
                      {hotReviewData.top_news.map((news, idx) => (
                        <View key={idx} className="py-2 border-b border-slate-100 last:border-b-0">
                          <Text className="block text-sm text-slate-800">{news.title}</Text>
                          <View className="flex flex-row justify-between mt-1">
                            <Text className="block text-xs text-slate-400">{news.source}</Text>
                            <Text className="block text-xs text-slate-400">{news.time}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* AI 分析 */}
                  {hotReviewData.analysis && (
                    <View className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 mb-4 border border-purple-100">
                      <View className="flex flex-row items-center mb-2">
                        <Text className="block text-lg mr-2">🤖</Text>
                        <Text className="block text-base font-semibold text-slate-800">AI 深度分析</Text>
                      </View>
                      <Text className="block text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {hotReviewData.analysis}
                      </Text>
                    </View>
                  )}

                  {/* 最终结论 */}
                  {hotReviewData.final_conclusion && (
                    <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
                      <View className="flex flex-row items-center mb-2">
                        <Text className="block text-lg mr-2">🎯</Text>
                        <Text className="block text-base font-semibold text-slate-800">最终结论</Text>
                      </View>
                      <Text className="block text-sm text-slate-700 leading-relaxed font-medium">
                        {hotReviewData.final_conclusion}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View className="flex items-center justify-center py-16">
                  <Text className="block text-slate-400">暂无热点复盘数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )
      default:
        return null
    }
  }

  if (!isLoggedIn) {
    return (
      <View className="flex items-center justify-center min-h-screen">
        <Text className="block text-slate-400">正在验证登录状态...</Text>
      </View>
    )
  }

  return (
    <View className="flex flex-col min-h-screen bg-slate-100">
      {/* 顶部欢迎区域 */}
      <View className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 pb-8">
        <View className="flex flex-row justify-between items-start">
          <View>
            <Text className="block text-2xl font-bold text-white mb-2">🐰 小兔快跑</Text>
            <Text className="block text-sm text-orange-100">AI驱动的金融数据分析工具</Text>
          </View>
          <View className="flex flex-row gap-2">
            {/* 管理员入口 - 只有管理员可见 */}
            {isAdmin && (
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 12px',
                  borderRadius: 20
                }}
                onClick={() => Taro.navigateTo({ url: '/pages/admin/index' })}
              >
                <Text className="block text-xs text-white font-medium">管理</Text>
              </View>
            )}
            {/* 退出登录 */}
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '4px 12px',
                borderRadius: 20
              }}
              onClick={() => {
                Taro.showModal({
                  title: '确认退出',
                  content: '确定要退出登录吗？',
                  success: (res) => {
                    if (res.confirm) {
                      Taro.removeStorageSync('isLoggedIn')
                      Taro.removeStorageSync('userInfo')
                      Taro.removeStorageSync('userRole')
                      Taro.redirectTo({ url: '/pages/login/index' })
                    }
                  }
                })
              }}
            >
              <Text className="block text-xs text-white font-medium">退出</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tab 栏目切换 */}
      <View className="bg-white border-b border-slate-200 px-2">
        <View className="flex flex-row">
          {tabs.map((tab) => (
            <View
              key={tab.key}
              className="flex-1 py-3 items-center"
              onClick={() => setActiveTab(tab.key as TabType)}
            >
              <Text className="block text-lg mb-1">{tab.icon}</Text>
              <Text className={`block text-sm ${activeTab === tab.key ? 'text-orange-500 font-semibold' : 'text-slate-600'}`}>
                {tab.name}
              </Text>
              {activeTab === tab.key && (
                <View className="w-8 h-1 bg-orange-500 rounded-full mt-2" />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 内容区域 */}
      <View className="flex-1">
        {loading ? (
          <View className="flex items-center justify-center py-16">
            <Text className="block text-slate-400">加载中...</Text>
          </View>
        ) : (
          renderContent()
        )}
      </View>

      {/* 风险提示 */}
      <View className="p-4 bg-amber-50 border-t border-amber-200">
        <Text className="block text-xs text-amber-700 text-center">
          ⚠️ 数据仅供参考，不作为投资依据{'\n'}
          股市有风险，投资需谨慎
        </Text>
      </View>
    </View>
  )
}

export default IndexPage
