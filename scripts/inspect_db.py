import sqlite3
import json

conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall() if not t[0].startswith('sqlite_') and not t[0].startswith('_prisma')]

print(f"Total tables: {len(tables)}")
for table in sorted(tables):
    try:
        cursor.execute(f'SELECT count(*) FROM "{table}"')
        count = cursor.fetchone()[0]
        print(f"{table}: {count} rows")
    except Exception as e:
        print(f"{table}: error ({e})")
