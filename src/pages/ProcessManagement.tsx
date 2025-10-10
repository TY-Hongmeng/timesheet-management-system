import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit, Trash2, Filter, X, Settings, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';
import ExcelImportDialog from '../components/ExcelImportDialog';
import { checkUserPermission, PERMISSIONS, isSuperAdmin } from '../utils/permissions';

interface Process {
  id: string;
  company_id: string;
  company_name?: string;
  production_line: string;
  production_category: string;
  product_name: string;
  product_process: string;
  unit_price: number;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProcessFormData {
  company_id: string;
  production_line: string;
  production_category: string;
  product_name: string;
  product_process: string;
  unit_price: string;
  effective_date: string;
  work_time_type: string;
}

interface Company {
  id: string;
  name: string;
}

const ProcessManagement: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductionLine, setSelectedProductionLine] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [effectiveDateFilter, setEffectiveDateFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [productionLineOptions, setProductionLineOptions] = useState<string[]>([]);
  const [productNameOptions, setProductNameOptions] = useState<string[]>([]);
  const [productProcessOptions, setProductProcessOptions] = useState<string[]>([]);
  const [filteredProductionLines, setFilteredProductionLines] = useState<string[]>([]);
  const [filteredProductNames, setFilteredProductNames] = useState<string[]>([]);
  const [filteredProductProcesses, setFilteredProductProcesses] = useState<string[]>([]);
  const [showProductionLineDropdown, setShowProductionLineDropdown] = useState(false);
  const [showProductNameDropdown, setShowProductNameDropdown] = useState(false);
  const [showProductProcessDropdown, setShowProductProcessDropdown] = useState(false);
  const [filters, setFilters] = useState({
    production_line: '',
    production_category: '',
    product_name: ''
  });
  const [formData, setFormData] = useState<ProcessFormData>({
    company_id: '',
    production_line: '',
    production_category: '',
    product_name: '',
    product_process: '',
    unit_price: '',
    effective_date: new Date().toISOString().slice(0, 7),
    work_time_type: '生产工时'
  });

  // 初始化表单数据，设置默认公司
  const initializeFormData = () => {
    const defaultCompanyId = getDefaultCompanyId();
    setFormData({
      company_id: defaultCompanyId,
      production_line: '',
      production_category: '',
      product_name: '',
      product_process: '',
      unit_price: '',
      effective_date: new Date().toISOString().slice(0, 7),
      work_time_type: '生产工时'
    });
  };
  
  // 保存上次添加的内容
  const [lastFormData, setLastFormData] = useState<ProcessFormData | null>(null);
  
  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);
  
  // Excel导入对话框状态
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // 未定价工序筛选状态
  const [showUnpricedOnly, setShowUnpricedOnly] = useState(false);

  // 测试重复检查功能
  const testDuplicateCheck = () => {
    console.log('=== 测试重复检查功能 ===');
    console.log('当前工序数量:', processes.length);
    console.log('当前表单数据:', formData);
    
    if (processes.length > 0) {
      const firstProcess = processes[0];
      console.log('使用第一个工序进行测试:', firstProcess);
      
      // 模拟相同的表单数据
      const testFormData = {
        company_id: firstProcess.company_id,
        production_line: firstProcess.production_line,
        work_time_type: firstProcess.production_category,
        product_name: firstProcess.product_name,
        product_process: firstProcess.product_process
      };
      
      console.log('测试表单数据:', testFormData);
      
      // 执行重复检查
      const duplicateProcess = processes.find(process => {
        const isMatch = process.company_id === testFormData.company_id &&
          process.production_line.trim() === testFormData.production_line.trim() &&
          process.production_category === testFormData.work_time_type &&
          process.product_name.trim() === testFormData.product_name.trim() &&
          process.product_process.trim() === testFormData.product_process.trim();
        
        console.log('检查工序:', process.id, '匹配结果:', isMatch);
        return isMatch;
      });
      
      if (duplicateProcess) {
        console.log('测试成功：发现重复工序');
        toast.error('测试成功：该工序已存在，请检查输入信息！', {
          duration: 4000,
          style: {
            fontSize: '16px',
            fontWeight: 'bold'
          }
        });
      } else {
        console.log('测试失败：未发现重复工序');
        toast.warning('测试失败：未发现重复工序');
      }
    } else {
      console.log('没有工序数据可供测试');
      toast.info('没有工序数据可供测试');
    }
  };

  useEffect(() => {
    // 检查用户认证状态
    if (!authLoading && !user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    
    if (user) {
      // 检查用户是否有工序管理权限
      checkProcessManagementPermission();
    }
  }, [user, authLoading, navigate]);

  const checkProcessManagementPermission = async () => {
    if (!user) return;
    
    const hasPermission = await checkUserPermission(user.id, PERMISSIONS.PROCESS_MANAGEMENT);
    if (!hasPermission) {
      toast.error('您没有权限访问工序管理功能');
      navigate('/dashboard');
      return;
    }
    
    fetchProcesses();
    fetchCompanies();
  };

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        toast.error('用户信息不存在');
        return;
      }



      let query = supabase
        .from('processes')
        .select(`
          *,
          companies!inner(
            name
          )
        `)
        .eq('is_active', true);

      // 如果不是超级管理员，只能查看自己公司的工序
      if (!isSuperAdmin(user.role)) {
        if (!user.company?.id) {
          toast.error('用户没有关联的公司，请联系管理员');
        return;
      }
      query = query.eq('company_id', user.company.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        toast.error(`获取工序列表失败: ${error.message}`);
        return;
      }

      // 转换数据格式，将公司名称添加到每个工序对象中
      const processesWithCompanyName = (data || []).map(process => ({
        ...process,
        company_name: process.companies?.name || '未知公司'
      }));

      setProcesses(processesWithCompanyName);
      
      // 更新自动完成选项
      updateAutoCompleteOptions(processesWithCompanyName);
    } catch (error) {
      toast.error(`获取工序列表失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 更新自动完成选项
  const updateAutoCompleteOptions = (processData: Process[]) => {
    if (!user?.company?.id) return;
    
    // 过滤当前用户公司的数据
    const userCompanyProcesses = processData.filter(p => p.company_id === user.company?.id);
    
    // 提取唯一的生产线
    const uniqueProductionLines = [...new Set(userCompanyProcesses.map(p => p.production_line).filter(Boolean))];
    setProductionLineOptions(uniqueProductionLines);
    
    // 提取唯一的产品名称
    const uniqueProductNames = [...new Set(userCompanyProcesses.map(p => p.product_name).filter(Boolean))];
    setProductNameOptions(uniqueProductNames);
    
    // 提取唯一的产品工序
    const uniqueProductProcesses = [...new Set(userCompanyProcesses.map(p => p.product_process).filter(Boolean))];
    setProductProcessOptions(uniqueProductProcesses);
  };

  // 处理自动完成输入
  const handleAutoCompleteInput = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    switch (field) {
      case 'production_line':
        const filteredLines = productionLineOptions.filter(option => 
          option.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProductionLines(filteredLines);
        setShowProductionLineDropdown(value.length > 0 && filteredLines.length > 0);
        break;
      case 'product_name':
        const filteredNames = productNameOptions.filter(option => 
          option.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProductNames(filteredNames);
        setShowProductNameDropdown(value.length > 0 && filteredNames.length > 0);
        break;
      case 'product_process':
        const filteredProcesses = productProcessOptions.filter(option => 
          option.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProductProcesses(filteredProcesses);
        setShowProductProcessDropdown(value.length > 0 && filteredProcesses.length > 0);
        break;
    }
  };

  // 选择自动完成选项
  const selectAutoCompleteOption = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    switch (field) {
      case 'production_line':
        setShowProductionLineDropdown(false);
        break;
      case 'product_name':
        setShowProductNameDropdown(false);
        break;
      case 'product_process':
        setShowProductProcessDropdown(false);
        break;
    }
  };

  const fetchCompanies = async () => {
    try {
      if (!user) {
        toast.error('用户信息不存在');
        return;
      }

      let query = supabase
        .from('companies')
        .select('id, name');

      // 如果不是超级管理员，只能看到自己的公司
      if (!isSuperAdmin(user.role)) {
        query = query.eq('id', user.company?.id);
      }

      const { data, error } = await query.order('name');

      if (error) {
        toast.error('获取公司列表失败');
        return;
      }

      setCompanies(data || []);
      
      // 如果不是超级管理员，自动设置表单的公司为用户所属公司
      if (!isSuperAdmin(user.role) && user.company?.id) {
        setFormData(prev => ({
          ...prev,
          company_id: user.company.id
        }));
      }
    } catch (error) {
      toast.error('获取公司列表失败');
    }
  };

  // 获取用户默认公司ID
  const getDefaultCompanyId = () => {
    if (!isSuperAdmin(user?.role) && user?.company?.id) {
      return user.company.id;
    }
    return '';
  };

  const handleAddProcess = async () => {
    // 检查用户认证状态
    if (!user) {
      toast.error('用户未登录，请重新登录');
      navigate('/login');
      return;
    }
    
    // 获取用户的公司ID
    const userCompanyId = user.company?.id;
    if (!userCompanyId) {
      toast.error('用户没有关联的公司，请联系管理员');
      return;
    }
    
    // 验证必填字段
    if (!formData.production_line.trim()) {
      toast.error('请填写生产线');
      return;
    }
    if (!formData.product_name.trim()) {
      toast.error('请填写产品名称');
      return;
    }
    if (!formData.product_process.trim()) {
      toast.error('请填写产品工序');
      return;
    }

    // 调试日志：打印当前表单数据和现有工序数据
    console.log('=== 开始添加工序 ===');
    console.log('当前表单数据:', {
      company_id: userCompanyId,
      production_line: formData.production_line.trim(),
      work_time_type: formData.work_time_type,
      product_name: formData.product_name.trim(),
      product_process: formData.product_process.trim()
    });
    console.log('现有工序数据:', processes.map(p => ({
      id: p.id,
      company_id: p.company_id,
      production_line: p.production_line,
      production_category: p.production_category,
      product_name: p.product_name,
      product_process: p.product_process
    })));
    console.log('工序总数:', processes.length);

    // 检查重复数据
    const duplicateProcess = processes.find(process => {
      const isMatch = process.company_id === userCompanyId &&
        process.production_line.trim() === formData.production_line.trim() &&
        process.production_category === formData.work_time_type &&
        process.product_name.trim() === formData.product_name.trim() &&
        process.product_process.trim() === formData.product_process.trim();
      
      if (isMatch) {
        console.log('找到重复工序:', process);
      }
      
      return isMatch;
    });
    
    console.log('重复检查结果:', duplicateProcess ? '发现重复' : '无重复');
    
    if (duplicateProcess) {
      console.log('显示重复提示');
      toast.error('该工序已存在，请检查输入信息！', {
        duration: 4000,
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      });
      return;
    }

    try {
      const insertData = {
        company_id: userCompanyId,
        production_line: formData.production_line,
        production_category: formData.work_time_type,
        product_name: formData.product_name,
        product_process: formData.product_process,
        unit_price: formData.unit_price && formData.unit_price.trim() !== '' ? parseFloat(formData.unit_price) : null,
        effective_date: formData.effective_date ? `${formData.effective_date}-01` : null,
        is_active: true
      };
      
      const { data, error } = await supabase
        .from('processes')
        .insert(insertData)
        .select(`
          *,
          companies!inner(
            name
          )
        `)
        .single();

      if (error) {
        toast.error(`添加工序失败: ${error.message}`);
        return;
      }

      // 添加公司名称到新工序数据中
      const newProcessWithCompanyName = {
        ...data,
        company_name: data.companies?.name || '未知公司'
      };
      setProcesses([newProcessWithCompanyName, ...processes]);
      
      // 保存当前表单数据作为下次的默认值
      setLastFormData({ ...formData });
      
      // 保留表单内容，只清空单价，保持生效年月不变
      setFormData({
          ...formData,
          product_process: ''
        });
      
      setShowAddForm(false);
      toast.success('工序添加成功');
    } catch (error) {
      toast.error(`添加工序失败: ${error.message || '未知错误'}`);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    // 检查用户认证状态
    if (!user) {
      toast.error('用户未登录，请重新登录');
      navigate('/login');
      return;
    }
    
    // 权限验证：检查要删除的工序是否属于用户的公司
    const processToDelete = processes.find(p => p.id === id);
    if (!processToDelete) {
      toast.error('工序不存在');
      return;
    }
    
    if (!isSuperAdmin(user.role) && processToDelete.company_id !== user.company?.id) {
      toast.error('您只能删除自己公司的工序');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('processes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        toast.error(`删除工序失败: ${error.message}`);
        return;
      }

      setProcesses(processes.filter(process => process.id !== id));
      toast.success('工序删除成功');
    } catch (error) {
      toast.error('删除工序失败');
    }
  };

  const handleEditProcess = (process: Process) => {
    setEditingProcess(process);
    
    // 正确处理生效年月格式转换
    let effectiveDate = '';
    if (process.effective_date) {
      // 如果是完整日期格式（YYYY-MM-DD），提取年月部分
      if (process.effective_date.includes('-') && process.effective_date.length >= 7) {
        effectiveDate = process.effective_date.substring(0, 7);
      } else {
        effectiveDate = process.effective_date;
      }
    } else {
      // 如果没有生效年月，使用当前年月作为默认值
      effectiveDate = new Date().toISOString().slice(0, 7);
    }
    
    setFormData({
      company_id: process.company_id,
      production_line: process.production_line,
      production_category: process.production_category,
      product_name: process.product_name,
      product_process: process.product_process,
      unit_price: process.unit_price?.toString() || '',
      effective_date: effectiveDate,
      work_time_type: process.production_category
    });
    setShowEditForm(true);
  };

  const handleUpdateProcess = async () => {
    if (!editingProcess) return;
    
    // 检查用户认证状态
    if (!user) {
      toast.error('用户未登录，请重新登录');
      navigate('/login');
      return;
    }

    // 权限验证：检查要编辑的工序是否属于用户的公司
    if (!isSuperAdmin(user.role) && editingProcess.company_id !== user.company?.id) {
      toast.error('您只能编辑自己公司的工序');
      return;
    }

    // 权限验证：非超级管理员不能将工序转移到其他公司
    if (!isSuperAdmin(user.role) && formData.company_id !== user.company?.id) {
      toast.error('您只能将工序分配给自己的公司');
      return;
    }

    if (!formData.company_id) {
      toast.error('请选择公司');
      return;
    }
    if (!formData.production_line.trim()) {
      toast.error('请输入生产线');
      return;
    }
    if (!formData.product_name.trim()) {
      toast.error('请输入产品名称');
      return;
    }

    // 检查重复数据（排除当前编辑的工序）
    const duplicateProcess = processes.find(process => 
      process.id !== editingProcess.id &&
      process.company_id === formData.company_id &&
      process.production_line.trim() === formData.production_line.trim() &&
      process.production_category === formData.work_time_type &&
      process.product_name.trim() === formData.product_name.trim() &&
      process.product_process.trim() === formData.product_process.trim()
    );
    
    if (duplicateProcess) {
      toast.error('该工序已存在，请检查输入信息！', {
        duration: 4000,
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('processes')
        .update({
          company_id: formData.company_id,
          production_line: formData.production_line,
          production_category: formData.work_time_type,
          product_name: formData.product_name,
          product_process: formData.product_process,
          unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
          effective_date: formData.effective_date ? `${formData.effective_date}-01` : null
        })
        .eq('id', editingProcess.id)
        .select(`
          *,
          companies!inner(
            name
          )
        `)
        .single();

      if (error) {
        toast.error('更新工序失败');
        return;
      }

      // 添加公司名称到更新后的工序数据中
      const updatedProcessWithCompanyName = {
        ...data,
        company_name: data.companies?.name || '未知公司'
      };
      
      setProcesses(processes.map(p => p.id === editingProcess.id ? updatedProcessWithCompanyName : p));
      
      // 保存当前表单数据作为下次的默认值
      setLastFormData({ ...formData });
      
      setShowEditForm(false);
      setEditingProcess(null);
      toast.success('工序更新成功');
    } catch (error) {
      toast.error('更新工序失败');
    }
  };

  const handleBatchImport = async (importData: any[]): Promise<void> => {
    // 检查用户认证状态
    if (!user) {
      toast.error('用户未登录，请重新登录');
      navigate('/login');
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // 批量插入数据
      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        try {
          // 获取用户公司ID
          const userCompanyId = user.company?.id;
          if (!userCompanyId) {
            errors.push(`第 ${i + 1} 行: 无法获取用户公司信息`);
            failedCount++;
            continue;
          }
          
          // 权限验证：非超级管理员只能导入自己公司的工序
          if (!isSuperAdmin(user.role) && item.company_id !== userCompanyId) {
            errors.push(`第 ${i + 1} 行: 您只能导入自己公司的工序`);
            failedCount++;
            continue;
          }
          
          const { data, error } = await supabase
            .from('processes')
            .insert({
              company_id: userCompanyId, // 使用用户的公司ID
              production_line: item.production_line,
              production_category: item.production_category,
              product_name: item.product_name,
              product_process: item.product_process,
              unit_price: item.unit_price, // 单价可以为null
              effective_date: item.effective_date ? (
                item.effective_date.match(/^\d{4}-\d{2}$/) ? `${item.effective_date}-01` : item.effective_date
              ) : null,
              is_active: true
            })
            .select(`
              *,
              companies!inner(
                name
              )
            `)
            .single();

          if (error) {
            errors.push(`第 ${i + 1} 行: ${error.message}`);
            failedCount++;
          } else {
            // 添加公司名称到新工序数据中
            const newProcessWithCompanyName = {
              ...data,
              company_name: data.companies?.name || '未知公司'
            };
            // 更新本地状态
            setProcesses(prev => [newProcessWithCompanyName, ...prev]);
            successCount++;
          }
        } catch (itemError) {
          errors.push(`第 ${i + 1} 行: ${itemError.message || '未知错误'}`);
          failedCount++;
        }
      }

      // 显示导入结果
      if (successCount > 0 && failedCount === 0) {
        toast.success(`批量导入成功！共导入 ${successCount} 条工序`);
      } else if (successCount > 0 && failedCount > 0) {
        toast.warning(`部分导入成功！成功 ${successCount} 条，失败 ${failedCount} 条`);
      } else {
        toast.error(`导入失败！共 ${failedCount} 条数据导入失败`);
      }
      
    } catch (error) {
      toast.error(`批量导入失败: ${error.message || '未知错误'}`);
    }
  };

  // 首先去重，保留最新的记录
  const uniqueProcesses = processes.reduce((acc, current) => {
    const key = `${current.company_id}_${current.production_line?.trim()}_${current.production_category}_${current.product_name?.trim()}_${current.product_process?.trim()}`;
    
    if (!acc[key] || new Date(current.created_at) > new Date(acc[key].created_at)) {
      acc[key] = current;
    }
    
    return acc;
  }, {});
  
  const deduplicatedProcesses = Object.values(uniqueProcesses);
  
  const filteredProcesses = deduplicatedProcesses.filter((process: any) => {
    // 如果开启了未定价筛选，只显示未定价的工序
    if (showUnpricedOnly) {
      return !process.unit_price || process.unit_price <= 0;
    }
    
    const matchesSearch = searchTerm === '' || 
      process.production_line.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (process.production_category && process.production_category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (process.product_process && process.product_process.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesProductionLine = filters.production_line === '' || process.production_line === filters.production_line;
    const matchesCategory = filters.production_category === '' || process.production_category === filters.production_category;
    const matchesEffectiveDate = !effectiveDateFilter || process.effective_date === effectiveDateFilter;
    
    return matchesSearch && matchesProductionLine && matchesCategory && matchesEffectiveDate;
  });

  // 获取唯一的生产线和工时类型用于筛选
  const uniqueProductionLines = [...new Set(processes.map((p: any) => p.production_line).filter(Boolean))];
  const uniqueCategories = [...new Set(processes.map((p: any) => p.production_category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-4xl font-bold text-green-400 font-mono">工序管理</h1>
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

        {/* 搜索和筛选栏 */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400/60" />
                <input
                  type="text"
                  placeholder="搜索工序内容、生产线、产品名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-green-400/30 rounded px-10 py-2 text-green-400 placeholder-green-400/60 focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
          </div>
          
          {/* 按钮行 - 手机端优化布局 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono text-sm sm:text-base"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">筛选</span>
              <span className="sm:hidden">筛选</span>
            </button>
            <button
              onClick={() => {
                const unpricedProcesses = processes.filter(p => !p.unit_price || p.unit_price <= 0);
                if (unpricedProcesses.length === 0) {
                  toast.info('当前没有未定价的工序');
                } else {
                  setSearchTerm('');
                  setFilters({ production_line: '', production_category: '', product_name: '' });
                  setEffectiveDateFilter('');
                  // 设置一个特殊的筛选状态来显示未定价工序
                  setShowUnpricedOnly(!showUnpricedOnly);
                }
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 font-bold rounded transition-colors font-mono text-sm sm:text-base ${
                showUnpricedOnly 
                  ? 'bg-red-600 hover:bg-red-500 text-white' 
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">{showUnpricedOnly ? '显示全部' : '未定价工序'}</span>
              <span className="sm:hidden">{showUnpricedOnly ? '全部' : '未定价'}</span>
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono text-sm sm:text-base"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">批量导入</span>
              <span className="sm:hidden">导入</span>
            </button>
            <button
              onClick={() => {
                if (!showAddForm) {
                  // 如果有上次的数据，使用上次的数据作为默认值
                  if (lastFormData) {
                    setFormData({
                      ...lastFormData,
                      unit_price: ''
                      // 保留上次的生效年月，不重置
                    });
                  } else {
                    initializeFormData();
                  }
                }
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors font-mono text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">添加工序</span>
              <span className="sm:hidden">添加</span>
            </button>
          </div>
          
          {/* 筛选器 */}
          {showFilters && (
            <div className="bg-green-900/10 border border-green-400/30 rounded p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">
                    生产线
                  </label>
                  <select
                    value={filters.production_line}
                    onChange={(e) => setFilters({ ...filters, production_line: e.target.value })}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  >
                    <option value="">全部生产线</option>
                    {uniqueProductionLines.map(line => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">
                    工时类型
                  </label>
                  <select
                    value={filters.production_category}
                    onChange={(e) => setFilters({ ...filters, production_category: e.target.value })}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  >
                    <option value="">全部类别</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-start mt-4">
                <button
                  onClick={() => {
                    setFilters({ production_line: '', production_category: '', product_name: '' });
                    setSearchTerm('');
                    setEffectiveDateFilter('');
                    setShowUnpricedOnly(false);
                  }}
                  className="flex items-center space-x-2 bg-gray-900/20 border border-gray-400/30 px-4 py-2 rounded hover:bg-gray-900/30 transition-colors text-gray-400"
                >
                  <X className="w-4 h-4" />
                  <span>清除筛选</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 添加工序表单 */}
        {showAddForm && (
          <div className="mb-6 p-4 border border-green-400/30 rounded bg-green-900/10">
            <h3 className="text-lg font-semibold mb-4 text-green-400">
              为 <strong>{user?.company?.name || '未设置公司'}</strong> 添加新工序
            </h3>
            
            <div className="space-y-4">
              {/* 第一行：生产线和工时类型 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2 text-green-400">生产线 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.production_line}
                    onChange={(e) => handleAutoCompleteInput('production_line', e.target.value)}
                    onFocus={() => {
                      if (formData.production_line && filteredProductionLines.length > 0) {
                        setShowProductionLineDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowProductionLineDropdown(false), 200);
                    }}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                    placeholder="请输入生产线"
                  />
                  {showProductionLineDropdown && filteredProductionLines.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-green-400/30 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredProductionLines.map((option, index) => (
                        <div
                          key={index}
                          onClick={() => selectAutoCompleteOption('production_line', option)}
                          className="px-3 py-2 text-green-400 hover:bg-green-900/20 cursor-pointer border-b border-green-400/10 last:border-b-0"
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-green-400">工时类型 <span className="text-red-400">*</span></label>
                  <select
                    value={formData.work_time_type}
                    onChange={(e) => setFormData({ ...formData, work_time_type: e.target.value })}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  >
                    <option value="生产工时">生产工时</option>
                    <option value="非生产工时">非生产工时</option>
                  </select>
                </div>
              </div>
              
              {/* 第二行：产品名称和产品工序 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium mb-2 text-green-400">产品名称 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => handleAutoCompleteInput('product_name', e.target.value)}
                    onFocus={() => {
                      if (formData.product_name && filteredProductNames.length > 0) {
                        setShowProductNameDropdown(true);
                      }
                    }}
                  onBlur={() => {
                    setTimeout(() => setShowProductNameDropdown(false), 200);
                  }}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  placeholder="请输入产品名称"
                />
                {showProductNameDropdown && filteredProductNames.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-green-400/30 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredProductNames.map((option, index) => (
                      <div
                        key={index}
                        onClick={() => selectAutoCompleteOption('product_name', option)}
                        className="px-3 py-2 text-green-400 hover:bg-green-900/20 cursor-pointer border-b border-green-400/10 last:border-b-0"
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-2 text-green-400">产品工序 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.product_process}
                    onChange={(e) => handleAutoCompleteInput('product_process', e.target.value)}
                    onFocus={() => {
                      if (formData.product_process && filteredProductProcesses.length > 0) {
                        setShowProductProcessDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowProductProcessDropdown(false), 200);
                    }}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                    placeholder="请输入产品工序"
                  />
                  {showProductProcessDropdown && filteredProductProcesses.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-green-400/30 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredProductProcesses.map((option, index) => (
                        <div
                          key={index}
                          onClick={() => selectAutoCompleteOption('product_process', option)}
                          className="px-3 py-2 text-green-400 hover:bg-green-900/20 cursor-pointer border-b border-green-400/10 last:border-b-0"
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
               
              {/* 第三行：单价和生效年月 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-green-400">单价（可选）</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="请输入单价"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-green-400">生效年月</label>
                  <input
                    type="month"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-4 mt-4">
              <button
                type="button"
                onClick={handleAddProcess}
                className="bg-green-900/20 border border-green-400/30 px-4 py-2 rounded hover:bg-green-900/30 transition-colors text-green-400"
              >确认添加</button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  const defaultCompanyId = getDefaultCompanyId();
                  setFormData({
                    company_id: defaultCompanyId,
                    production_line: '',
                    production_category: '',
                    product_name: '',
                    product_process: '',
                    unit_price: '',
                    effective_date: new Date().toISOString().slice(0, 7),
                    work_time_type: '生产工时'
                  });
                }}
                className="border border-green-400/30 px-4 py-2 rounded hover:bg-green-900/20 transition-colors text-green-400"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const defaultCompanyId = getDefaultCompanyId();
                  setFormData({
                    company_id: defaultCompanyId,
                    production_line: '',
                    production_category: '',
                    product_name: '',
                    product_process: '',
                    unit_price: '',
                    effective_date: new Date().toISOString().slice(0, 7),
                    work_time_type: '生产工时'
                  });
                  toast.success('表单内容已清除');
                }}
                className="bg-red-900/20 border border-red-400/30 px-4 py-2 rounded hover:bg-red-900/30 transition-colors text-red-400"
              >
                清除内容
              </button>
            </div>
          </div>
        )}

        {/* 编辑工序表单 */}
        {showEditForm && editingProcess && (
          <div className="bg-gray-800 border border-green-500 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-400 mb-4">编辑工序</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  公司 <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                >
                  <option value="">请选择公司</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  生产线 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.production_line}
                  onChange={(e) => setFormData({ ...formData, production_line: e.target.value })}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  placeholder="请输入生产线"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  工时类型 <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.work_time_type}
                  onChange={(e) => setFormData({ ...formData, work_time_type: e.target.value })}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                >
                  <option value="生产工时">生产工时</option>
                  <option value="非生产工时">非生产工时</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  产品名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  placeholder="请输入产品名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  产品工序 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.product_process}
                  onChange={(e) => setFormData({ ...formData, product_process: e.target.value })}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  placeholder="请输入产品工序"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  单价
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  placeholder="请输入单价"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  生效年月
                </label>
                <input
                  type="month"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingProcess(null);
                  setFormData({
                    company_id: '',
                    production_line: '',
                    production_category: '',
                    product_name: '',
                    product_process: '',
                    unit_price: '',
                    effective_date: new Date().toISOString().slice(0, 7),
                    work_time_type: '生产工时'
                  });
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateProcess}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        )}

        {/* 工序列表 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
          
          {loading ? (
            <div className="p-8 text-center text-green-400/60">
              <div className="animate-pulse">加载中...</div>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="p-8 text-center text-green-400/60">
              {searchTerm ? '未找到匹配的工序' : '暂无工序数据'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-900/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      公司
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      生产线
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">工时类型</th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      产品名称
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      产品工序
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      单价
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      生效年月
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-mono font-medium text-green-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-800">
                  {filteredProcesses.map((process: any) => (
                    <tr key={process.id} className="hover:bg-green-900/10">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300" title={process.company_name}>
                          {process.company_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300" title={process.production_line}>
                          {process.production_line}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300" title={process.production_category || '-'}>
                          {process.production_category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300" title={process.product_name}>
                          {process.product_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300" title={process.product_process || '-'}>
                          {process.product_process || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-mono ${!process.unit_price || process.unit_price <= 0 ? 'text-red-400 font-bold' : 'text-green-300'}`} title={process.unit_price ? `¥${process.unit_price.toFixed(2)}` : '未定价'}>
                          {process.unit_price && process.unit_price > 0 ? `¥${process.unit_price.toFixed(2)}` : '未定价'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300" title={process.effective_date}>
                          {process.effective_date ? process.effective_date.substring(0, 7) : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => handleEditProcess(process as Process)}
                            className="p-1 text-blue-400/60 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                            title="编辑工序"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProcessToDelete(process as Process);
                              setShowConfirmDialog(true);
                            }}
                            className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                            title="删除工序"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="mt-6 text-center text-green-400/60 text-sm">
          共 {filteredProcesses.length} 个工序
          {searchTerm && ` (从 ${processes.length} 个工序中筛选)`}
          {showUnpricedOnly && (
            <span className="ml-2 text-red-400 font-bold">
              (显示未定价工序)
            </span>
          )}
          {!showUnpricedOnly && (
            <span className="ml-2 text-orange-400">
              (未定价: {processes.filter(p => !p.unit_price || p.unit_price <= 0).length} 个)
            </span>
          )}
        </div>
      </div>
      
      {/* 确认删除对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="确认删除"
        message={processToDelete ? `确定要删除工序"${processToDelete.product_name}"吗？\n\n此操作不可撤销！` : ''}
        onConfirm={() => {
          if (processToDelete) {
            handleDeleteProcess(processToDelete.id);
            setShowConfirmDialog(false);
            setProcessToDelete(null);
          }
        }}
        onCancel={() => {
          setShowConfirmDialog(false);
          setProcessToDelete(null);
        }}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
      
      {/* Excel导入对话框 */}
      <ExcelImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleBatchImport}
        companies={companies}
        currentUser={user}
        existingProcesses={processes}
      />
    </div>
  );
};

export default ProcessManagement;