import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit, Trash2, Filter, X, Settings, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';
import ExcelImportDialog from '../components/ExcelImportDialog';
import CollapsibleSection from '../components/CollapsibleSection';
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
  // 移除不需要的状态变量，改用函数计算
  const [showProductionLineDropdown, setShowProductionLineDropdown] = useState(false);
  const [showProductNameDropdown, setShowProductNameDropdown] = useState(false);
  const [showProductProcessDropdown, setShowProductProcessDropdown] = useState(false);
  const [filters, setFilters] = useState({
    company_id: '',
    production_line: '',
    production_category: '',
    product_name: '',
    product_process: ''
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
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
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



      // 修复：移除is_active条件，确保获取所有生产线数据
      let query = supabase
        .from('processes')
        .select(`
          *,
          companies!inner(
            name
          )
        `);

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

      console.log('📊 ProcessManagement.tsx - fetchProcesses: 查询到的原始数据:', data)
      console.log('📊 ProcessManagement.tsx - fetchProcesses: 原始数据数量:', data?.length || 0)

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
    console.log('🔍 ProcessManagement.tsx - updateAutoCompleteOptions: 开始更新自动完成选项')
    console.log('🔍 ProcessManagement.tsx - updateAutoCompleteOptions: 用户信息:', user)
    console.log('🔍 ProcessManagement.tsx - updateAutoCompleteOptions: 用户公司ID:', user?.company?.id)
    console.log('🔍 ProcessManagement.tsx - updateAutoCompleteOptions: 是否为超级管理员:', isSuperAdmin(user?.role))
    
    if (!user?.company?.id && !isSuperAdmin(user?.role)) return;
    
    // 如果是超级管理员，使用所有数据；否则过滤当前用户公司的数据
    const filteredProcesses = isSuperAdmin(user?.role) 
      ? processData 
      : processData.filter(p => p.company_id === user.company?.id);
    
    console.log('📊 ProcessManagement.tsx - updateAutoCompleteOptions: 过滤后的工序数据数量:', filteredProcesses.length)
    
    // 提取唯一的生产线
    const uniqueProductionLines = [...new Set(filteredProcesses.map(p => p.production_line).filter(Boolean))];
    console.log('🎯 ProcessManagement.tsx - updateAutoCompleteOptions: 唯一生产线:', uniqueProductionLines)
    console.log('🎯 ProcessManagement.tsx - updateAutoCompleteOptions: 唯一生产线数量:', uniqueProductionLines.length)
    setProductionLineOptions(uniqueProductionLines);
    
    // 提取唯一的产品名称
    const uniqueProductNames = [...new Set(filteredProcesses.map(p => p.product_name).filter(Boolean))];
    setProductNameOptions(uniqueProductNames);
    
    // 提取唯一的产品工序
    const uniqueProductProcesses = [...new Set(filteredProcesses.map(p => p.product_process).filter(Boolean))];
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
        setShowProductNameDropdown(value.length > 0 && filteredNames.length > 0);
        break;
      case 'product_process':
        const filteredProcesses = productProcessOptions.filter(option => 
          option.toLowerCase().includes(value.toLowerCase())
        );
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
    
    // 获取用户的公司ID（超级管理员可以没有公司ID）
    const userCompanyId = user.company?.id;
    if (!isSuperAdmin(user.role) && !userCompanyId) {
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

    // 确定要使用的公司ID（超级管理员使用表单选择的公司ID，其他用户使用自己的公司ID）
    const targetCompanyId = isSuperAdmin(user.role) ? formData.company_id : userCompanyId;
    
    if (!targetCompanyId) {
      toast.error('请选择公司');
      return;
    }

    // 调试日志：打印当前表单数据和现有工序数据
    console.log('=== 开始添加工序 ===');
    console.log('当前表单数据:', {
      company_id: targetCompanyId,
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
      const isMatch = process.company_id === targetCompanyId &&
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
        company_id: targetCompanyId,
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
      // 获取用户公司ID（超级管理员可以没有公司ID）
      const userCompanyId = user.company?.id;
      if (!isSuperAdmin(user.role) && !userCompanyId) {
        toast.error('无法获取用户公司信息');
        return;
      }

      // 预处理和验证数据
      const validData: any[] = [];
      const batchSize = 100; // 每批处理100条记录

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        
        // 权限验证：非超级管理员只能导入自己公司的工序
        if (!isSuperAdmin(user.role) && item.company_id !== userCompanyId) {
          errors.push(`第 ${i + 1} 行: 您只能导入自己公司的工序`);
          failedCount++;
          continue;
        }

        // 数据格式化
        const processData = {
          company_id: isSuperAdmin(user.role) ? item.company_id : userCompanyId, // 超级管理员使用导入数据的公司ID，其他用户使用自己的公司ID
          production_line: item.production_line,
          production_category: item.production_category,
          product_name: item.product_name,
          product_process: item.product_process,
          unit_price: item.unit_price, // 单价可以为null
          effective_date: item.effective_date ? (
            item.effective_date.match(/^\d{4}-\d{2}$/) ? `${item.effective_date}-01` : item.effective_date
          ) : null,
          is_active: true
        };

        validData.push(processData);
      }

      if (validData.length === 0) {
        toast.error('没有有效的数据可以导入');
        return;
      }

      // 分批批量插入数据
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('processes')
            .insert(batch)
            .select(`
              *,
              companies!inner(
                name
              )
            `);

          if (error) {
            // 如果批量插入失败，尝试逐条插入以识别具体错误
            console.warn('批量插入失败，尝试逐条插入:', error);
            
            for (let j = 0; j < batch.length; j++) {
              try {
                const { data: singleData, error: singleError } = await supabase
                  .from('processes')
                  .insert(batch[j])
                  .select(`
                    *,
                    companies!inner(
                      name
                    )
                  `)
                  .single();

                if (singleError) {
                  errors.push(`第 ${i + j + 1} 行: ${singleError.message}`);
                  failedCount++;
                } else {
                  const newProcessWithCompanyName = {
                    ...singleData,
                    company_name: singleData.companies?.name || '未知公司'
                  };
                  setProcesses(prev => [newProcessWithCompanyName, ...prev]);
                  successCount++;
                }
              } catch (singleItemError) {
                errors.push(`第 ${i + j + 1} 行: ${singleItemError.message || '未知错误'}`);
                failedCount++;
              }
            }
          } else {
            // 批量插入成功
            const newProcessesWithCompanyName = data.map(process => ({
              ...process,
              company_name: process.companies?.name || '未知公司'
            }));
            
            setProcesses(prev => [...newProcessesWithCompanyName, ...prev]);
            successCount += data.length;
          }
        } catch (batchError) {
          console.error('批次处理错误:', batchError);
          errors.push(`批次 ${Math.floor(i / batchSize) + 1} 处理失败: ${batchError.message || '未知错误'}`);
          failedCount += batch.length;
        }
      }

      // 显示导入结果
      if (successCount > 0 && failedCount === 0) {
        toast.success(`批量导入成功！共导入 ${successCount} 条工序`);
      } else if (successCount > 0 && failedCount > 0) {
        toast.warning(`部分导入成功！成功 ${successCount} 条，失败 ${failedCount} 条`);
        if (errors.length > 0) {
          console.warn('导入错误详情:', errors.slice(0, 10)); // 只显示前10个错误
        }
      } else {
        toast.error(`导入失败！共 ${failedCount} 条数据导入失败`);
        if (errors.length > 0) {
          console.error('导入错误详情:', errors.slice(0, 10)); // 只显示前10个错误
        }
      }
      
    } catch (error) {
      console.error('批量导入失败:', error);
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
      (process.product_process && process.product_process.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (process.company_name && process.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCompany = filters.company_id === '' || process.company_id === filters.company_id;
    const matchesProductionLine = filters.production_line === '' || process.production_line === filters.production_line;
    const matchesCategory = filters.production_category === '' || process.production_category === filters.production_category;
    const matchesProductName = filters.product_name === '' || process.product_name === filters.product_name;
    const matchesProductProcess = filters.product_process === '' || process.product_process === filters.product_process;
    const matchesEffectiveDate = !effectiveDateFilter || process.effective_date === effectiveDateFilter;
    
    return matchesSearch && matchesCompany && matchesProductionLine && matchesCategory && matchesProductName && matchesProductProcess && matchesEffectiveDate;
  });

  // 分页计算
  const totalItems = filteredProcesses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProcesses = filteredProcesses.slice(startIndex, endIndex);

  // 获取唯一的值用于筛选下拉框 - 实现完整的四级联级筛选
  const companyMap = new Map();
  processes.forEach((p: any) => {
    if (p.company_id && p.company_name) {
      companyMap.set(p.company_id, p.company_name);
    }
  });
  const uniqueCompanies = Array.from(companyMap.entries()).map(([id, name]) => ({ id, name }));
  
  // 获取当前用户的公司ID（用于非超级管理员）
  const getCurrentUserCompanyId = () => {
    if (isSuperAdmin(user?.role)) {
      return filters.company_id; // 超级管理员使用筛选选择的公司
    } else {
      return user?.company?.id || ''; // 普通用户使用自己的公司
    }
  };
  
  // 联级筛选：根据公司过滤生产线
  const getFilteredProductionLines = () => {
    const companyId = getCurrentUserCompanyId();
    if (!companyId) {
      return [];
    }
    return [...new Set(processes
      .filter((p: any) => p.company_id === companyId)
      .map((p: any) => p.production_line)
      .filter(Boolean))];
  };
  
  // 联级筛选：根据公司和生产线过滤产品名称
  const getFilteredProductNames = () => {
    const companyId = getCurrentUserCompanyId();
    if (!companyId) {
      return [];
    }
    
    let filteredProcesses = processes.filter((p: any) => p.company_id === companyId);
    
    // 如果选择了生产线，进一步过滤
    if (filters.production_line) {
      filteredProcesses = filteredProcesses.filter((p: any) => p.production_line === filters.production_line);
    }
    
    return [...new Set(filteredProcesses
      .map((p: any) => p.product_name)
      .filter(Boolean))];
  };
  
  // 联级筛选：根据公司、生产线和产品名称过滤产品工序
  const getFilteredProductProcesses = () => {
    const companyId = getCurrentUserCompanyId();
    if (!companyId) {
      return [];
    }
    
    let filteredProcesses = processes.filter((p: any) => p.company_id === companyId);
    
    // 如果选择了生产线，进一步过滤
    if (filters.production_line) {
      filteredProcesses = filteredProcesses.filter((p: any) => p.production_line === filters.production_line);
    }
    
    // 如果选择了产品名称，进一步过滤
    if (filters.product_name) {
      filteredProcesses = filteredProcesses.filter((p: any) => p.product_name === filters.product_name);
    }
    
    return [...new Set(filteredProcesses
      .map((p: any) => p.product_process)
      .filter(Boolean))];
  };
  
  // 获取所有唯一值（用于超级管理员未选择公司时的备用选项）
  const uniqueProductionLines = [...new Set(processes.map((p: any) => p.production_line).filter(Boolean))];
  const uniqueCategories = [...new Set(processes.map((p: any) => p.production_category).filter(Boolean))];
  
  console.log('🎯 ProcessManagement.tsx - 筛选用唯一生产线:', uniqueProductionLines)
  console.log('🎯 ProcessManagement.tsx - 筛选用唯一生产线数量:', uniqueProductionLines.length)

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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // 搜索时重置到第一页
                  }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 公司筛选 - 仅超级管理员可见 */}
                {isSuperAdmin(user?.role) && (
                  <div>
                    <label className="block text-sm font-medium text-green-400 mb-2">
                      公司
                    </label>
                    <select
                      value={filters.company_id}
                      onChange={(e) => {
                        // 联级筛选：选择公司时清空生产线、产品名称和产品工序
                        setFilters({ 
                          ...filters, 
                          company_id: e.target.value,
                          production_line: '',
                          product_name: '',
                          product_process: ''
                        });
                        setCurrentPage(1); // 筛选时重置到第一页
                      }}
                      className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                    >
                      <option value="">全部公司</option>
                      {uniqueCompanies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">
                    生产线
                  </label>
                  <select
                    value={filters.production_line}
                    onChange={(e) => {
                      // 联级筛选：选择生产线时清空产品名称和产品工序
                      setFilters({ 
                        ...filters, 
                        production_line: e.target.value,
                        product_name: '',
                        product_process: ''
                      });
                      setCurrentPage(1); // 筛选时重置到第一页
                    }}
                    disabled={isSuperAdmin(user?.role) && !filters.company_id}
                    className={`w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 ${
                      (isSuperAdmin(user?.role) && !filters.company_id) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">
                      {(isSuperAdmin(user?.role) && !filters.company_id) ? '请先选择公司' : '全部生产线'}
                    </option>
                    {(isSuperAdmin(user?.role) ? getFilteredProductionLines() : uniqueProductionLines).map(line => (
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
                    onChange={(e) => {
                      setFilters({ ...filters, production_category: e.target.value });
                      setCurrentPage(1); // 筛选时重置到第一页
                    }}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  >
                    <option value="">全部类别</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">
                    产品名称
                  </label>
                  <select
                    value={filters.product_name}
                    onChange={(e) => {
                      // 联级筛选：选择产品名称时清空产品工序
                      setFilters({ 
                        ...filters, 
                        product_name: e.target.value,
                        product_process: ''
                      });
                      setCurrentPage(1); // 筛选时重置到第一页
                    }}
                    disabled={isSuperAdmin(user?.role) ? !filters.company_id : false}
                    className={`w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 ${
                      (isSuperAdmin(user?.role) && !filters.company_id) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">
                      {(isSuperAdmin(user?.role) && !filters.company_id) ? '请先选择公司' : '所有产品名称'}
                    </option>
                    {getFilteredProductNames().map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-400 mb-2">
                    产品工序
                  </label>
                  <select
                    value={filters.product_process}
                    onChange={(e) => {
                      setFilters({ ...filters, product_process: e.target.value });
                      setCurrentPage(1); // 筛选时重置到第一页
                    }}
                    disabled={isSuperAdmin(user?.role) ? !filters.company_id : !filters.product_name}
                    className={`w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 ${
                      (isSuperAdmin(user?.role) ? !filters.company_id : !filters.product_name) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">
                      {isSuperAdmin(user?.role) 
                        ? (!filters.company_id ? '请先选择公司' : '所有产品工序')
                        : (!filters.product_name ? '请先选择产品名称' : '所有产品工序')
                      }
                    </option>
                    {getFilteredProductProcesses().map((process) => (
                      <option key={process} value={process}>
                        {process}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-start mt-4">
                <button
                  onClick={() => {
                    setFilters({ company_id: '', production_line: '', production_category: '', product_name: '', product_process: '' });
                    setSearchTerm('');
                    setEffectiveDateFilter('');
                    setShowUnpricedOnly(false);
                    setCurrentPage(1); // 清除筛选时重置到第一页
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
          <div className="mb-6">
            <CollapsibleSection
              title={`为 ${user?.company?.name || '未设置公司'} 添加新工序`}
              defaultExpanded={true}
              className="p-4 border border-green-400/30 rounded bg-green-900/10"
            >
            
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
                      if (formData.product_name && productNameOptions.length > 0) {
                        setShowProductNameDropdown(true);
                      }
                    }}
                  onBlur={() => {
                    setTimeout(() => setShowProductNameDropdown(false), 200);
                  }}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                  placeholder="请输入产品名称"
                />
                {showProductNameDropdown && productNameOptions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-green-400/30 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {productNameOptions.filter(option => 
                      option.toLowerCase().includes(formData.product_name.toLowerCase())
                    ).map((option, index) => (
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
                      if (formData.product_process && productProcessOptions.length > 0) {
                        setShowProductProcessDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowProductProcessDropdown(false), 200);
                    }}
                    className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
                    placeholder="请输入产品工序"
                  />
                  {showProductProcessDropdown && productProcessOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-green-400/30 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {productProcessOptions.filter(option => 
                        option.toLowerCase().includes(formData.product_process.toLowerCase())
                      ).map((option, index) => (
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
            </CollapsibleSection>
          </div>
        )}

        {/* 编辑工序表单 */}
        {showEditForm && editingProcess && (
          <div className="mb-6">
            <CollapsibleSection
              title="编辑工序"
              defaultExpanded={true}
              className="bg-gray-800 border border-green-500 rounded-lg p-6"
            >
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
                  step="0.001"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full bg-black border border-green-400/30 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  placeholder="请输入单价（精确到小数点后三位）"
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
            </CollapsibleSection>
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
                      序号
                    </th>
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
                  {paginatedProcesses.map((process: any, index: number) => (
                    <tr key={process.id} className="hover:bg-green-900/10">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-green-300">
                          {startIndex + index + 1}
                        </span>
                      </td>
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
                        <span className={`text-sm font-mono ${process.unit_price == null || process.unit_price === undefined ? 'text-red-400 font-bold' : 'text-green-300'}`} title={process.unit_price != null ? `¥${process.unit_price.toFixed(3)}` : '未定价'}>
                          {process.unit_price != null ? `¥${process.unit_price.toFixed(3)}` : '未定价'}
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
              (未定价: {processes.filter(p => p.unit_price == null || p.unit_price === undefined).length} 个)
            </span>
          )}
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 每页显示数量选择 */}
            <div className="flex items-center gap-2 text-sm text-green-400">
              <span>每页显示:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // 重置到第一页
                }}
                className="bg-gray-800 border border-green-400/30 rounded px-2 py-1 text-green-400 focus:outline-none focus:border-green-400"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>条</span>
            </div>

            {/* 分页信息 */}
            <div className="text-sm text-green-400/60">
              显示第 {startIndex + 1} - {Math.min(endIndex, totalItems)} 条，共 {totalItems} 条
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-800 border border-green-400/30 rounded text-green-400 hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                首页
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-800 border border-green-400/30 rounded text-green-400 hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              
              {/* 页码显示 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-gray-800 border-green-400/30 text-green-400 hover:bg-green-900/20'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-800 border border-green-400/30 rounded text-green-400 hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-800 border border-green-400/30 rounded text-green-400 hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                末页
              </button>
            </div>
          </div>
        )}
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