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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseExcelFile(file);
    }
  };

  const parseExcelFile = async (file: File) => {
    setIsLoading(true);
    setErrors([]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRowData[];
      
      // 处理Excel数据类型转换，特别是日期字段
      const processedData = jsonData.map(row => ({
        ...row,
        生效年月: convertExcelDate(row.生效年月)
      }));
      
      // 验证数据
      const validationErrors = validateData(processedData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }
      
      setPreviewData(processedData.slice(0, 10)); // 只显示前10行预览
    } catch (error) {
      setErrors(['Excel文件解析失败，请检查文件格式']);
    } finally {
      setIsLoading(false);
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
    const companyNames = companies.map(c => c.name);
    
    // 检查导入数据内部重复
    const duplicateMap = new Map<string, number[]>();
    
    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel行号从2开始（第1行是标题）
      
      if (!row.公司名称) {
        errors.push(`第${rowNum}行：公司名称不能为空`);
      } else if (!companyNames.includes(row.公司名称)) {
        errors.push(`第${rowNum}行：公司"${row.公司名称}"不存在`);
      }
      
      if (!row.生产线) {
        errors.push(`第${rowNum}行：生产线不能为空`);
      }
      
      if (!row.工时类型 || !['生产工时', '非生产工时'].includes(row.工时类型)) {
        errors.push(`第${rowNum}行：工时类型必须是"生产工时"或"非生产工时"`);
      }
      
      if (!row.产品名称) {
        errors.push(`第${rowNum}行：产品名称不能为空`);
      }
      
      if (!row.产品工序) {
        errors.push(`第${rowNum}行：产品工序不能为空`);
      }
      
      // 单价可以为空，但如果填写了必须是有效数字
      if (row.单价 && (row.单价 as any) !== '' && typeof row.单价 === 'string' && isNaN(Number(row.单价))) {
        errors.push(`第${rowNum}行：单价必须是有效数字`);
      }
      
      if (!row.生效年月) {
        errors.push(`第${rowNum}行：生效年月不能为空`);
      }
      
      // 检查导入数据内部重复
      if (row.公司名称 && row.生产线 && row.工时类型 && row.产品名称 && row.产品工序) {
        const key = `${row.公司名称.trim()}_${row.生产线.trim()}_${row.工时类型}_${row.产品名称.trim()}_${row.产品工序.trim()}`;
        if (duplicateMap.has(key)) {
          duplicateMap.get(key)!.push(rowNum);
        } else {
          duplicateMap.set(key, [rowNum]);
        }
      }
      
      // 检查与现有数据重复
      if (row.公司名称 && row.生产线 && row.工时类型 && row.产品名称 && row.产品工序) {
        const company = companies.find(c => c.name === row.公司名称);
        if (company) {
          const existingDuplicate = existingProcesses.find(process => 
            process.company_id === company.id &&
            process.production_line.trim() === row.生产线.trim() &&
            process.production_category === row.工时类型 &&
            process.product_name.trim() === row.产品名称.trim() &&
            process.product_process.trim() === row.产品工序.trim()
          );
          
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
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRowData[];
      
      // 处理Excel数据类型转换，特别是日期字段
      const processedData = jsonData.map(row => ({
        ...row,
        生效年月: convertExcelDate(row.生效年月)
      }));
      
      // 转换数据格式
      const processData = processedData.map(row => {
        const company = companies.find(c => c.name === row.公司名称);
        return {
          company_id: company?.id || '',
          production_line: row.生产线,
          production_category: row.工时类型,
          product_name: row.产品名称,
          product_process: row.产品工序,
          unit_price: row.单价 && (row.单价 as any) !== '' && typeof row.单价 !== 'undefined' ? Number(row.单价) : null, // 允许单价为空
          effective_date: row.生效年月 || null
        };
      });
      
      await onImport(processData);
      setImportResult({
        success: processData.length,
        failed: 0,
        errors: []
      });
    } catch (error) {
      setImportResult({
        success: 0,
        failed: previewData.length,
        errors: ['导入失败：' + (error as Error).message]
      });
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
              
              {selectedFile && (
                <div className="flex items-center gap-2 text-green-400">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{selectedFile.name}</span>
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