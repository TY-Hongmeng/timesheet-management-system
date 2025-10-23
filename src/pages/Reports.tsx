import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useModuleLoading, MODULE_IDS } from '../contexts/ModuleLoadingContext';
import { checkUserPermission, PERMISSIONS, isSuperAdmin } from '../utils/permissions';
import { 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  User, 

  Filter,
  Download,
  PieChart,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import EditConfirmDialog from '../components/EditConfirmDialog';

// 数据接口定义
interface TimesheetRecord {
  id: string;
  user_id: string;
  work_date: string;
  shift_type: '白班' | '夜班'; // 添加班次类型字段
  status: 'pending' | 'approved' | 'section_chief_approved';
  created_at: string;
  updated_at: string;
  supervisor_approved_at?: string;
  section_chief_approved_at?: string;
  supervisor_id?: string;
  section_chief_id?: string;
  supervisor_name?: string;
  section_chief_name?: string;
  user: {
    id: string;
    name: string;
  };
  supervisor?: {
    id: string;
    name: string;
  } | null;
  section_chief?: {
    id: string;
    name: string;
  } | null;
  items: TimesheetItem[];
  total_amount: number;
  approval_history?: ApprovalHistory[];
}

interface TimesheetItem {
  id: string;
  process_id: string;
  quantity: number;
  unit_price: number;
  amount: number;
  processes: {
    product_process: string;
    product_name: string;
    production_category: string;
    production_line: string;
    unit_price: number;
  };
  modification_history?: ModificationHistory[];
  record?: TimesheetRecord;
}

interface ModificationHistory {
  id: string;
  modifier_id: string;
  modifier_name: string;
  old_quantity: number;
  new_quantity: number;
  old_amount: number;
  new_amount: number;
  modification_reason?: string;
  created_at: string;
  modifier?: {
    name: string;
    role: {
      name: string;
    };
  };
}

interface ApprovalHistory {
  id: string;
  approver_id: string;
  created_at: string;
  approver_type: 'supervisor' | 'section_chief';
  action: 'approved' | 'rejected';
  comment?: string;
  approver?: {
    name: string;
  };
}

interface ReportStats {
  totalRecords: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  supervisorApprovedCount: number;
  sectionChiefApprovedCount: number;
}

const Reports: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { markModuleAsLoaded } = useModuleLoading();
  const navigate = useNavigate();
  const [records, setRecords] = useState<TimesheetRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TimesheetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const [stats, setStats] = useState<ReportStats>({
    totalRecords: 0,
    totalAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    supervisorApprovedCount: 0,
    sectionChiefApprovedCount: 0
  });

  
  // 统计分析数据
  const [analyticsData, setAnalyticsData] = useState({
    dailyStats: [] as any[],
    monthlyStats: [] as any[],
    userStats: [] as any[],
    workTypeStats: {
      production: [] as any[],
      nonProduction: [] as any[],
      productionTotal: 0,
      nonProductionTotal: 0
    },
    duplicateRecords: [] as any[],
    priceIssues: [] as any[],
    workDayStats: [] as any[]
  });

  // 排序状态
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: '', direction: 'asc' });

  // 展开状态管理
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // 项目栏显示/隐藏状态
  const [showProjectColumns, setShowProjectColumns] = useState<boolean>(true);

  // 筛选区域折叠状态
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // 编辑状态管理
  const [editingItem, setEditingItem] = useState<{recordId: string, itemId: string} | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  
  // 确认弹窗状态
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{recordId: string, itemId: string, newQuantity: number} | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{recordId: string, itemId: string, employeeName?: string, workDate?: string, workProject?: string} | null>(null);

  // 筛选条件
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    status: '',
    productionLine: '',
    workType: '',
    productName: '',
    productProcess: '',
    yearMonth: ''
  });

  const [users, setUsers] = useState<Array<{id: string, name: string}>>([]);
  const [productionLines, setProductionLines] = useState<string[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productProcesses, setProductProcesses] = useState<string[]>([]);

  useEffect(() => {
    // 检查用户认证状态
    if (!authLoading && !user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }
    
    if (user) {
      // 检查用户是否有报表查看权限
      checkReportsPermission();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  const checkReportsPermission = async () => {
    console.log('=== checkReportsPermission 被调用 ===');
    console.log('user:', user);
    if (!user) {
      console.log('用户不存在，返回');
      return;
    }
    
    // 这里可以根据需要添加特定的报表权限检查
    // 目前允许所有登录用户查看报表，但会根据公司进行数据过滤
    fetchReportData();
    fetchFilterOptions();
  };

  // 刷新数据
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      // 重新获取报表数据和筛选选项
      await Promise.all([
        fetchReportData(),
        fetchFilterOptions()
      ]);
      
      toast.success('数据刷新成功');
    } catch (error) {
      console.error('刷新数据失败:', error);
      toast.error('刷新数据失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 获取报表数据
  const fetchReportData = async () => {
    console.log('=== fetchReportData 被调用 ===');
    try {
      setLoading(true);
      
      if (!user) {
        console.error('fetchReportData: 用户信息不存在');
        toast.error('用户信息不存在');
        return;
      }
      
      let recordsData;
      
      // 如果不是超级管理员，只能查看自己公司的工时记录
      if (!isSuperAdmin(user.role)) {
        if (!user.company?.id) {
          console.error('fetchReportData: 用户没有关联的公司ID');
          toast.error('用户没有关联的公司，请联系管理员');
          return;
        }
        
        // 先查询当前公司的所有用户ID
        const { data: companyUsers, error: usersError } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', user.company.id);
          
        if (usersError) {
          console.error('查询公司用户失败:', usersError);
          throw usersError;
        }
        
        const companyUserIds = companyUsers?.map(u => u.id) || [];
        
        if (companyUserIds.length === 0) {
          setRecords([]);
          calculateStats([]);
          return;
        }
        
        // 使用用户ID列表过滤工时记录，排除草稿状态
        const { data: filteredRecords, error: recordsError } = await supabase
          .from('timesheet_records')
          .select(`
            *,
            user_name,
            supervisor_name,
            section_chief_name,
            user:user_id(id, name, company_id),
            supervisor:supervisor_id(id, name),
            section_chief:section_chief_id(id, name)
          `)
          .in('user_id', companyUserIds)
          .neq('status', 'draft')
          .order('created_at', { ascending: false });
          
        if (recordsError) throw recordsError;
        recordsData = filteredRecords;
      } else {
        // 超级管理员查看所有工时记录，排除草稿状态
        const { data: allRecords, error: recordsError } = await supabase
          .from('timesheet_records')
          .select(`
            *,
            user_name,
            supervisor_name,
            section_chief_name,
            user:user_id(id, name, company_id),
            supervisor:supervisor_id(id, name),
            section_chief:section_chief_id(id, name)
          `)
          .neq('status', 'draft')
          .order('created_at', { ascending: false });
          
        if (recordsError) throw recordsError;
        recordsData = allRecords;
       }

      // 获取工时记录项（包含工序详细信息）
      const recordIds = recordsData?.map(r => r.id) || [];
      const { data: itemsData, error: itemsError } = await supabase
        .from('timesheet_record_items')
        .select(`
          *,
          processes:process_id(
            product_process,
            product_name,
            production_category,
            production_line,
            unit_price
          )
        `)
        .in('timesheet_record_id', recordIds);

      if (itemsError) throw itemsError;

      // 获取审核历史
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_history')
        .select(`
          *,
          approver_name,
          approver:approver_id(name)
        `)
        .in('timesheet_record_id', recordIds);

      if (approvalError) throw approvalError;

      // 获取修改历史
      const itemIds = itemsData?.map(item => item.id) || [];
      const { data: modificationData, error: modificationError } = await supabase
        .from('timesheet_item_modification_history')
        .select(`
          *,
          modifier_name,
          modifier:modifier_id(
            name,
            role:role_id(name)
          )
        `)
        .in('timesheet_record_item_id', itemIds)
        .order('created_at', { ascending: false });

      if (modificationError) throw modificationError;

      // 调试修改历史数据
      console.log('=== 修改历史查询结果 ===');
      console.log('modificationData:', modificationData);
      console.log('modificationData length:', modificationData?.length || 0);
      if (modificationData && modificationData.length > 0) {
        console.log('第一条修改历史:', modificationData[0]);
      }
      console.log('========================');

      // 组合数据并计算金额
      const recordsWithItems = recordsData?.map(record => {
        const items = itemsData?.filter(item => item.timesheet_record_id === record.id).map(item => {
          const modifications = modificationData?.filter(mod => mod.timesheet_record_item_id === item.id) || [];
          return {
            ...item,
            modification_history: modifications
          };
        }) || [];
        const approvals = approvalData?.filter(approval => approval.timesheet_record_id === record.id) || [];
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        return {
          ...record,
          items,
          approval_history: approvals,
          total_amount: totalAmount
        };
      }) || [];



      setRecords(recordsWithItems);
      calculateStats(recordsWithItems);
      calculateAnalyticsData(recordsWithItems);
    } catch (error) {
      console.error('获取报表数据失败:', error);
      toast.error('获取报表数据失败');
    } finally {
      setLoading(false);
      markModuleAsLoaded(MODULE_IDS.REPORTS);
    }
  };

  // 获取筛选选项
  const fetchFilterOptions = async () => {
    try {
      if (!user) {
        toast.error('用户信息不存在');
        return;
      }

      // 获取用户列表
      let usersQuery = supabase
        .from('users')
        .select('id, name, company_id')
        .eq('is_active', true);

      // 如果不是超级管理员，只能看到自己公司的用户
      if (!isSuperAdmin(user.role)) {
        if (!user.company?.id) {
          console.error('fetchFilterOptions: 用户没有关联的公司ID');
          toast.error('用户没有关联的公司，请联系管理员');
          return;
        }
        usersQuery = usersQuery.eq('company_id', user.company.id);
      }

      const { data: usersData } = await usersQuery.order('name');
      
      if (usersData) {
        setUsers(usersData);
      }

      // 获取工序相关数据（生产线、工时类型、产品名称、产品工序）
      let processesQuery = supabase
        .from('processes')
        .select('production_line, production_category, product_name, product_process')
        .eq('is_active', true);
      
      // 非超级管理员只能看到本公司的数据
      if (!isSuperAdmin(user.role)) {
        processesQuery = processesQuery.eq('company_id', user.company.id);
      }
      
      const { data: processesData } = await processesQuery;
      
      if (processesData) {
        // 生产线列表
        const uniqueLines = [...new Set(processesData.map(p => p.production_line).filter(Boolean))];
        setProductionLines(uniqueLines);
        
        // 工时类型列表
        const uniqueWorkTypes = [...new Set(processesData.map(p => p.production_category).filter(Boolean))];
        setWorkTypes(uniqueWorkTypes);
        
        // 产品名称列表
        const uniqueProductNames = [...new Set(processesData.map(p => p.product_name).filter(Boolean))];
        setProductNames(uniqueProductNames);
        
        // 产品工序列表
        const uniqueProductProcesses = [...new Set(processesData.map(p => p.product_process).filter(Boolean))];
        setProductProcesses(uniqueProductProcesses);
      }
    } catch (error) {
      console.error('获取筛选选项失败:', error);
    }
  };

  // 计算统计数据
  const calculateStats = (data: TimesheetRecord[]) => {
    // 重新计算总金额，确保数据准确性
    const totalAmount = data.reduce((sum, record) => {
      const recordTotalAmount = record.items.reduce((itemSum, item) => itemSum + (item.quantity * item.unit_price), 0);
      return sum + recordTotalAmount;
    }, 0);
    
    const stats: ReportStats = {
      totalRecords: data.length,
      totalAmount: totalAmount,
      pendingCount: data.filter(r => r.status === 'pending').length,
      approvedCount: data.filter(r => r.status === 'approved').length,
      rejectedCount: data.filter(r => (r.status as any) === 'rejected').length,
      supervisorApprovedCount: data.filter(r => r.supervisor_approved_at).length,
      sectionChiefApprovedCount: data.filter(r => r.section_chief_approved_at).length
    };
    setStats(stats);
    
    // 计算分析数据
    calculateAnalyticsData(data);
  };
  
  // 计算分析统计数据
  const calculateAnalyticsData = (data: TimesheetRecord[]) => {
    // 每人每天工时金额统计
    const dailyStats = calculateDailyStats(data);
    
    // 每人每月工作天数统计
    const monthlyStats = calculateMonthlyStats(data);
    
    // 每人工作天数统计（按用户汇总）
    const workDayStats = calculateWorkDayStats(data);
    
    // 用户统计
    const userStats = calculateUserStats(data);
    
    // 工时类型统计
    const workTypeStats = calculateWorkTypeStats(data);
    
    // 重复记录检查（修正逻辑：员工每天干不同工序为正常情况）
    const duplicateRecords = findDuplicateRecords(data).filter(dup => {
      // 只有同一天、同一员工、同一工序的记录才算重复
      return dup.records.some((record, index) => 
        dup.records.slice(index + 1).some(otherRecord => 
          record.work_date === otherRecord.work_date &&
          record.user_id === otherRecord.user_id &&
          record.items.some(item => 
            otherRecord.items.some(otherItem => 
              item.processes?.product_process === otherItem.processes?.product_process
            )
          )
        )
      );
    });
    
    // 工时单价问题检查
    const priceIssues = findPriceIssues(data);
    
    setAnalyticsData({
      dailyStats,
      monthlyStats,
      workDayStats,
      userStats,
      workTypeStats,
      duplicateRecords,
      priceIssues
    });
  };

  // 应用筛选条件
  const applyFilters = () => {
    let filtered = [...records];

    if (filters.startDate) {
      filtered = filtered.filter(r => r.work_date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(r => r.work_date <= filters.endDate);
    }
    if (filters.userId) {
      filtered = filtered.filter(r => r.user_id === filters.userId);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.productionLine) {
      filtered = filtered.filter(r => 
        r.items.some(item => item.processes?.production_line === filters.productionLine)
      );
    }
    if (filters.workType) {
      filtered = filtered.filter(r => 
        r.items.some(item => item.processes?.production_category === filters.workType)
      );
    }
    if (filters.productName) {
      filtered = filtered.filter(r => 
        r.items.some(item => item.processes?.product_name === filters.productName)
      );
    }
    if (filters.productProcess) {
      filtered = filtered.filter(r => 
        r.items.some(item => item.processes?.product_process === filters.productProcess)
      );
    }
    if (filters.yearMonth) {
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.work_date);
        const recordYearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        return recordYearMonth === filters.yearMonth;
      });
    }

    setFilteredRecords(filtered);
    calculateStats(filtered);
    calculateAnalyticsData(filtered);
  };



  // 重置筛选条件
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      status: '',
      productionLine: '',
      workType: '',
      productName: '',
      productProcess: '',
      yearMonth: ''
    });
  };

  // 开始编辑数量
  const startEdit = (recordId: string, itemId: string, currentQuantity: number) => {
    setEditingItem({ recordId, itemId });
    setEditQuantity(currentQuantity);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingItem(null);
    setEditQuantity(0);
  };

  // 确认编辑（显示确认弹窗）
  const confirmEdit = () => {
    if (!editingItem) {
      toast.error('请先选择要编辑的项目');
      return;
    }
    
    if (editQuantity < 0) {
      toast.error('数量不能为负数');
      return;
    }
    
    const pendingEditData = {
      recordId: editingItem.recordId,
      itemId: editingItem.itemId,
      newQuantity: editQuantity
    };
    setPendingEdit(pendingEditData);
    setShowEditConfirm(true);
  };

  // 执行编辑
  const executeEdit = async () => {
    if (!pendingEdit) {
      return;
    }

    try {
      const record = records.find(r => r.id === pendingEdit.recordId);
      const item = record?.items.find(i => i.id === pendingEdit.itemId);
      const unitPrice = item?.unit_price || 0;
      const newAmount = pendingEdit.newQuantity * unitPrice;
      const oldQuantity = item?.quantity || 0;
      const oldAmount = item?.amount || 0;
      
      // 只使用数据库函数更新，它会自动记录修改历史，避免重复插入
      const { error } = await supabase.rpc('update_timesheet_item_with_user', {
        item_id: pendingEdit.itemId,
        new_quantity: pendingEdit.newQuantity,
        new_amount: newAmount,
        modifier_id: user?.id || null,
        modifier_name: user?.name || '未知用户'
      });

      if (error) {
        throw error;
      }

      toast.success('数量修改成功');
      await fetchReportData();
      
      // 重置状态
      setEditingItem(null);
      setEditQuantity(0);
      setPendingEdit(null);
      setShowEditConfirm(false);
    } catch (error) {
      console.error('修改数量失败:', error);
      toast.error('修改数量失败');
    }
  };

  // 删除工时项目（显示确认弹窗）
  const confirmDelete = (recordId: string, itemId: string) => {
    // 查找对应的记录和项目信息
    const record = records.find(r => r.id === recordId);
    const item = record?.items?.find(i => i.id === itemId);
    
    const employeeName = record?.user?.name || '未知员工';
    const workDate = record?.work_date ? formatDate(record.work_date) : '未知日期';
    const workProject = item ? getProcessContent(item) : '未知项目';
    
    const pendingDeleteData = { 
      recordId, 
      itemId, 
      employeeName, 
      workDate, 
      workProject 
    };
    
    setPendingDelete(pendingDeleteData);
    setShowDeleteConfirm(true);
  };

  // 执行删除
  const executeDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      // 先检查这个item所属的record还有多少个items
      const { data: remainingItems, error: checkError } = await supabase
        .from('timesheet_record_items')
        .select('id')
        .eq('timesheet_record_id', pendingDelete.recordId);

      if (checkError) {
        throw checkError;
      }

      // 删除工时项目
      const { error } = await supabase
        .from('timesheet_record_items')
        .delete()
        .eq('id', pendingDelete.itemId);

      if (error) {
        throw error;
      }

      // 如果删除后该记录没有任何items了，也删除主记录
      if (remainingItems && remainingItems.length === 1) {
        const { error: recordError } = await supabase
          .from('timesheet_records')
          .delete()
          .eq('id', pendingDelete.recordId);

        if (recordError) {
          console.error('删除空的工时记录失败:', recordError);
          // 不抛出错误，因为item已经删除成功了
        }
      }

      toast.success('工时项目删除成功');
      await fetchReportData();
      
      // 重置状态
      setPendingDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('删除工时项目失败:', error);
      toast.error('删除工时项目失败');
    }
  };



  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: '待班长审核', icon: '⚠', color: 'text-yellow-400' };
      case 'approved':
        return { text: '待段长审核', icon: '⚠', color: 'text-blue-400' };
      case 'section_chief_approved':
        return { text: '已通过', icon: '✓', color: 'text-green-400' };
      default:
        return { text: '未知', icon: '⚠', color: 'text-gray-400' };
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待班长审核';
      case 'approved':
        return '待段长审核';
      case 'section_chief_approved':
        return '已通过';
      default:
        return '未知';
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusDisplay = getStatusDisplay(status);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${statusDisplay.color}`}>
        <span className="w-3 h-3 text-center">{statusDisplay.icon}</span>
        {statusDisplay.text}
      </span>
    );
  };

  // 获取工序完整内容
  const getProcessContent = (item: TimesheetItem) => {
    const workType = item.processes?.production_category || '未知工时类型';
    const productName = item.processes?.product_name || '未知产品';
    const processName = item.processes?.product_process || '未知工序';
    return `${workType} - ${productName} - ${processName}`;
  };

  // 格式化修改历史（用于Excel导出）
  const formatModificationHistoryText = (item: TimesheetItem & { record?: TimesheetRecord }) => {
    if (!item.modification_history || item.modification_history.length === 0) {
      return '暂无修改记录';
    }

    return item.modification_history.map(mod => {
      const date = new Date(mod.created_at).toLocaleDateString('zh-CN');
      let modifierName = '未知用户';
      
      // 简化逻辑：直接使用现有字段
      if (mod.modifier?.name) {
        modifierName = mod.modifier.name;
      } else if (mod.modifier_name) {
        modifierName = mod.modifier_name;
      } else if (item.record && mod.modifier_id) {
        // 直接匹配ID并使用冗余字段
        if (mod.modifier_id === item.record.supervisor_id && item.record.supervisor_name) {
          modifierName = item.record.supervisor_name;
        } else if (mod.modifier_id === item.record.section_chief_id && item.record.section_chief_name) {
          modifierName = item.record.section_chief_name;
        }
      } else if (item.record && !mod.modifier_id) {
        // 如果没有 modifier_id，直接使用班长姓名（因为通常是班长在审核时修改）
        if (item.record.supervisor_name) {
          modifierName = item.record.supervisor_name;
        } else if (item.record.section_chief_name) {
          modifierName = item.record.section_chief_name;
        }
      }
      
      return `${modifierName} ${date} ${mod.old_quantity}→${mod.new_quantity}`;
    }).join('; ');
  };

  // 格式化修改历史（用于界面显示）
  const formatModificationHistory = (item: TimesheetItem & { record?: TimesheetRecord }) => {
    if (!item.modification_history || item.modification_history.length === 0) {
      return <span className="text-gray-400">暂无修改记录</span>;
    }

    // 去重处理
    const uniqueHistory = item.modification_history.filter((mod, index, arr) => {
      return index === arr.findIndex(m => 
        m.created_at === mod.created_at && 
        m.old_quantity === mod.old_quantity && 
        m.new_quantity === mod.new_quantity &&
        m.modifier_id === mod.modifier_id
      );
    });

    const historyTexts = uniqueHistory.map(mod => {
      // 格式化日期（只要日期，不要时间）
      const date = new Date(mod.created_at).toLocaleDateString('zh-CN');
      let modifierName = '未知用户';
      

      
      // 简化逻辑：直接使用现有字段
      if (mod.modifier?.name) {
        modifierName = mod.modifier.name;
      } else if (mod.modifier_name) {
        modifierName = mod.modifier_name;
      } else if (item.record && mod.modifier_id) {
        // 直接匹配ID并使用冗余字段
        if (mod.modifier_id === item.record.supervisor_id && item.record.supervisor_name) {
          modifierName = item.record.supervisor_name;

        } else if (mod.modifier_id === item.record.section_chief_id && item.record.section_chief_name) {
          modifierName = item.record.section_chief_name;

        }
      } else if (item.record && !mod.modifier_id) {
        // 如果没有 modifier_id，直接使用班长姓名（因为通常是班长在审核时修改）
        if (item.record.supervisor_name) {
          modifierName = item.record.supervisor_name;
        } else if (item.record.section_chief_name) {
          modifierName = item.record.section_chief_name;
        }
      }
      
      // 格式：姓名 日期 原数量→新数量
      const result = `${modifierName} ${date} ${mod.old_quantity}→${mod.new_quantity}`;

      return result;
    });

    return (
      <span className="text-xs text-gray-300">
        {historyTexts.join('; ')}
      </span>
    );
  };

  // 获取角色的中文显示
  const getRoleDisplay = (roleName: string) => {
    // 直接使用角色名称，因为数据库中存储的就是中文角色名
    if (roleName) {
      return roleName;
    }
    
    // 如果没有角色名称，返回默认值
    return '用户';
  };
  
  // 每人每天工时金额统计
  const calculateDailyStats = (data: TimesheetRecord[]) => {
    const dailyMap = new Map();
    
    data.forEach(record => {
      const key = `${record.user?.id}-${record.work_date}`;
      const existing = dailyMap.get(key);
      
      // 重新计算每条记录的总金额，确保数据准确性
      const recordTotalAmount = record.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      if (existing) {
        existing.totalAmount += recordTotalAmount;
        existing.recordCount += 1;
      } else {
        dailyMap.set(key, {
          userId: record.user?.id,
          userName: record.user?.name,
          workDate: record.work_date,
          totalAmount: recordTotalAmount,
          recordCount: 1,
          items: record.items
        });
      }
    });
    
    return Array.from(dailyMap.values()).sort((a, b) => 
      new Date(b.workDate).getTime() - new Date(a.workDate).getTime()
    );
  };
  
  // 判断是否为工作日（排除周末和法定节假日）
  const isWorkingDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    // 周末
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // 简化的法定节假日判断（可根据实际需求扩展）
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 元旦
    if (month === 1 && day === 1) return false;
    // 春节假期（简化为农历正月初一到初三，这里用公历近似）
    if (month === 1 && day >= 21 && day <= 27) return false;
    if (month === 2 && day >= 10 && day <= 16) return false;
    // 清明节（4月4日或5日）
    if (month === 4 && (day === 4 || day === 5)) return false;
    // 劳动节
    if (month === 5 && day >= 1 && day <= 3) return false;
    // 端午节（农历五月初五，这里用公历近似）
    if (month === 6 && day >= 20 && day <= 22) return false;
    // 中秋节（农历八月十五，这里用公历近似）
    if (month === 9 && day >= 15 && day <= 17) return false;
    // 国庆节
    if (month === 10 && day >= 1 && day <= 7) return false;
    
    return true;
  };

  // 每人工作天数统计（按用户汇总，不按月份）
  const calculateWorkDayStats = (data: TimesheetRecord[]) => {
    const userMap = new Map();
    
    data.forEach(record => {
      const date = new Date(record.work_date);
      const userId = record.user?.id;
      const existing = userMap.get(userId);
      
      const isWorking = isWorkingDay(date);
      
      // 重新计算每条记录的总金额，确保数据准确性
      const recordTotalAmount = record.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      if (existing) {
        existing.totalAmount += recordTotalAmount;
        existing.workDates.add(record.work_date);
        
        if (isWorking) {
          existing.workingAmount += recordTotalAmount;
          existing.workingDates.add(record.work_date);
        } else {
          existing.holidayAmount += recordTotalAmount;
          existing.holidayDates.add(record.work_date);
        }
      } else {
        userMap.set(userId, {
          userId: record.user?.id,
          userName: record.user?.name,
          totalAmount: recordTotalAmount,
          workingAmount: isWorking ? recordTotalAmount : 0,
          holidayAmount: isWorking ? 0 : recordTotalAmount,
          workDates: new Set([record.work_date]),
          workingDates: new Set(isWorking ? [record.work_date] : []),
          holidayDates: new Set(isWorking ? [] : [record.work_date])
        });
      }
    });
    
    return Array.from(userMap.values()).map(stat => ({
      ...stat,
      actualWorkDays: stat.workingDates.size, // 修复：使用实际工作日天数，不包括节假日
      actualWorkingDays: stat.workingDates.size,
      actualHolidayDays: stat.holidayDates.size,
      avgDailyAmount: stat.totalAmount / stat.workDates.size,
      avgWorkingDayAmount: stat.workingDates.size > 0 ? stat.workingAmount / stat.workingDates.size : 0,
      avgHolidayDayAmount: stat.holidayDates.size > 0 ? stat.holidayAmount / stat.holidayDates.size : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  // 每人每月工作天数统计（保留原有功能）
  const calculateMonthlyStats = (data: TimesheetRecord[]) => {
    const monthlyMap = new Map();
    
    data.forEach(record => {
      const date = new Date(record.work_date);
      const monthKey = `${record.user?.id}-${date.getFullYear()}-${date.getMonth() + 1}`;
      const existing = monthlyMap.get(monthKey);
      
      const isWorking = isWorkingDay(date);
      
      // 重新计算每条记录的总金额，确保数据准确性
      const recordTotalAmount = record.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      if (existing) {
        existing.totalAmount += recordTotalAmount;
        existing.totalDays += 1;
        if (isWorking) {
          existing.workDays += 1;
          existing.workAmount += recordTotalAmount;
        } else {
          existing.holidayDays += 1;
          existing.holidayAmount += recordTotalAmount;
        }
      } else {
        monthlyMap.set(monthKey, {
          userId: record.user?.id,
          userName: record.user?.name,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          totalDays: 1,
          workDays: isWorking ? 1 : 0,
          holidayDays: isWorking ? 0 : 1,
          totalAmount: recordTotalAmount,
          workAmount: isWorking ? recordTotalAmount : 0,
          holidayAmount: isWorking ? 0 : recordTotalAmount
        });
      }
    });
    
    return Array.from(monthlyMap.values()).map(stat => ({
      ...stat,
      avgDailyAmount: stat.totalAmount / stat.totalDays
    })).sort((a, b) => b.year - a.year || b.month - a.month);
  };
  
  // 用户统计
  const calculateUserStats = (data: TimesheetRecord[]) => {
    const userMap = new Map();
    
    data.forEach(record => {
      // 只统计有实际工作项目的记录
      if (!record.items || record.items.length === 0) {
        return;
      }
      
      const existing = userMap.get(record.user?.id);
      // 重新计算每条记录的总金额和总工时数量，确保数据准确性
      const recordTotalAmount = record.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const recordTotalQuantity = record.items.reduce((sum, item) => sum + item.quantity, 0);
      
      if (existing) {
        existing.totalAmount += recordTotalAmount;
        existing.totalQuantity += recordTotalQuantity;
        existing.recordCount += 1;
        existing.dates.add(record.work_date);
      } else {
        const newStat = {
          userId: record.user?.id,
          userName: record.user?.name,
          totalAmount: recordTotalAmount,
          totalQuantity: recordTotalQuantity,
          recordCount: 1,
          dates: new Set([record.work_date])
        };
        userMap.set(record.user?.id, newStat);
      }
    });
    
    const result = Array.from(userMap.values()).map(stat => ({
      ...stat,
      workDays: stat.dates.size,
      avgDailyAmount: stat.totalAmount / stat.dates.size,
      avgDailyQuantity: stat.totalQuantity / stat.dates.size
    })).sort((a, b) => b.totalAmount - a.totalAmount);
    
    return result;
  };
  
  // 工时类型统计
  const calculateWorkTypeStats = (data: TimesheetRecord[]) => {
    const productionMap = new Map();
    const nonProductionMap = new Map();
    
    data.forEach(record => {
      record.items.forEach(item => {
        const category = item.processes?.production_category || '未知类型';
        const isProduction = category.includes('生产') || category.includes('加工');
        
        const targetMap = isProduction ? productionMap : nonProductionMap;
        const existing = targetMap.get(category);
        
        const itemAmount = item.quantity * item.unit_price;
        
        if (existing) {
          existing.totalAmount += itemAmount;
          existing.quantity += item.quantity;
          existing.recordCount += 1;
        } else {
          targetMap.set(category, {
            category,
            totalAmount: itemAmount,
            quantity: item.quantity,
            recordCount: 1,
            isProduction
          });
        }
      });
    });
    
    const productionStats = Array.from(productionMap.values());
    const nonProductionStats = Array.from(nonProductionMap.values());
    
    return {
      production: productionStats.sort((a, b) => b.totalAmount - a.totalAmount),
      nonProduction: nonProductionStats.sort((a, b) => b.totalAmount - a.totalAmount),
      productionTotal: productionStats.reduce((sum, stat) => sum + stat.totalAmount, 0),
      nonProductionTotal: nonProductionStats.reduce((sum, stat) => sum + stat.totalAmount, 0)
    };
  };
  
  // 查找重复记录
  const findDuplicateRecords = (data: TimesheetRecord[]) => {
    const duplicates = [];
    const processMap = new Map();
    
    data.forEach(record => {
      record.items.forEach(item => {
        const key = `${record.user?.id}-${record.work_date}-${item.process_id}`;
        const existing = processMap.get(key);
        
        if (existing) {
          duplicates.push({
            userId: record.user?.id,
            userName: record.user?.name,
            workDate: record.work_date,
            processId: item.process_id,
            processName: getProcessContent(item),
            records: [existing.record, record],
            items: [existing.item, item]
          });
        } else {
          processMap.set(key, { record, item });
        }
      });
    });
    
    return duplicates;
  };
  
  // 查找工时单价问题
  const findPriceIssues = (data: TimesheetRecord[]) => {
    const issues = [];
    
    data.forEach(record => {
      record.items.forEach(item => {
        if (item.unit_price == null || item.unit_price === undefined) {
          issues.push({
            recordId: record.id,
            userId: record.user?.id,
            userName: record.user?.name,
            workDate: record.work_date,
            processId: item.process_id,
            processName: getProcessContent(item),
            issue: '单价为空或无效',
            unitPrice: item.unit_price
          });
        }
        
        if (!item.processes) {
          issues.push({
            recordId: record.id,
            userId: record.user?.id,
            userName: record.user?.name,
            workDate: record.work_date,
            processId: item.process_id,
            processName: '工序信息缺失',
            issue: '工序引用缺失',
            unitPrice: item.unit_price
          });
        }
      });
    });
    
    return issues;
  };

  // 排序函数
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ ...sortConfig, key, direction });
  };

  // 获取排序后的用户统计数据
  const getSortedUserStats = () => {
    // 过滤掉没有工时数据的员工（总工时数量为0或总工时金额为0）
    let filteredData = analyticsData.userStats.filter(userStat => 
      userStat.totalQuantity > 0 || userStat.totalAmount > 0
    );
    
    // 应用排序
    if (!sortConfig.key) {
      return filteredData;
    }

    const sortedData = [...filteredData].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sortedData;
  };

  // 获取排序值
  const getSortValue = (userStat: any, key: string) => {
    const userRecords = filteredRecords.filter(r => r.user?.id === userStat.userId);
    const userWorkTypeStats = calculateWorkTypeStats(userRecords);
    const userWorkDayStats = analyticsData.workDayStats.find(w => w.userId === userStat.userId);
    const userDuplicates = analyticsData.duplicateRecords.filter(d => d.userId === userStat.userId);
    const userPriceIssues = analyticsData.priceIssues.filter(p => p.userId === userStat.userId);

    switch (key) {
      case 'userName':
        return userStat.userName;
      case 'totalQuantity':
        return userStat.totalQuantity;
      case 'totalAmount':
        return userStat.totalAmount;
      case 'workDays':
        return userStat.workDays;
      case 'avgDailyQuantity':
        return userStat.avgDailyQuantity;
      case 'workingDays':
        return userWorkDayStats?.actualWorkingDays || 0;
      case 'holidayDays':
        return userWorkDayStats?.actualHolidayDays || 0;
      case 'workingAmount':
        return userWorkDayStats?.workingAmount || 0;
      case 'holidayAmount':
        return userWorkDayStats?.holidayAmount || 0;
      case 'avgDailyAmount':
        return userStat.avgDailyAmount;
      case 'productionTotal':
        return userWorkTypeStats.productionTotal || 0;
      case 'nonProductionTotal':
        return userWorkTypeStats.nonProductionTotal || 0;
      case 'duplicateCount':
        return userDuplicates.length;
      case 'priceIssueCount':
        return userPriceIssues.length;
      case 'totalIssues':
        return userDuplicates.length + userPriceIssues.length;
      default:
        return 0;
    }
  };

  // 获取排序图标 - 已移除排序箭头显示
  const getSortIcon = (key: string) => {
    return null;
  };

  // 获取审核信息
  const getApprovalInfo = (record: TimesheetRecord, type: 'supervisor' | 'section_chief') => {
    const approval = record.approval_history?.find(a => a.approver_type === type);
    if (approval) {
      return {
        name: approval.approver?.name || '未知',
        date: formatDate(approval.created_at)
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse font-mono">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-300">
      {/* Header */}
      <header className="bg-gray-900 border-b border-green-400 px-2 sm:px-4 lg:px-6 py-4">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-4xl font-bold text-green-400 font-mono flex items-center gap-2">
              <BarChart3 className="w-5 h-5 sm:w-8 sm:h-8" />
              查看报表
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:from-gray-600 disabled:to-gray-800 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? '刷新中...' : '刷新'}</span>
                <span className="sm:hidden">{refreshing ? '...' : '刷新'}</span>
              </button>

              <Link 
                to="/dashboard" 
                className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">返回控制台</span>
                <span className="sm:hidden">返回</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-2 sm:px-4 lg:px-6 py-6">


        {/* 视图切换和筛选条件 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-green-400 font-mono">数据筛选</h2>
              <button
                onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                className="p-1 text-green-400 hover:text-green-300 transition-colors duration-200"
              >
                {isFilterCollapsed ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </button>
            </div>
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 border border-green-400 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-mono text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">重置筛选</span>
              <span className="sm:hidden">重置</span>
            </button>
          </div>
          
          {!isFilterCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                年月
              </label>
              <input
                type="month"
                value={filters.yearMonth}
                onChange={(e) => setFilters({...filters, yearMonth: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                开始日期
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                结束日期
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              />
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                员工
              </label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({...filters, userId: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部员工</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部状态</option>
                <option value="pending">待班长审核</option>
                <option value="approved">待段长审核</option>
                <option value="section_chief_approved">已通过</option>
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                生产线
              </label>
              <select
                value={filters.productionLine}
                onChange={(e) => setFilters({...filters, productionLine: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部生产线</option>
                {productionLines.map(line => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                工时类型
              </label>
              <select
                value={filters.workType}
                onChange={(e) => setFilters({...filters, workType: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部工时类型</option>
                {workTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                产品名称
              </label>
              <select
                value={filters.productName}
                onChange={(e) => setFilters({...filters, productName: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部产品</option>
                {productNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-green-300 text-sm font-medium mb-2 font-mono">
                产品工序
              </label>
              <select
                value={filters.productProcess}
                onChange={(e) => setFilters({...filters, productProcess: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono focus:outline-none focus:border-green-400"
              >
                <option value="">全部工序</option>
                {productProcesses.map(process => (
                  <option key={process} value={process}>{process}</option>
                ))}
              </select>
            </div>
          </div>
          )}

        </div>

        {/* 数据显示区域 - 统计分析视图 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
          {/* 统计分析视图 - 表格形式 */
          <div className="bg-gray-900 border border-green-400 rounded-lg overflow-hidden">
            {/* 表格头部 */}
            <div className="bg-gray-800 border-b border-green-600 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-green-400 font-mono flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  统计分析
                </h3>
                <div className="flex items-center gap-4">

                  
                  <button
                    onClick={async () => {
                      // 导入xlsx库
                      const XLSX = await import('xlsx');
                      
                      // 准备统计分析数据
                      const statsData = getSortedUserStats().map(userStat => {
                        const userRecords = filteredRecords.filter(r => r.user?.id === userStat.userId);
                        const userWorkTypeStats = calculateWorkTypeStats(userRecords);
                        const userWorkDayStats = analyticsData.workDayStats.find(w => w.userId === userStat.userId);
                        const userDuplicates = analyticsData.duplicateRecords.filter(d => d.userId === userStat.userId);
                        const userPriceIssues = analyticsData.priceIssues.filter(p => p.userId === userStat.userId);
                        
                        return {
                          '姓名': userStat.userName,
                          '总额': userStat.totalAmount.toFixed(2),
                          '天数': userWorkDayStats?.actualWorkDays || userStat.workDays,
                          '日平均': userStat.avgDailyAmount.toFixed(2),
                          '生产工时金额': userWorkTypeStats.productionTotal?.toFixed(2) || '0.00',
                          '非生产工时金额': userWorkTypeStats.nonProductionTotal?.toFixed(2) || '0.00',
                          '重复记录数': userDuplicates.length,
                          '单价问题数': userPriceIssues.length,
                          '异常总数': userDuplicates.length + userPriceIssues.length
                        };
                      });
                      
                      // 准备详细记录数据（调整列顺序：生产线移到生产类别前面）
                      const detailData = filteredRecords.flatMap(record => 
                        record.items.map(item => {
                          const supervisorApproval = getApprovalInfo(record, 'supervisor');
                          const sectionChiefApproval = getApprovalInfo(record, 'section_chief');
                          
                          return {
                            '工作日期': formatDate(record.work_date),
                            '员工姓名': record.user?.name || '未知',
                            '班次': record.shift_type || '白班',
                            '生产线': item.processes?.production_line || '未知',
                            '生产类别': item.processes?.production_category || '未知',
                            '产品名称': item.processes?.product_name || '未知',
                            '工序名称': item.processes?.product_process || '未知',
                            '数量': item.quantity,
                            '单价': item.unit_price != null ? item.unit_price.toFixed(3) : '未定义',
                            '金额': item.amount.toFixed(2),
                            '状态': getStatusText(record.status),
                            '班长': supervisorApproval ? supervisorApproval.name : (record.supervisor?.name || '未分配'),
                            '段长': sectionChiefApproval ? sectionChiefApproval.name : (record.section_chief?.name || '未分配'),
                            '修改历史': formatModificationHistoryText({ ...item, record }),
                            '创建时间': formatDateTime(record.created_at)
                          };
                        })
                      );
                      
                      // 准备工时统计分析汇总数据
                      const analysisSummaryData = (() => {
                        const summaryMap = new Map();
                        
                        filteredRecords.forEach(record => {
                          record.items.forEach(item => {
                            const key = `${item.processes?.production_line || '未知'}-${item.processes?.production_category || '未知'}-${item.processes?.product_name || '未知'}-${item.processes?.product_process || '未知'}`;
                            
                            if (!summaryMap.has(key)) {
                              summaryMap.set(key, {
                                productionLine: item.processes?.production_line || '未知',
                                productionCategory: item.processes?.production_category || '未知',
                                productName: item.processes?.product_name || '未知',
                                productProcess: item.processes?.product_process || '未知',
                                totalQuantity: 0,
                                totalAmount: 0
                              });
                            }
                            
                            const summary = summaryMap.get(key);
                            summary.totalQuantity += item.quantity;
                            summary.totalAmount += item.amount;
                          });
                        });
                        
                        return Array.from(summaryMap.values()).sort((a, b) => {
                          if (a.productionCategory !== b.productionCategory) {
                            return a.productionCategory.localeCompare(b.productionCategory);
                          }
                          return b.totalAmount - a.totalAmount;
                        }).map(summary => ({
                          '生产线': summary.productionLine,
                          '生产类别': summary.productionCategory,
                          '产品名称': summary.productName,
                          '工序名称': summary.productProcess,
                          '总数量': summary.totalQuantity.toFixed(1),
                          '总金额': summary.totalAmount.toFixed(2)
                        }));
                      })();
                      
                      // 准备统计汇总数据
                      const summaryData = [];
                      getSortedUserStats().forEach(userStat => {
                        const userRecords = filteredRecords.filter(r => r.user?.id === userStat.userId);
                        const userItems = userRecords.flatMap(record => 
                          record.items.map(item => ({
                            ...item,
                            workDate: record.work_date
                          }))
                        );
                        
                        // 按生产类别、生产线、产品名称、工序名称分组统计
                        const statsMap = new Map();
                        
                        userItems.forEach(item => {
                          const key = `${item.processes?.production_category || '未知'}-${item.processes?.production_line || '未知'}-${item.processes?.product_name || '未知'}-${item.processes?.product_process || '未知'}`;
                          
                          if (!statsMap.has(key)) {
                            statsMap.set(key, {
                              productionCategory: item.processes?.production_category || '未知',
                              productionLine: item.processes?.production_line || '未知',
                              productName: item.processes?.product_name || '未知',
                              productProcess: item.processes?.product_process || '未知',
                              totalQuantity: 0,
                              recordCount: 0
                            });
                          }
                          
                          const stat = statsMap.get(key);
                          stat.totalQuantity += item.quantity;
                          stat.recordCount += 1;
                        });
                        
                        const statsArray = Array.from(statsMap.values());
                        statsArray.forEach(stat => {
                          summaryData.push({
                            '员工姓名': userStat.userName,
                            '生产类别': stat.productionCategory,
                            '生产线': stat.productionLine,
                            '产品名称': stat.productName,
                            '工序名称': stat.productProcess,
                            '数量总计': stat.totalQuantity.toFixed(1),
                            '记录条数': stat.recordCount
                          });
                        });
                      });
                      
                      // 创建工作簿
                      const workbook = XLSX.utils.book_new();
                      
                      // 添加统计分析工作表
                      const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
                      
                      // 设置列宽
                      const statsColWidths = [
                        { wch: 12 }, // 姓名
                        { wch: 10 }, // 总额
                        { wch: 8 },  // 天数
                        { wch: 10 }, // 日平均
                        { wch: 15 }, // 生产工时金额
                        { wch: 15 }, // 非生产工时金额
                        { wch: 12 }, // 重复记录数
                        { wch: 12 }, // 单价问题数
                        { wch: 10 }  // 异常总数
                      ];
                      statsWorksheet['!cols'] = statsColWidths;
                      
                      // 设置表头样式
                      const statsRange = XLSX.utils.decode_range(statsWorksheet['!ref'] || 'A1');
                      for (let col = statsRange.s.c; col <= statsRange.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                        if (!statsWorksheet[cellAddress]) continue;
                        statsWorksheet[cellAddress].s = {
                          font: { bold: true, color: { rgb: 'FFFFFF' } },
                          fill: { fgColor: { rgb: '4A5568' } },
                          alignment: { horizontal: 'center' }
                        };
                      }
                      
                      XLSX.utils.book_append_sheet(workbook, statsWorksheet, '工时统计分析');
                      
                      // 添加工时统计分析汇总工作表
                      const analysisSummaryWorksheet = XLSX.utils.json_to_sheet(analysisSummaryData);
                      
                      // 设置工时统计分析汇总列宽
                      const analysisSummaryColWidths = [
                        { wch: 12 }, // 生产线
                        { wch: 12 }, // 生产类别
                        { wch: 15 }, // 产品名称
                        { wch: 15 }, // 工序名称
                        { wch: 10 }, // 总数量
                        { wch: 12 }  // 总金额
                      ];
                      analysisSummaryWorksheet['!cols'] = analysisSummaryColWidths;
                      
                      // 设置工时统计分析汇总表头样式
                      const analysisSummaryRange = XLSX.utils.decode_range(analysisSummaryWorksheet['!ref'] || 'A1');
                      for (let col = analysisSummaryRange.s.c; col <= analysisSummaryRange.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                        if (!analysisSummaryWorksheet[cellAddress]) continue;
                        analysisSummaryWorksheet[cellAddress].s = {
                          font: { bold: true, color: { rgb: 'FFFFFF' } },
                          fill: { fgColor: { rgb: '2B6CB0' } },
                          alignment: { horizontal: 'center' }
                        };
                      }
                      
                      // 添加自动筛选
                      analysisSummaryWorksheet['!autofilter'] = { ref: analysisSummaryWorksheet['!ref'] };
                      
                      XLSX.utils.book_append_sheet(workbook, analysisSummaryWorksheet, '工时统计分析汇总');
                      
                      // 添加详细记录工作表
                      const detailWorksheet = XLSX.utils.json_to_sheet(detailData);
                      
                      // 设置详细记录列宽（添加班次列和修改历史列）
                      const detailColWidths = [
                        { wch: 12 }, // 工作日期
                        { wch: 12 }, // 员工姓名
                        { wch: 8 },  // 班次
                        { wch: 10 }, // 生产线
                        { wch: 12 }, // 生产类别
                        { wch: 15 }, // 产品名称
                        { wch: 15 }, // 工序名称
                        { wch: 8 },  // 数量
                        { wch: 10 }, // 单价
                        { wch: 10 }, // 金额
                        { wch: 12 }, // 状态
                        { wch: 15 }, // 班长
                        { wch: 15 }, // 段长
                        { wch: 20 }, // 修改历史
                        { wch: 18 }  // 创建时间
                      ];
                      detailWorksheet['!cols'] = detailColWidths;
                      
                      // 设置详细记录表头样式
                      const detailRange = XLSX.utils.decode_range(detailWorksheet['!ref'] || 'A1');
                      for (let col = detailRange.s.c; col <= detailRange.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                        if (!detailWorksheet[cellAddress]) continue;
                        detailWorksheet[cellAddress].s = {
                          font: { bold: true, color: { rgb: 'FFFFFF' } },
                          fill: { fgColor: { rgb: '2D3748' } },
                          alignment: { horizontal: 'center' }
                        };
                      }
                      
                      // 添加自动筛选
                      detailWorksheet['!autofilter'] = { ref: detailWorksheet['!ref'] };
                      
                      XLSX.utils.book_append_sheet(workbook, detailWorksheet, '详细工时记录');
                      
                      // 添加统计汇总工作表
                      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
                      
                      // 设置汇总列宽
                      const summaryColWidths = [
                        { wch: 12 }, // 员工姓名
                        { wch: 12 }, // 生产类别
                        { wch: 10 }, // 生产线
                        { wch: 15 }, // 产品名称
                        { wch: 15 }, // 工序名称
                        { wch: 10 }, // 数量总计
                        { wch: 10 }  // 记录条数
                      ];
                      summaryWorksheet['!cols'] = summaryColWidths;
                      
                      // 设置汇总表头样式
                      const summaryRange = XLSX.utils.decode_range(summaryWorksheet['!ref'] || 'A1');
                      for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                        if (!summaryWorksheet[cellAddress]) continue;
                        summaryWorksheet[cellAddress].s = {
                          font: { bold: true, color: { rgb: 'FFFFFF' } },
                          fill: { fgColor: { rgb: '1A202C' } },
                          alignment: { horizontal: 'center' }
                        };
                      }
                      
                      // 添加自动筛选和分组功能
                      summaryWorksheet['!autofilter'] = { ref: summaryWorksheet['!ref'] };
                      
                      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '数量统计汇总');
                      
                      // 导出Excel文件
                      const fileName = `工时报告_${new Date().toISOString().split('T')[0]}.xlsx`;
                      XLSX.writeFile(workbook, fileName);
                      
                      toast.success('报告导出成功！');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors font-mono text-sm"
                  >
                    <Download className="w-4 h-4" />
                    导出报告
                  </button>
                </div>
              </div>
            </div>
            
            {/* 统计分析表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-green-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('userName')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        员工姓名
                      </button>
                    </th>

                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('totalAmount')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        总额
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('workDays')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        天数
                      </button>
                    </th>


                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('avgDailyAmount')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        日平均
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('productionTotal')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        生产工时金额
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('nonProductionTotal')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        非生产工时金额
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('duplicateCount')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        重复记录({analyticsData.duplicateRecords.length})
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">
                      <button 
                        onClick={() => handleSort('priceIssueCount')}
                        className="flex items-center gap-1 hover:text-green-300 transition-colors"
                      >
                        单价问题({analyticsData.priceIssues.length})
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-green-400 font-mono text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedUserStats().map((userStat, userIndex) => {
                    // 获取该用户的详细统计数据
                    const userDailyStats = analyticsData.dailyStats.filter(d => d.userId === userStat.userId);
                    const userMonthlyStats = analyticsData.monthlyStats.filter(m => m.userId === userStat.userId);
                    const userWorkDayStats = analyticsData.workDayStats.find(w => w.userId === userStat.userId);
                    const userDuplicates = analyticsData.duplicateRecords.filter(d => d.userId === userStat.userId);
                    const userPriceIssues = analyticsData.priceIssues.filter(p => p.userId === userStat.userId);
                    
                    // 计算该用户的工时类型统计
                    const userRecords = filteredRecords.filter(r => r.user?.id === userStat.userId);
                    const userWorkTypeStats = calculateWorkTypeStats(userRecords);
                    
                    // 判断是否有异常
                    const hasIssues = userDuplicates.length > 0 || userPriceIssues.length > 0;
                    
                    return (
                      <React.Fragment key={userIndex}>
                        <tr 
                          className={`border-b transition-colors ${
                            hasIssues 
                              ? 'border-red-500 bg-red-900 bg-opacity-20 hover:bg-red-900 hover:bg-opacity-30' 
                              : 'border-gray-700 hover:bg-gray-800'
                          }`}
                        >
                          <td className="px-4 py-3 text-green-300 font-mono text-sm font-medium">
                            {userStat.userName}
                          </td>

                          <td className="px-4 py-3 text-green-300 font-mono text-sm font-bold">
                            ¥{userStat.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-green-300 font-mono text-sm">
                            {userStat.workDays}
                          </td>


                          <td className="px-4 py-3 text-purple-300 font-mono text-sm">
                            ¥{userStat.avgDailyAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-blue-300 font-mono text-sm">
                            ¥{userWorkTypeStats.productionTotal?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-red-300 font-mono text-sm">
                            ¥{userWorkTypeStats.nonProductionTotal?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {userDuplicates.length > 0 ? (
                              <span className="text-yellow-400 font-bold">{userDuplicates.length}</span>
                            ) : (
                              <span className="text-green-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {userPriceIssues.length > 0 ? (
                              <span className="text-red-400 font-bold">{userPriceIssues.length}</span>
                            ) : (
                              <span className="text-green-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newExpandedUsers = new Set(expandedUsers);
                                  if (expandedUsers.has(userStat.userId)) {
                                    newExpandedUsers.delete(userStat.userId);
                                  } else {
                                    newExpandedUsers.add(userStat.userId);
                                  }
                                  setExpandedUsers(newExpandedUsers);
                                }}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title={expandedUsers.has(userStat.userId) ? "收起详细记录" : "展开详细记录"}
                              >
                                {expandedUsers.has(userStat.userId) ? (
                                  <ArrowUp className="w-4 h-4" />
                                ) : (
                                  <ArrowDown className="w-4 h-4" />
                                )}
                              </button>
                              {hasIssues && (
                                <span className="text-red-400" title="存在异常数据">
                                  ⚠
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedUsers.has(userStat.userId) && (() => {
                          // 获取该用户的所有记录
                          const userRecords = filteredRecords.filter(record => record.user?.id === userStat.userId);
                          
                          // 如果用户没有详细工时记录，则完全隐藏详细记录区域
                          if (userRecords.length === 0 || userRecords.every(record => record.items.length === 0)) {
                            return null;
                          }
                          
                          return (
                            <tr className="bg-gray-800 border-b border-gray-600">
                              <td colSpan={11} className="px-4 py-4">
                                <div className="bg-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-lg font-bold text-green-400 font-mono flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    {userStat.userName} - 详细工时记录
                                  </h4>
                                </div>
                                
                                {/* 详细记录按日期分组 - 表格形式 */}
                                <div className="bg-gray-600 rounded-lg overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-gray-700">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">工作日期</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">班次</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">日工时金额</th>
                                          {showProjectColumns && (
                                            <>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">生产线</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">生产类别</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">产品名称</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">工序名称</th>
                                            </>
                                          )}
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">数量</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">单价</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">金额</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">状态</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">班长</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">段长</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">修改历史</th>
                                          <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">操作</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(() => {
                                        
                                        // 按日期分组
                                        const recordsByDate = userRecords.reduce((groups, record) => {
                                          const dateKey = record.work_date;
                                          if (!groups[dateKey]) {
                                            groups[dateKey] = [];
                                          }
                                          groups[dateKey].push(record);
                                          return groups;
                                        }, {} as Record<string, typeof userRecords>);
                                        
                                        // 按日期排序
                                        const sortedDates = Object.keys(recordsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                                        
                                        return sortedDates.flatMap(date => {
                                          const dateRecords = recordsByDate[date];
                                          // 计算该日期的总金额
                                          const dailyTotal = dateRecords.reduce((sum, record) => 
                                            sum + record.items.reduce((itemSum, item) => itemSum + item.amount, 0), 0
                                          );
                                          
                                          // 获取该日期的所有工时项目
                                          const allItems = dateRecords.flatMap(record => 
                                            record.items.map(item => ({ ...item, record }))
                                          );
                                          
                                          return allItems.map((item, itemIndex) => {
                                            // 检查是否有异常
                                            const isDuplicate = userDuplicates.some(d => 
                                              d.workDate === item.record.work_date && 
                                              d.processId === item.process_id
                                            );
                                            const hasPriceIssue = userPriceIssues.some(p => 
                                              p.workDate === item.record.work_date && 
                                              p.processId === item.process_id
                                            );
                                            const hasIssue = isDuplicate || hasPriceIssue;
                                            
                                            return (
                                              <tr 
                                                key={`${date}-${item.record.id}-${itemIndex}`}
                                                className={`border-b border-gray-600 hover:bg-gray-600 transition-colors ${
                                                  hasIssue ? 'bg-red-900 bg-opacity-20' : ''
                                                }`}
                                              >
                                                {/* 只在每个日期的第一行显示日期和日总金额 */}
                                                {itemIndex === 0 ? (
                                                  <>
                                                    <td 
                                                      className="px-3 py-2 text-yellow-400 font-mono text-xs font-bold border-r border-gray-500"
                                                      rowSpan={allItems.length}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(date)}
                                                      </div>
                                                    </td>
                                                    <td 
                                                      className="px-3 py-2 text-green-400 font-mono text-xs border-r border-gray-500"
                                                      rowSpan={allItems.length}
                                                    >
                                                      {item.record.shift_type || '白班'}
                                                    </td>
                                                    <td 
                                                      className="px-3 py-2 text-green-400 font-mono text-xs font-bold border-r border-gray-500"
                                                      rowSpan={allItems.length}
                                                    >
                                                      ¥{dailyTotal.toFixed(2)}
                                                    </td>
                                                  </>
                                                ) : null}
                                                
                                                {/* 工时记录详细信息 */}
                                                {showProjectColumns && (
                                                  <>
                                                    <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                      {item.processes?.production_line || '未知'}
                                                    </td>
                                                    <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        item.processes?.production_category === '生产工时' 
                                                          ? 'bg-blue-900 text-blue-300' 
                                                          : 'bg-red-900 text-red-300'
                                                      }`}>
                                                        {item.processes?.production_category || '未知'}
                                                      </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                      {item.processes?.product_name || '未知'}
                                                    </td>
                                                    <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                      {item.processes?.product_process || '未知'}
                                                    </td>
                                                  </>
                                                )}
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs font-bold">
                                                  {editingItem?.recordId === item.record.id && editingItem?.itemId === item.id ? (
                                                    <div className="flex items-center gap-2">
                                                      <input
                                                        type="number"
                                                        value={editQuantity}
                                                        onChange={(e) => {
                                                          e.stopPropagation();
                                                          setEditQuantity(Number(e.target.value));
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onWheel={(e) => e.preventDefault()}
                                                        className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-green-300 font-mono text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        min="0"
                                                        step="0.1"
                                                      />
                                                      <button
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          confirmEdit();
                                                        }}
                                                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                                        title="确认修改"
                                                      >
                                                        <Check className="w-3 h-3" />
                                                      </button>
                                                      <button
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          cancelEdit();
                                                        }}
                                                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                        title="取消修改"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-2">
                                                      <span>{item.quantity}</span>
                                                      <button
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          startEdit(item.record.id, item.id, item.quantity);
                                                        }}
                                                        className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                        title="编辑数量"
                                                      >
                                                        <Edit2 className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {item.unit_price != null ? `¥${item.unit_price.toFixed(3)}` : '未定义'}
                                                  {hasPriceIssue && (
                                                    <span className="ml-1 text-red-400" title="单价异常">
                                                      ⚠
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs font-bold">
                                                  ¥{item.amount.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  <div className="flex items-center gap-1">
                                                    {getStatusBadge(item.record.status)}
                                                    {isDuplicate && (
                                                      <span className="text-yellow-400" title="重复记录">
                                                        ⚠
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {(() => {
                                                    const supervisorApproval = getApprovalInfo(item.record, 'supervisor');
                                                    const supervisorName = item.record.supervisor?.name || '未分配';
                                                    if (supervisorApproval) {
                                                      return (
                                                        <div className="flex flex-col">
                                                          <div>{supervisorApproval.name}</div>
                                                          <div className="text-xs text-gray-400">{supervisorApproval.date}</div>
                                                        </div>
                                                      );
                                                    }
                                                    return supervisorName;
                                                  })()}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {(() => {
                                                    const sectionChiefApproval = getApprovalInfo(item.record, 'section_chief');
                                                    const sectionChiefName = item.record.section_chief?.name || '未分配';
                                                    if (sectionChiefApproval) {
                                                      return (
                                                        <div className="flex flex-col">
                                                          <div>{sectionChiefApproval.name}</div>
                                                          <div className="text-xs text-gray-400">{sectionChiefApproval.date}</div>
                                                        </div>
                                                      );
                                                    }
                                                    return sectionChiefName;
                                                  })()}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {formatModificationHistory(item)}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  <button
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      confirmDelete(item.record.id, item.id);
                                                    }}
                                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                    title="删除工时项目"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          });
                                        });
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                {/* 统计汇总区域 */}
                                <div className="mt-6 bg-gray-600 rounded-lg p-4">
                                  <h5 className="text-md font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    {userStat.userName} - 数量统计汇总
                                  </h5>
                                  
                                  {(() => {
                                    // 计算该用户的统计数据
                                    const userItems = userRecords.flatMap(record => 
                                      record.items.map(item => ({
                                        ...item,
                                        workDate: record.work_date
                                      }))
                                    );
                                    
                                    // 按生产类别、生产线、产品名称、工序名称分组统计
                                    const statsMap = new Map();
                                    
                                    userItems.forEach(item => {
                                      const key = `${item.processes?.production_category || '未知'}-${item.processes?.production_line || '未知'}-${item.processes?.product_name || '未知'}-${item.processes?.product_process || '未知'}`;
                                      
                                      if (!statsMap.has(key)) {
                                        statsMap.set(key, {
                                          productionCategory: item.processes?.production_category || '未知',
                                          productionLine: item.processes?.production_line || '未知',
                                          productName: item.processes?.product_name || '未知',
                                          productProcess: item.processes?.product_process || '未知',
                                          totalQuantity: 0,
                                          recordCount: 0
                                        });
                                      }
                                      
                                      const stat = statsMap.get(key);
                                      stat.totalQuantity += item.quantity;
                                      stat.recordCount += 1;
                                    });
                                    
                                    const statsArray = Array.from(statsMap.values()).sort((a, b) => {
                                      // 先按生产类别排序，再按数量排序
                                      if (a.productionCategory !== b.productionCategory) {
                                        return a.productionCategory.localeCompare(b.productionCategory);
                                      }
                                      return b.totalQuantity - a.totalQuantity;
                                    });
                                    
                                    if (statsArray.length === 0) {
                                      return (
                                        <div className="text-center py-4 text-gray-400 font-mono text-sm">
                                          暂无统计数据
                                        </div>
                                      );
                                    }
                                    
                                    return (
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead className="bg-gray-700">
                                            <tr>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">生产类别</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">生产线</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">产品名称</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">工序名称</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">数量总计</th>
                                              <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">记录条数</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {statsArray.map((stat, index) => (
                                              <tr key={index} className="border-b border-gray-600 hover:bg-gray-600 transition-colors">
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    stat.productionCategory === '生产工时' 
                                                      ? 'bg-blue-900 text-blue-300' 
                                                      : 'bg-red-900 text-red-300'
                                                  }`}>
                                                    {stat.productionCategory}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {stat.productionLine}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {stat.productName}
                                                </td>
                                                <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                                  {stat.productProcess}
                                                </td>
                                                <td className="px-3 py-2 text-yellow-400 font-mono text-xs font-bold">
                                                  {stat.totalQuantity.toFixed(1)}
                                                </td>
                                                <td className="px-3 py-2 text-blue-400 font-mono text-xs">
                                                  {stat.recordCount}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                        

                                      </div>
                                    );
                                  })()}
                                </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        }
          
          {/* 工时统计分析汇总模块 */}
          {analyticsData.userStats.length > 0 && (
            <div className="mt-6 bg-gray-900 rounded-lg border border-green-400 overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-600">
                <h3 className="text-lg font-bold text-green-400 font-mono flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  汇总分析
                </h3>
              </div>
              
              <div className="p-4">
                {(() => {
                  // 计算汇总数据
                  const summaryMap = new Map();
                  
                  filteredRecords.forEach(record => {
                    record.items.forEach(item => {
                      const key = `${item.processes?.production_line || '未知'}-${item.processes?.production_category || '未知'}-${item.processes?.product_name || '未知'}-${item.processes?.product_process || '未知'}`;
                      
                      if (!summaryMap.has(key)) {
                        summaryMap.set(key, {
                          productionLine: item.processes?.production_line || '未知',
                          productionCategory: item.processes?.production_category || '未知',
                          productName: item.processes?.product_name || '未知',
                          productProcess: item.processes?.product_process || '未知',
                          totalQuantity: 0,
                          totalAmount: 0
                        });
                      }
                      
                      const summary = summaryMap.get(key);
                      summary.totalQuantity += item.quantity;
                      summary.totalAmount += item.amount;
                    });
                  });
                  
                  const summaryArray = Array.from(summaryMap.values()).sort((a, b) => {
                    // 先按生产类别排序，再按总金额排序
                    if (a.productionCategory !== b.productionCategory) {
                      return a.productionCategory.localeCompare(b.productionCategory);
                    }
                    return b.totalAmount - a.totalAmount;
                  });
                  
                  if (summaryArray.length === 0) {
                    return (
                      <div className="text-center py-4 text-gray-400 font-mono text-sm">
                        暂无汇总数据
                      </div>
                    );
                  }
                  
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">生产线</th>
                            <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">生产类别</th>
                            <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">产品名称</th>
                            <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">工序名称</th>
                            <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">总数量</th>
                            <th className="px-3 py-2 text-left text-green-400 font-mono text-xs">总金额</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryArray.map((summary, index) => (
                            <tr key={index} className="border-b border-gray-600 hover:bg-gray-600 transition-colors">
                              <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                {summary.productionLine}
                              </td>
                              <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  summary.productionCategory === '生产工时' 
                                    ? 'bg-blue-900 text-blue-300' 
                                    : 'bg-red-900 text-red-300'
                                }`}>
                                  {summary.productionCategory}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                {summary.productName}
                              </td>
                              <td className="px-3 py-2 text-green-300 font-mono text-xs">
                                {summary.productProcess}
                              </td>
                              <td className="px-3 py-2 text-yellow-400 font-mono text-xs font-bold">
                                {summary.totalQuantity.toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-green-300 font-mono text-xs font-bold">
                                ¥{summary.totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* 如果没有数据 */}
          {analyticsData.userStats.length === 0 && (
            <div className="text-center py-12">
              <div className="text-blue-600 mb-4">
                <Users className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-blue-400 mb-2 font-mono">暂无统计数据</h3>
              <p className="text-blue-600 font-mono">请调整筛选条件或刷新数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 编辑确认弹窗 */}
      <EditConfirmDialog
        isOpen={showEditConfirm}
        currentQuantity={editingItem ? records.find(r => r.id === editingItem.recordId)?.items?.find(i => i.id === editingItem.itemId)?.quantity : undefined}
        newQuantity={pendingEdit?.newQuantity}
        onConfirm={executeEdit}
        onCancel={() => {
          setShowEditConfirm(false);
          setPendingEdit(null);
        }}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        employeeName={pendingDelete?.employeeName}
        workDate={pendingDelete?.workDate}
        workProject={pendingDelete?.workProject}
        onConfirm={executeDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingDelete(null);
        }}
      />
    </div>
  );
};

export default Reports;