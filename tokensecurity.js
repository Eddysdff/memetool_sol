const axios = require('axios');

const tokenReportUrl = 'https://api.rugcheck.xyz/v1/tokens/Bd5oLZJHiUkwmBtSYuEJmeR4LiQif8Tdcwg61myzXF1R/report';

axios.get(tokenReportUrl, {
  headers: {
    'accept': 'application/json'
  }
})
.then(response => {
  console.log('完整返回数据:', JSON.stringify(response.data, null, 2));
})
.catch(error => {
  console.error('请求错误:', error);
});
