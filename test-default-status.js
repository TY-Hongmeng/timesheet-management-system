// 测试用户注册默认状态功能的脚本
// 在浏览器控制台中运行此脚本

async function testDefaultUserStatus() {
  console.log('🧪 开始测试用户注册默认状态功能...');
  
  // 1. 检查当前localStorage中的defaultUserStatus
  const currentStatus = localStorage.getItem('defaultUserStatus');
  console.log('📋 当前localStorage中的defaultUserStatus:', currentStatus);
  
  // 2. 测试设置为禁用状态
  console.log('🔧 设置默认状态为禁用(false)...');
  localStorage.setItem('defaultUserStatus', JSON.stringify(false));
  console.log('✅ 已设置defaultUserStatus为false');
  
  // 3. 验证读取
  const disabledStatus = JSON.parse(localStorage.getItem('defaultUserStatus') || 'true');
  console.log('📖 读取到的禁用状态:', disabledStatus);
  
  // 4. 测试设置为启用状态
  console.log('🔧 设置默认状态为启用(true)...');
  localStorage.setItem('defaultUserStatus', JSON.stringify(true));
  console.log('✅ 已设置defaultUserStatus为true');
  
  // 5. 验证读取
  const enabledStatus = JSON.parse(localStorage.getItem('defaultUserStatus') || 'true');
  console.log('📖 读取到的启用状态:', enabledStatus);
  
  // 6. 模拟注册函数中的读取逻辑
  console.log('🔍 模拟注册函数中的读取逻辑...');
  const defaultUserStatus = JSON.parse(localStorage.getItem('defaultUserStatus') || 'false');
  console.log('📋 注册函数读取到的默认状态:', defaultUserStatus);
  console.log('👤 新用户的is_active字段将设置为:', defaultUserStatus);
  
  // 7. 检查所有相关的localStorage键
  console.log('🔍 检查所有localStorage键...');
  const allKeys = Object.keys(localStorage);
  const relevantKeys = allKeys.filter(key => 
    key.includes('default') || 
    key.includes('status') || 
    key.includes('user')
  );
  console.log('📋 相关的localStorage键:', relevantKeys);
  relevantKeys.forEach(key => {
    console.log(`  ${key}: ${localStorage.getItem(key)}`);
  });
  
  console.log('✅ 测试完成！');
  
  return {
    currentStatus,
    disabledStatus,
    enabledStatus,
    defaultUserStatus,
    relevantKeys
  };
}

// 运行测试
testDefaultUserStatus();