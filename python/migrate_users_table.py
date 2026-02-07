import sqlite3

DB_PATH = "events.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check existing columns
cur.execute("PRAGMA table_info(users)")
existing_columns = [row[1] for row in cur.fetchall()]

print("Existing columns:", existing_columns)

# Add missing columns safely
if "otp_hash" not in existing_columns:
    print("Adding otp_hash column...")
    cur.execute("ALTER TABLE users ADD COLUMN otp_hash TEXT")

if "otp_expires_at" not in existing_columns:
    print("Adding otp_expires_at column...")
    cur.execute("ALTER TABLE users ADD COLUMN otp_expires_at INTEGER")

if "is_verified" not in existing_columns:
    print("Adding is_verified column...")
    cur.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0")

conn.commit()
conn.close()

print("✅ Migration complete")
