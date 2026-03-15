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
    // 检查是否已登录
    const loggedIn = Taro.getStorageSync('isLoggedIn')
    if (loggedIn) {
      // 使用 reLaunch 替代 switchTab，避免 H5 端单 Tab 问题
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

      console.log('登录响应:', res.data)

      if (res.data.code === 200) {
        // 保存用户信息
        Taro.setStorageSync('userInfo', res.data.data)
        Taro.setStorageSync('isLoggedIn', true)
        Taro.setStorageSync('userRole', res.data.data.role)
        
        Taro.showToast({ title: '登录成功', icon: 'success' })
        
        // 跳转到主页 - 使用 reLaunch 替代 switchTab，避免 H5 端单 Tab 问题
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/index/index' })
        }, 1000)
      } else {
        Taro.showToast({ title: res.data.msg || '登录失败', icon: 'none' })
      }
    } catch (error) {
      console.error('登录错误:', error)
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = () => {
    Taro.redirectTo({ url: '/pages/register/index' })
  }

  return (
    <View className="flex flex-col min-h-screen bg-gradient-to-b from-orange-50 to-white p-6">
      {/* Logo 区域 */}
      <View className="flex flex-col items-center mt-16 mb-12">
        <View className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Text className="text-white text-3xl font-bold">🐰</Text>
        </View>
        <Text className="block text-3xl font-bold text-slate-800">小兔快跑</Text>
        <Text className="block text-sm text-slate-500 mt-2">AI驱动的金融数据分析工具</Text>
      </View>

      {/* 登录表单 */}
      <View className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        <Text className="block text-xl font-semibold text-slate-800 mb-6 text-center">欢迎回来</Text>
        
        {/* 用户名输入 */}
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

        {/* 密码输入 */}
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

        {/* 登录按钮 */}
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

        {/* 注册链接 */}
        <View className="flex flex-row justify-center mt-4">
          <Text className="block text-sm text-slate-500">还没有账号？</Text>
          <Text
            className="block text-sm text-orange-500 ml-1 font-medium"
            onClick={handleRegister}
          >
            立即注册
          </Text>
        </View>
      </View>

      {/* 底部提示 */}
      <View className="mt-auto pt-8">
        <Text className="block text-xs text-slate-400 text-center">
          登录即表示同意《用户协议》和《隐私政策》
        </Text>
      </View>
    </View>
  )
}

export default LoginPage
