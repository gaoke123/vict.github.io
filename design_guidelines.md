# 小兔快跑 - 金融数据分析工具设计指南

## 1. 品牌定位

**应用定位**：AI驱动的金融数据分析工具，为投资者提供实时、专业的A股市场数据追踪服务  
**设计风格**：热情、专业、可信赖  
**目标用户**：个人投资者、股票交易爱好者  

## 2. 配色方案

### 主色板
- **主色（Primary）**：活力橙 `#FF6B35` - Tailwind: `bg-orange-500`, `text-orange-500`
  - 用于：主要按钮、强调元素、涨势标识
- **辅色（Secondary）**：信任蓝 `#1E88E5` - Tailwind: `bg-blue-600`, `text-blue-600`
  - 用于：次级按钮、链接、数据图表
- **成功色（Success）**：上涨绿 `#10B981` - Tailwind: `bg-green-500`, `text-green-500`
  - 用于：涨势数据、成功提示
- **危险色（Danger）**：下跌红 `#EF4444` - Tailwind: `bg-red-500`, `text-red-500`
  - 用于：跌势数据、错误提示

### 中性色
- **深色背景**：`#0F172A` - Tailwind: `bg-slate-900`
- **浅色背景**：`#F8FAFC` - Tailwind: `bg-slate-50`
- **卡片背景**：`#FFFFFF` - Tailwind: `bg-white`
- **主文本**：`#1E293B` - Tailwind: `text-slate-800`
- **次文本**：`#64748B` - Tailwind: `text-slate-500`
- **边框**：`#E2E8F0` - Tailwind: `border-slate-200`

### 语义色（金融专用）
- **涨停**：`#EF4444` - Tailwind: `text-red-500`, `bg-red-50`
- **跌停**：`#10B981` - Tailwind: `text-green-500`, `bg-green-50`（A股跌停为绿色）
- **平盘**：`#64748B` - Tailwind: `text-slate-500`

## 3. 字体规范

### 标题层级
- **H1（页面标题）**：`text-2xl font-bold` - 如"小兔快跑"
- **H2（栏目标题）**：`text-xl font-semibold` - 如"实时跟踪"
- **H3（卡片标题）**：`text-lg font-medium` - 如"行业板块"
- **Body（正文）**：`text-base` - 常规文本
- **Caption（说明文字）**：`text-sm text-slate-500` - 辅助说明

### 数据展示
- **大数字**：`text-3xl font-bold font-mono` - 股票价格、涨跌幅
- **小数字**：`text-base font-mono` - 辅助数据

## 4. 间距系统

- **页面边距**：`p-4` (16px)
- **卡片内边距**：`p-4` (16px)
- **组件间距**：`gap-3` (12px)
- **列表项间距**：`gap-2` (8px)

## 5. 组件规范

### 按钮样式

**主按钮（Primary）**
```tsx
<Button className="w-full bg-orange-500 text-white rounded-lg py-3 text-base font-medium">
  登录
</Button>
```

**次按钮（Secondary）**
```tsx
<Button className="w-full bg-blue-600 text-white rounded-lg py-3 text-base font-medium">
  注册
</Button>
```

**禁用态**
```tsx
<Button className="w-full bg-slate-300 text-slate-500 rounded-lg py-3 text-base" disabled>
  提交
</Button>
```

### 卡片样式

**数据卡片**
```tsx
<View className="bg-white rounded-xl p-4 border border-slate-200">
  <Text className="block text-base font-semibold mb-2">行业板块</Text>
  {/* 内容 */}
</View>
```

**股票列表项**
```tsx
<View className="flex flex-row items-center justify-between bg-white rounded-lg p-3 mb-2 border border-slate-200">
  <View>
    <Text className="block text-base font-medium">贵州茅台</Text>
    <Text className="block text-sm text-slate-500">600519</Text>
  </View>
  <View className="text-right">
    <Text className="block text-lg font-bold text-red-500">+9.98%</Text>
    <Text className="block text-sm text-slate-500">1856.50</Text>
  </View>
</View>
```

