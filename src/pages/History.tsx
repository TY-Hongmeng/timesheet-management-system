import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar, 
  User, 
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History as HistoryIcon,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import NavActions from '../components/NavActions';
import { toast } from 'sonner';

// 数据接口定义
interface TimesheetRecord {
  id: string;
  user_id: string;
  work_date: string;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'section_chief_approved';
  created_at: string;
  updated_at: string;
  supervisor_approved_at?: string;
  section_chief_approved_at?: string;
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
  approval_history?: {
    approver_type: string;
    approver_name?: string;
    approver?: {
      name: string;
    };
    created_at: string;
  }[];
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
}

const History: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<TimesheetRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TimesheetRecord[]>([]);
  const [loading, setLoading] = useState(true);


  // 排序状态
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'work_date', direction: 'desc' });

  // 筛选条件
  const [filters, setFilters] = useState({
    yearMonth: '', // YYYY-MM格式
    startDate: '',
    endDate: '',
    userId: ''
  });

  // 筛选选项状态
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<{id: string, name: string}[]>([]);

  // 折叠展开状态
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true); // 筛选区域默认折叠
  const [refreshing, setRefreshing] = useState(false);

  // 移除不需要的状态变量

  useEffect(() => {
    if (user) {
      fetchHistoryData();
      fetchApprovedUsers();
    }
  }, [user]);
  
  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  // 获取当前用户审核过的员工列表
  const fetchApprovedUsers = async () => {
    if (!user) return;

    try {
      // 获取当前用户审核过的记录中的员工
      const { data: approvedRecords, error } = await supabase
        .from('timesheet_records')
        .select('user_id, user:users!timesheet_records_user_id_fkey(id, name)')
        .or(`supervisor_id.eq.${user.id},section_chief_id.eq.${user.id}`)
        .neq('status', 'draft');

      if (error) {
        console.error('fetchApprovedUsers error:', error);
        return;
      }

      // 去重并获取唯一的员工列表
      const uniqueUsers = approvedRecords
        ?.filter(record => record.user)
        .reduce((acc, record) => {
          const userId = (record.user as any).id;
          if (!acc.find(u => u.id === userId)) {
            acc.push({
              id: userId,
              name: (record.user as any).name
            });
          }
          return acc;
        }, [] as {id: string, name: string}[]) || [];

      setApprovedUsers(uniqueUsers);
    } catch (error) {
      console.error('fetchApprovedUsers catch error:', error);
    }
  };

  // 获取历史记录数据
  const fetchHistoryData = async () => {
    if (!user) {
      console.error('fetchHistoryData: 用户信息不存在');
      return;
    }
    
    try {
      setLoading(true);
      
      // 获取当前用户填报或审核过的记录
      const { data: historyData, error } = await supabase
        .from('timesheet_records')
        .select(`
          *,
          user:users!timesheet_records_user_id_fkey(id, name),
          supervisor:users!timesheet_records_supervisor_id_fkey(id, name),
          section_chief:users!timesheet_records_section_chief_id_fkey(id, name),
          items:timesheet_record_items(
            id,
            process_id,
            quantity,
            unit_price,
            amount,
            processes:processes!timesheet_record_items_process_id_fkey(
              product_process,
              product_name,
              production_category,
              production_line,
              unit_price
            )
          ),
          approval_history(
            approver_type,
            approver_name,
            created_at,
            approver:approver_id(name)
          )
        `)
        .or(`user_id.eq.${user.id},supervisor_id.eq.${user.id},section_chief_id.eq.${user.id}`)
        .neq('status', 'draft')
        .order('work_date', { ascending: false });
        
      // 去重处理 - 可能因为OR查询导致重复记录
      const uniqueRecords = historyData ? historyData.filter((record, index, self) => 
        index === self.findIndex(r => r.id === record.id)
      ) : [];

      if (error) {
        console.error('fetchHistoryData error:', error);
        toast.error('获取历史记录失败');
        return;
      }

      setRecords(uniqueRecords);
    } catch (error) {
      console.error('fetchHistoryData catch error:', error);
      toast.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除不需要的fetchFilterOptions函数

  // 应用筛选
  const applyFilters = () => {
    let filtered = [...records];

    // 年月筛选
    if (filters.yearMonth) {
      const [year, month] = filters.yearMonth.split('-');
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.work_date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth() + 1;
        return recordYear === parseInt(year) && recordMonth === parseInt(month);
      });
    }

    // 开始日期筛选
    if (filters.startDate) {
      filtered = filtered.filter(record => record.work_date >= filters.startDate);
    }

    // 结束日期筛选
    if (filters.endDate) {
      filtered = filtered.filter(record => record.work_date <= filters.endDate);
    }

    // 员工筛选
    if (filters.userId) {
      filtered = filtered.filter(record => record.user_id === filters.userId);
    }

    // 应用排序
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'work_date':
            aValue = new Date(a.work_date);
            bValue = new Date(b.work_date);
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          default:
            aValue = a[sortConfig.key as keyof TimesheetRecord];
            bValue = b[sortConfig.key as keyof TimesheetRecord];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredRecords(filtered);
  };

  // 按人和工作日期分组数据
  const groupRecordsByUserAndDate = (records: TimesheetRecord[]) => {
    const groups: { [key: string]: TimesheetRecord[] } = {};
    
    records.forEach(record => {
      const key = `${record.user?.name || '未知用户'}-${record.work_date}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });
    
    // 按日期降序排序组
    return Object.entries(groups)
      .sort(([keyA], [keyB]) => {
        const dateA = keyA.split('-').slice(-3).join('-');
        const dateB = keyB.split('-').slice(-3).join('-');
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .map(([key, records]) => ({
        key,
        userName: key.split('-')[0],
        workDate: key.split('-').slice(-3).join('-'),
        records
      }));
  };

  // 排序处理
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 获取排序图标
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
  };



  // 重置筛选
  const resetFilters = () => {
    setFilters({
      yearMonth: '',
      startDate: '',
      endDate: '',
      userId: ''
    });
    setSortConfig({ key: 'work_date', direction: 'desc' });
    toast.success('筛选条件已重置');
  };

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchHistoryData(),
        fetchApprovedUsers()
      ]);
      toast.success('数据刷新成功');
    } catch (error) {
      console.error('刷新数据失败:', error);
      toast.error('刷新数据失败，请重试');
    } finally {
      setRefreshing(false);
    }
  };

  // 切换日期折叠状态
  const toggleDateCollapse = (date: string) => {
    const newCollapsed = new Set(collapsedDates);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedDates(newCollapsed);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
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

  // 获取审核信息 - 与Reports.tsx保持一致
  const getApprovalInfo = (record: TimesheetRecord, type: 'supervisor' | 'section_chief') => {
    const approval = record.approval_history?.find(a => a.approver_type === type);
    if (approval) {
      return {
        name: approval.approver_name || approval.approver?.name || '未知',
        date: formatDate(approval.created_at)
      };
    }
    return null;
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
    // 春节（简化判断，实际应根据农历）
    if (month === 2 && day >= 10 && day <= 17) return false;
    // 清明节
    if (month === 4 && day >= 4 && day <= 6) return false;
    // 劳动节
    if (month === 5 && day >= 1 && day <= 3) return false;
    // 端午节（简化判断）
    if (month === 6 && day >= 22 && day <= 24) return false;
    // 中秋节（简化判断）
    if (month === 9 && day >= 15 && day <= 17) return false;
    // 国庆节
    if (month === 10 && day >= 1 && day <= 7) return false;
    
    return true;
  };

  // 计算工作天数统计
  const calculateWorkDayStats = () => {
    const userWorkDays = new Map();
    
    filteredRecords.forEach(record => {
      const userId = record.user_id;
      const workDate = record.work_date;
      const date = new Date(workDate);
      const isWorking = isWorkingDay(date);
      
      if (!userWorkDays.has(userId)) {
        userWorkDays.set(userId, {
          userId,
          userName: record.user?.name || '未知',
          workDates: new Set(),
          workingDates: new Set(),
          holidayDates: new Set()
        });
      }
      
      const userStat = userWorkDays.get(userId);
      userStat.workDates.add(workDate);
      
      if (isWorking) {
        userStat.workingDates.add(workDate);
      } else {
        userStat.holidayDates.add(workDate);
      }
    });
    
    return Array.from(userWorkDays.values()).map(stat => ({
      ...stat,
      totalWorkDays: stat.workDates.size,
      actualWorkDays: stat.workingDates.size,
      holidayDays: stat.holidayDates.size
    }));
  };

  // 计算统计信息
  const getStatistics = () => {
    const total = filteredRecords.length;
    const supervisorPending = filteredRecords.filter(record => record.status === 'pending').length;
    const sectionChiefPending = filteredRecords.filter(record => record.status === 'approved').length;
    const completed = filteredRecords.filter(record => record.status === 'section_chief_approved').length;
    
    // 计算工作天数统计
    const workDayStats = calculateWorkDayStats();
    const totalWorkDays = workDayStats.reduce((sum, stat) => sum + stat.actualWorkDays, 0);
    
    return { total, supervisorPending, sectionChiefPending, completed, totalWorkDays };
  };

  const statistics = getStatistics();

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
      <header className="bg-gray-900 border-b border-green-400 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-4xl font-bold text-green-400 font-mono flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 sm:w-8 sm:h-8" />
              历史记录
            </h1>
            <div className="flex items-center gap-3">
              <NavActions onRefresh={handleRefresh} refreshing={refreshing} backTo="/dashboard" showClearCache={false} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* 视图切换和筛选条件 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg mb-6">
          {/* 筛选标题栏 - 可点击折叠/展开 */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 transition-colors"
            onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold text-green-400 font-mono">数据筛选</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-mono">
                {isFilterCollapsed ? '展开筛选' : '收起筛选'}
              </span>
              {isFilterCollapsed ? (
                <ChevronDown className="w-5 h-5 text-green-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-green-400" />
              )}
            </div>
          </div>
          
          {/* 筛选内容区域 - 可折叠 */}
          {!isFilterCollapsed && (
            <div className="px-4 pb-4 border-t border-gray-700">
              <div className="space-y-4 mt-4">
                {/* 第一行：年月和员工 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-green-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 font-mono">
                      年月
                    </label>
                    <input
                      type="month"
                      value={filters.yearMonth}
                      onChange={(e) => setFilters({...filters, yearMonth: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono text-xs sm:text-sm focus:outline-none focus:border-green-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-green-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 font-mono">
                      员工
                    </label>
                    <select
                      value={filters.userId}
                      onChange={(e) => setFilters({...filters, userId: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono text-xs sm:text-sm focus:outline-none focus:border-green-400"
                    >
                      <option value="">全部员工</option>
                      {approvedUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* 第二行：开始日期和结束日期 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-green-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 font-mono">
                      开始日期
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono text-xs sm:text-sm focus:outline-none focus:border-green-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-green-300 text-xs sm:text-sm font-medium mb-1 sm:mb-2 font-mono">
                      结束日期
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800 border border-gray-600 rounded text-green-300 font-mono text-xs sm:text-sm focus:outline-none focus:border-green-400"
                    />
                  </div>
                </div>
                
                {/* 第三行：重置按钮 */}
                <div className="flex justify-start">
                  <button
                    onClick={resetFilters}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-green-300 hover:text-green-200 rounded font-mono transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600 hover:border-green-500/50 flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                    重置筛选
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 移除统计信息，将在分组中显示 */}

        {/* 详细工时记录标题 */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-green-400 font-mono flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            详细工时记录
          </h2>
        </div>

        {/* 历史记录模块化显示 */}
        {filteredRecords.length === 0 ? (
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 text-center">
            <div className="text-green-600 mb-4">
              <HistoryIcon className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-green-400 mb-2 font-mono">暂无历史记录</h3>
            <p className="text-green-600 font-mono">请调整筛选条件或添加新的工时记录</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              // 按用户分组
              const userGroups = new Map();
              
              filteredRecords.forEach(record => {
                const userKey = record.user_id;
                if (!userGroups.has(userKey)) {
                  userGroups.set(userKey, {
                    userName: record.user?.name || '未知用户',
                    records: []
                  });
                }
                userGroups.get(userKey).records.push(record);
              });
              
              // 按用户名排序
              const sortedUsers = Array.from(userGroups.values()).sort((a, b) => a.userName.localeCompare(b.userName));
              
              return sortedUsers.map((userGroup, userIndex) => {
                // 按日期分组该用户的记录
                const dateGroups = new Map();
                userGroup.records.forEach(record => {
                  const dateKey = record.work_date;
                  if (!dateGroups.has(dateKey)) {
                    dateGroups.set(dateKey, []);
                  }
                  dateGroups.get(dateKey).push(record);
                });
                
                // 按日期排序
                const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                
                // 计算该用户的统计信息 - 按工作日期统计
                const pendingRecords = userGroup.records.filter(r => r.status === 'pending');
                const approvedRecords = userGroup.records.filter(r => r.status === 'approved');
                
                // 获取有pending状态记录的唯一工作日期
                const pendingWorkDates = [...new Set(pendingRecords.map(r => r.work_date))];
                // 获取有approved状态记录的唯一工作日期
                const approvedWorkDates = [...new Set(approvedRecords.map(r => r.work_date))];
                
                const userStats = {
                  // 班长待审核：该用户有多少个工作日期存在pending状态的记录
                  supervisorPending: pendingWorkDates.length,
                  // 段长待审核：该用户有多少个工作日期存在approved状态的记录
                  sectionChiefPending: approvedWorkDates.length,
                  // 工作天数：该用户的唯一工作日期数量
                  totalWorkDays: sortedDates.length
                };
                

                

                

                
                return (
                  <div key={userIndex} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    {/* 用户名标题 - 添加折叠展开功能 */}
                    <div 
                      className="bg-gray-800 px-4 py-3 border-b border-gray-600 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => toggleDateCollapse(userGroup.userName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <h3 className="text-lg font-bold text-green-400 font-mono flex items-center gap-2">
                            {userGroup.userName}
                            {collapsedDates.has(userGroup.userName) ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronUp className="w-5 h-5" />
                            )}
                          </h3>
                          
                          {/* 用户统计信息 - 放在姓名后面，做成一行 */}
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="text-yellow-400 font-mono font-bold">{userStats.supervisorPending}</div>
                              <div className="text-gray-400 font-mono">班长待审核</div>
                            </div>
                            <div className="text-center">
                              <div className="text-orange-400 font-mono font-bold">{userStats.sectionChiefPending}</div>
                              <div className="text-gray-400 font-mono">段长待审核</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-400 font-mono font-bold">{userStats.totalWorkDays}</div>
                              <div className="text-gray-400 font-mono">工作天数</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 日期记录 - 添加折叠展开控制 */}
                    {!collapsedDates.has(userGroup.userName) && (
                      <div className="p-4 space-y-4">
                        {sortedDates.map(date => {
                          const dayRecords = dateGroups.get(date);
                          const dateCollapseKey = `${userGroup.userName}-${date}`;
                          const isDateCollapsed = collapsedDates.has(dateCollapseKey);
                          
                          return (
                            <div key={date} className="space-y-3">
                              {/* 日期标题 - 简化显示 */}
                              <div 
                                className="flex items-center gap-2 mb-3 cursor-pointer"
                                onClick={() => toggleDateCollapse(dateCollapseKey)}
                              >
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <h4 className="text-md font-semibold text-green-300 font-mono flex items-center gap-2">
                                  {formatDate(date)}
                                  {isDateCollapsed ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4" />
                                  )}
                                </h4>
                              </div>
                          
                              {/* 工时记录卡片 */}
                              {!isDateCollapsed && (
                                <div className="space-y-2">
                                  {dayRecords.map(record => (
                                    record.items.map((item, itemIndex) => (
                                      <div key={`${record.id}-${itemIndex}`} className="bg-gray-800 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors">
                                        <div className="space-y-3">
                                          {/* 产品工序和数量 - 放在一行，数量靠右 */}
                                          <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                              <div className="text-xs text-gray-400 font-mono mb-1">产品工序</div>
                                              <div className="text-sm text-green-300 font-mono break-words">
                                                {`${item.processes?.production_line || '未知'} - ${item.processes?.product_name || '未知'} - ${item.processes?.product_process || '未知'}`}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-xs text-gray-400 font-mono mb-1">数量</div>
                                              <div className="text-sm text-yellow-400 font-mono font-semibold">
                                                {item.quantity}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* 班长、段长、状态 - 状态放在最右侧，使用与Reports.tsx一致的显示逻辑 */}
                                          <div className="flex justify-between items-start gap-2 text-xs">
                                            <div className="flex gap-4 flex-1">
                                              <div className="flex-1">
                                                <div className="text-gray-400 font-mono mb-1">班长</div>
                                                <div className="text-green-300 font-mono">
                                                  {(() => {
                                                    const supervisorApproval = getApprovalInfo(record, 'supervisor');
                                                    const supervisorName = record.supervisor?.name || '未分配';
                                                    if (supervisorApproval) {
                                                      return (
                                                        <div className="flex flex-col">
                                                          <div className="truncate">{supervisorApproval.name}</div>
                                                          <div className="text-xs text-gray-400">{supervisorApproval.date}</div>
                                                        </div>
                                                      );
                                                    }
                                                    return <div className="truncate">{supervisorName}</div>;
                                                  })()} 
                                                </div>
                                              </div>
                                              <div className="flex-1">
                                                <div className="text-gray-400 font-mono mb-1">段长</div>
                                                <div className="text-green-300 font-mono">
                                                  {(() => {
                                                    const sectionChiefApproval = getApprovalInfo(record, 'section_chief');
                                                    const sectionChiefName = record.section_chief?.name || '未分配';
                                                    if (sectionChiefApproval) {
                                                      return (
                                                        <div className="flex flex-col">
                                                          <div className="truncate">{sectionChiefApproval.name}</div>
                                                          <div className="text-xs text-gray-400">{sectionChiefApproval.date}</div>
                                                        </div>
                                                      );
                                                    }
                                                    return <div className="truncate">{sectionChiefName}</div>;
                                                  })()} 
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-gray-400 font-mono mb-1">状态</div>
                                              <div className="flex items-center justify-end">
                                                {getStatusBadge(record.status)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* 该员工的数量统计汇总 - 与员工信息一起折叠展开 */}
                    {!collapsedDates.has(userGroup.userName) && (() => {
                      // 计算该用户的统计数据
                      const userItems = userGroup.records.flatMap(record => 
                        record.items.map(item => ({
                          ...item,
                          workDate: record.work_date
                        }))
                      );
                      
                      // 按生产线、产品名称、工序名称分组统计
                      const userStatsMap = new Map();
                      
                      userItems.forEach(item => {
                        const key = `${item.processes?.production_line || '未知'}-${item.processes?.product_name || '未知'}-${item.processes?.product_process || '未知'}`;
                        
                        if (!userStatsMap.has(key)) {
                          userStatsMap.set(key, {
                            productionLine: item.processes?.production_line || '未知',
                            productName: item.processes?.product_name || '未知',
                            productProcess: item.processes?.product_process || '未知',
                            productionCategory: item.processes?.production_category || '未知',
                            totalQuantity: 0,
                            recordCount: 0
                          });
                        }
                        
                        const stat = userStatsMap.get(key);
                        stat.totalQuantity += item.quantity;
                        stat.recordCount += 1;
                      });
                      
                      const userStatsArray = Array.from(userStatsMap.values()).sort((a, b) => {
                        // 按数量排序
                        return b.totalQuantity - a.totalQuantity;
                      });
                      
                      if (userStatsArray.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div className="mt-4 bg-gray-900 rounded-lg p-3 border border-gray-600">
                          <h6 className="text-sm font-bold text-blue-400 font-mono mb-3 flex items-center gap-2">
                            <BarChart3 className="w-3 h-3" />
                            {userGroup.userName} - 数量统计汇总
                          </h6>
                          
                          <div className="w-full">
                            <table className="w-full table-fixed">
                              <thead className="bg-gray-800">
                                <tr>
                                  <th className="px-1 py-2 text-left text-blue-400 font-mono text-xs w-[50%] sm:w-[60%]">产品工序</th>
                                  <th className="px-1 py-2 text-left text-blue-400 font-mono text-xs w-[25%] sm:w-[20%]">数量总计</th>
                                  <th className="px-1 py-2 text-left text-blue-400 font-mono text-xs w-[25%] sm:w-[20%]">记录条数</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userStatsArray.map((stat, index) => (
                                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                                    <td className="px-1 py-2 text-green-300 font-mono text-xs">
                                      <div className="break-words text-xs leading-tight">
                                        {`${stat.productionLine} - ${stat.productName} - ${stat.productProcess}`}
                                      </div>
                                    </td>
                                    <td className="px-1 py-2 text-yellow-400 font-mono text-xs font-bold">
                                      {stat.totalQuantity.toFixed(1)}
                                    </td>
                                    <td className="px-1 py-2 text-blue-400 font-mono text-xs">
                                      {stat.recordCount}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
