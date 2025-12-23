import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
// 单例管理员客户端，避免重复创建导致 GoTrueClient 警告
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: 'sb-admin'
    }
  }
)
function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

// 回收站项目类型
export type RecycleBinItemType = 'timesheet_record' | 'process'

// 回收站项目接口
export interface RecycleBinItem {
  id: string
  item_type: RecycleBinItemType
  item_id: string
  item_data: any
  deleted_by: string
  deleter?: { name?: string }
  deleted_at: string
  original_table: string
  company_id?: string
  user_id?: string
  expires_at: string
  is_permanently_deleted: boolean
  restored_at?: string
  restored_by?: string
  created_at: string
  updated_at: string
  parent_recycle_bin_id?: string
  child_item_id?: string
  is_virtual_item?: boolean
}

// 回收站统计数据接口
export interface RecycleBinStats {
  totalItems: number
  expiredItems: number
  timesheetRecords: number
  timesheetRecordItems: number
  processes: number
}

// 添加到回收站
export async function addToRecycleBin(
  itemType: RecycleBinItemType,
  itemId: string,
  itemData: any,
  originalTable: string,
  companyId?: string,
  userId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // 使用本地存储的用户信息，不依赖Supabase Auth
    const storedUser = localStorage.getItem('auth_user')
    if (!storedUser) {
      return { success: false, error: '用户未登录' }
    }
    const currentUser = JSON.parse(storedUser)

    // 计算100天后的过期时间
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000)
    const expiresAtISO = expiresAt.toISOString()
    console.log(`添加到回收站: itemType=${itemType}, itemId=${itemId}, expiresAt=${expiresAt}, expiresAtISO=${expiresAtISO}`)

    const { data, error } = await supabase
      .from('recycle_bin')
      .insert({
        item_type: itemType,
        item_id: itemId,
        item_data: itemData,
        deleted_by: currentUser.id,
        original_table: originalTable,
        company_id: companyId,
        user_id: userId,
        expires_at: expiresAtISO // 100天后过期
      })
      .select('*, expires_at')
      .single()

    if (error) {
      console.error('添加到回收站失败:', error)
      return { success: false, error }
    }

    console.log('添加到回收站成功:', data)
    console.log('实际保存的expires_at:', data.expires_at)
    return { success: true }
  } catch (error) {
    console.error('添加到回收站异常:', error)
    return { success: false, error: error as any }
  }
}

