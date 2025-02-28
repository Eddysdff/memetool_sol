const axios = require('axios');

async function getRaydiumInfo(mintAddress) {
    try {
        console.log(`正在查询 Raydium 信息: ${mintAddress}\n`);
        
        const response = await axios.get('https://api.raydium.io/v2/main/pairs');
        const pairs = response.data;
        
        console.log(`获取到 ${pairs.length} 个交易对\n`);
        
        // 查找包含该 mint 地址的交易对（不区分大小写）
        const pair = pairs.find(p => 
            p.baseMint.toLowerCase() === mintAddress.toLowerCase() || 
            p.quoteMint.toLowerCase() === mintAddress.toLowerCase()
        );

        if (!pair) {
            // 尝试查找部分匹配的交易对用于调试
            const possiblePairs = pairs.filter(p => 
                p.baseMint.includes(mintAddress.slice(0, 8)) || 
                p.quoteMint.includes(mintAddress.slice(0, 8))
            );
            
            if (possiblePairs.length > 0) {
                console.log('找到可能相关的交易对:');
                possiblePairs.forEach(p => {
                    console.log(`- AMM ID: ${p.ammId}`);
                    console.log(`  Base: ${p.baseMint}`);
                    console.log(`  Quote: ${p.quoteMint}\n`);
                });
            }
            
            throw new Error('未找到完全匹配的 Raydium 交易对');
        }

        console.log(`\n=== Raydium 交易对信息 ===`);
        console.log(`交易对地址: ${pair.ammId}`);
        console.log(`Base Token: ${pair.baseMint}`);
        console.log(`Quote Token: ${pair.quoteMint}`);
        console.log(`LP Token: ${pair.lpMint}`);
        
        return {
            success: true,
            data: pair
        };
    } catch (error) {
        console.error('\n错误详情:');
        console.error('- 消息:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getPumpInfo(mintAddress) {
    try {
        console.log(`正在查询代币信息: ${mintAddress}\n`);
        
        const response = await axios.get(`https://frontend-api.pump.fun/coins/${mintAddress}`);
        const info = response.data;

        if (!info || !info.mint) {
            throw new Error('获取信息失败');
        }

        console.log(`\n=== PUMP 交易对信息 ===`);
        console.log(`代币名字: ${info.name}`);
        console.log(`代币符号: ${info.symbol}`);
        console.log(`代币MINT地址: ${info.mint}`);
        console.log(`\nBonding Curve 信息:`);
        console.log(`Bonding Curve 地址: ${info.bonding_curve}`);
        console.log(`Associated Bonding Curve: ${info.associated_bonding_curve}`);

        return {
            success: true,
            data: {
                mint: info.mint,
                name: info.name,
                symbol: info.symbol,
                bondingCurve: info.bonding_curve,
                associatedBondingCurve: info.associated_bonding_curve
            }
        };
    } catch (error) {
        console.error('\n错误详情:');
        console.error('- 消息:', error.message);
        if (error.response) {
            console.error('- 状态码:', error.response.status);
            console.error('- 状态文本:', error.response.statusText);
        }
        return {
            success: false,
            error: error.message
        };
    }
}

// 使用示例
const mintAddress = process.argv[2];
if (!mintAddress) {
    console.error("请提供代币地址");
    process.exit(1);
}

// 同时查询 PUMP 和 Raydium 信息
Promise.all([
    getPumpInfo(mintAddress),
    getRaydiumInfo(mintAddress)
]).catch(error => {
    console.error('查询过程中出现错误:', error);
}); 
