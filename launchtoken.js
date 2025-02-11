const GeyserClient = require("@triton-one/yellowstone-grpc").default;
const bs58 = require("bs58");

const pumpfun = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';
const grpc_url = "http://84.32.186.52:10000";
const grpc_token = "";//xToken

async function tOutPut(data) {
    try {
        if (!data.transaction?.transaction) {
            return null;
        }

        let signature = data.transaction.transaction.signature;
        if (Buffer.isBuffer(signature)) {
            signature = bs58.encode(signature);
        } else if (Array.isArray(signature)) {
            signature = bs58.encode(Buffer.from(signature));
        }

        return {
            signature: signature,
            meta: data.transaction.transaction.meta,
            slot: data.slot
        };
    } catch (error) {
        console.error("Error in tOutPut:", error);
        return null;
    }
}

function log_now() {
    var dt_now = new Date();
    console.log(
        `=============${dt_now.toLocaleTimeString()} - (${dt_now.getMilliseconds()})============= `
    );
}

//监控PUMP 开盘
async function handleStream(client, args) {
    // Subscribe for events
    const stream = await client.subscribe();

    // Create `error` / `end` handler
    const streamClosed = new Promise((resolve, reject) => {
        stream.on("error", (error) => {
            console.log("ERROR", error);
            reject(error);
            stream.end();
        });
        stream.on("end", () => {
            resolve();
        });
        stream.on("close", () => {
            resolve();
        });
    });

    // Handle updates
    stream.on("data", async (data) => {
        try {
            //监控PUMP开盘
            const result = await tOutPut(data);
            if (result == null) {
                return;
            }
            console.log("监控中...");

            var mint_address = "";
            try {
                mint_address = result.meta.postTokenBalances[1].mint;
            } catch (e) {
                // 忽略错误
            }

            var log_program_data = result.meta.logMessages;
            var pdata = log_program_data.find(
                (par) => par.includes("initialize2")
            );

            if (pdata) {
                if (pdata.indexOf("initialize2") !== -1 && pdata.indexOf("InitializeInstruction2") !== -1) {
                    log_now();
                    console.log(`✅✅ 开始解析hash 🔗 https://solscan.io/tx/${result.signature}`);
                    console.log(`✨✨✨✨✨✨【外盘开始】✨✨✨✨✨✨`);
                    if (mint_address) {
                        console.log(`✅✅ Dex查看 🔗 https://gmgn.ai/sol/token/${mint_address}`);
                    }
                }
            }

        } catch (error) {
            console.error("Error:", error);
        }
    });

    // Send subscribe request
    await new Promise((resolve, reject) => {
        stream.write(args, (err) => {
            if (err === null || err === undefined) {
                resolve();
            } else {
                reject(err);
            }
        });
    }).catch((reason) => {
        console.error(reason);
        throw reason;
    });

    await streamClosed;
}

async function subscribeCommand(client, args) {
    while (true) {
        try {
            await handleStream(client, args);
        } catch (error) {
            console.error("Stream error, restarting in 1 second...", error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

const client = new GeyserClient(
    grpc_url,
    grpc_token,
    undefined,
);

//监控PUMP 开盘
const req = {
    accounts: {},
    slots: {},
    transactions: {
        pumpfun: {
            vote: false,
            failed: false,
            signature: undefined,
            accountInclude: [pumpfun],
            accountExclude: [],
            accountRequired: [],
        },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    ping: undefined,
    commitment: "processed", //for receiving confirmed txn updates
};

//解析pumpfun开盘
subscribeCommand(client, req); 