const axios = require("axios");

// Meme 币的 Mint 地址
const memeTokenMintAddress = '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4';

// Jupiter API endpoint
const jupiterAPI = 'https://quote-api.jup.ag/v1/quote';

async function getRealTimePrice(memeMintAddress) {
    try {
        // 构造请求参数
        const params = new URLSearchParams({
            inputMint: memeMintAddress, 
            outputMint: 'So11111111111111111111111111111111111111112', 
            slippage: 1, 
        });

        // 发送请求到Jupiter API
        const response = await axios.get(`${jupiterAPI}?${params.toString()}`);
        const data = response.data;

        if (data && data.data && data.data[0]) {
            const quote = data.data[0]; 
            const price = quote.outAmount / Math.pow(10, 9); 
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