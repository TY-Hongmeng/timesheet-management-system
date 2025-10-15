// 动态导入 Excel 库，只在需要时加载
export const exportToExcel = async (data: any, fileName: string) => {
  try {
    // 显示加载提示
    const loadingToast = (await import('sonner')).toast.loading('正在准备导出文件...')
    
    // 动态导入 XLSX 库
    const XLSX = await import('xlsx')
    
    // 更新加载提示
    ;(await import('sonner')).toast.loading('正在生成 Excel 文件...', { id: loadingToast })
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 处理数据并创建工作表
    if (Array.isArray(data)) {
      // 如果是数组，创建单个工作表
      const worksheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    } else if (typeof data === 'object') {
      // 如果是对象，为每个键创建一个工作表
      Object.entries(data).forEach(([sheetName, sheetData]) => {
        if (Array.isArray(sheetData)) {
          const worksheet = XLSX.utils.json_to_sheet(sheetData)
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        }
      })
    }
    
    // 导出文件
    XLSX.writeFile(workbook, fileName)
    
    // 关闭加载提示并显示成功消息
    ;(await import('sonner')).toast.dismiss(loadingToast)
    ;(await import('sonner')).toast.success('文件导出成功！')
    
  } catch (error) {
    console.error('Excel 导出失败:', error)
    ;(await import('sonner')).toast.error('文件导出失败，请重试')
    throw error
  }
}

// 高级 Excel 导出功能
export const exportAdvancedExcel = async (config: {
  sheets: Array<{
    name: string
    data: any[]
    columns?: Array<{
      header: string
      key: string
      width?: number
    }>
    styles?: {
      headerStyle?: any
      cellStyle?: any
    }
  }>
  fileName: string
}) => {
  try {
    const loadingToast = (await import('sonner')).toast.loading('正在准备高级导出...')
    
    // 动态导入 XLSX 库
    const XLSX = await import('xlsx')
    
    const workbook = XLSX.utils.book_new()
    
    for (const sheet of config.sheets) {
      ;(await import('sonner')).toast.loading(`正在处理工作表: ${sheet.name}...`, { id: loadingToast })
      
      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(sheet.data)
      
      // 设置列宽
      if (sheet.columns) {
        worksheet['!cols'] = sheet.columns.map(col => ({ wch: col.width || 15 }))
      }
      
      // 应用样式
      if (sheet.styles?.headerStyle && worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref'])
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = sheet.styles.headerStyle
          }
        }
      }
      
      // 添加自动筛选
      if (worksheet['!ref']) {
        worksheet['!autofilter'] = { ref: worksheet['!ref'] }
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    }
    
    ;(await import('sonner')).toast.loading('正在生成最终文件...', { id: loadingToast })
    
    // 导出文件
    XLSX.writeFile(workbook, config.fileName)
    
    ;(await import('sonner')).toast.dismiss(loadingToast)
    ;(await import('sonner')).toast.success('高级导出完成！')
    
  } catch (error) {
    console.error('高级 Excel 导出失败:', error)
    ;(await import('sonner')).toast.error('高级导出失败，请重试')
    throw error
  }
}