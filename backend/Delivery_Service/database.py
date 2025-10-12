import aioodbc
import os
# database config
<<<<<<< HEAD
server = 'DESKTOP-VQQ0NIU\SQLEXPRESS'
database = 'OOS'
username = 'sa'
=======
server = 'DESKTOP-FH6B6B4\SQLEXPRESS'
database = 'OOS'
username = 'imsadmin'
>>>>>>> 1b537ad1f3682c6bae1cb1e70da0239ea0cbe0e3
password = 'imsadmin'
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