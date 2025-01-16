from solana.rpc.api import Client
import time
from datetime import datetime
import json
import requests

class SolanaMemeMonitor:
    def __init__(self):
        self.solana_client = Client("https://api.mainnet-beta.solana.com")
        self.known_tokens = set()
        self.target_token_name = "GAIM Studio"
        
    def is_target_token(self, token_info):
        if not token_info or 'name' not in token_info:
            return False
        
        token_name = token_info['name']
        return token_name == self.target_token_name

    def get_token_info(self, token_address, max_retries=3):
        for attempt in range(max_retries):
            try:
                # 添加请求头，模拟浏览器行为
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                
                # 获取基本代币信息
                response = requests.get(
                    f"https://public-api.solscan.io/token/meta/{token_address}",
                    headers=headers,
                    timeout=10
                )
                if response.status_code == 200:
                    token_data = response.json()
                    if self.is_target_token(token_data):
                        # 获取代币创建者信息
                        creator_response = requests.get(
                            f"https://public-api.solscan.io/token/holders/{token_address}",
                            headers=headers,
                            timeout=10
                        )
                        if creator_response.status_code == 200:
                            creator_data = creator_response.json()
                            if creator_data.get('data'):
                                token_data['creator'] = creator_data['data'][0].get('owner', '未知')
                        return token_data
                return None
            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:  # 最后一次重试
                    print(f"获取代币信息错误 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
                else:
                    print(f"重试获取代币信息 (尝试 {attempt + 1}/{max_retries})...")
                    time.sleep(2)  # 重试前等待2秒
            except Exception as e:
                print(f"获取代币信息时发生未知错误: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2)
        return None

    def get_new_tokens(self, max_retries=3):
        for attempt in range(max_retries):
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(
                    "https://token.jup.ag/all",
                    headers=headers,
                    timeout=10
                )
                if response.status_code == 200:
                    tokens = response.json()
                    return [token['address'] for token in tokens]
                return []
            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:
                    print(f"获取新代币列表错误 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
                else:
                    print(f"重试获取代币列表 (尝试 {attempt + 1}/{max_retries})...")
                    time.sleep(2)
            except Exception as e:
                print(f"获取代币列表时发生未知错误: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2)
        return []

    def monitor_new_tokens(self):
        print(f"开始监测名称为 '{self.target_token_name}' 的新代币...")
        while True:
            try:
                new_tokens = self.get_new_tokens()
                
                for token_address in new_tokens:
                    if token_address not in self.known_tokens:
                        self.known_tokens.add(token_address)
                        token_info = self.get_token_info(token_address)
                        if token_info:
                            print("\n" + "="*50)
                            print(f"发现目标代币！")
                            print(f"时间: {datetime.now()}")
                            print(f"代币名称: {token_info.get('name')}")
                            print(f"代币地址: {token_address}")
                            print(f"代币符号: {token_info.get('symbol')}")
                            print(f"创建者地址: {token_info.get('creator', '未知')}")
                            print("="*50 + "\n")
                
                time.sleep(5)
                
            except Exception as e:
                print(f"监控过程中出错: {str(e)}")
                time.sleep(5)

if __name__ == "__main__":
    monitor = SolanaMemeMonitor()
    monitor.monitor_new_tokens()
