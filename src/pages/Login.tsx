import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, Lock, Eye, EyeOff, User, X } from 'lucide-react'

export default function Login() {
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(false)
  const [savedUsers, setSavedUsers] = useState<Array<{phone: string, name?: string}>>([])

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  // 简单的加密/解密函数
  const encryptPassword = (password: string): string => {
    return btoa(password) // 简单的base64编码
  }

  const decryptPassword = (encryptedPassword: string): string => {
    try {
      return atob(encryptedPassword) // base64解码
    } catch {
      return ''
    }
  }

  // 加载保存的用户信息
  useEffect(() => {
    const savedUsersData = localStorage.getItem('savedUsers')
    const savedCredentials = localStorage.getItem('savedCredentials')
    
    if (savedUsersData) {
      const users = JSON.parse(savedUsersData)
      setSavedUsers(users)
      // 自动填充最后一次登录的用户
      if (users.length > 0) {
        setFormData(prev => ({ ...prev, phone: users[0].phone }))
        setRememberMe(true)
      }
    }
    
    // 如果有保存的密码凭据，自动填充
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials)
        if (credentials.phone && credentials.password) {
          setFormData({
            phone: credentials.phone,
            password: decryptPassword(credentials.password)
          })
          setRememberPassword(true)
          setRememberMe(true)
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.phone || !formData.password) {
      setError('请填写所有必填字段')
      setLoading(false)
      return
    }

    const result = await login(formData.phone, formData.password)
    
    if (result.success) {
      // 如果选择记住我，保存用户信息
      if (rememberMe) {
        const existingUsers = JSON.parse(localStorage.getItem('savedUsers') || '[]')
        const userExists = existingUsers.find((user: any) => user.phone === formData.phone)
        
        if (!userExists) {
          const newUsers = [{ phone: formData.phone }, ...existingUsers.slice(0, 4)] // 最多保存5个用户
          localStorage.setItem('savedUsers', JSON.stringify(newUsers))
        } else {
          // 将当前用户移到最前面
          const filteredUsers = existingUsers.filter((user: any) => user.phone !== formData.phone)
          const newUsers = [{ phone: formData.phone }, ...filteredUsers]
          localStorage.setItem('savedUsers', JSON.stringify(newUsers))
        }
      }
      
      // 如果选择记住密码，保存加密的凭据
      if (rememberPassword) {
        const credentials = {
          phone: formData.phone,
          password: encryptPassword(formData.password)
        }
        localStorage.setItem('savedCredentials', JSON.stringify(credentials))
      } else {
        // 如果不记住密码，清除保存的凭据
        localStorage.removeItem('savedCredentials')
      }
      
      navigate(from, { replace: true })
    } else {
      setError(result.error || '登录失败')
    }
    
    setLoading(false)
  }

  const handleQuickLogin = (phone: string) => {
    setFormData(prev => ({ ...prev, phone }))
    // 检查是否有保存的密码
    const savedCredentials = localStorage.getItem('savedCredentials')
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials)
        if (credentials.phone === phone && credentials.password) {
          setFormData({
            phone: phone,
            password: decryptPassword(credentials.password)
          })
          setRememberPassword(true)
        }
      } catch (error) {
        console.error('Failed to load saved password:', error)
      }
    }
  }

  const handleClearSavedData = () => {
    localStorage.removeItem('savedUsers')
    localStorage.removeItem('savedCredentials')
    setSavedUsers([])
    setFormData({ phone: '', password: '' })
    setRememberMe(false)
    setRememberPassword(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-16 h-16 mr-4" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="40" cy="40" rx="38" ry="30" fill="black" stroke="#22c55e" strokeWidth="3"/>
              <text x="40" y="50" textAnchor="middle" fill="#22c55e" fontSize="28" fontWeight="bold" fontFamily="Arial, sans-serif">JT</text>
            </svg>
            <h1 className="text-4xl font-bold text-green-400 font-mono">
              工时管理系统
            </h1>
          </div>
          <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-8 shadow-lg shadow-green-400/20">
          <h2 className="text-2xl font-bold text-green-400 mb-6 text-center font-mono">
            用户登录
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-400 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-2">
                手机号码
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-5 h-5" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-black border border-green-400 rounded-lg text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono"
                  placeholder="请输入手机号码"
                  maxLength={11}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-green-300 text-sm font-mono mb-2">
                登录密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 bg-black border border-green-400 rounded-lg text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Options */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-black border-green-400 rounded focus:ring-green-500 focus:ring-2"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-green-300 font-mono">
                  记住账号
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberPassword"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="w-4 h-4 text-green-600 bg-black border-green-400 rounded focus:ring-green-500 focus:ring-2"
                />
                <label htmlFor="rememberPassword" className="ml-2 text-sm text-green-300 font-mono">
                  记住密码
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-black font-bold rounded-lg transition-colors duration-200 font-mono text-lg"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* Quick Login Users */}
          {savedUsers.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-green-300 text-sm font-mono">快速登录</h3>
                <button
                  type="button"
                  onClick={handleClearSavedData}
                  className="text-red-400 hover:text-red-300 text-xs font-mono flex items-center"
                  title="清除所有保存的登录信息"
                >
                  <X className="w-3 h-3 mr-1" />
                  清除
                </button>
              </div>
              <div className="space-y-2">
                {savedUsers.slice(0, 3).map((user, index) => (
                  <button
                    key={user.phone}
                    type="button"
                    onClick={() => handleQuickLogin(user.phone)}
                    className="w-full flex items-center p-2 bg-gray-800 hover:bg-gray-700 border border-green-400/30 rounded-lg transition-colors duration-200"
                  >
                    <User className="w-4 h-4 text-green-400 mr-2" />
                    <span className="text-green-300 font-mono text-sm">{user.phone}</span>
                    {formData.phone === user.phone && (
                      <span className="ml-auto text-green-400 text-xs font-mono">当前</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <Link
              to="/register"
              className="block text-green-400 hover:text-green-300 text-sm font-mono transition-colors"
            >
              还没有账号？立即注册
            </Link>
            <Link
              to="/reset-password"
              className="block text-green-400 hover:text-green-300 text-sm font-mono transition-colors"
            >
              忘记密码？重置密码
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-green-600 text-xs font-mono">
          <p>&copy; 吉林省通用机械（集团）有限责任公司.</p>
          <div className="mt-2 flex justify-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
          </div>
        </div>
      </div>
    </div>
  )
}