### 输入框样式

**Text 换行强制规范**：所有垂直排列的 Text 必须添加 `block` 类

```tsx
<View className="mb-4">
  <Text className="block text-sm text-slate-600 mb-2">手机号</Text>
  <View className="bg-slate-50 rounded-lg px-4 py-3">
    <Input 
      className="w-full bg-transparent text-base" 
      type="number"
      placeholder="请输入手机号"
      maxlength={11}
    />
  </View>
</View>
```

## 6. 导航结构

### TabBar 配置
```typescript
tabBar: {
  color: '#64748B',
  selectedColor: '#FF6B35',
  backgroundColor: '#FFFFFF',
  list: [
    {
      pagePath: 'pages/index/index',
      text: '首页',
      iconPath: './assets/tabbar/home.png',
      selectedIconPath: './assets/tabbar/home-active.png'
    },
    {
      pagePath: 'pages/admin/index',
      text: '管理',
      iconPath: './assets/tabbar/admin.png',
      selectedIconPath: './assets/tabbar/admin-active.png'
    }
  ]
}
```

### 页面路由
- `/pages/login/index` - 登录页
- `/pages/register/index` - 注册页
- `/pages/index/index` - 主页（小兔快跑）
- `/pages/admin/index` - 后台管理页

## 7. 栏目设计

### 实时跟踪
- 展示同花顺一级行业板块数据
- 采用分组列表形式（行业名称 + 细分板块）
- 实时刷新按钮（每30秒自动刷新）

### 心跳时刻
- A股涨停个股列表
- 卡片式布局（股票名称、代码、涨停价、涨停时间）
- 红色涨停标签

### 聚焦核心
- 后台上传的核心数据展示
- 列表形式（标题 + 内容）
- 支持点击查看详情

### 历史数据
- 后台上传的历史数据展示
- 时间轴样式
- 支持筛选和搜索

## 8. 风险提示

在主页底部必须显示：
```tsx
<View className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
  <Text className="block text-sm text-amber-700 text-center">
    ⚠️ 数据仅供参考，不作为投资依据{'\n'}
    股市有风险，投资需谨慎
  </Text>
</View>
```

## 9. 小程序约束

- **包体积限制**：单个分包不超过 2MB
- **图片策略**：使用 CDN 或对象存储，避免本地图片
- **性能优化**：
  - 列表使用虚拟滚动（超过50项）
  - 避免频繁 setData
  - 使用防抖/节流处理搜索输入

## 10. 跨端兼容性规范

### Text 换行强制规则
**所有垂直排列的 Text 必须添加 `block` 类**，否则 H5 端会出现白屏问题。

```tsx
// ✅ 正确：Text 添加 block 类
<Text className="block text-lg font-bold">标题</Text>
<Text className="block text-sm text-slate-500">说明</Text>

// ❌ 错误：H5 端会白屏
<Text className="text-lg font-bold">标题</Text>
<Text className="text-sm text-slate-500">说明</Text>
```

### Input/Textarea 样式规则
**必须用 View 包裹，样式放 View 上**（H5 端 Input 是 inline 元素）。

```tsx
// ✅ 正确：View 包裹
<View className="bg-slate-50 rounded-lg px-4 py-3">
  <Input className="w-full bg-transparent" placeholder="请输入" />
</View>

// ❌ 错误：H5 端样式不生效
<Input className="bg-slate-50 rounded-lg px-4 py-3 w-full" />
```

### 平台检测
**直接判断，禁止 useState + useEffect**（会导致状态延迟）。

```tsx
// ✅ 正确：直接判断
const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

// ❌ 错误：状态延迟
const [isWeapp, setIsWeapp] = useState(false)
useEffect(() => { setIsWeapp(Taro.getEnv() === Taro.ENV_TYPE.WEAPP) }, [])
```
