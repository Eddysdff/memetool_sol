import pandas as pd
from solana.rpc.api import Client
import time
from datetime import datetime
import json

class DevWalletTracker:
    def __init__(self):
        self.solana_client = Client("https://api.mainnet-beta.solana.com")
        self.excel_path = "devaddress.xlsx"
        self.known_tokens = set() 
        
    def load_addresses(self):
        try:
            df = pd.read_excel(self.excel_path)
            return df['address'].tolist()  
        except Exception as e:
            print(f"读取Excel文件失败: {e}")
            return []
            
    def get_token_accounts(self, address):
        try:
            response = self.solana_client.get_token_accounts_by_owner(
                address,
                {'programId': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'}
            )
            return response['result']['value'] if response['result'] else []
        except Exception as e:
            print(f"获取代币账户失败: {e}")
            return []
            
    def monitor_addresses(self):
        addresses = self.load_addresses()
        
        while True:
            for address in addresses:
                token_accounts = self.get_token_accounts(address)
                
                for account in token_accounts:
                    mint = account['account']['data']['parsed']['info']['mint']
                    if mint not in self.known_tokens:
                        self.known_tokens.add(mint)
                        print(f"发现新代币！")
                        print(f"时间: {datetime.now()}")
                        print(f"开发者地址: {address}")
                        print(f"代币地址: {mint}")
                        print("-" * 50)
                
            time.sleep(60)  # 每分钟检查一次

if __name__ == "__main__":
    tracker = DevWalletTracker()
    print("开始监控开发者钱包...")
    tracker.monitor_addresses()
