import sqlite3
import json
import os

conn = sqlite3.connect('prisma/dev.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall() if not t[0].startswith('sqlite_') and not t[0].startswith('_prisma')]

dump = {}
for table in tables:
    cursor.execute(f'SELECT * FROM "{table}"')
    rows = [dict(row) for row in cursor.fetchall()]
    dump[table] = rows
    print(f"Exported {len(rows)} rows from {table}")

with open('scripts/dev_db_dump.json', 'w', encoding='utf-8') as f:
    json.dump(dump, f, indent=2, default=str)

print("Saved to scripts/dev_db_dump.json")
