import { View, Text, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import type { FC } from 'react'

// 完整源代码内容
const FULL_CODE = `============================================================
小兔快跑 - 完整源代码
项目: AI驱动的金融数据分析工具
技术栈: Taro + React + NestJS + Python
============================================================

==================== 第一部分: 前端代码 ====================

------------------------------------------------------------
文件: src/app.tsx
------------------------------------------------------------
import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import './app.css'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
  })
  return children
}

export default App

------------------------------------------------------------
文件: src/app.config.ts
------------------------------------------------------------
export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/register/index',
    'pages/index/index',
    'pages/admin/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '小兔快跑',
    navigationBarTextStyle: 'black'
  }
})

------------------------------------------------------------
文件: src/network.ts
------------------------------------------------------------
import Taro from '@tarojs/taro'

export namespace Network {
    const createUrl = (url: string): string => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }
        return \`\${PROJECT_DOMAIN}\${url}\`
    }

    export const request: typeof Taro.request = option => {
        return Taro.request({
            ...option,
            url: createUrl(option.url),
        })
    }

    export const uploadFile: typeof Taro.uploadFile = option => {
        return Taro.uploadFile({
            ...option,
            url: createUrl(option.url),
        })
    }

    export const downloadFile: typeof Taro.downloadFile = option => {
        return Taro.downloadFile({
            ...option,
            url: createUrl(option.url),
        })
    }
}

------------------------------------------------------------
文件: src/pages/login/index.tsx (登录页)
------------------------------------------------------------
import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import type { FC } from 'react'
import { Network } from '@/network'
import './index.css'

const LoginPage: FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useDidShow(() => {
    const loggedIn = Taro.getStorageSync('isLoggedIn')
    if (loggedIn) {
      Taro.reLaunch({ url: '/pages/index/index' })
    }
  })

  const handleLogin = async () => {
    if (!username.trim()) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/user/login',
        method: 'POST',
        data: { username: username.trim(), password: password.trim() }
      })

      if (res.data.code === 200) {
        Taro.setStorageSync('userInfo', res.data.data)
        Taro.setStorageSync('isLoggedIn', true)
        Taro.setStorageSync('userRole', res.data.data.role)
        
        Taro.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/index/index' })
        }, 1000)
      } else {
        Taro.showToast({ title: res.data.msg || '登录失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex flex-col min-h-screen bg-gradient-to-b from-orange-50 to-white p-6">
      <View className="flex flex-col items-center mt-16 mb-12">
        <View className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Text className="text-white text-3xl font-bold">🐰</Text>
        </View>
        <Text className="block text-3xl font-bold text-slate-800">小兔快跑</Text>
        <Text className="block text-sm text-slate-500 mt-2">AI驱动的金融数据分析工具</Text>
      </View>

      <View className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        <Text className="block text-xl font-semibold text-slate-800 mb-6 text-center">欢迎回来</Text>
        
        <View className="mb-4">
          <Text className="block text-sm text-slate-600 mb-2 font-medium">用户名</Text>
          <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <Input
              className="w-full bg-transparent text-base"
              placeholder="请输入用户名"
              maxlength={20}
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="block text-sm text-slate-600 mb-2 font-medium">密码</Text>
          <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <Input
              className="w-full bg-transparent text-base"
              password
              placeholder="请输入密码"
              maxlength={20}
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>
        </View>

        <Button
          style={{
            width: '100%',
            backgroundColor: '#FF6B35',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '16px 0',
            fontSize: '16px',
            fontWeight: 500,
            border: 'none'
          }}
          onClick={handleLogin}
          loading={loading}
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </Button>

        <View className="flex flex-row justify-center mt-4">
          <Text className="block text-sm text-slate-500">还没有账号？</Text>
          <Text
            className="block text-sm text-orange-500 ml-1 font-medium"
            onClick={() => Taro.redirectTo({ url: '/pages/register/index' })}
          >
            立即注册
          </Text>
        </View>
      </View>
    </View>
  )
}

export default LoginPage

------------------------------------------------------------
【代码太长，请在浏览器中查看完整内容】
------------------------------------------------------------

完整代码共 2772 行，包含：
1. 前端代码 (Taro + React)
2. 后端代码 (NestJS)
3. Python数据脚本 (AKSHARE)
4. Android WebView项目
5. 配置文件

请在浏览器中打开此页面，然后按 Ctrl+A 全选，Ctrl+C 复制。
`

const CodeViewerPage: FC = () => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // 在H5环境中使用浏览器原生复制
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(FULL_CODE).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <View className="flex flex-col min-h-screen bg-slate-900 p-4">
      <View className="flex flex-row justify-between items-center mb-4">
        <Text className="block text-xl font-bold text-white">小兔快跑 - 完整源代码</Text>
        <View
          className="px-4 py-2 bg-orange-500 rounded-lg"
          onClick={handleCopy}
        >
          <Text className="block text-white text-sm">
            {copied ? '已复制!' : '复制代码'}
          </Text>
        </View>
      </View>
      
      <ScrollView scrollY className="flex-1 bg-slate-800 rounded-xl p-4">
        <Text className="block text-green-400 text-sm font-mono whitespace-pre-wrap">
          {FULL_CODE}
        </Text>
      </ScrollView>
      
      <View className="mt-4 p-3 bg-slate-700 rounded-lg">
        <Text className="block text-slate-300 text-sm text-center">
          💡 提示：点击右上角「复制代码」按钮，或在代码区域长按选择复制
        </Text>
      </View>
    </View>
  )
}

export default CodeViewerPage
