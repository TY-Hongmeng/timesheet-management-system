import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Company } from '@/lib/supabase'
import { Building, Plus, Edit, Trash2, Save, X, AlertTriangle, GripVertical, ArrowLeft, Search } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface CompanyFormData {
  name: string
}

// 可拖拽的公司行组件
function SortableCompanyRow({ company, index, onEdit, onDelete }: {
  company: Company
  index: number
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-6 py-4 hover:bg-green-900/10 transition-colors ${
        isDragging ? 'bg-gray-800/70 shadow-lg' : ''
      }`}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-1 flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-green-400 hover:text-green-300 p-1"
            title="拖拽排序"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-green-400 font-bold font-mono text-lg">
            {index + 1}
          </span>
        </div>
        <div className="col-span-6">
          <h3 className="text-green-400 font-bold font-mono text-lg">
            {company.name}
          </h3>
        </div>
        <div className="col-span-3">
          <span className="text-green-600 font-mono text-sm">
            {new Date(company.created_at).toLocaleString()}
          </span>
        </div>
        <div className="col-span-2">
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(company)}
              className="text-green-400 hover:text-green-300 transition-colors p-1"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(company)}
              className="text-red-400 hover:text-red-300 transition-colors p-1"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState<CompanyFormData>({
    name: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 检查用户认证状态
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
  }, [user, authLoading, navigate])

  // 如果正在加载认证状态，显示加载界面
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-400 text-2xl font-mono mb-4">加载中...</div>
          <div className="text-green-600 font-mono">正在验证用户身份</div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    setLoading(true)
    setError('')
    
  try {
      if (!user) {
        setError('用户未登录，请重新登录')
        return
      }
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) {
        console.error('获取公司列表失败:', error)
        throw error
      }
      
      console.log('获取到公司列表:', data)
      setCompanies(data || [])
    } catch (error: any) {
      console.error('获取公司列表失败:', error)
      setError('获取公司列表失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')
    let successMessage = ''

    try {
      if (editingCompany) {
        const { data, error } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCompany.id)
          .select()
        
        if (error) {
          throw new Error(error.message)
        }
        
        if (!data || data.length === 0) {
          throw new Error('更新失败：权限不足或记录不存在')
        }
        
        const updatedCompany = data[0]
        setCompanies(prevCompanies => 
          prevCompanies.map(company => 
            company.id === updatedCompany.id ? updatedCompany : company
          )
        )
        successMessage = `公司 "${updatedCompany.name}" 更新成功`
      } else {
        const { data, error } = await supabase
          .from('companies')
          .insert([formData])
          .select()
        
        if (error) {
          throw new Error(error.message)
        }
        
        const newCompany = data[0]
        setCompanies(prevCompanies => [...prevCompanies, newCompany])
        successMessage = `公司 "${newCompany.name}" 创建成功`
      }
      
      setError('')
      setSuccessMessage(successMessage)
      
      await fetchCompanies()
      
      resetForm()
      
    } catch (error: any) {
      setError(error.message || '保存失败')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setFormData({
      name: company.name
    })
    setShowForm(true)
  }

  const handleDelete = (company: Company) => {
    setCompanyToDelete(company)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!companyToDelete) return

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyToDelete.id)

      if (error) throw error
      await fetchCompanies()
      setShowDeleteConfirm(false)
      setCompanyToDelete(null)
    } catch (error: any) {
      setError(error.message || '删除失败')
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setCompanyToDelete(null)
  }

  const resetForm = () => {
    setFormData({
      name: ''
    })
    setEditingCompany(null)
    setShowForm(false)
    setError('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // 拖拽结束处理函数
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = companies.findIndex((company) => company.id === active.id)
      const newIndex = companies.findIndex((company) => company.id === over?.id)

      const newCompanies = arrayMove(companies, oldIndex, newIndex)
      
      // 立即更新本地状态以提供即时反馈
      setCompanies(newCompanies)

      // 更新数据库中的order_index
      try {
        const updates = newCompanies.map((company, index) => ({
          id: company.id,
          order_index: index + 1
        }))

        for (const update of updates) {
          await supabase
            .from('companies')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        }

      } catch (error) {
        // 如果更新失败，恢复原始顺序
        await fetchCompanies()
      }
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse font-mono">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-300 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-4xl font-bold text-green-400 font-mono">公司管理</h1>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-green-300 hover:text-green-200 rounded-lg font-mono transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600 hover:border-green-500/50"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">返回控制台</span>
              <span className="sm:hidden">返回</span>
            </Link>
          </div>
          <div className="h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400/60" />
              <input
                type="text"
                placeholder="搜索公司名称..."
                className="w-full bg-black border border-green-400/30 rounded px-10 py-2 text-green-400 placeholder-green-400/60 focus:outline-none focus:border-green-400"
              />
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono"
          >
            <Plus className="w-4 h-4" />
            新增公司
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-400 rounded text-red-300">
            {error}
          </div>
        )}



        {/* Company Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-green-400 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-green-400 font-mono">
                  {editingCompany ? '编辑公司' : '新增公司'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-green-400 hover:text-green-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-green-300 text-sm font-mono mb-1">
                    公司名称 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-black border border-green-400 rounded text-green-300 placeholder-green-600 focus:outline-none focus:border-green-300 focus:ring-1 focus:ring-green-300 font-mono text-sm"
                    placeholder="请输入公司名称"
                  />
                </div>



                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-black font-bold rounded transition-colors font-mono"
                  >
                    <Save className="w-4 h-4" />
                    {formLoading ? '保存中...' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && companyToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-red-400 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-400 w-8 h-8" />
                <h2 className="text-xl font-bold text-red-400 font-mono">
                  确认删除
                </h2>
              </div>
              
              <div className="mb-6">
                <p className="text-green-300 font-mono mb-2">
                  您确定要删除以下公司吗？
                </p>
                <div className="bg-black border border-green-400 rounded p-3 mb-3">
                  <p className="text-green-400 font-mono font-bold">
                    {companyToDelete.name}
                  </p>
                </div>
                <p className="text-red-300 text-sm font-mono">
                  ⚠️ 此操作不可恢复，请谨慎操作！
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors font-mono"
                >
                  <Trash2 className="w-4 h-4" />
                  确认删除
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded transition-colors font-mono"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Companies List - Table Format */}
        <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-green-900/30 border-b border-green-400 px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-1">
                <span className="text-green-400 font-bold font-mono text-sm">排序</span>
              </div>
              <div className="col-span-6">
                <span className="text-green-400 font-bold font-mono text-sm">公司名称</span>
              </div>
              <div className="col-span-3">
                <span className="text-green-400 font-bold font-mono text-sm">创建时间</span>
              </div>
              <div className="col-span-2">
                <span className="text-green-400 font-bold font-mono text-sm">操作</span>
              </div>
            </div>
          </div>
          
          {/* Table Body */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={companies.map(company => company.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-green-800">
                {companies.map((company, index) => (
                  <SortableCompanyRow
                    key={company.id}
                    company={company}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-green-400 text-lg font-mono">
              暂无公司数据
            </p>
            <p className="text-green-600 text-sm font-mono mt-2">
              点击上方按钮添加第一家公司
            </p>
          </div>
        )}
      </div>
    </div>
  )
}