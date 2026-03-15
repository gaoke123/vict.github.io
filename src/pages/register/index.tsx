import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import type { FC } from 'react'
import { Network } from '@/network'
import './index.css'

const RegisterPage: FC = () => {
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useDidShow(() => {
    // 检查是否已登录
    const loggedIn = Taro.getStorageSync('isLoggedIn')
    if (loggedIn) {
      Taro.redirectTo({ url: '/pages/index/index' })
    }
  })

  const handleRegister = async () => {
    if (!username.trim()) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!phone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (username.length < 3 || username.length > 20) {
      Taro.showToast({ title: '用户名长度应为3-20个字符', icon: 'none' })
      return
    }
    if (password.length < 6) {
      Taro.showToast({ title: '密码长度至少6个字符', icon: 'none' })
      return
    }
    if (password !== confirmPassword) {
      Taro.showToast({ title: '两次密码输入不一致', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/user/register',
        method: 'POST',
        data: { 
          username: username.trim(), 
          phone: phone.trim(),
          password: password.trim() 
        }
      })

      console.log('注册响应:', res.data)

      if (res.data.code === 200) {
        Taro.showToast({ title: '注册成功', icon: 'success' })
        
        // 跳转到登录页
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/login/index' })
        }, 1000)
      } else {
        Taro.showToast({ title: res.data.msg || '注册失败', icon: 'none' })
      }
    } catch (error) {
      console.error('注册错误:', error)
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const goTologin = () => {
    Taro.redirectTo({ url: '/pages/login/index' })
  }

  return (
    <View className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      {/* Logo 区域 */}
      <View className="flex flex-col items-center mt-12 mb-8">
        <View className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Text className="text-white text-3xl font-bold">🐰</Text>
        </View>
        <Text className="block text-2xl font-bold text-slate-800">注册账号</Text>
        <Text className="block text-sm text-slate-500 mt-2">加入小兔快跑，开启智能投资之旅</Text>
      </View>

      {/* 注册表单 */}
      <View className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        {/* 用户名输入 */}
        <View className="mb-4">
          <Text className="block text-sm text-slate-600 mb-2 font-medium">用户名 *</Text>
          <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <Input
              className="w-full bg-transparent text-base"
              placeholder="请输入用户名（3-20个字符）"
              maxlength={20}
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
            />
          </View>
        </View>

        {/* 手机号输入 */}
        <View className="mb-4">
          <Text className="block text-sm text-slate-600 mb-2 font-medium">手机号 *</Text>
          <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <Input
              className="w-full bg-transparent text-base"
              type="number"
              placeholder="请输入手机号"
              maxlength={11}
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
            />
          </View>
        </View>

        {/* 密码输入 */}
        <View className="mb-4">
          <Text className="block text-sm text-slate-600 mb-2 font-medium">密码 *</Text>
          <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <Input
              className="w-full bg-transparent text-base"
              password
              placeholder="请输入密码（至少6个字符）"
              maxlength={20}
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>
        </View>

        {/* 确认密码输入 */}
        <View className="mb-6">
          <Text className="block text-sm text-slate-600 mb-2 font-medium">确认密码 *</Text>
          <View className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <Input
              className="w-full bg-transparent text-base"
              password
              placeholder="请再次输入密码"
              maxlength={20}
              value={confirmPassword}
              onInput={(e) => setConfirmPassword(e.detail.value)}
            />
          </View>
        </View>

        {/* 注册按钮 */}
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
          onClick={handleRegister}
          loading={loading}
          disabled={loading}
        >
          {loading ? '注册中...' : '立即注册'}
        </Button>

        {/* 已有账号 */}
        <View className="mt-4 text-center">
          <Text className="block text-sm text-slate-500">
            已有账号？{' '}
            <Text className="text-orange-500 font-medium" onClick={goTologin}>
              立即登录
            </Text>
          </Text>
        </View>
      </View>

      {/* 说明 */}
      <View className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
        <Text className="block text-sm text-orange-800 font-medium mb-2">注册说明</Text>
        <Text className="block text-xs text-orange-600 mb-1">• 新用户注册即送30天使用时长</Text>
        <Text className="block text-xs text-orange-600 mb-1">• 用户名将用于登录，请牢记</Text>
        <Text className="block text-xs text-orange-600">• 如需帮助请联系管理员</Text>
      </View>
    </View>
  )
}

export default RegisterPage
