import React, { useState, useEffect } from 'react';
import { supabase, safeQuery } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, User, Calendar, Package, MessageSquare, Eye, ArrowLeft, Edit2, Trash2, Save, X, Shield, Crown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

// 日期格式化函数
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // 返回YYYY-MM-DD格式
};

interface TimesheetRecord {
  id: string;
  user_id: string;
  work_date: string;
  production_line_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'section_chief_approved';
  created_at: string;
  updated_at: string;
  user: {
    name: string;
  };
  production_line: {
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
}

// 合并后的工时记录接口
interface GroupedTimesheetRecord {
  groupKey: string; // user_id + work_date
  user_id: string;
  work_date: string;
  user: {
    name: string;
  };
  production_line: {
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
  originalRecords: TimesheetRecord[]; // 原始记录数组
  totalItems: number; // 总项目数
  allItems: TimesheetItem[]; // 所有工时项
  status: 'pending' | 'approved' | 'rejected' | 'section_chief_approved';
  created_at: string;
  updated_at: string;
}

interface TimesheetItem {
  id: string;
  work_type: {
    name: string;
  };
  product: {
    name: string;
    code: string;
  };
  process: {
    name: string;
  };
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface ApprovalHistory {
  id: string;
  approver_id: string;
  approver_type: string;
  action: string;
  comments: string;
  created_at: string;
  approver: {
    name: string;
  };
}

const SectionChiefApproval: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 调试用户信息
  console.log('SectionChiefApproval - 用户信息:', {
    user: user,
    userRole: user?.role?.name,
    userId: user?.id
  });
  const [records, setRecords] = useState<TimesheetRecord[]>([]);
  const [groupedRecords, setGroupedRecords] = useState<GroupedTimesheetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRecord, setSelectedRecord] = useState<TimesheetRecord | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [originalQuantity, setOriginalQuantity] = useState<number>(0);
  
  // 批量选择状态管理
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  
  // 删除确认对话框状态管理
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetInfo, setDeleteTargetInfo] = useState<{
    itemId: string;
    itemName: string;
    userName: string;
    workDate: string;
  } | null>(null);
  
