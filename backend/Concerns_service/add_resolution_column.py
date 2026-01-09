import asyncio
import aioodbc

# database config
server = 'DESKTOP-OD6PU2O'
database = 'OOS'
username = 'sa'
password = 'speedmabagal69'
driver = 'ODBC Driver 17 for SQL Server'

async def add_resolution_summary_column():
    dsn = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
    )
    conn = await aioodbc.connect(dsn=dsn, autocommit=True)
    cursor = await conn.cursor()
    try:
        # Check if column exists first
        await cursor.execute("""
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Concerns' AND COLUMN_NAME = 'resolution_summary'
        """)
        result = await cursor.fetchone()
        if result:
            print("resolution_summary column already exists")
        else:
            # Add the resolution_summary column
            await cursor.execute("""
                ALTER TABLE Concerns ADD resolution_summary NVARCHAR(MAX) NULL
            """)
            print("resolution_summary column added successfully")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await cursor.close()
        await conn.close()

if __name__ == "__main__":
    asyncio.run(add_resolution_summary_column())
