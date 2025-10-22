import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react';

interface ExcelImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
  companies: Array<{ id: string; name: string }>;
  currentUser?: { company?: { id: string; name: string } };
  existingProcesses?: Array<{
    company_id: string;
    production_line: string;
    production_category: string;
    product_name: string;
    product_process: string;
    company_name?: string;
  }>;
}

interface ExcelRowData {
  公司名称: string;
  生产线: string;
  工时类型: string;
  产品名称: string;
  产品工序: string;
  单价: number;
  生效年月: string;
}

const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  companies,
  currentUser,
  existingProcesses = []
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ExcelRowData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  // 进度状态
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 重置之前的状态
      setErrors([]);
      setPreviewData([]);
      
      // 验证文件格式
      const validationError = validateFileFormat(file);
      if (validationError) {
        setErrors([validationError]);
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      parseExcelFile(file);
    }
  };

  // 验证文件格式
  const validateFileFormat = (file: File): string | null => {
    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return '文件大小不能超过10MB';
    }
    
    // 检查文件是否为空
    if (file.size === 0) {
      return '文件不能为空';
    }
    
    // 检查文件扩展名
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return '请选择有效的Excel文件（.xlsx 或 .xls 格式）';
    }
    
    // 检查MIME类型
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // 某些情况下Excel文件可能被识别为这种类型
    ];
    
    if (file.type && !validMimeTypes.includes(file.type)) {
      return '文件类型不正确，请选择有效的Excel文件';
    }
    
    return null;
  };

  const parseExcelFile = async (file: File) => {
    setIsLoading(true);
    setErrors([]);
    
    try {
      // 读取文件
      const arrayBuffer = await file.arrayBuffer();
      
      // 检查文件内容是否有效
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        setErrors(['文件内容为空，请检查文件是否损坏']);
        return;
      }
      
      // 解析Excel文件，使用更详细的配置
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      
      // 检查工作簿是否有效
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        setErrors(['Excel文件格式错误：未找到有效的工作表']);
        return;
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 检查工作表是否为空
      if (!worksheet) {
        setErrors(['Excel文件格式错误：工作表为空']);
        return;
      }
      
      // 转换为JSON数据
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      });
      
      // 检查是否有数据
      if (!jsonData || jsonData.length === 0) {
        setErrors(['Excel文件中没有数据']);
        return;
      }
      
      // 检查是否有标题行
      if (jsonData.length < 2) {
        setErrors(['Excel文件至少需要包含标题行和一行数据']);
        return;
      }
      
      // 获取标题行
      const headers = jsonData[0] as string[];
      const requiredHeaders = ['公司名称', '生产线', '工时类型', '产品名称', '产品工序', '单价', '生效年月'];
      
      // 验证标题行
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        setErrors([
          'Excel文件标题行不正确，缺少以下列：' + missingHeaders.join('、'),
          '正确的标题行应该包含：' + requiredHeaders.join('、')
        ]);
        return;
      }
      
      // 转换数据行为对象格式
      const dataRows = jsonData.slice(1) as any[][];
      const processedData: ExcelRowData[] = dataRows
        .filter(row => row.some(cell => cell !== '' && cell != null)) // 过滤空行
        .map((row, index) => {
          const rowData: any = {};
          headers.forEach((header, headerIndex) => {
            rowData[header] = row[headerIndex] || '';
          });
          
          return {
            公司名称: String(rowData['公司名称'] || '').trim(),
            生产线: String(rowData['生产线'] || '').trim(),
            工时类型: String(rowData['工时类型'] || '').trim(),
            产品名称: String(rowData['产品名称'] || '').trim(),
            产品工序: String(rowData['产品工序'] || '').trim(),
            单价: rowData['单价'],
            生效年月: convertExcelDate(rowData['生效年月'])
          };
        });
      
      // 检查是否有有效数据
      if (processedData.length === 0) {
        setErrors(['Excel文件中没有有效的数据行']);
        return;
      }
      
      // 验证数据
      const validationErrors = validateData(processedData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }
      
      setPreviewData(processedData.slice(0, 10)); // 只显示前10行预览
      
    } catch (error) {
      console.error('Excel解析错误:', error);
      
      // 提供更详细的错误信息
      let errorMessage = 'Excel文件解析失败';
      
      if (error instanceof Error) {
        if (error.message.includes('Unsupported file')) {
          errorMessage = '不支持的文件格式，请确保文件是有效的Excel文件（.xlsx或.xls）';
        } else if (error.message.includes('Invalid file')) {
          errorMessage = '文件格式无效或文件已损坏，请检查文件是否正确';
        } else if (error.message.includes('password')) {
          errorMessage = '文件受密码保护，请先解除密码保护后再导入';
        } else {
          errorMessage = `文件解析失败：${error.message}`;
        }
      }
      
      setErrors([errorMessage, '请确保文件是有效的Excel格式，且包含正确的数据结构']);
    } finally {
      setIsLoading(false);
      // 延迟一秒后隐藏进度条，让用户看到完成状态
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setImportStatus('');
      }, 1000);
    }
  };

  // 转换Excel日期格式
  const convertExcelDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    // 如果是数字（Excel日期序列号）
    if (typeof dateValue === 'number') {
      const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
      const year = excelDate.getFullYear();
      const month = String(excelDate.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
    
    // 如果是字符串
    const dateStr = String(dateValue).trim();
    
    // 已经是YYYY-MM格式
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
      return dateStr;
    }
    
    // YYYY-MM-DD格式，截取前7位
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr.substring(0, 7);
    }
    
    // YYYY/MM格式，转换为YYYY-MM
    if (dateStr.match(/^\d{4}\/\d{1,2}$/)) {
      const [year, month] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}`;
    }
    
    // YYYY/MM/DD格式，转换为YYYY-MM
    if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      const [year, month] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}`;
    }
    
    return dateStr;
  };

  const validateData = (data: ExcelRowData[]): string[] => {
    const errors: string[] = [];
    
    // 预构建高效查找结构
    const companyNameSet = new Set(companies.map(c => c.name));
    const companyNameToId = new Map(companies.map(c => [c.name, c.id]));
    const validWorkTypes = new Set(['生产工时', '非生产工时']);
    
    // 构建现有工序的快速查找Map
    const existingProcessMap = new Map<string, any>();
    existingProcesses.forEach(process => {
      const key = `${process.company_id}_${process.production_line.trim()}_${process.production_category}_${process.product_name.trim()}_${process.product_process.trim()}`;
      existingProcessMap.set(key, process);
    });
    
    // 检查导入数据内部重复
    const duplicateMap = new Map<string, number[]>();
    
    // 批量验证，减少重复计算
    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel行号从2开始（第1行是标题）
      
      // 基础字段验证
      if (!row.公司名称) {
        errors.push(`第${rowNum}行：公司名称不能为空`);
      } else if (!companyNameSet.has(row.公司名称)) {
        errors.push(`第${rowNum}行：公司"${row.公司名称}"不存在`);
      }
      
      if (!row.生产线) {
        errors.push(`第${rowNum}行：生产线不能为空`);
      }
      
      if (!row.工时类型 || !validWorkTypes.has(row.工时类型)) {
        errors.push(`第${rowNum}行：工时类型必须是"生产工时"或"非生产工时"`);
      }
      
      if (!row.产品名称) {
        errors.push(`第${rowNum}行：产品名称不能为空`);
      }
      
      if (!row.产品工序) {
        errors.push(`第${rowNum}行：产品工序不能为空`);
      }
      
      // 单价验证优化
      if (row.单价 && (row.单价 as any) !== '' && typeof row.单价 === 'string' && isNaN(Number(row.单价))) {
        errors.push(`第${rowNum}行：单价必须是有效数字`);
      }
      
      if (!row.生效年月) {
        errors.push(`第${rowNum}行：生效年月不能为空`);
      }
      
      // 重复检查优化
      if (row.公司名称 && row.生产线 && row.工时类型 && row.产品名称 && row.产品工序) {
        const key = `${row.公司名称.trim()}_${row.生产线.trim()}_${row.工时类型}_${row.产品名称.trim()}_${row.产品工序.trim()}`;
        
        // 检查导入数据内部重复
        if (duplicateMap.has(key)) {
          duplicateMap.get(key)!.push(rowNum);
        } else {
          duplicateMap.set(key, [rowNum]);
        }
        
        // 检查与现有数据重复（使用预构建的Map）
        const companyId = companyNameToId.get(row.公司名称);
        if (companyId) {
          const existingKey = `${companyId}_${row.生产线.trim()}_${row.工时类型}_${row.产品名称.trim()}_${row.产品工序.trim()}`;
          const existingDuplicate = existingProcessMap.get(existingKey);
          
          if (existingDuplicate) {
            errors.push(
              `第${rowNum}行：与现有工序重复！` +
              `（公司：${existingDuplicate.company_name || row.公司名称}，` +
              `生产线：${existingDuplicate.production_line}，` +
              `工时类型：${existingDuplicate.production_category}，` +
              `产品名称：${existingDuplicate.product_name}，` +
              `产品工序：${existingDuplicate.product_process}）`
            );
          }
        }
      }
    });
    
    // 添加导入数据内部重复的错误信息
    duplicateMap.forEach((rows, key) => {
      if (rows.length > 1) {
        const [company, productionLine, workTimeType, productName, productProcess] = key.split('_');
        errors.push(
          `导入数据内部重复：第${rows.join('、')}行` +
          `（公司：${company}，生产线：${productionLine}，工时类型：${workTimeType}，产品名称：${productName}，产品工序：${productProcess}）`
        );
      }
    });
    
    return errors;
  };

  const downloadTemplate = () => {
    // 获取当前用户的公司名称，如果没有则使用示例公司
    const companyName = currentUser?.company?.name || '示例公司';
    
    const templateData = [
      {
        公司名称: companyName,
        生产线: '生产线A',
        工时类型: '生产工时',
        产品名称: '示例产品',
        产品工序: '示例工序',
        单价: '', // 单价可以为空
        生效年月: new Date().toISOString().slice(0, 7) // 当前年月
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工序导入模板');
    XLSX.writeFile(wb, '工序导入模板.xlsx');
  };

  const handleImport = async () => {
    if (!selectedFile || errors.length > 0) return;
    
    setIsLoading(true);
    setIsImporting(true);
    setImportProgress(0);
    setImportStatus('开始导入...');
    
    try {
      // 阶段1：文件读取 (0-15%)
      setImportStatus('正在读取Excel文件...');
      setImportProgress(5);
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // 阶段2：Excel解析 (15-30%)
      setImportStatus('正在解析Excel数据...');
      setImportProgress(15);
      
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为JSON数据
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      });
      
      setImportProgress(30);
      setImportStatus(`正在处理 ${jsonData.length - 1} 条数据...`);
      
      // 阶段3：数据转换 (30-50%)
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];
      const processedData: ExcelRowData[] = [];
      const totalRows = dataRows.length;
      
      for (let i = 0; i < totalRows; i++) {
        const row = dataRows[i];
        
        // 过滤空行
        if (!row.some(cell => cell !== '' && cell != null)) {
          continue;
        }
        
        const rowData: any = {};
        headers.forEach((header, headerIndex) => {
          rowData[header] = row[headerIndex] || '';
        });
        
        processedData.push({
          公司名称: String(rowData['公司名称'] || '').trim(),
          生产线: String(rowData['生产线'] || '').trim(),
          工时类型: String(rowData['工时类型'] || '').trim(),
          产品名称: String(rowData['产品名称'] || '').trim(),
          产品工序: String(rowData['产品工序'] || '').trim(),
          单价: rowData['单价'],
          生效年月: convertExcelDate(rowData['生效年月'])
        });
        
        // 更新进度
        const progress = 30 + Math.floor((i / totalRows) * 20);
        setImportProgress(progress);
        
        // 分批处理，避免阻塞UI
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      // 阶段4：数据转换 (50-70%)
      setImportStatus(`正在转换 ${processedData.length} 条有效数据格式...`);
      setImportProgress(50);
      
      const processData = processedData.map((row, index) => {
        const company = companies.find(c => c.name === row.公司名称);
        
        // 更新进度
        if (index % 10 === 0) {
          const progress = 50 + Math.floor((index / processedData.length) * 20);
          setImportProgress(progress);
        }
        
        return {
          company_id: company?.id || '',
          production_line: row.生产线,
          production_category: row.工时类型,
          product_name: row.产品名称,
          product_process: row.产品工序,
          unit_price: row.单价 && (row.单价 as any) !== '' && typeof row.单价 !== 'undefined' ? Number(row.单价) : null,
          effective_date: row.生效年月 || null
        };
      });
      
      // 阶段5：数据保存 (70-95%)
      setImportStatus(`正在保存 ${processData.length} 条工序数据到数据库...`);
      setImportProgress(70);
      
      await onImport(processData);
      
      // 阶段6：完成 (95-100%)
      setImportProgress(100);
      setImportStatus(`导入完成！成功导入 ${processData.length} 条工序数据`);
      setImportResult({
        success: processData.length,
        failed: 0,
        errors: []
      });
    } catch (error) {
      console.error('导入错误:', error);
      
      let errorMessage = '导入失败';
      if (error instanceof Error) {
        if (error.message.includes('duplicate')) {
          errorMessage = '导入失败：存在重复数据';
        } else if (error.message.includes('permission')) {
          errorMessage = '导入失败：权限不足';
        } else if (error.message.includes('network')) {
          errorMessage = '导入失败：网络连接错误';
        } else {
          errorMessage = `导入失败：${error.message}`;
        }
      }
      
      setImportResult({
        success: 0,
        failed: previewData.length,
        errors: [errorMessage]
      });
      
      // 重置进度状态
      setImportProgress(0);
      setImportStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setErrors([]);
    setImportResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-green-400">批量导入工序</h2>
          <button
            onClick={resetDialog}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!importResult ? (
          <>
            {/* 文件选择区域 */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  选择Excel文件
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载模板
                </button>
              </div>
              
              {/* 文件格式要求说明 */}
              <div className="mb-4 p-3 bg-blue-900 border border-blue-600 rounded">
                <h4 className="text-blue-400 font-semibold mb-2">文件格式要求：</h4>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• 支持 .xlsx 和 .xls 格式的Excel文件</li>
                  <li>• 文件大小不超过 10MB</li>
                  <li>• 必须包含标题行：公司名称、生产线、工时类型、产品名称、产品工序、单价、生效年月</li>
                  <li>• 工时类型只能是"生产工时"或"非生产工时"</li>
                  <li>• 生效年月格式：YYYY-MM（如：2024-01）</li>
                  <li>• 单价可以为空，如填写必须是有效数字</li>
                </ul>
              </div>
              
              {selectedFile && (
                <div className="flex items-center gap-2 text-green-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-gray-400 text-sm">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* 错误信息 */}
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-900 border border-red-600 rounded">
                <h3 className="text-red-400 font-semibold mb-2">数据验证错误：</h3>
                <ul className="text-red-300 text-sm space-y-1">
                  {errors.slice(0, 10).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {errors.length > 10 && (
                    <li className="text-red-400">... 还有 {errors.length - 10} 个错误</li>
                  )}
                </ul>
              </div>
            )}

            {/* 数据预览 */}
            {previewData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-green-400 font-semibold mb-3">数据预览（前10行）：</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-600 rounded">
                    <thead>
                      <tr className="bg-gray-700">
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">公司名称</th>
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">生产线</th>
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">工时类型</th>
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">产品名称</th>
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">产品工序</th>
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">单价</th>
                        <th className="border border-gray-600 px-3 py-2 text-green-400 text-sm">生效年月</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-700">
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.公司名称}</td>
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.生产线}</td>
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.工时类型}</td>
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.产品名称}</td>
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.产品工序}</td>
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.单价}</td>
                          <td className="border border-gray-600 px-3 py-2 text-white text-sm">{row.生效年月}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 导入进度条 */}
            {isImporting && (
              <div className="mb-6 p-4 bg-gray-700 border border-green-400 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-semibold">导入进度</span>
                  <span className="text-green-400 text-sm">{importProgress}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <div className="text-green-300 text-sm flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400 border-t-transparent mr-2"></div>
                  {importStatus}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4">
              <button
                onClick={resetDialog}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || errors.length > 0 || isLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {isLoading ? '导入中...' : '确认导入'}
              </button>
            </div>
          </>
        ) : (
          /* 导入结果 */
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-green-400 mb-4">导入完成</h3>
              <div className="space-y-2">
                <p className="text-white">成功导入：<span className="text-green-400 font-semibold">{importResult.success}</span> 条</p>
                <p className="text-white">导入失败：<span className="text-red-400 font-semibold">{importResult.failed}</span> 条</p>
              </div>
              
              {importResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-900 border border-red-600 rounded text-left">
                  <h4 className="text-red-400 font-semibold mb-2">错误信息：</h4>
                  <ul className="text-red-300 text-sm space-y-1">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={resetDialog}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImportDialog;