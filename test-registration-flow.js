// 测试注册流程的脚本
console.log('🔍 开始测试注册流程...');

// 1. 检查localStorage中的defaultUserStatus
console.log('📋 步骤1: 检查localStorage中的defaultUserStatus');
const defaultUserStatus = localStorage.getItem('defaultUserStatus');
console.log('defaultUserStatus原始值:', defaultUserStatus);
console.log('defaultUserStatus解析值:', defaultUserStatus ? JSON.parse(defaultUserStatus) : null);

// 2. 设置defaultUserStatus为true（启用状态）
console.log('📋 步骤2: 设置defaultUserStatus为true');
localStorage.setItem('defaultUserStatus', JSON.stringify(true));
console.log('设置后的值:', localStorage.getItem('defaultUserStatus'));

// 3. 模拟注册过程中的localStorage读取
console.log('📋 步骤3: 模拟注册过程中的localStorage读取');
const saved = localStorage.getItem('defaultUserStatus');
const defaultStatus = saved ? JSON.parse(saved) : false;
console.log('注册时读取的saved值:', saved);
console.log('注册时解析的defaultStatus:', defaultStatus);

// 4. 检查所有相关的localStorage键
console.log('📋 步骤4: 检查所有相关的localStorage键');
const allKeys = Object.keys(localStorage);
const relevantKeys = allKeys.filter(key => 
  key.includes('default') || 
  key.includes('status') || 
  key.includes('user')
);
console.log('相关的localStorage键:', relevantKeys);
relevantKeys.forEach(key => {
  console.log(`  ${key}: ${localStorage.getItem(key)}`);
});

// 5. 模拟用户数据插入
console.log('📋 步骤5: 模拟用户数据插入');
const mockUserData = {
  id: 'test-user-id',
  phone: '13800000000',
  name: '测试用户',
  company_id: 'test-company',
  role_id: 'test-role',
  is_active: defaultStatus
};
console.log('模拟插入的用户数据:', mockUserData);
console.log('用户的is_active字段:', mockUserData.is_active);

console.log('✅ 测试完成！');

// 返回测试结果
return {
  defaultUserStatus: defaultStatus,
  mockUserData: mockUserData,
  relevantKeys: relevantKeys
};