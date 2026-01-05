import asyncio
import aioodbc

# database config
server = 'DESKTOP-VQQ0NIU\SQLEXPRESS'
database = 'OOS'
username = 'sa'
password = 'imsadmin'
driver = 'ODBC Driver 17 for SQL Server'

async def add_file_path_column():
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
            WHERE TABLE_NAME = 'Concerns' AND COLUMN_NAME = 'file_path'
        """)
        result = await cursor.fetchone()
        if result:
            print("file_path column already exists")
        else:
            # Add the file_path column
            await cursor.execute("""
                ALTER TABLE Concerns ADD file_path NVARCHAR(500) NULL
            """)
            print("file_path column added successfully")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await cursor.close()
        await conn.close()

if __name__ == "__main__":
    asyncio.run(add_file_path_column())