// 安全删除（带回收站备份）
export async function safeDeleteWithRecycleBin(
  tableName: string,
  itemId: string,
  itemType: RecycleBinItemType,
  companyId?: string,
  userId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. 获取原始数据，根据不同类型获取完整信息
    let originalData: any;
    let fetchError: any;
    
    if (tableName === 'timesheet_records') {
      // 获取工时记录完整数据，包括关联表信息
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          user_name,
          supervisor_name,
          section_chief_name,
          user:user_id(id, name, company_id),
          supervisor:supervisor_id(id, name),
          section_chief:section_chief_id(id, name)
        `)
        .eq('id', itemId)
        .single();
      originalData = data;
      fetchError = error;
      
      // 获取工时记录项（包含工序详细信息）
      if (originalData) {
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
          .eq('timesheet_record_id', itemId);
        
        if (!itemsError) {
          originalData.items = itemsData;
        }
      }
    } else if (tableName === 'processes') {
      // 获取工序完整数据
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', itemId)
        .single();
      originalData = data;
      fetchError = error;
    } else {
      // 默认获取方式
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', itemId)
        .single();
      originalData = data;
      fetchError = error;
    }

    if (fetchError || !originalData) {
      return { success: false, error: fetchError || '未找到要删除的数据' }
    }

    // 2. 添加到回收站
    const recycleResult = await addToRecycleBin(
      itemType,
      itemId,
      originalData,
      tableName,
      companyId,
      userId
    )

    if (!recycleResult.success) {
      return { success: false, error: recycleResult.error }
    }

    // 3. 删除原始数据
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', itemId)

    if (deleteError) {
      // 如果删除失败，尝试回滚回收站添加
      await supabase
        .from('recycle_bin')
        .delete()
        .eq('item_id', itemId)
        .eq('item_type', itemType)

      return { success: false, error: deleteError }
    }

    return { success: true }
  } catch (error) {
    console.error('安全删除异常:', error)
    return { success: false, error }
  }
}

// 批量安全删除
export async function batchDeleteWithRecycleBin(
  tableName: string,
  itemIds: string[],
  itemType: RecycleBinItemType,
  companyId?: string,
  userId?: string
): Promise<{ success: boolean; error?: any; deletedCount?: number }> {
  try {
    let deletedCount = 0
    const errors: any[] = []

    // 逐个处理，确保每个项目都能正确备份
    for (const itemId of itemIds) {
      const result = await safeDeleteWithRecycleBin(
        tableName,
        itemId,
        itemType,
        companyId,
        userId
      )

      if (result.success) {
        deletedCount++
      } else {
        errors.push({ itemId, error: result.error })
      }
    }

    if (errors.length > 0) {
      console.warn('批量删除警告:', errors)
    }

    return { 
      success: deletedCount > 0, 
      error: errors.length > 0 ? errors : undefined,
      deletedCount 
    }
  } catch (error) {
    console.error('批量安全删除异常:', error)
    return { success: false, error }
  }
}

// 从回收站恢复项目
export async function restoreFromRecycleBin(
  recycleBinId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('开始恢复项目，ID:', recycleBinId)
    
    // 使用文件顶部的单例管理员客户端
    
    // 1. 获取回收站项目
    const { data: recycleItem, error: fetchError } = await supabaseAdmin
      .from('recycle_bin')
      .select('*')
      .eq('id', recycleBinId)
      .eq('is_permanently_deleted', false)
      .single()
    
    console.log('获取到回收站项目:', recycleItem)

    if (fetchError || !recycleItem) {
      console.error('获取回收站项目失败:', fetchError)
      return { success: false, error: { message: fetchError?.message || '未找到回收站项目' } }
    }

    const originalTable = recycleItem.original_table
    const itemId = recycleItem.item_id
    const itemType = recycleItem.item_type
    const itemData = recycleItem.item_data

    // 记录恢复者与原删除者，用于历史描述
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}') } catch { return {} } })()
    let deletedByName: string | undefined
    try {
      const { data: deleterRes } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', recycleItem.deleted_by)
        .limit(1)
      deletedByName = (Array.isArray(deleterRes) && deleterRes[0]?.name) || (recycleItem.deleted_by ? String(recycleItem.deleted_by).slice(0, 8) : undefined)
    } catch {}
    const restoredAtStr = formatDateTime(new Date())
    const deletedAtStr = recycleItem.deleted_at ? formatDateTime(new Date(recycleItem.deleted_at)) : ''
    const historyReason = `restore_from_recycle_bin: ${currentUser.name || '未知用户'} 在 ${restoredAtStr} 恢复${deletedByName ? `；原删除人：${deletedByName}` : ''}${deletedAtStr ? `，删除于 ${deletedAtStr}` : ''}`

    console.log('恢复参数:', { originalTable, itemId, itemType })

    let restoreError: any = null

    // 2. 根据不同类型执行恢复操作
    switch (originalTable) {
      case 'timesheet_records': {
        const safeMain = {
          id: itemId,
          user_id: itemData.user_id || null,
          work_date: itemData.work_date || itemData.record_date,
          shift_type: itemData.shift_type || '白班',
          supervisor_id: itemData.supervisor_id || null,
          section_chief_id: itemData.section_chief_id || null,
          status: itemData.status || 'pending'
        }
        const { error: mainError } = await supabase
          .from('timesheet_records')
          .upsert(safeMain, { onConflict: 'id' })
        
        if (mainError) {
          restoreError = mainError
          break
        }
        
        const items = Array.isArray(itemData.items) ? itemData.items : []
        for (const it of items) {
          const safeItem = {
            id: it.id,
            timesheet_record_id: itemId,
            process_id: it.process_id || it.processes?.id,
            quantity: it.quantity ?? 0,
            unit_price: it.unit_price ?? it.processes?.unit_price ?? 0,
            amount: it.amount ?? ((it.quantity ?? 0) * (it.unit_price ?? it.processes?.unit_price ?? 0))
          }
          const { error: itemErr } = await supabase
            .from('timesheet_record_items')
            .upsert(safeItem, { onConflict: 'id' })
          if (itemErr) { restoreError = itemErr; break }
          // 写入恢复历史
          await supabase
            .from('timesheet_item_modification_history')
            .insert({
              timesheet_record_item_id: safeItem.id,
              timesheet_record_id: itemId,
              modifier_id: currentUser.id || null,
              modifier_name: currentUser.name || '系统恢复',
              old_quantity: 0,
              new_quantity: Number(safeItem.quantity) || 0,
              old_amount: 0,
              new_amount: Number(safeItem.amount) || 0,
              modification_reason: historyReason
            })
        }
        break
      }
      
      case 'timesheet_record_items': {
        // 恢复工时明细记录
        const detailItemData = { ...itemData }
        delete detailItemData.created_at
        delete detailItemData.updated_at
        // 删除关联对象，这些不是表的实际列
        delete detailItemData.processes
        delete detailItemData.process
        delete detailItemData.user
        delete detailItemData.timesheet_record
        
        const recordId = detailItemData.timesheet_record_id
        // 先确保主记录存在
        const { data: existRecord, error: checkErr } = await supabase
          .from('timesheet_records')
          .select('id')
          .eq('id', recordId)
          .limit(1)
        if (!checkErr && (!existRecord || existRecord.length === 0)) {
          const safeMain = {
            id: recordId,
            user_id: itemData.user_id || null,
            work_date: (itemData.work_date || itemData.record_date || new Date().toISOString().split('T')[0]),
            shift_type: itemData.shift_type || '白班',
            supervisor_id: itemData.supervisor_id || null,
            section_chief_id: itemData.section_chief_id || null,
            status: itemData.status || 'pending'
          }
          const { error: createMainErr } = await supabase
            .from('timesheet_records')
            .upsert(safeMain, { onConflict: 'id' })
          if (createMainErr) {
            restoreError = createMainErr
            break
          }
        }
        const safeItem2 = {
          id: detailItemData.id || itemId,
          timesheet_record_id: recordId,
          process_id: detailItemData.process_id || detailItemData.processes?.id,
          quantity: detailItemData.quantity ?? 0,
          unit_price: detailItemData.unit_price ?? detailItemData.processes?.unit_price ?? 0,
          amount: detailItemData.amount ?? ((detailItemData.quantity ?? 0) * (detailItemData.unit_price ?? detailItemData.processes?.unit_price ?? 0))
        }
        const { error } = await supabase
          .from('timesheet_record_items')
          .upsert(safeItem2, { onConflict: 'id' })
        restoreError = error
        if (!restoreError) {
          // 写入恢复历史
          await supabase
            .from('timesheet_item_modification_history')
            .insert({
              timesheet_record_item_id: safeItem2.id,
              timesheet_record_id: recordId,
              modifier_id: currentUser.id || null,
              modifier_name: currentUser.name || '系统恢复',
              old_quantity: 0,
              new_quantity: Number(safeItem2.quantity) || 0,
              old_amount: 0,
              new_amount: Number(safeItem2.amount) || 0,
              modification_reason: historyReason
            })
        }
        break
      }
      
      case 'processes': {
        // 恢复工序记录，保留原始is_active状态
        const processData = { ...itemData }
        delete processData.created_at
        delete processData.updated_at
        // 删除可能存在的关联对象，避免400错误
        delete processData.user
        delete processData.timesheet_record
        delete processData.supervisor
        delete processData.section_chief
        delete processData.items
        
        // 执行恢复
        // 确保记录ID存在
        processData.id = itemId
        // 关键：恢复后强制启用显示
        processData.is_active = true
        const { error } = await supabase
          .from('processes')
          .upsert(processData, { onConflict: 'id' })
        restoreError = error
        break
      }
      
      default: {
        // 其他类型，直接恢复
        const restoreData = { ...itemData }
        delete restoreData.created_at
        delete restoreData.updated_at
        // 删除常见的关联对象，避免400错误
        delete restoreData.processes
        delete restoreData.process
        delete restoreData.user
        delete restoreData.timesheet_record
        delete restoreData.supervisor
        delete restoreData.section_chief
        
        // 执行恢复
        // 确保记录ID存在
        restoreData.id = itemId
        const { error } = await supabase
          .from(originalTable)
          .upsert(restoreData, { onConflict: 'id' })
        restoreError = error
        break
      }
    }

    // 3. 恢复成功后清除回收站项：优先调用后端RPC保证成功
    if (!restoreError) {
      let finalErr: any = null
      const { error: rpcErr } = await supabase.rpc('delete_recycle_bin_item', { rid: recycleBinId })
      finalErr = rpcErr
      if (finalErr) {
        const { error: e1 } = await supabase
          .from('recycle_bin')
          .delete()
          .eq('id', recycleBinId)
        finalErr = e1
      }
      if (finalErr) {
        const { error: e2 } = await supabaseAdmin
          .from('recycle_bin')
          .delete()
          .eq('id', recycleBinId)
        finalErr = e2
      }
      if (finalErr) {
        const { error: e3 } = await supabaseAdmin
          .from('recycle_bin')
          .update({
            is_permanently_deleted: true,
            restored_at: new Date().toISOString(),
            restored_by: localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user') || '{}').id : null
          })
          .eq('id', recycleBinId)
        finalErr = e3
      }
      if (finalErr) restoreError = finalErr
    }

    if (restoreError) {
      console.error('恢复失败:', restoreError)
      return { success: false, error: { message: restoreError.message || '恢复失败' } }
    }

    console.log('恢复成功')
    return { success: true }
  } catch (error: any) {
    console.error('恢复项目异常:', error)
    return { success: false, error: { message: error.message || '恢复过程中发生异常' } }
  }
}

// 永久删除回收站项目
export async function permanentlyDeleteFromRecycleBin(
  recycleBinId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('recycle_bin')
      .delete()
      .eq('id', recycleBinId)

    if (error) {
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('永久删除异常:', error)
    return { success: false, error }
  }
}

// 获取回收站列表
export async function getRecycleBinItems(
  filters?: {
    itemType?: RecycleBinItemType
    search?: string
    startDate?: string
    endDate?: string
  },
  pagination?: {
    page: number
    pageSize: number
  }
): Promise<{ data: RecycleBinItem[]; total: number; error?: any }> {
  try {
    // 注意：由于项目使用自定义认证，我们需要直接查询recycle_bin表
    // 创建一个新的Supabase客户端实例，用于绕过RLS策略
    // 使用服务角色密钥（如果有）或直接查询
    // 使用单例管理员客户端
    
    // 使用管理员客户端查询所有数据
    // 不再限制item_type，确保所有类型的记录都能显示
    const storedUser = (() => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}') } catch { return {} } })()
    const isSuperAdmin = ['超级管理员', 'super_admin', 'Super Admin'].includes(storedUser?.role?.name)
    const companyIdFilter = storedUser?.company?.id
    let query = supabaseAdmin
      .from('recycle_bin')
      .select('*')
      .eq('is_permanently_deleted', false)
    if (!isSuperAdmin && companyIdFilter) {
      query = query.eq('company_id', companyIdFilter)
    }
    const { data: allItems, error: allError } = await query
      .order('deleted_at', { ascending: false })
    
    // 初始化用户映射和生产线映射
    let userMap = new Map<string, string>()
    let productionLineMap = new Map<number, string>()
    
    // 对于工时记录，尝试获取关联的timesheet_records和users信息
    if (allItems && allItems.length > 0) {
      // 获取所有用户的ID，包括删除者ID
      const userIdsSet = new Set<string>()
      allItems.forEach(item => {
        // 添加删除者ID
        if (typeof item.deleted_by === 'string') {
          userIdsSet.add(item.deleted_by)
        }
        // 添加用户ID
        if (typeof item.item_data.user_id === 'string') {
          userIdsSet.add(item.item_data.user_id)
        }
        // 添加班长ID
        if (typeof item.item_data.supervisor_id === 'string') {
          userIdsSet.add(item.item_data.supervisor_id)
        }
        // 添加段长ID
        if (typeof item.item_data.section_chief_id === 'string') {
          userIdsSet.add(item.item_data.section_chief_id)
        }
      })
      const userIds = Array.from(userIdsSet)
      
      // 获取所有用户的名称
      if (userIds.length > 0) {
        // 获取用户名称
        const { data: users, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', userIds)
        
        if (users && !userError) {
          // 创建用户ID到名称的映射
          userMap = new Map(users.map(user => [user.id, user.name]))
        }
      }
      
      // 获取生产线名称映射
      const productionLineIds = [...new Set(allItems.map(item => item.item_data?.production_line_id).filter(id => typeof id === 'number'))]
      if (productionLineIds.length > 0) {
        const { data: lines } = await supabaseAdmin
          .from('production_lines')
          .select('id, name')
          .in('id', productionLineIds)
        productionLineMap = new Map((lines || []).map(l => [l.id, l.name]))
      }

      // 为所有项目设置删除者名称
      allItems.forEach(item => {
        // 设置删除者名称
        (item as any).deleted_by_name = userMap.get(item.deleted_by) || item.deleted_by.slice(0, 8)
      })
      
      // 直接处理所有工时相关记录，优先使用真实字段
      allItems.forEach(item => {
        let mergedData = { ...item.item_data }
        
        // 工时记录字段映射与增强：从ID解析真实名称
        if ((item.original_table === 'timesheet_records' || 
             item.original_table === 'timesheet_record_items' ||
             item.item_type === 'timesheet_record' ||
             item.item_type === 'timesheet_record_item') && 
            mergedData) {
          // 日期来自 record_date
          if (mergedData.record_date) {
            mergedData.date = mergedData.record_date
          }
          // 用户、班长、段长名称通过ID映射
          if (mergedData.user_id) mergedData.user_name = userMap.get(mergedData.user_id) || mergedData.user_name
          if (mergedData.supervisor_id) mergedData.supervisor_name = userMap.get(mergedData.supervisor_id) || mergedData.supervisor_name
          if (mergedData.section_chief_id) mergedData.section_chief_name = userMap.get(mergedData.section_chief_id) || mergedData.section_chief_name
          // 生产线名称通过ID映射
          if (mergedData.production_line_id) mergedData.production_line = productionLineMap.get(mergedData.production_line_id) || mergedData.production_line
          
          // 处理嵌套的items数组，提取工序/产品相关真实信息
          if (mergedData.items && Array.isArray(mergedData.items)) {
            mergedData.items.forEach((item: any) => {
              if (item.process && !item.processes) item.processes = item.process
              // 纯粹使用存在的真实字段，不填充默认文案
              if (item.quantity != null && item.unit_price != null && item.amount == null) {
                item.amount = Number(item.quantity) * Number(item.unit_price)
              }
            })
          }
          
          // 顶层兼容字段（如有明细，则将第一个明细用于展示）
          if (mergedData.process && !mergedData.processes) {
            mergedData.processes = mergedData.process
          }
          
          // 如果有items，合并第一个item的process信息到顶层，方便前端直接访问
          if (mergedData.items && mergedData.items.length > 0) {
            const firstItem = mergedData.items[0]
            if (firstItem.process || firstItem.processes) {
              const processData = firstItem.process || firstItem.processes
              mergedData = {
                ...mergedData,
                // 兼容前端使用的processes字段名
                processes: processData,
                // 直接合并到顶层，方便前端访问
                product_process: processData.product_process ?? mergedData.product_process,
                product_name: processData.product_name ?? mergedData.product_name,
                production_category: processData.production_category ?? mergedData.production_category,
                production_line: processData.production_line ?? mergedData.production_line,
                unit_price: processData.unit_price ?? mergedData.unit_price,
                // 兼容不同的字段名
                process_name: processData.product_process ?? mergedData.process_name,
                product_process_name: processData.product_process ?? mergedData.product_process_name,
                // 合并数量和金额
                quantity: firstItem.quantity ?? mergedData.quantity,
                amount: firstItem.amount ?? mergedData.amount
              }
            }
          }
        }
        
        // 更新item_data
        item.item_data = mergedData
      })
      
      // 获取所有工序相关的记录ID
      const processRelatedIds = allItems
        .filter(item => 
          item.item_type === 'process' ||
          item.original_table === 'processes'
        )
        .map(item => item.item_id)
      
      if (processRelatedIds.length > 0) {
        // 获取工序表数据
        const { data: processes, error: processError } = await supabaseAdmin
          .from('processes')
          .select(`*
            `)
          .in('id', processRelatedIds)
        
        // 创建工序映射
        const processMap = new Map(processes?.map(process => [process.id, process]) || [])
        // 收集公司ID并查询公司名称映射
        const companyIds = [...new Set((processes || []).map(p => p.company_id).filter(Boolean))]
        let companyMap = new Map<string, string>()
        if (companyIds.length > 0) {
          const { data: companies } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .in('id', companyIds as string[])
          companyMap = new Map((companies || []).map(c => [c.id as string, c.name as string]))
        }
        
        // 合并所有工序相关记录的数据
        allItems.forEach(item => {
          if (item.original_table === 'processes' || item.item_type === 'process') {
            const processDetails = processMap.get(item.item_id)
            if (processDetails) {
              // 合并基本信息
              item.item_data = { ...item.item_data, ...processDetails }
              // 设置公司名称
              if (!item.item_data.company_name) {
                const cid = item.item_data.company_id || processDetails.company_id
                item.item_data.company_name = companyMap.get(cid) || '未知公司'
              }
            }
            
            // 确保工序记录有基本字段
            if (item.item_data) {
              if (!item.item_data.company_name) {
                item.item_data.company_name = '未知公司'
              }
              if (!item.item_data.production_line) {
                item.item_data.production_line = '未知生产线'
              }
              if (!item.item_data.production_category) {
                item.item_data.production_category = '未知类型'
              }
              if (!item.item_data.product_name) {
                item.item_data.product_name = '未知产品'
              }
              if (!item.item_data.product_process) {
                item.item_data.product_process = '未知工序'
              }
              if (item.item_data.unit_price == null) {
                item.item_data.unit_price = 0
              }
              if (!item.item_data.effective_date) {
                item.item_data.effective_date = '未知'
              }
            }
          }
        })
      }
    }
    
    // 只使用真实数据
    let actualData: RecycleBinItem[] = allItems || []
    
    // 简化逻辑：不再展开子项，直接使用原始数据
    // 这样可以避免因展开逻辑复杂导致的错误
    // 后续可以单独优化展开功能
    
    // 手动过滤和分页
    let filteredData = actualData
    
    // 应用itemType过滤
    if (filters?.itemType) {
      if (filters.itemType === 'timesheet_record') {
        // 显示所有工时相关的记录，包括主记录和明细
        filteredData = filteredData.filter(item => 
          item.item_type === 'timesheet_record' || 
          item.item_type === 'timesheet_record_item' ||
          item.original_table === 'timesheet_records' ||
          item.original_table === 'timesheet_record_items'
        )
      } else if (filters.itemType === 'process') {
        // 显示所有工序相关的记录
        filteredData = filteredData.filter(item => 
          item.item_type === 'process' ||
          item.original_table === 'processes'
        )
      } else {
        // 默认过滤逻辑
        filteredData = filteredData.filter(item => item.item_type === filters.itemType)
      }
    }
    
    // 应用日期过滤
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate)
      filteredData = filteredData.filter(item => new Date(item.deleted_at) >= startDate)
    }
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate)
      filteredData = filteredData.filter(item => new Date(item.deleted_at) <= endDate)
    }
    
    // 应用搜索过滤
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase()
      const matchStr = (v: any) => typeof v === 'string' && v.toLowerCase().includes(searchTerm)
      filteredData = filteredData.filter(item => {
        const d = item.item_data || {}
        return (
          matchStr(d.name) ||
          matchStr(d.description) ||
          matchStr(d.product_name) ||
          matchStr(d.product_process) ||
          matchStr(d.production_line) ||
          matchStr(d.user_name) ||
          matchStr(d.employee_name) ||
          matchStr(d.process_name) ||
          matchStr(d.process_number)
        )
      })
    }
    
    // 计算总数量
    const total = filteredData.length
    
    // 应用分页
    if (pagination) {
      const from = (pagination.page - 1) * pagination.pageSize
      const to = from + pagination.pageSize
      filteredData = filteredData.slice(from, to)
    }
    
    return { 
      data: filteredData, 
      total: total, 
      error: allError 
    }
  } catch (error) {
    console.error('获取回收站列表异常:', error)
    return { data: [], total: 0, error: error }
  }
}

// 获取回收站统计数据
export async function getRecycleBinStats(): Promise<RecycleBinStats> {
  try {
    // 使用管理员客户端查询所有数据
    // 使用单例管理员客户端

    // 直接查询所有回收站数据，然后在客户端计算统计信息
    const { data: allItems, error: allError } = await supabaseAdmin
      .from('recycle_bin')
      .select('*')
      .eq('is_permanently_deleted', false)

    if (allError) {
      console.error('获取回收站统计数据失败:', allError)
      return {
        totalItems: 0,
        expiredItems: 0,
        timesheetRecords: 0,
        timesheetRecordItems: 0,
        processes: 0
      }
    }

    // 计算统计数据
    const now = new Date()
    const totalItems = allItems?.length || 0
    const expiredItems = allItems?.filter(item => new Date(item.expires_at) < now).length || 0
    const timesheetRecords = allItems?.filter(item => item.item_type === 'timesheet_record').length || 0
    const timesheetRecordItems = 0 // 移除了工时明细类型
    const processes = allItems?.filter(item => item.item_type === 'process').length || 0

    return {
      totalItems,
      expiredItems,
      timesheetRecords,
      timesheetRecordItems,
      processes
    }
  } catch (error) {
    console.error('获取回收站统计数据异常:', error)
    return {
      totalItems: 0,
      expiredItems: 0,
      timesheetRecords: 0,
      timesheetRecordItems: 0,
      processes: 0
    }
  }
}

// 格式化删除时间
export function formatDeletedTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 30) {
    return `${diffDays}天前`
  } else {
    return formatDateTime(date)
  }
}

// 检查项目是否已过期
export function isItemExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

// 获取项目剩余天数
export function getRemainingDays(expiresAt: string): number {
  const expires = new Date(expiresAt)
  const now = new Date()
  const diffMs = expires.getTime() - now.getTime()
  const days = Math.ceil(diffMs / 86400000) // 转换为天数
  console.log(`剩余天数计算：expiresAt=${expiresAt}, expires=${expires}, now=${now}, diffMs=${diffMs}, days=${days}`)
  return days > 0 ? days : 0
}

// 自动删除过期项目
export async function autoDeleteExpiredItems(): Promise<{ success: boolean; deletedCount: number; error?: any }> {
  try {
    // 创建一个新的Supabase客户端实例，用于绕过RLS策略
    // 使用单例管理员客户端

    // 获取当前时间
    const now = new Date().toISOString()
    console.log(`执行自动删除过期项目，当前时间: ${now}`)

    // 删除所有过期且未永久删除的项目
    const { error, count, data } = await supabaseAdmin
      .from('recycle_bin')
      .delete()
      .eq('is_permanently_deleted', false)
      .lt('expires_at', now)
      .select('*', { count: 'exact' })

    if (error) {
      console.error('自动删除过期项目失败:', error);
      return { success: false, deletedCount: 0, error };
    }

    const deletedCount = (count != null ? count : (Array.isArray(data) ? data.length : 0)) || 0
    console.log(`成功删除 ${deletedCount} 个过期项目`)
    return { success: true, deletedCount };
  } catch (error) {
    console.error('自动删除过期项目异常:', error);
    return { success: false, deletedCount: 0, error: error as any };
  }
}

// 更新现有项目的过期时间为100天
export async function updateExistingItemsExpiry(): Promise<{ success: boolean; updatedCount: number; error?: any }> {
  try {
    // 创建一个新的Supabase客户端实例，用于绕过RLS策略
    // 使用单例管理员客户端

    // 计算100天后的过期时间
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000)
    const expiresAtISO = expiresAt.toISOString()
    console.log(`更新所有回收站项目的过期时间为: ${expiresAtISO}`)

    // 更新所有未永久删除的项目
    const { error, count, data } = await supabaseAdmin
      .from('recycle_bin')
      .update({ expires_at: expiresAtISO })
      .eq('is_permanently_deleted', false)
      .select('*', { count: 'exact' })

    if (error) {
      console.error('更新现有项目过期时间失败:', error);
      return { success: false, updatedCount: 0, error };
    }

    const updatedCount = (count != null ? count : (Array.isArray(data) ? data.length : 0)) || 0
    console.log(`成功更新 ${updatedCount} 个项目的过期时间为100天`)
    return { success: true, updatedCount };
  } catch (error) {
    console.error('更新现有项目过期时间异常:', error);
    return { success: false, updatedCount: 0, error: error as any };
  }
}

// 初始化自动删除定时器
export function initAutoDeleteTimer(days: number = 100): void {
  // 每天执行一次自动删除
  const interval = 24 * 60 * 60 * 1000 // 24小时
  
  // 立即执行一次自动删除，但添加错误处理
  const safeAutoDelete = async () => {
    try {
      await autoDeleteExpiredItems()
    } catch (error) {
      console.warn('自动删除过期项目失败，将在下次尝试:', error)
    }
  }
  
  // 立即执行一次自动删除
  safeAutoDelete()
  
  // 更新现有项目的过期时间为100天，添加错误处理
  const safeUpdateExpiry = async () => {
    try {
      await updateExistingItemsExpiry()
    } catch (error) {
      console.warn('更新现有项目过期时间失败，将在下次尝试:', error)
    }
  }
  
  // 更新现有项目的过期时间为100天
  safeUpdateExpiry()
  
  // 设置定时器，定期执行自动删除
  setInterval(() => {
    safeAutoDelete()
  }, interval)
  
  console.log(`自动删除定时器已初始化，将每24小时删除一次过期项目，保留期限为${days}天`)
}
