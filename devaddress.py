from typing import Optional
import base58
import struct
import sys
from solders.pubkey import Pubkey
from solana.rpc.api import Client

# Metaplex Metadata Program ID
METADATA_PROGRAM_ID = Pubkey.from_string("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

########################
#  1. 获取 Metaplex Metadata
########################
def get_metadata_account(mint_address: Pubkey) -> Pubkey:
    """推导 Metaplex Metadata PDA 地址"""
    try:
        seeds = [
            b"metadata",
            bytes(METADATA_PROGRAM_ID),
            bytes(mint_address)
        ]
        metadata_address, _ = Pubkey.find_program_address(seeds, METADATA_PROGRAM_ID)
        return metadata_address
    except Exception as e:
        raise Exception(f"获取metadata地址失败: {str(e)}")

def decode_metadata(data: bytes) -> dict:
    """
    基于旧版Metaplex Metadata的内存布局，简单硬编码偏移量去解析 creators。
    注意：如果布局或版本变动，这种写法可能失效。
    """
    try:
        # 跳过前面字段(约 326字节)，此处仅做演示
        creators_data = data[326:]
        
        if len(creators_data) > 4:
            # 解析creator_count
            creator_count = int.from_bytes(creators_data[0:4], "little")
            offset = 4
            creators = []
            # 每个creator 34字节 = 32地址 + 1 verified + 1 share
            for _ in range(creator_count):
                if offset + 34 <= len(creators_data):
                    creator_address = base58.b58encode(creators_data[offset:offset+32]).decode()
                    verified = creators_data[offset+32] == 1
                    share = creators_data[offset+33]
                    creators.append({
                        "address": creator_address,
                        "verified": verified,
                        "share": share
                    })
                    offset += 34
            return {"creators": creators}
    except Exception as e:
        raise Exception(f"解析metadata失败: {str(e)}")

    return {"creators": []}

def fetch_metaplex_creators(client: Client, mint_address: Pubkey) -> Optional[list]:
    """
    获取 Metaplex Metadata 中的 creators 数组（如果有）
    无法获取或无metadata时返回 None
    """
    metadata_pubkey = get_metadata_account(mint_address)
    resp = client.get_account_info(metadata_pubkey)
    if resp.value is None:
        return None  # 没有 metadata account
    
    data = resp.value.data  # bytes
    if not data:
        return None
    try:
        metadata_dict = decode_metadata(data)
        return metadata_dict.get("creators", [])
    except Exception as e:
        # 解析失败
        print(f"[警告] Metaplex Metadata 解析失败: {e}")
        return None


########################
#  2. 如果没有 Metadata，就获取 SPL Token 的 Mint Authority
########################
def fetch_spl_mint_authority(client: Client, mint_address: Pubkey) -> Optional[dict]:
    """
    直接从 SPL Token Mint Account 解析 mintAuthority & freezeAuthority.
    若不是有效的SPL Token，或解析失败，则返回 None。
    
    SPL Token Mint布局 (82字节):
    - mintAuthorityOption: 4字节(u32)，0=没有，1=有
    - mintAuthority: 32字节(Pubkey) [当mintAuthorityOption=1时]
    - supply: 8字节(u64)
    - decimals: 1字节(u8)
    - isInitialized: 1字节(bool)
    - freezeAuthorityOption: 4字节(u32), 0=没有,1=有
    - freezeAuthority: 32字节(Pubkey) [当freezeAuthorityOption=1时]
    """
    resp = client.get_account_info(mint_address)
    info = resp.value
    if info is None:
        return None
    
    data = info.data
    if not data or len(data) < 82:
        # 可能不是标准的 SPL Token Mint
        return None

    try:
        # 解析
        # <表示小端，I=4字节u32, 32s=32字节, Q=8字节u64, B=1字节u8
        # 先读 mintAuthorityOption
        offset = 0
        (mint_auth_opt,) = struct.unpack_from("<I", data, offset)
        offset += 4

        mint_authority = None
        if mint_auth_opt == 1:
            raw_auth = data[offset : offset + 32]
            offset += 32
            mint_authority = base58.b58encode(raw_auth).decode()
        else:
            # 没有 mint authority
            offset += 32  # 跳过
       
        # supply
        offset_end = offset + 8
        (supply,) = struct.unpack_from("<Q", data, offset)
        offset = offset_end
        
        # decimals
        (decimals,) = struct.unpack_from("<B", data, offset)
        offset += 1
        
        # isInitialized
        (initialized,) = struct.unpack_from("<?", data, offset)
        offset += 1

        # freezeAuthorityOption
        (freeze_auth_opt,) = struct.unpack_from("<I", data, offset)
        offset += 4
        
        freeze_authority = None
        if freeze_auth_opt == 1:
            raw_freeze = data[offset : offset + 32]
            freeze_authority = base58.b58encode(raw_freeze).decode()
        # else 没有 freeze authority
        
        return {
            "mint_authority": mint_authority,
            "freeze_authority": freeze_authority,
            "supply": supply,
            "decimals": decimals,
            "initialized": initialized,
        }
    except Exception as e:
        print(f"[警告] 解析 SPL Mint失败: {e}")
        return None


def query_token_creator():
    client = Client("https://api.mainnet-beta.solana.com")
    
    while True:
        print("\n=== Solana Token 创建者查询工具 ===")
        token_address_str = input("请输入Token的CA地址 (输入 q 退出): ").strip()
        
        if token_address_str.lower() == 'q':
            print("退出程序...")
            break
        
        # 尝试转换为 Pubkey
        try:
            mint_pubkey = Pubkey.from_string(token_address_str)
        except Exception:
            print("\n❌ 无效的公钥格式，请重新输入。")
            continue
        
        # 1. 先尝试获取 Metaplex Metadata
        creators = fetch_metaplex_creators(client, mint_pubkey)
        if creators is not None and len(creators) > 0:
            # 如果成功拿到 creators，说明是NFT或带Metadata的代币
            print("\n📝 Metaplex Metadata 中的创建者信息:")
            for idx, c in enumerate(creators, 1):
                verified_status = "✅ 已验证" if c["verified"] else "❌ 未验证"
                print(f"\n创建者 {idx}:")
                print(f"- 地址: {c['address']}")
                print(f"- 状态: {verified_status}")
                print(f"- 份额: {c['share']}%")
        else:
            # 2. 如果没有Metadata, 或解析 creators 为空，则尝试SPL Mint Authority
            print("\n未检测到 Metaplex Metadata 的 creators，尝试读取 SPL Token信息...")
            mint_info = fetch_spl_mint_authority(client, mint_pubkey)
            if mint_info is None:
                print("❌ 该地址既没有有效的 Metaplex Metadata，也不是标准 SPL Token。")
            else:
                print("\nSPL Token Mint 信息:")
                print(f"- Mint Authority: {mint_info['mint_authority'] or '无（可能已设置为null）'}")
                print(f"- Freeze Authority: {mint_info['freeze_authority'] or '无'}")
                print(f"- Supply: {mint_info['supply']}")
                print(f"- Decimals: {mint_info['decimals']}")
                init_state = "已初始化" if mint_info['initialized'] else "未初始化"
                print(f"- 状态: {init_state}")


if __name__ == "__main__":
    query_token_creator()
