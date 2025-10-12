import aioodbc
import os
# database config
<<<<<<< HEAD
server = 'DESKTOP-VQQ0NIU\SQLEXPRESS'
database = 'OOS'
username = 'sa'
password = 'imsadmin'
=======
server = 'DESKTOP-D84FNH8'
database = 'OOS'
username = 'sa'
password = 'markregie123'
>>>>>>> bc882bfef2f5b8b5d0cfbab1ed2d51959dbcfe08
driver = 'ODBC Driver 17 for SQL Server'

# async function to get db connection
async def get_db_connection():
    dsn = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
    )
    conn = await aioodbc.connect(dsn=dsn, autocommit=True)
    return conn