  // 修改数量确认对话框状态管理
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalInfo, setQuantityModalInfo] = useState<{
    itemId: string;
    itemName: string;
    userName: string;
    workDate: string;
    originalQuantity: number;
    newQuantity: number;
    unit: string;
    workType: string;
  } | null>(null);
  
  // 审核模态框状态管理
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 自动保存并审核确认对话框状态管理
  const [showSaveAndApproveModal, setSaveAndApproveModal] = useState(false);
  const [pendingApprovalData, setPendingApprovalData] = useState<{
    type: 'single' | 'grouped';
    record?: TimesheetRecord;
    groupedRecord?: GroupedTimesheetRecord;
    comment?: string;
  } | null>(null);

  // 未保存修改提示对话框状态管理
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [unsavedChangesInfo, setUnsavedChangesInfo] = useState<{
    itemId: string;
    itemName: string;
    userName: string;
    workDate: string;
    originalQuantity: number;
    newQuantity: number;
    unit: string;
    pendingApprovalData: {
      type: 'single' | 'grouped' | 'batch' | 'edit_switch';
      record?: TimesheetRecord;
      groupedRecord?: GroupedTimesheetRecord;
      selectedRecords?: string[];
      comment?: string;
      // 编辑切换时的新目标项目信息
      newEditTarget?: {
        item: TimesheetItem;
        groupedRecord: GroupedTimesheetRecord;
      };
    };
  } | null>(null);

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPendingRecords();
      toast.success('数据刷新成功');
    } catch (error) {
      console.error('刷新数据失败:', error);
      toast.error('刷新数据失败，请重试');
    } finally {
      setRefreshing(false);
    }
  };
  
  // 批量选择相关函数 - 移除全选功能
  
  const handleSelectRecord = (groupKey: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(groupKey)) {
      newSelected.delete(groupKey);
    } else {
      newSelected.add(groupKey);
    }
    setSelectedRecords(newSelected);
  };
  
  // 移除全选状态更新逻辑
  
  // 批量审核通过
  const handleBatchApproval = async () => {
    if (selectedRecords.size === 0) {
      toast.error('请先选择要审核的记录');
      return;
    }
    
    // 检查是否有未保存的修改
    if (editingItem) {
      const editingInfo = getCurrentEditingItemInfo();
      if (editingInfo) {
        // 显示详细的未保存修改对话框
        setUnsavedChangesInfo({
          itemId: editingItem,
          itemName: editingInfo.itemName,
          userName: editingInfo.userName,
          workDate: editingInfo.workDate,
          originalQuantity: originalQuantity,
          newQuantity: editQuantity,
          unit: editingInfo.item.unit,
          pendingApprovalData: {
            type: 'batch',
            selectedRecords: Array.from(selectedRecords)
          }
        });
        setShowUnsavedChangesModal(true);
        return; // 停止执行批量审核
      }
    }
    
    setSubmitting(true);
    try {
      const selectedGroupedRecords = groupedRecords.filter(record => 
        selectedRecords.has(record.groupKey)
      );
      
      for (const groupedRecord of selectedGroupedRecords) {
        await handleGroupedApproval(groupedRecord, '');
      }
      
      toast.success(`成功审核通过 ${selectedGroupedRecords.length} 条记录`);
      setSelectedRecords(new Set());
      navigate('/');
    } catch (error) {
      console.error('批量审核失败:', error);
      toast.error('批量审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };
  

  


  // 优化的数据分组处理函数
  const groupRecordsByUserAndDate = (records: TimesheetRecord[]): GroupedTimesheetRecord[] => {
    const grouped = new Map<string, TimesheetRecord[]>();
    
    // 按用户ID和日期分组
    records.forEach(record => {
      const groupKey = `${record.user_id}_${record.work_date}`;
      const existingGroup = grouped.get(groupKey);
      if (existingGroup) {
        existingGroup.push(record);
      } else {
        grouped.set(groupKey, [record]);
      }
    });
    
    // 转换为GroupedTimesheetRecord数组，减少重复计算
    const groupedRecords: GroupedTimesheetRecord[] = [];
    
    grouped.forEach((recordGroup, groupKey) => {
      const firstRecord = recordGroup[0];
      
      // 预计算所有项目，避免重复flatMap
      let allItems: any[] = [];
      let maxUpdatedTime = new Date(firstRecord.updated_at).getTime();
      
      recordGroup.forEach(record => {
        allItems = allItems.concat(record.items);
        const recordTime = new Date(record.updated_at).getTime();
        if (recordTime > maxUpdatedTime) {
          maxUpdatedTime = recordTime;
        }
      });
      
      // 只添加有工时记录项的分组记录
      if (allItems.length > 0) {
        groupedRecords.push({
          groupKey,
          user_id: firstRecord.user_id,
          work_date: firstRecord.work_date,
          user: firstRecord.user,
          production_line: firstRecord.production_line,
          supervisor: firstRecord.supervisor,
          section_chief: firstRecord.section_chief,
          originalRecords: recordGroup,
          totalItems: allItems.length,
          allItems,
          status: firstRecord.status,
          created_at: firstRecord.created_at,
          updated_at: maxUpdatedTime.toString()
        });
      }
    });
    
    // 优化排序，避免重复的Date对象创建
    return groupedRecords.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  };

  // 工序信息缓存
  const processCache = new Map();
  
  // 公共查询函数 - 减少重复代码
  const executeQuery = async <T,>(queryFn: () => Promise<{ data: T; error: any }>, errorMessage: string): Promise<T | null> => {
    try {
      const { data, error } = await queryFn();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
      return null;
    }
  };
  
  // 批量更新记录状态的公共函数
  const updateRecordStatus = async (recordIds: string[], status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('timesheet_records')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', recordIds);
      
      if (error) {
        console.error('更新记录状态失败', error);
        toast.error('更新记录状态失败');
        return false;
      }
      return true;
    } catch (error) {
      console.error('更新记录状态失败', error);
      toast.error('更新记录状态失败');
      return false;
    }
  };
  
  // 批量插入审核历史的公共函数
  const insertApprovalHistory = async (historyRecords: any[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('approval_history')
        .insert(historyRecords);
      
      if (error) {
        console.error('插入审核历史失败', error);
        toast.error('插入审核历史失败');
        return false;
      }
      return true;
    } catch (error) {
      console.error('插入审核历史失败', error);
      toast.error('插入审核历史失败');
      return false;
    }
  };
  
  const fetchPendingRecords = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // 查询班长已审核通过的记录（status='approved'），同时获取冗余姓名字段
      let query = supabase
        .from('timesheet_records')
        .select(`
          *,
          supervisor:supervisor_id(id, name),
          section_chief:section_chief_id(id, name),
          user:user_id(id, name, phone),
          timesheet_record_items(*, processes(unit_price))
        `)
        .eq('status', 'approved'); // 查询班长已审核通过的记录
      
      // 如果是超级管理员，可以查看所有记录
      // 如果是段长，只能查看自己管辖的记录
      if (user.role?.name !== '超级管理员') {
        query = query.eq('section_chief_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 提取所有工序ID
      const allItems = data?.flatMap(record => record.timesheet_record_items || []) || [];
      const processIds = [...new Set(allItems.map(item => item.process_id).filter(Boolean))];
      
      // 使用缓存机制查询工序信息
      const uncachedProcessIds = processIds.filter(id => !processCache.has(id));
      
      if (uncachedProcessIds.length > 0) {
        const { data: processesData, error: processError } = await supabase
          .from('processes')
          .select('id, product_process, product_name, production_category, production_line')
          .in('id', uncachedProcessIds);
        
        if (processError) {
          console.error('查询工序信息失败:', processError);
        } else {
          // 将新查询的工序信息添加到缓存
          (processesData || []).forEach(process => {
            processCache.set(process.id, process);
          });
        }
      }
      
      // 从缓存中获取所有需要的工序信息
      const processes = processIds.map(id => processCache.get(id)).filter(Boolean);
      
      // 创建工序信息Map提升查找效率
      const processesMap = new Map(processes.map(p => [p.id, p]));
      
      // 组合数据 - 利用JOIN查询已获取的数据
      const recordsWithItems = data?.map(record => {
        const recordItems = record.timesheet_record_items || [];
        
        // 通过工序ID获取生产线信息
        const firstProcess = recordItems.length > 0 ? processesMap.get(recordItems[0].process_id) : null;
        const production_line = firstProcess ? { name: firstProcess.production_line } : { name: '未知生产线' };
        
        return {
          ...record,
          production_line,
          // 优先使用冗余姓名字段，如果为空则使用JOIN查询结果
          user: {
            name: record.user_name || (record.user ? record.user.name : '未知用户'),
            phone: record.user ? record.user.phone : ''
          },
          supervisor: record.supervisor_name ? 
            { id: record.supervisor_id, name: record.supervisor_name } : 
            (record.supervisor || null),
          section_chief: record.section_chief_name ? 
            { id: record.section_chief_id, name: record.section_chief_name } : 
            (record.section_chief || null),
          items: recordItems.map(item => {
            const process = processesMap.get(item.process_id);
            const unitPrice = item.processes?.unit_price || 0;
            const amount = item.quantity * unitPrice;
            return {
              id: item.id,
              work_type: { name: process?.production_category || '未知工时类型' },
              product: { name: process?.product_name || '未知产品', code: '' },
              process: { name: process?.product_process || '未知工序' },
              quantity: item.quantity,
              unit: item.unit || '件',
              unit_price: unitPrice,
              amount: amount
            };
          })
        };
      }) || [];
      
      // 过滤掉没有工时记录项的记录
      const filteredRecords = recordsWithItems.filter(record => 
        record.items && record.items.length > 0
      );
      
      setRecords(filteredRecords);
      
      // 对数据进行分组处理
      const grouped = groupRecordsByUserAndDate(filteredRecords);
      setGroupedRecords(grouped);
    } catch (error) {
      console.error('获取待审核记录失败:', error);
      toast.error('获取待审核记录失败');
    } finally {
      setLoading(false);
    }
  };



  const fetchApprovalHistory = async (recordId: string) => {
    try {
      // 使用JOIN语句一次性获取审核历史和审核人信息，同时获取冗余姓名字段
      const { data, error } = await safeQuery(async () => {
        return await supabase
          .from('approval_history')
          .select(`
            *,
            approver:approver_id(id, name)
          `)
          .eq('timesheet_record_id', recordId)
          .order('created_at', { ascending: false });
      });

      if (error) throw error;
      
      // 优先使用冗余姓名字段，如果为空则使用JOIN查询结果
      const historyWithApprovers = (data || []).map(history => ({
        ...history,
        approver: {
          name: history.approver_name || (history.approver ? history.approver.name : '未知审核人')
        }
      }));
      
      setApprovalHistory(historyWithApprovers);
    } catch (error) {
      console.error('获取审核历史失败:', error);
      toast.error('获取审核历史失败');
    }
  };

  const handleApproval = async () => {
    if (!selectedRecord || !user) return;

    // 检查是否有未保存的修改
    if (editingItem) {
      const editingInfo = getCurrentEditingItemInfo();
      if (editingInfo) {
        setUnsavedChangesInfo({
          itemId: editingItem,
          itemName: editingInfo.itemName,
          userName: editingInfo.userName,
          workDate: editingInfo.workDate,
          originalQuantity: originalQuantity,
          newQuantity: editQuantity,
          unit: editingInfo.item.unit,
          pendingApprovalData: {
            type: 'single',
            record: selectedRecord,
            comment: comments
          }
        });
        setShowUnsavedChangesModal(true);
        return;
      }
    }

    try {
      setSubmitting(true);

      // 使用公共函数更新记录状态为段长审核通过
      const updateSuccess = await updateRecordStatus([selectedRecord.id], 'section_chief_approved');
      if (!updateSuccess) return;

      // 使用公共函数添加审核历史
      const historyRecord = {
        timesheet_record_id: selectedRecord.id,
        approver_id: user.id,
        approver_type: 'section_chief', // 段长审核
        action: 'approved',
        comment: comments,
        created_at: new Date().toISOString()
      };
      
      const historySuccess = await insertApprovalHistory([historyRecord]);
      if (!historySuccess) return;

      setShowApprovalModal(false);
      setSelectedRecord(null);
      setComments('');
      fetchPendingRecords();
    } catch (error) {
      console.error('审核操作失败:', error);
      toast.error('审核操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 处理合并记录的审核
  const handleGroupedApproval = async (groupedRecord: GroupedTimesheetRecord, comment?: string) => {
    // 检查是否有未保存的修改
    if (editingItem) {
      const editingInfo = getCurrentEditingItemInfo();
      if (editingInfo) {
        setUnsavedChangesInfo({
          itemId: editingItem,
          itemName: editingInfo.itemName,
          userName: editingInfo.userName,
          workDate: editingInfo.workDate,
          originalQuantity: originalQuantity,
          newQuantity: editQuantity,
          unit: editingInfo.item.unit,
          pendingApprovalData: {
            type: 'grouped',
            groupedRecord: groupedRecord,
            comment: comment
          }
        });
        setShowUnsavedChangesModal(true);
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const recordIds = groupedRecord.originalRecords.map(record => record.id);
      
      // 使用公共函数批量更新记录状态为段长审核通过
      const updateSuccess = await updateRecordStatus(recordIds, 'section_chief_approved');
      if (!updateSuccess) return;

      // 使用公共函数批量添加审核历史
      const historyRecords = recordIds.map(recordId => ({
        timesheet_record_id: recordId,
        approver_id: user?.id,
        approver_type: 'section_chief', // 段长审核
        action: 'approved',
        comment: comment || null,
        created_at: new Date().toISOString()
      }));

      const historySuccess = await insertApprovalHistory(historyRecords);
      if (!historySuccess) return;

      // 审核通过后刷新数据并显示成功提示
      toast.success('审核通过成功');
      fetchPendingRecords();
      
      // 清空选中的记录
      setSelectedRecords(new Set());
      
    } catch (error) {
      console.error('审核操作失败:', error);
      toast.error('审核操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 开始编辑数量
  const startEditQuantity = (item: TimesheetItem) => {
    // 检查是否有未保存的修改
    if (editingItem && editQuantity !== originalQuantity) {
      // 获取当前正在编辑的项目信息
      const currentEditingInfo = getCurrentEditingItemInfo();
      if (currentEditingInfo) {
        // 找到新目标项目所属的分组记录
        const targetGroupedRecord = groupedRecords.find(record => 
          record.allItems.some(i => i.id === item.id)
        );
        
        if (targetGroupedRecord) {
          // 显示未保存修改对话框
          setUnsavedChangesInfo({
            itemId: editingItem,
            itemName: currentEditingInfo.itemName,
            userName: currentEditingInfo.userName,
            workDate: currentEditingInfo.workDate,
            originalQuantity: originalQuantity,
            newQuantity: editQuantity,
            unit: currentEditingInfo.item.unit,
            pendingApprovalData: {
              type: 'edit_switch',
              newEditTarget: {
                item: item,
                groupedRecord: targetGroupedRecord
              }
            }
          });
          setShowUnsavedChangesModal(true);
          return; // 停止执行，等待用户选择
        }
      }
    }
    
    // 没有未保存修改或无法获取信息，直接开始编辑
    setEditingItem(item.id);
    setEditQuantity(item.quantity);
    setOriginalQuantity(item.quantity);
  };

  // 显示修改数量确认弹窗
  const showQuantityConfirmModal = (item: TimesheetItem, groupedRecord: GroupedTimesheetRecord) => {
    // 验证数量输入
    if (editQuantity <= 0) {
      toast.error('数量必须大于0');
      return;
    }

    // 根据工时类型验证数量格式
    const workType = item.work_type?.name || '';
    const isProduction = workType.includes('生产');
    
    if (isProduction && !Number.isInteger(editQuantity)) {
      toast.error('生产工时数量必须为整数');
      return;
    }

    if (!isProduction && editQuantity < 0) {
      toast.error('非生产工时数量不能为负数');
      return;
    }

    const itemName = `${item.work_type?.name || '未知类型'} | ${item.product?.name || '未知产品'} | ${item.process?.name || '未知工序'}`;
    
    setQuantityModalInfo({
      itemId: item.id,
      itemName,
      userName: groupedRecord.user.name,
      workDate: groupedRecord.work_date,
      originalQuantity: originalQuantity,
      newQuantity: editQuantity,
      unit: item.unit,
      workType: workType
    });
    setShowQuantityModal(true);
  };

  // 确认保存数量修改
  const confirmSaveQuantityEdit = async () => {
    if (!quantityModalInfo) return;

    try {
      // 查找对应的项目信息以获取单价
      let item = null;
      for (const groupedRecord of groupedRecords) {
        const foundItem = groupedRecord.allItems.find(i => i.id === quantityModalInfo.itemId);
        if (foundItem) {
          item = foundItem;
          break;
        }
      }

      if (!item) {
        toast.error('找不到对应的工时项目');
        return;
      }

      const unitPrice = item.unit_price || 0;
      const newAmount = quantityModalInfo.newQuantity * unitPrice;

      // 使用数据库函数更新，它会自动记录修改历史
      const { error } = await supabase.rpc('update_timesheet_item_with_user', {
        item_id: quantityModalInfo.itemId,
        new_quantity: quantityModalInfo.newQuantity,
        new_amount: newAmount,
        modifier_id: user?.id || null,
        modifier_name: user?.name || '未知用户'
      });

      if (error) throw error;

      toast.success('数量修改成功');
      setEditingItem(null);
      setEditQuantity(0);
      setOriginalQuantity(0);
      setShowQuantityModal(false);
      setQuantityModalInfo(null);
      fetchPendingRecords();
    } catch (error) {
      console.error('修改数量失败:', error);
      toast.error('修改数量失败，请重试');
    }
  };

  // 关闭修改数量确认弹窗
  const closeQuantityModal = () => {
    setShowQuantityModal(false);
    setQuantityModalInfo(null);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingItem(null);
    setEditQuantity(0);
  };

  // 获取当前正在编辑的项目信息
  const getCurrentEditingItemInfo = () => {
    if (!editingItem) return null;
    
    // 在所有分组记录中查找正在编辑的项目
    for (const groupedRecord of groupedRecords) {
      const item = groupedRecord.allItems.find(item => item.id === editingItem);
      if (item) {
        return {
          item,
          groupedRecord,
          itemName: `${item.work_type?.name || '未知类型'} | ${item.product?.name || '未知产品'} | ${item.process?.name || '未知工序'}`,
          userName: groupedRecord.user?.name || '未知用户',
          workDate: groupedRecord.work_date
        };
      }
    }
    return null;
  };

  // 自动保存并审核
  const confirmSaveAndApprove = async () => {
    if (!pendingApprovalData || !quantityModalInfo) return;

    try {
      setSubmitting(true);
      
      // 先保存数量修改 - 查找对应的项目信息以获取单价
      let item = null;
      for (const groupedRecord of groupedRecords) {
        const foundItem = groupedRecord.allItems.find(i => i.id === quantityModalInfo.itemId);
        if (foundItem) {
          item = foundItem;
          break;
        }
      }

      if (!item) {
        toast.error('找不到对应的工时项目');
        return;
      }

      const unitPrice = item.unit_price || 0;
      const newAmount = quantityModalInfo.newQuantity * unitPrice;

      // 使用数据库函数更新，它会自动记录修改历史
      const { error: saveError } = await supabase.rpc('update_timesheet_item_with_user', {
        item_id: quantityModalInfo.itemId,
        new_quantity: quantityModalInfo.newQuantity,
        new_amount: newAmount,
        modifier_id: user?.id || null,
        modifier_name: user?.name || '未知用户'
      });

      if (saveError) {
        console.error('保存数量修改失败:', saveError);
        toast.error('保存数量修改失败，请重试');
        return;
      }

      // 清除编辑状态
      setEditingItem(null);
      setEditQuantity(0);
      setOriginalQuantity(0);
      setShowQuantityModal(false);
      setQuantityModalInfo(null);

      // 然后执行审核
      if (pendingApprovalData.type === 'single' && pendingApprovalData.record) {
        // 单个记录审核
        const updateSuccess = await updateRecordStatus([pendingApprovalData.record.id], 'section_chief_approved');
        if (!updateSuccess) return;

        const historyRecord = {
          timesheet_record_id: pendingApprovalData.record.id,
          approver_id: user?.id,
          approver_type: 'section_chief',
          action: 'approved',
          comment: pendingApprovalData.comment || '',
          created_at: new Date().toISOString()
        };
        
        const historySuccess = await insertApprovalHistory([historyRecord]);
        if (!historySuccess) return;

        setShowApprovalModal(false);
        setSelectedRecord(null);
        setComments('');
      } else if (pendingApprovalData.type === 'grouped' && pendingApprovalData.groupedRecord) {
        // 批量记录审核
        const recordIds = pendingApprovalData.groupedRecord.originalRecords.map(record => record.id);
        
        const updateSuccess = await updateRecordStatus(recordIds, 'section_chief_approved');
        if (!updateSuccess) return;

        const historyRecords = recordIds.map(recordId => ({
          timesheet_record_id: recordId,
          approver_id: user?.id,
          approver_type: 'section_chief',
          action: 'approved',
          comment: pendingApprovalData.comment || null,
          created_at: new Date().toISOString()
        }));

        const historySuccess = await insertApprovalHistory(historyRecords);
        if (!historySuccess) return;

        setSelectedRecords(new Set());
      }

      toast.success('保存并审核成功');
      fetchPendingRecords();
      
    } catch (error) {
      console.error('保存并审核失败:', error);
      toast.error('保存并审核失败，请重试');
    } finally {
      setSubmitting(false);
      setSaveAndApproveModal(false);
      setPendingApprovalData(null);
    }
  };

  // 取消自动保存并审核
  const cancelSaveAndApprove = () => {
    setSaveAndApproveModal(false);
    setPendingApprovalData(null);
  };

  // 处理未保存修改对话框 - 保存并继续审核
  const handleSaveAndContinueApproval = async () => {
    if (!unsavedChangesInfo) return;

    try {
      setSubmitting(true);
      
      // 先保存数量修改 - 查找对应的项目信息以获取单价
      let item = null;
      for (const groupedRecord of groupedRecords) {
        const foundItem = groupedRecord.allItems.find(i => i.id === unsavedChangesInfo.itemId);
        if (foundItem) {
          item = foundItem;
          break;
        }
      }

      if (!item) {
        toast.error('找不到对应的工时项目');
        return;
      }

      const unitPrice = item.unit_price || 0;
      const newAmount = unsavedChangesInfo.newQuantity * unitPrice;

      // 使用数据库函数更新，它会自动记录修改历史
      const { error: saveError } = await supabase.rpc('update_timesheet_item_with_user', {
        item_id: unsavedChangesInfo.itemId,
        new_quantity: unsavedChangesInfo.newQuantity,
        new_amount: newAmount,
        modifier_id: user?.id || null,
        modifier_name: user?.name || '未知用户'
      });

      if (saveError) {
        console.error('保存数量修改失败:', saveError);
        toast.error('保存数量修改失败，请重试');
        return;
      }

      // 清除编辑状态
      setEditingItem(null);
      setEditQuantity(0);
      setOriginalQuantity(0);

      // 关闭未保存修改对话框
      setShowUnsavedChangesModal(false);
      
      // 检查是否是编辑切换场景
      const pendingData = unsavedChangesInfo.pendingApprovalData;
      if (pendingData.type === 'edit_switch' && pendingData.newEditTarget) {
        // 编辑切换场景：保存当前修改后开始编辑新项目
        const { item, groupedRecord } = pendingData.newEditTarget;
        
        // 开始编辑新项目
        setEditingItem(item.id);
        setEditQuantity(item.quantity);
        setOriginalQuantity(item.quantity);
        
        toast.success('已保存修改，现在可以编辑新项目');
        
        // 清理状态并返回，不需要执行审核
        setUnsavedChangesInfo(null);
        setSubmitting(false);
        return;
      }

      // 对于其他场景，只保存数量修改，不执行审核操作
      toast.success('数量修改已保存');
      fetchPendingRecords();
      
    } catch (error) {
      console.error('保存并审核失败:', error);
      toast.error('保存并审核失败，请重试');
    } finally {
      setSubmitting(false);
      setUnsavedChangesInfo(null);
    }
  };

  // 处理未保存修改对话框 - 取消修改并继续审核
  const handleCancelAndContinueApproval = async () => {
    if (!unsavedChangesInfo) return;

    try {
      setSubmitting(true);
      
      // 恢复原数量，取消编辑状态
      setEditingItem(null);
      setEditQuantity(0);
      setOriginalQuantity(0);

      // 关闭未保存修改对话框
      setShowUnsavedChangesModal(false);
      
      // 然后执行审核
      const pendingData = unsavedChangesInfo.pendingApprovalData;
      if (pendingData.type === 'single' && pendingData.record) {
        // 单个记录审核
        const updateSuccess = await updateRecordStatus([pendingData.record.id], 'section_chief_approved');
        if (!updateSuccess) return;

        const historyRecord = {
          timesheet_record_id: pendingData.record.id,
          approver_id: user?.id,
          approver_type: 'section_chief',
          action: 'approved',
          comment: pendingData.comment || '',
          created_at: new Date().toISOString()
        };
        
        const historySuccess = await insertApprovalHistory([historyRecord]);
        if (!historySuccess) return;

        setShowApprovalModal(false);
        setSelectedRecord(null);
        setComments('');
      } else if (pendingData.type === 'grouped' && pendingData.groupedRecord) {
        // 批量记录审核
        const recordIds = pendingData.groupedRecord.originalRecords.map(record => record.id);
        
        const updateSuccess = await updateRecordStatus(recordIds, 'section_chief_approved');
        if (!updateSuccess) return;

        const historyRecords = recordIds.map(recordId => ({
          timesheet_record_id: recordId,
          approver_id: user?.id,
          approver_type: 'section_chief',
          action: 'approved',
          comment: pendingData.comment || null,
          created_at: new Date().toISOString()
        }));

        const historySuccess = await insertApprovalHistory(historyRecords);
        if (!historySuccess) return;
      } else if (pendingData.type === 'batch' && pendingData.selectedRecords) {
        // 批量审核
        const selectedGroupedRecords = groupedRecords.filter(record => 
          pendingData.selectedRecords?.includes(record.groupKey) ?? false
        );
        
        for (const groupedRecord of selectedGroupedRecords) {
          const recordIds = groupedRecord.originalRecords.map(record => record.id);
          
          const updateSuccess = await updateRecordStatus(recordIds, 'section_chief_approved');
          if (!updateSuccess) return;

          const historyRecords = recordIds.map(recordId => ({
            timesheet_record_id: recordId,
            approver_id: user?.id,
            approver_type: 'section_chief',
            action: 'approved',
            comment: '',
            created_at: new Date().toISOString()
          }));

          const historySuccess = await insertApprovalHistory(historyRecords);
          if (!historySuccess) return;
        }
        
        setSelectedRecords(new Set());
        navigate('/');
        return;
      } else if (pendingData.type === 'edit_switch' && pendingData.newEditTarget) {
        // 编辑切换场景：取消当前修改并开始编辑新项目
        const { item, groupedRecord } = pendingData.newEditTarget;
        
        // 开始编辑新项目
        setEditingItem(item.id);
        setEditQuantity(item.quantity);
        setOriginalQuantity(item.quantity);
        
        toast.success('已取消修改，现在可以编辑新项目');
        
        // 清理状态并返回，不需要执行审核
        setUnsavedChangesInfo(null);
        setSubmitting(false);
        return;
      }

      toast.success('审核成功');
      fetchPendingRecords();
      
    } catch (error) {
      console.error('审核失败:', error);
      toast.error('审核失败，请重试');
    } finally {
      setSubmitting(false);
      setUnsavedChangesInfo(null);
    }
  };

  // 关闭未保存修改对话框
  const closeUnsavedChangesModal = () => {
    setShowUnsavedChangesModal(false);
    setUnsavedChangesInfo(null);
  };

  // 打开删除确认对话框
  const openDeleteModal = (itemId: string, itemName: string, userName: string, workDate: string) => {
    setDeleteTargetInfo({
      itemId,
      itemName,
      userName,
      workDate
    });
    setShowDeleteModal(true);
  };

  // 删除记录项
  const deleteRecordItem = async () => {
    if (!deleteTargetInfo) return;

    try {
      // 先获取要删除的item信息，包括其所属的timesheet_record_id
      const { data: itemData, error: itemError } = await supabase
        .from('timesheet_record_items')
        .select('timesheet_record_id')
        .eq('id', deleteTargetInfo.itemId)
        .single();

      if (itemError) throw itemError;

      // 删除该item
      const { error } = await supabase
        .from('timesheet_record_items')
        .delete()
        .eq('id', deleteTargetInfo.itemId);

      if (error) throw error;

      // 检查该record是否还有其他items
      const { data: remainingItems, error: checkError } = await supabase
        .from('timesheet_record_items')
        .select('id')
        .eq('timesheet_record_id', itemData.timesheet_record_id);

      if (checkError) throw checkError;

      // 如果没有剩余的items，删除主记录
      if (remainingItems.length === 0) {
        const { error: deleteRecordError } = await supabase
          .from('timesheet_records')
          .delete()
          .eq('id', itemData.timesheet_record_id);

        if (deleteRecordError) throw deleteRecordError;
      }

      toast.success('记录项删除成功');
      setShowDeleteModal(false);
      setDeleteTargetInfo(null);
      fetchPendingRecords();
    } catch (error) {
      console.error('删除记录项失败:', error);
      toast.error('删除记录项失败，请重试');
    }
  };

  // 关闭删除确认对话框
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTargetInfo(null);
  };

  const openApprovalModal = (record: TimesheetRecord) => {
    setSelectedRecord(record);
    setShowApprovalModal(true);
  };

  // 处理合并记录的审核模态框
  const [selectedGroupedRecord, setSelectedGroupedRecord] = useState<GroupedTimesheetRecord | null>(null);
  


  const openHistoryModal = (record: TimesheetRecord) => {
    setSelectedRecord(record);
    fetchApprovalHistory(record.id);
    setShowHistoryModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'section_chief_approved': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '班长已通过';
      case 'section_chief_approved': return '段长已通过';
      default: return '草稿';
    }
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
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="max-w-6xl mx-auto px-3 py-4">
        {/* Header - 紧凑设计 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <Crown className="w-6 h-6 text-green-400 mr-2" />
              <h1 className="text-2xl font-bold text-green-400 font-mono">段长审核</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 disabled:from-gray-700 disabled:to-gray-800 text-green-300 hover:text-green-200 disabled:text-gray-400 rounded-lg font-mono transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600 hover:border-green-500/50 disabled:border-gray-600"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? '刷新中...' : '刷新'}</span>
              </button>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-green-300 hover:text-green-200 rounded-lg font-mono transition-all duration-200 shadow-md hover:shadow-lg border border-gray-600 hover:border-green-500/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回控制台</span>
                <span className="sm:hidden">返回</span>
              </Link>
            </div>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
        </div>

        {/* 统计信息栏 - 紧凑设计 */}
        <div className="bg-gray-900 border border-green-400 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-green-300 font-mono text-base bg-gray-800 px-2 py-1 rounded">
              {groupedRecords.length} 条记录
            </span>
            {selectedRecords.size > 0 && (
              <span className="text-green-400 font-mono text-base">
                已选择 {selectedRecords.size} 条
              </span>
            )}
          </div>
        </div>

        {groupedRecords.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-green-400 mb-2 font-mono">暂无待审核记录</h3>
            <p className="text-green-600 font-mono text-sm">当前没有需要段长审核的工时记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedRecords.map((groupedRecord) => (
              <div key={groupedRecord.groupKey} className="border border-green-400 bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all duration-200">
                {/* 卡片头部 - 用户信息和选择 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(groupedRecord.groupKey)}
                      onChange={() => handleSelectRecord(groupedRecord.groupKey)}
                      className="w-4 h-4 text-green-600 border-green-400 rounded focus:ring-green-500 bg-gray-700 flex-shrink-0"
                    />
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-400" />
                      <span className="font-medium text-green-300 font-mono">{groupedRecord.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 font-mono text-base">{formatDate(groupedRecord.work_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getStatusColor(groupedRecord.status)}`}>
                      {getStatusText(groupedRecord.status)}
                    </span>
                  </div>
                </div>
                
                {/* 基本信息 - 网格布局 */}
                <div className="grid grid-cols-1 gap-2 mb-3 text-base">
                  <div className="flex items-center gap-1">
                    <span className="text-green-400 font-mono text-sm">共 {groupedRecord.totalItems} 项</span>
                  </div>
                </div>

                {/* 工时项目卡片网格 - 移动端友好 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                  {groupedRecord.allItems.map((item) => (
                    <div key={item.id} className="bg-gray-700 border border-green-500 rounded p-2 hover:bg-gray-600 transition-colors">
                      {/* 合并的工时信息 */}
                      <div className="mb-1.5">
                        <div className="text-green-200 font-mono text-sm font-medium leading-tight">
                          {`${item.work_type?.name || '未知类型'} | ${item.product?.name || '未知产品'} | ${item.process?.name || '未知工序'}`}
                        </div>
                        {item.product?.code && (
                          <div className="text-green-500 font-mono text-sm mt-0.5">编码: {item.product.code}</div>
                        )}
                      </div>
                      
                      {/* 数量和操作按钮 */}
                      <div className="flex items-center justify-between">
                        <div className="text-green-200 font-mono text-sm font-medium">
                          {editingItem === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(Number(e.target.value))}
                                onWheel={(e) => e.preventDefault()}
                                className="w-16 px-2 py-1 bg-gray-600 border border-green-400 rounded text-green-300 font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="1"
                              />
                              <span className="text-green-300 text-sm">{item.unit}</span>
                            </div>
                          ) : (
                            `${item.quantity} ${item.unit}`
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {editingItem === item.id ? (
                            <>
                              <button
                                onClick={() => showQuantityConfirmModal(item, groupedRecord)}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="确认保存"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="取消"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditQuantity(item)}
                                className="p-2 text-blue-400 hover:text-blue-300 transition-colors rounded-md hover:bg-blue-400/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="编辑数量"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  const itemName = `${item.work_type?.name || '未知工时类型'} | ${item.product?.name || '未知产品'} | ${item.process?.name || '未知工序'}`;
                                  openDeleteModal(
                                    item.id, 
                                    itemName,
                                    groupedRecord?.user?.name || '未知用户',
                                    groupedRecord?.work_date || '未知日期'
                                  );
                                }}
                                className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-md hover:bg-red-400/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="删除"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 底部通过审核按钮区域 */}
        {selectedRecords.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-green-400 p-4 z-40">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <span className="text-green-400 font-mono text-sm">
                已选择 {selectedRecords.size} 条记录
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedRecords(new Set())}
                  className="px-4 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700 font-mono"
                >
                  取消选择
                </button>
                <button
                  onClick={handleBatchApproval}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50 font-mono"
                >
                  <CheckCircle className="w-5 h-5" />
                  {submitting ? '处理中...' : '通过审核'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* 修改数量确认对话框 */}
      {showQuantityModal && quantityModalInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-green-400 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Edit2 className="w-6 h-6 text-blue-400 mr-3" />
              <h3 className="text-lg font-semibold text-green-400 font-mono">确认修改数量</h3>
            </div>
            
            <div className="mb-4 text-green-300 font-mono text-sm">
              <p>您确定要修改以下工时记录的数量吗？</p>
              <div className="mt-3 p-3 bg-gray-700 rounded border border-green-500">
                <div className="text-green-200">员工姓名：{quantityModalInfo.userName}</div>
                <div className="text-green-200">工作日期：{quantityModalInfo.workDate}</div>
                <div className="text-green-200">工时项目：{quantityModalInfo.itemName}</div>
                <div className="text-yellow-300">数量变更：{quantityModalInfo.originalQuantity} {quantityModalInfo.unit} → {quantityModalInfo.newQuantity} {quantityModalInfo.unit}</div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeQuantityModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-green-300 rounded font-mono transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmSaveQuantityEdit}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-mono transition-colors"
              >
                ✓ 确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteModal && deleteTargetInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-green-400 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">确认删除</h3>
                <p className="text-sm text-gray-400">此操作不可恢复</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                您确定要删除以下工时记录项吗？
              </p>
              <div className="bg-gray-700 border border-gray-600 p-3 rounded-lg">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">员工姓名:</span>
                    <span className="font-medium text-gray-200">{deleteTargetInfo.userName}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">工作日期:</span>
                    <span className="font-medium text-gray-200">{formatDate(deleteTargetInfo.workDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">工时项目:</span>
                    <span className="font-medium text-gray-200">{deleteTargetInfo.itemName}</span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-300 hover:text-gray-100 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={deleteRecordItem}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自动保存并审核确认对话框 */}
      {showSaveAndApproveModal && pendingApprovalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-green-400 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">检测到未保存的修改</h3>
                <p className="text-sm text-gray-400">您有数量修改尚未保存</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-3">
                您修改了数量但尚未保存。是否要自动保存修改并继续审核？
              </p>
              <div className="bg-gray-700 border border-gray-600 p-3 rounded-lg">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">原数量:</span>
                    <span className="font-medium text-gray-200">{originalQuantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">新数量:</span>
                    <span className="font-medium text-green-400">{editQuantity}</span>
                  </div>
                </div>
              </div>
              <p className="text-yellow-400 text-sm mt-3 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                选择"保存并审核"将自动保存修改然后继续审核流程
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelSaveAndApprove}
                className="px-4 py-2 text-gray-300 hover:text-gray-100 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmSaveAndApprove}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    保存并审核
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未保存修改详细对话框 */}
      {showUnsavedChangesModal && unsavedChangesInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-green-400 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">检测到未保存的修改</h3>
                <p className="text-sm text-gray-400">您有数量修改尚未保存</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-3">
                您修改了数量但尚未保存。请选择如何处理这个未保存的修改：
              </p>
              <div className="bg-gray-700 border border-gray-600 p-3 rounded-lg">
                <h4 className="font-medium text-gray-200 mb-3">未保存的修改项目：</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">项目：</span>
                    <span className="font-medium text-gray-200">{unsavedChangesInfo.itemName}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">用户：</span>
                    <span className="font-medium text-gray-200">{unsavedChangesInfo.userName}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">日期：</span>
                    <span className="font-medium text-gray-200">{unsavedChangesInfo.workDate}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                    <span className="text-gray-400">数量变更：</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300">{unsavedChangesInfo.originalQuantity}</span>
                      <span className="text-orange-400">→</span>
                      <span className="font-medium text-orange-400">{unsavedChangesInfo.newQuantity}</span>
                      <span className="text-gray-400 text-xs">{unsavedChangesInfo.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-orange-400 text-sm mt-3 flex items-center gap-1">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 选择"保存修改"将自动保存修改然后继续审核流程
               </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={closeUnsavedChangesModal}
                className="px-4 py-2 text-gray-300 hover:text-gray-100 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleSaveAndContinueApproval}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                     保存修改
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审核历史模态框 */}
      {showHistoryModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">审核历史</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              {approvalHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无审核历史</p>
              ) : (
                approvalHistory.map((history) => (
                  <div key={history.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{history.approver.name}</span>
                        <span className="text-sm text-gray-500">({history.approver_type === 'supervisor' ? '班长' : '段长'})</span>
                      </div>
                      <span className="px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                        通过
                      </span>
                    </div>
                    {history.comments && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">审核意见:</span>
                        </div>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{history.comments}</p>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {new Date(history.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionChiefApproval;