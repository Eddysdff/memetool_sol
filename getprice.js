const axios = require("axios");

// Meme 币的 Mint 地址（请替换为实际的 Mint 地址）
const memeTokenMintAddress = '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4';

// Jupiter API endpoint
const jupiterAPI = 'https://quote-api.jup.ag/v1/quote';

async function getRealTimePrice(memeMintAddress) {
    try {
        // 构造请求参数
        const params = new URLSearchParams({
            inputMint: memeMintAddress, // 输入代币的 Mint 地址
            outputMint: 'So11111111111111111111111111111111111111112', // Solana 原生代币的 Mint 地址（例如 USDC 的 mint 地址）
            slippage: 1, // 设置 slippage（价格滑点），可以根据需求调整
        });

        // 发送请求到 Jupiter API
        const response = await axios.get(`${jupiterAPI}?${params.toString()}`);
        const data = response.data;

        if (data && data.data && data.data[0]) {
            const quote = data.data[0]; // 获取第一个报价
            const price = quote.outAmount / Math.pow(10, 9); // 将返回的报价格式化为人类可读的形式
            console.log(`当前 ${memeMintAddress} 的价格: ${price} SOL`);
        } else {
            console.log("未能找到价格数据，请检查输入的 Mint 地址是否正确");
        }
    } catch (error) {
        console.error("查询实时价格时出错:", error);
    }
}

// 调用函数获取价格
getRealTimePrice(memeTokenMintAddress);