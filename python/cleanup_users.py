import sqlite3

DB_PATH = "events.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("Before cleanup:")
for row in cur.execute("SELECT pubkey_hash, is_verified FROM users"):
    print(row)

# 🔥 DELETE unverified users
cur.execute("DELETE FROM users WHERE is_verified = 0")

conn.commit()

print("\nAfter cleanup:")
for row in cur.execute("SELECT pubkey_hash, is_verified FROM users"):
    print(row)

conn.close()
