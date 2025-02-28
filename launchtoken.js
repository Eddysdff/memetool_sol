const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

async function getTokenHolders(mintAddress) {
    // 连接到 Solana 网络
    const connection = new Connection(clusterApiUrl('mainnet-beta'));

    // 获取所有持有该代币的账户
    const mintPublicKey = new PublicKey(mintAddress);
    
    // 获取代币 mint 地址下的所有代币账户
    const tokenAccounts = await connection.getTokenAccountsByOwner(
        mintPublicKey, 
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') } // Token Program ID
    );

    // 打印持有该代币的账户地址及其余额
    let holders = new Set();  // 使用 Set 来去重地址
    for (let accountInfo of tokenAccounts.value) {
        const ownerAddress = accountInfo.account.data.parsed.info.owner;
        holders.add(ownerAddress);
    }

    // 输出唯一的持有者地址数量
    console.log(`Total number of unique token holders: ${holders.size}`);
}

// 你需要提供代币的 mint 地址
const mintAddress = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';
getTokenHolders(mintAddress).catch(console.error);