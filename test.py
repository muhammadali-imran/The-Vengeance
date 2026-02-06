import asyncio
from libp2p import new_host

async def test_node():
    # Initialize a p2p node on your Windows machine
    host = new_host()
    # A Peer ID is like a permanent username for your computer on the P2P web
    print(f"Success! Your Windows P2P ID is: {host.get_id()}")
    await host.close()

if __name__ == "__main__":
    asyncio.run(test_node())