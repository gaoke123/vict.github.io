import { View, Text, Button, ScrollView, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import type { FC } from 'react'
import { Network } from '@/network'
import './index.css'

interface User {
  id: number
  username: string
  phone?: string
  role: string
  expireAt: string
  createdAt: string
  daysLeft: number
}

interface UploadItem {
  id: number
  category: string
  title: string
  created_at: string
}

const AdminPage: FC = () => {
  const [activeSection, setActiveSection] = useState<'users' | 'upload'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // 新增用户表单
  const [newUsername, setNewUsername] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDays, setNewDays] = useState('30')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  
  // 延长时长
  const [extendDays, setExtendDays] = useState<{[key: number]: string}>({})
  
  // 编辑用户弹窗
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editPhone, setEditPhone] = useState('')

  useDidShow(() => {
    // 检查登录状态和管理员权限
    const userInfo = Taro.getStorageSync('userInfo')
    const userRole = Taro.getStorageSync('userRole')
    
    if (!userInfo) {
      Taro.redirectTo({ url: '/pages/login/index' })
      return
    }
    
    setIsLoggedIn(true)
    const admin = userRole === 'admin' || userInfo.role === 'admin'
    setIsAdmin(admin)
    
    if (admin) {
      loadData()
    }
  })

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUsers(),
        loadUploads()
      ])
    } catch (error) {
      console.error('加载数据错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await Network.request({
        url: '/api/user/list',
        method: 'GET'
      })
      console.log('用户列表:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setUsers(res.data.data)
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }

  const loadUploads = async () => {
    try {
      const res = await Network.request({
        url: '/api/data/uploaded',
        method: 'GET'
      })
      console.log('上传数据:', res.data)
      if (res.data.code === 200 && res.data.data) {
        setUploads(res.data.data)
      }
    } catch (error) {
      console.error('加载上传数据失败:', error)
    }
  }

  const handleAddUser = async () => {
    if (!newUsername.trim()) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!newPhone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(newPhone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!newPassword.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (newRole !== 'admin' && (!newDays || parseInt(newDays) <= 0)) {
      Taro.showToast({ title: '请输入有效的天数', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/user/add',
        method: 'POST',
        data: {
          username: newUsername.trim(),
          phone: newPhone.trim(),
          password: newPassword.trim(),
          days: parseInt(newDays),
          role: newRole
        }
      })

      if (res.data.code === 200) {
        Taro.showToast({ title: '添加成功', icon: 'success' })
        setNewUsername('')
        setNewPhone('')
        setNewPassword('')
        setNewDays('30')
        setNewRole('user')
        loadUsers()
      } else {
        Taro.showToast({ title: res.data.msg || '添加失败', icon: 'none' })
      }
    } catch (error) {
      console.error('添加用户错误:', error)
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number, username: string) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除用户 "${username}" 吗？`,
      success: async (res) => {
        if (res.confirm) {
          setLoading(true)
          try {
            const result = await Network.request({
              url: `/api/user/${userId}`,
              method: 'DELETE'
            })

            if (result.data.code === 200) {
              Taro.showToast({ title: '删除成功', icon: 'success' })
              loadUsers()
            } else {
              Taro.showToast({ title: result.data.msg || '删除失败', icon: 'none' })
            }
          } catch (error) {
            console.error('删除用户错误:', error)
            Taro.showToast({ title: '网络错误', icon: 'none' })
          } finally {
            setLoading(false)
          }
        }
      }
    })
  }

  const handleExtendUser = async (userId: number) => {
    const days = extendDays[userId] || '30'
    if (!days || parseInt(days) <= 0) {
      Taro.showToast({ title: '请输入有效的天数', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/user/extend',
        method: 'POST',
        data: {
          userId: userId,
          days: parseInt(days)
        }
      })

      if (res.data.code === 200) {
        Taro.showToast({ title: '延长成功', icon: 'success' })
        setExtendDays({ ...extendDays, [userId]: '' })
        loadUsers()
      } else {
        Taro.showToast({ title: res.data.msg || '延长失败', icon: 'none' })
      }
    } catch (error) {
      console.error('延长用户时长错误:', error)
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 打开编辑弹窗
  const openEditModal = (user: User) => {
    setEditingUser(user)
    setEditUsername(user.username)
    setEditPassword('')
    setEditPhone(user.phone || '')
  }

  // 关闭编辑弹窗
  const closeEditModal = () => {
    setEditingUser(null)
    setEditUsername('')
    setEditPassword('')
    setEditPhone('')
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingUser) return
    
    if (!editUsername.trim()) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/user/update',
        method: 'POST',
        data: {
          userId: editingUser.id,
          username: editUsername.trim(),
          password: editPassword.trim() || undefined,
          phone: editPhone.trim() || undefined
        }
      })

      if (res.data.code === 200) {
        Taro.showToast({ title: '更新成功', icon: 'success' })
        closeEditModal()
        loadUsers()
      } else {
        Taro.showToast({ title: res.data.msg || '更新失败', icon: 'none' })
      }
    } catch (error) {
      console.error('更新用户错误:', error)
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
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
  }

  // 非管理员显示
  if (isLoggedIn && !isAdmin) {
    return (
      <View className="flex flex-col min-h-screen bg-slate-100">
        <View className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 pb-8">
          <Text className="block text-2xl font-bold text-white mb-2">🐰 小兔快跑</Text>
          <Text className="block text-sm text-orange-100">后台管理</Text>
        </View>
        
        <View className="flex-1 flex items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <Text className="block text-6xl mb-4">🔒</Text>
            <Text className="block text-lg font-semibold text-slate-800 mb-2">权限不足</Text>
            <Text className="block text-sm text-slate-500 mb-6">您没有访问后台管理的权限</Text>
            <Button
              style={{
                backgroundColor: '#FF6B35',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '12px 32px',
                border: 'none'
              }}
              onClick={() => Taro.redirectTo({ url: '/pages/index/index' })}
            >
              返回首页
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex flex-col min-h-screen bg-slate-100">
      {/* 顶部区域 - 与主页风格一致 */}
      <View className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 pb-8">
        <View className="flex flex-row justify-between items-center">
          <View>
            <Text className="block text-2xl font-bold text-white mb-2">🐰 后台管理</Text>
            <Text className="block text-sm text-orange-100">客户管理与数据上传</Text>
          </View>
          <Button
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              border: 'none'
            }}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </View>
      </View>

      {/* Tab 栏目切换 */}
      <View className="bg-white border-b border-slate-200 px-2">
        <View className="flex flex-row">
          <View
            className="flex-1 py-3 items-center"
            onClick={() => setActiveSection('users')}
          >
            <Text className="block text-lg mb-1">👥</Text>
            <Text className={`block text-sm ${activeSection === 'users' ? 'text-orange-500 font-semibold' : 'text-slate-600'}`}>
              客户管理
            </Text>
            {activeSection === 'users' && (
              <View className="w-8 h-1 bg-orange-500 rounded-full mt-2" />
            )}
          </View>
          <View
            className="flex-1 py-3 items-center"
            onClick={() => setActiveSection('upload')}
          >
            <Text className="block text-lg mb-1">📤</Text>
            <Text className={`block text-sm ${activeSection === 'upload' ? 'text-orange-500 font-semibold' : 'text-slate-600'}`}>
              数据上传
            </Text>
            {activeSection === 'upload' && (
              <View className="w-8 h-1 bg-orange-500 rounded-full mt-2" />
            )}
          </View>
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView scrollY className="flex-1">
        {loading ? (
          <View className="flex items-center justify-center py-16">
            <Text className="block text-slate-400">加载中...</Text>
          </View>
        ) : (
          <View className="p-4">
            {activeSection === 'users' && (
              <View>
                {/* 添加用户卡片 */}
                <View className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
                  <Text className="block text-base font-semibold text-orange-600 mb-4">➕ 添加新用户</Text>
                  
                  <View className="mb-3">
                    <Text className="block text-xs text-slate-500 mb-1">用户名 *</Text>
                    <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                      <Input
                        className="w-full bg-transparent text-sm"
                        placeholder="请输入用户名"
                        maxlength={20}
                        value={newUsername}
                        onInput={(e) => setNewUsername(e.detail.value)}
                      />
                    </View>
                  </View>
                  
                  <View className="mb-3">
                    <Text className="block text-xs text-slate-500 mb-1">手机号 *</Text>
                    <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                      <Input
                        className="w-full bg-transparent text-sm"
                        type="number"
                        placeholder="请输入手机号"
                        maxlength={11}
                        value={newPhone}
                        onInput={(e) => setNewPhone(e.detail.value)}
                      />
                    </View>
                  </View>
                  
                  <View className="mb-3">
                    <Text className="block text-xs text-slate-500 mb-1">密码 *</Text>
                    <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                      <Input
                        className="w-full bg-transparent text-sm"
                        password
                        placeholder="请输入密码"
                        maxlength={20}
                        value={newPassword}
                        onInput={(e) => setNewPassword(e.detail.value)}
                      />
                    </View>
                  </View>
                  
                  <View className="mb-3">
                    <Text className="block text-xs text-slate-500 mb-1">角色 *</Text>
                    <View className="flex flex-row gap-2">
                      <View 
                        className={`flex-1 rounded-lg px-3 py-2 border ${newRole === 'user' ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'}`}
                        onClick={() => setNewRole('user')}
                      >
                        <Text className={`block text-sm text-center ${newRole === 'user' ? 'text-orange-600 font-medium' : 'text-slate-600'}`}>
                          普通用户
                        </Text>
                      </View>
                      <View 
                        className={`flex-1 rounded-lg px-3 py-2 border ${newRole === 'admin' ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200'}`}
                        onClick={() => setNewRole('admin')}
                      >
                        <Text className={`block text-sm text-center ${newRole === 'admin' ? 'text-purple-600 font-medium' : 'text-slate-600'}`}>
                          管理员
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {newRole === 'user' && (
                    <View className="mb-4">
                      <Text className="block text-xs text-slate-500 mb-1">使用天数</Text>
                      <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        <Input
                          className="w-full bg-transparent text-sm"
                          type="number"
                          placeholder="默认30天"
                          value={newDays}
                          onInput={(e) => setNewDays(e.detail.value)}
                        />
                      </View>
                    </View>
                  )}
                  
                  <Button
                    style={{
                      width: '100%',
                      backgroundColor: '#10B981',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '12px 0',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: 'none'
                    }}
                    onClick={handleAddUser}
                  >
                    添加用户
                  </Button>
                </View>

                {/* 用户列表 */}
                <Text className="block text-base font-semibold text-orange-600 mb-3">📋 用户列表 ({users.length})</Text>
                
                {users.map((user) => (
                  <View key={user.id} className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
                    <View className="flex flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <View className="flex flex-row items-center">
                          <Text className="block text-base font-semibold text-slate-800 mr-2">{user.username}</Text>
                          {user.role === 'admin' ? (
                            <View className="bg-purple-100 px-2 py-0.5 rounded">
                              <Text className="block text-xs text-purple-600">管理员</Text>
                            </View>
                          ) : (
                            <View className="bg-blue-100 px-2 py-0.5 rounded">
                              <Text className="block text-xs text-blue-600">用户</Text>
                            </View>
                          )}
                        </View>
                        {user.phone && (
                          <Text className="block text-xs text-slate-500 mt-1">
                            手机: {user.phone}
                          </Text>
                        )}
                        <Text className="block text-xs text-slate-400 mt-1">
                          创建时间: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </Text>
                      </View>
                      {user.role !== 'admin' && (
                        <View className="text-right">
                          <Text className={`block text-lg font-bold ${user.daysLeft > 7 ? 'text-green-500' : user.daysLeft > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                            {user.daysLeft}天
                          </Text>
                          <Text className="block text-xs text-slate-400">剩余时长</Text>
                        </View>
                      )}
                    </View>
                    
                    <View className="flex flex-row gap-2 pt-3 border-t border-slate-100">
                      {/* 编辑按钮 */}
                      <Button
                        size="mini"
                        style={{
                          backgroundColor: '#F59E0B',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          border: 'none'
                        }}
                        onClick={() => openEditModal(user)}
                      >
                        编辑
                      </Button>
                      
                      {user.role !== 'admin' && (
                        <>
                          <View className="flex-1 flex flex-row gap-2">
                            <View className="flex-1 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200">
                              <Input
                                className="w-full bg-transparent text-xs"
                                type="number"
                                placeholder="天数"
                                value={extendDays[user.id] || ''}
                                onInput={(e) => setExtendDays({ ...extendDays, [user.id]: e.detail.value })}
                              />
                            </View>
                            <Button
                              size="mini"
                              style={{
                                backgroundColor: '#3B82F6',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '4px 12px',
                                border: 'none'
                              }}
                              onClick={() => handleExtendUser(user.id)}
                            >
                              延长
                            </Button>
                          </View>
                          <Button
                            size="mini"
                            style={{
                              backgroundColor: '#EF4444',
                              color: '#ffffff',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              border: 'none'
                            }}
                            onClick={() => handleDeleteUser(user.id, user.username)}
                          >
                            删除
                          </Button>
                        </>
                      )}
                    </View>
                  </View>
                ))}
                
                {users.length === 0 && (
                  <View className="bg-white rounded-xl p-8 text-center">
                    <Text className="block text-slate-400">暂无用户数据</Text>
                  </View>
                )}
              </View>
            )}

            {activeSection === 'upload' && (
              <View>
                <Text className="block text-base font-semibold text-orange-600 mb-3">📤 数据上传管理</Text>
                
                {uploads.map((item) => (
                  <View key={item.id} className="bg-white rounded-xl p-4 mb-3 border border-slate-200">
                    <View className="flex flex-row justify-between items-start">
                      <View className="flex-1">
                        <View className="flex flex-row items-center mb-1">
                          <View className={`px-2 py-0.5 rounded mr-2 ${item.category === 'focus' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            <Text className={`block text-xs ${item.category === 'focus' ? 'text-blue-600' : 'text-green-600'}`}>
                              {item.category === 'focus' ? '聚焦核心' : '历史数据'}
                            </Text>
                          </View>
                        </View>
                        <Text className="block text-base font-medium text-slate-800">{item.title}</Text>
                        <Text className="block text-xs text-slate-400 mt-1">
                          {new Date(item.created_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                
                {uploads.length === 0 && (
                  <View className="bg-white rounded-xl p-8 text-center">
                    <Text className="block text-slate-400">暂无上传数据</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 编辑用户弹窗 */}
      {editingUser && (
        <View 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              width: '85%',
              maxWidth: '400px'
            }}
          >
            <Text className="block text-lg font-semibold text-slate-800 mb-4 text-center">
              编辑用户信息
            </Text>
            
            <View className="mb-3">
              <Text className="block text-xs text-slate-500 mb-1">用户名</Text>
              <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <Input
                  className="w-full bg-transparent text-sm"
                  placeholder="请输入用户名"
                  maxlength={20}
                  value={editUsername}
                  onInput={(e) => setEditUsername(e.detail.value)}
                />
              </View>
            </View>
            
            <View className="mb-3">
              <Text className="block text-xs text-slate-500 mb-1">手机号</Text>
              <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <Input
                  className="w-full bg-transparent text-sm"
                  type="number"
                  placeholder="请输入手机号"
                  maxlength={11}
                  value={editPhone}
                  onInput={(e) => setEditPhone(e.detail.value)}
                />
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="block text-xs text-slate-500 mb-1">新密码（留空则不修改）</Text>
              <View className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <Input
                  className="w-full bg-transparent text-sm"
                  password
                  placeholder="请输入新密码"
                  maxlength={20}
                  value={editPassword}
                  onInput={(e) => setEditPassword(e.detail.value)}
                />
              </View>
            </View>
            
            <View className="flex flex-row gap-3">
              <Button
                style={{
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  borderRadius: '8px',
                  padding: '12px 0',
                  fontSize: '14px',
                  border: 'none'
                }}
                onClick={closeEditModal}
              >
                取消
              </Button>
              <Button
                style={{
                  flex: 1,
                  backgroundColor: '#FF6B35',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 0',
                  fontSize: '14px',
                  border: 'none'
                }}
                onClick={handleSaveEdit}
              >
                保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default AdminPage
