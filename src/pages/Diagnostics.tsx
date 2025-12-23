import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const Diagnostics: React.FC = () => {
  const { user } = useAuth()
  const [recycleBinData, setRecycleBinData] = useState<any[]>([])
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      runDiagnostics()
    }
  }, [user])

  const runDiagnostics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取当前用户信息
      const { data: currentUserData, error: userError } = await supabase
        .from('users')
        .select('id, name, company_id, role')
        .eq('id', user.id)
        .single()
      
      if (userError) {
        setError(`获取用户信息失败: ${userError.message}`)
        return
      }
      
      setUserData(currentUserData)
      console.log('当前用户信息:', currentUserData)
      
      // 直接查询recycle_bin表，查看是否能获取到数据
      const { data: recycleData, error: recycleError } = await supabase
        .from('recycle_bin')
        .select('*')
        .eq('is_permanently_deleted', false)
        .limit(100)
      
      if (recycleError) {
        setError(`查询recycle_bin失败: ${recycleError.message}`)
        return
      }
      
      setRecycleBinData(recycleData || [])
      console.log('获取到的recycle_bin数据:', recycleData || [])
      
      // 测试直接插入一条测试数据
      const testInsertResult = await supabase
        .from('recycle_bin')
        .insert([{
          item_type: 'timesheet_record',
          item_id: crypto.randomUUID(),
          item_data: { 
            id: crypto.randomUUID(),
            user_id: user.id,
            record_date: new Date().toISOString().split('T')[0],
            production_line: '测试生产线',
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          deleted_by: user.id,
          original_table: 'timesheet_records',
          company_id: currentUserData.company_id,
          user_id: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
      
      console.log('测试插入结果:', testInsertResult)
      
    } catch (err) {
      setError(`诊断测试失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-black text-green-400">
      <h1 className="text-2xl font-bold mb-4">回收站诊断测试</h1>
      
      {error && (
        <div className="mb-4 p-2 bg-red-900 text-red-300 rounded">
          <strong>错误:</strong> {error}
        </div>
      )}
      
      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">当前用户信息</h2>
            <pre className="bg-gray-900 p-2 rounded overflow-x-auto">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">recycle_bin表数据 ({recycleBinData.length} 条)</h2>
            <div className="overflow-x-auto">
              <table className="border-collapse border border-green-600 w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="border border-green-600 p-2 text-left">id</th>
                    <th className="border border-green-600 p-2 text-left">item_type</th>
                    <th className="border border-green-600 p-2 text-left">company_id</th>
                    <th className="border border-green-600 p-2 text-left">user_id</th>
                    <th className="border border-green-600 p-2 text-left">deleted_by</th>
                    <th className="border border-green-600 p-2 text-left">deleted_at</th>
                  </tr>
                </thead>
                <tbody>
                  {recycleBinData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-900">
                      <td className="border border-green-600 p-2">{item.id.slice(0, 8)}...</td>
                      <td className="border border-green-600 p-2">{item.item_type}</td>
                      <td className="border border-green-600 p-2">{item.company_id || 'null'}</td>
                      <td className="border border-green-600 p-2">{item.user_id || 'null'}</td>
                      <td className="border border-green-600 p-2">{item.deleted_by === user.id ? '当前用户' : item.deleted_by.slice(0, 8)}...</td>
                      <td className="border border-green-600 p-2">{new Date(item.deleted_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">RLS策略检查</h2>
            <div className="bg-gray-900 p-3 rounded">
              <p><strong>当前用户company_id:</strong> {userData?.company_id || 'null'}</p>
              <p><strong>当前用户id:</strong> {user.id}</p>
              <p><strong>RLS查看策略条件:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>company_id IN (SELECT company_id FROM users WHERE id = auth.uid())</li>
                <li>OR user_id = auth.uid()</li>
                <li>OR deleted_by = auth.uid()</li>
              </ul>
              <p className="mt-2"><strong>是否符合查看条件:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>条件1 (company_id匹配): {recycleBinData.some(item => item.company_id === userData?.company_id) ? '是' : '否'}</li>
                <li>条件2 (user_id匹配): {recycleBinData.some(item => item.user_id === user.id) ? '是' : '否'}</li>
                <li>条件3 (deleted_by匹配): {recycleBinData.some(item => item.deleted_by === user.id) ? '是' : '否'}</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Diagnostics
