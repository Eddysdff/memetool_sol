const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');  // 用于文件操作
const connection = new Connection('https://g.w.lavanet.xyz:443/gateway/solana/rpc-http/e51c4e4c205e66737ffdacc87205576f', 'confirmed');

async function getTokenHoldersAndSaveToFile(tokenMintAddress) {
    const mintPublicKey = new PublicKey(tokenMintAddress);

    // 获取与 tokenMintAddress 相关的所有代币账户
    const result = await connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), 
            filters: [
                { dataSize: 165 },  // 代币账户大小
                { memcmp: { offset: 0, bytes: mintPublicKey.toBase58() } }  
            ]
        }
    );

    // 提取所有持有者的地址
    const holders = result.map(account => account.pubkey.toString());

    // 创建一个对象来存储每个持有者的代币信息
    const holdersData = [];

    // 遍历 holders 列表，查询每个地址的代币账户信息
    for (let holder of holders) {
        const holderPubKey = new PublicKey(holder);

        // 使用 getTokenAccountsByOwner 获取该地址持有的代币账户信息
        const tokenAccounts = await connection.getTokenAccountsByOwner(holderPubKey, {
            programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // Token Program ID
        });

        // 收集该持有者的代币信息
        const holderInfo = {
            owner: holder,
            tokenAccounts: tokenAccounts.value.map(account => ({
                pubkey: account.pubkey.toString(),
                balance: account.account.data.parsed.info.tokenAmount.uiAmount
            }))
        };

        // 将每个持有者的数据加入到 holdersData 数组
        holdersData.push(holderInfo);
    }

    // 将持有者信息保存到一个 JSON 文件中
    fs.writeFileSync('token_holders_data.json', JSON.stringify(holdersData, null, 2));

    console.log('Token holders data saved to token_holders_data.json');
}

// 使用代币的 mint 地址调用该函数
const tokenMintAddress = 'JCeoBX79HfatfaY6xvuNyCHf86hwgkCCWDpEycVHtime'; 
getTokenHoldersAndSaveToFile(tokenMintAddress).catch(console.error);