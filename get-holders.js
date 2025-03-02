const fetch = require('node-fetch'); // 需要先安装 node-fetch：npm install node-fetch

// API 基础信息
const baseUrl = 'https://gmgn.ai/api/v1/token_stat/sol/GBHUG2DyvXT3PsSrdHikjiSShA8Nsc79JduMu4wUpump';
const params = {
  device_id: '315a90e1-6369-4036-95aa-497834066d64',
  client_id: 'gmgn_web_2025.0228.185518',
  from_app: 'gmgn',
  app_ver: '2025.0228.185518',
  tz_name: 'Asia/Shanghai',
  tz_offset: '28800',
  app_lang: 'zh-CN'
};

// 构建查询字符串
const queryString = new URLSearchParams(params).toString();
const fullUrl = `${baseUrl}?${queryString}`;

// 发送请求
async function sendRequest() {
  try {
    const response = await fetch(fullUrl, {
      method: 'GET', // 默认 GET 请求
      headers: {
        'Content-Type': 'application/json',
        // 如果需要其他 headers（例如认证 token），可以在这里添加
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // 解析 JSON 响应
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

// 执行请求
sendRequest();