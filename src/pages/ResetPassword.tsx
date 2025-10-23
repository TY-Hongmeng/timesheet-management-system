import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CreditCard, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [step, setStep] = useState<'verify' | 'reset'>('verify')
  const [formData, setFormData] = useState({
    id_card: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifiedUser, setVerifiedUser] = useState<any>(null)

  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.id_card) {
      setError('请输入身份证号码')
      setLoading(false)
      return
    }

    if (!/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(formData.id_card)) {
      setError('请输入正确的身份证号码')
      setLoading(false)
      return
    }

    const result = await resetPassword(formData.id_card)
    
    if (result.success && result.user) {
      setVerifiedUser(result.user)
      setStep('reset')
      setError('')
    } else {
      setError(result.error || '身份证号码验证失败，请检查后重试')
    }
    
    setLoading(false)
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('请填写新密码和确认密码')
      setLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      setPasswordError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      setError('密码长度至少6位')
      setLoading(false)
      return
    }

    const result = await resetPassword(formData.id_card, formData.newPassword)
    
    if (result.success) {
      alert('密码重置成功，请使用新密码登录')
      navigate('/login')
    } else {
      setError(result.error || '密码重置失败')
    }
    
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 实时验证密码确认
    if (name === 'confirmPassword' || name === 'newPassword') {
      const newPassword = name === 'newPassword' ? value : formData.newPassword
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword
      
      if (confirmPassword && newPassword !== confirmPassword) {
        setPasswordError('两次输入的密码不一致')
      } else {
        setPasswordError('')
      }
    }
  }

  const handleBack = () => {
    if (step === 'reset') {
      setStep('verify')
      setVerifiedUser(null)
      setError('')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-400 mb-2 font-mono">
            工时管理系统
          </h1>
          <p className="text-green-300 text-lg font-mono">
            TIMETRACK SYSTEM
          </p>
          <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>

        {/* Reset Password Form */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-8 shadow-lg shadow-green-400/20">
          <div className="flex items-center mb-6">
            <button
              onClick={handleBack}
              className="text-green-400 hover:text-green-300 mr-3 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-green-400 font-mono">
              {step === 'verify' ? '身份验证' : '重置密码'}
            </h2>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-400 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {step === 'verify' ? (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-green-300 text-sm font-mono">
                  请输入您的身份证号码进行身份验证
                </p>
              </div>

              {/* ID Card Input */}
              <div>
                <label className="block text-green-300 text-sm font-mono mb-2">
                  身份证号码
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-5 h-5" />
                  <input
                    type="text"
                    name="id_card"
                    value={formData.id_card}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono"
                    placeholder="请输入身份证号码"
                    maxLength={18}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-black font-bold rounded-lg transition-colors duration-200 font-mono text-lg"
              >
                {loading ? '验证中...' : '验证身份'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              {verifiedUser && (
                <div className="bg-green-900/30 border border-green-400 rounded p-4 mb-6">
                  <p className="text-green-300 text-sm font-mono">
                    验证成功！正在为用户 <span className="text-green-400 font-bold">{verifiedUser.name}</span> 重置密码
                  </p>
                  <p className="text-green-400 text-xs font-mono mt-1">
                    手机号: {verifiedUser.phone}
                  </p>
                </div>
              )}

              {/* New Password Input */}
              <div>
                <label className="block text-green-300 text-sm font-mono mb-2">
                  新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono"
                    placeholder="请输入新密码（至少6位）"
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

              {/* Confirm Password Input */}
              <div>
                <label className="block text-green-300 text-sm font-mono mb-2">
                  确认新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full pl-12 pr-12 py-3 bg-black border rounded text-green-300 placeholder-green-600 focus:outline-none focus:ring-1 font-mono ${
                      passwordError ? 'border-red-400 focus:border-red-300 focus:ring-red-300' : 'border-green-400 focus:border-green-300 focus:ring-green-300'
                    }`}
                    placeholder="请再次输入新密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <div className="mt-1 text-red-400 text-xs font-mono">
                    {passwordError}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-black font-bold rounded-lg transition-colors duration-200 font-mono text-lg"
              >
                {loading ? '重置中...' : '重置密码'}
              </button>
            </form>
          )}

          {/* Links */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-green-400 hover:text-green-300 text-sm font-mono transition-colors"
            >
              返回登录
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-green-600 text-xs font-mono">
          <p>&copy; 2024 工时管理系统. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}