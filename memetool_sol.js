const fs = require('fs');
const path = require('path');
const axios = require('axios');


class SolanaTokenMonitor {
  constructor(options = {}) {
    this.knownTokensFile = options.knownTokensFile || 'known_tokens.json';
    this.alertLogFile = options.alertLogFile || 'token_alerts.json';
    this.targetTokenName = options.targetTokenName || 'Replicat-One';
    this.intervalMs = options.intervalMs || 10_000; 
    this.knownTokens = new Set(this.loadKnownTokens());
  }

  loadKnownTokens() {
    try {
      const filePath = path.resolve(__dirname, this.knownTokensFile);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return arr;
        }
      }
    } catch (err) {
      console.error(`加载 knownTokens 文件出错: ${err.message}`);
    }
    return [];
  }

  saveKnownTokens() {
    try {
      const filePath = path.resolve(__dirname, this.knownTokensFile);
      fs.writeFileSync(filePath, JSON.stringify(Array.from(this.knownTokens), null, 2));
    } catch (err) {
      console.error(`保存 knownTokens 文件出错: ${err.message}`);
    }
  }

  async getNewTokens() {
    try {
      const response = await axios.get('https://token.jup.ag/all', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 10_000 
      });

      const data = response.data || [];
      if (!Array.isArray(data)) {
        console.error('Jupiter 返回数据格式异常');
        return [];
      }
      return data.map(token => token.address).filter(Boolean);
    } catch (error) {
      console.error(`获取新代币列表错误: ${error.message}`);
      return [];
    }
  }

  async getTokenInfo(tokenAddress) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.get(`https://public-api.solscan.io/token/meta/${tokenAddress}`, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          timeout: 5_000
        });

        if (response.status === 200 && this.isTargetToken(response.data)) {
          const creatorInfo = await this.getTokenCreator(tokenAddress);
          response.data.creator = creatorInfo || '未知';
          return response.data;
        }
        return null;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return null;
        }
        console.error(`第 ${attempt} 次获取代币[${tokenAddress}]信息失败: ${error.message}`);

        if (attempt === 3) {
          return null;
        }
      }
    }
    return null;
  }

  async getTokenCreator(tokenAddress) {
    try {
      const response = await axios.get(
        `https://public-api.solscan.io/token/holders/${tokenAddress}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          timeout: 5_000
        }
      );
      if (response.status === 200 && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].owner || '未知';
      }
      return null;
    } catch (err) {
      console.log(`获取创建者信息失败: ${err.message}`);
      return null;
    }
  }

  isTargetToken(tokenInfo) {
    if (!tokenInfo || !tokenInfo.name) return false;
    const name = tokenInfo.name.trim().toLowerCase();
    const target = this.targetTokenName.trim().toLowerCase();
    return name === target;
  }

  logTokenInfo(tokenInfo, tokenAddress) {
    const separator = '='.repeat(50);
    console.log(`\n${separator}`);
    console.log('发现目标代币！');
    console.log(`时间: ${new Date().toLocaleString()}`);
    console.log(`代币名称: ${tokenInfo.name}`);
    console.log(`代币地址: ${tokenAddress}`);
    console.log(`代币符号: ${tokenInfo.symbol}`);
    console.log(`创建者地址: ${tokenInfo.creator || '未知'}`);
    console.log(`${separator}\n`);
  }

  saveAlertToFile(tokenInfo, tokenAddress) {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        tokenName: tokenInfo.name,
        tokenAddress: tokenAddress,
        symbol: tokenInfo.symbol,
        creator: tokenInfo.creator
      };
      const filePath = path.resolve(__dirname, this.alertLogFile);
      fs.appendFileSync(filePath, JSON.stringify(data) + '\n');
    } catch (err) {
      console.error(`保存到文件时出错: ${err.message}`);
    }
  }

  async monitorTokensLoop() {
    console.log(`开始监测名称为 '${this.targetTokenName}' 的新代币...`);

    while (true) {
      try {
        const newTokens = await this.getNewTokens();
        const tasks = [];
        for (const tokenAddress of newTokens) {
          if (!this.knownTokens.has(tokenAddress)) {
            tasks.push(
              async () => {
                this.knownTokens.add(tokenAddress);
                const tokenInfo = await this.getTokenInfo(tokenAddress);
                if (tokenInfo) {
                  this.logTokenInfo(tokenInfo, tokenAddress);
                  this.saveAlertToFile(tokenInfo, tokenAddress);
                }
              }
            );
          }
        }
        await Promise.all(tasks);

        this.saveKnownTokens();
      } catch (error) {
        console.error(`监控过程中出错: ${error.message}`);
      }
      await this.sleep(this.intervalMs);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

(async () => {
  const monitor = new SolanaTokenMonitor({
    targetTokenName: 'Replicat-One',
    knownTokensFile: 'known_tokens.json',
    alertLogFile: 'token_alerts.json',
    intervalMs: 10_000
  });
  await monitor.monitorTokensLoop();
})();

