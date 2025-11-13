import aioodbc


# database config
server = 'DESKTOP-OD6PU2O'
database = 'OOS'
username = 'sa'
<<<<<<< HEAD
password = 'speedmabagal69'
driver = 'ODBC Driver 17 for SQL Server'

# async function to get db connection
=======
password = 'markregie123'
driver = 'ODBC Driver 17 for SQL Server'# async function to get db connection
>>>>>>> debe503deed4c8b337b28801e04f7292a7aa1ac6
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