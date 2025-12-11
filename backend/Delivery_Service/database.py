import aioodbc

# database config
server = 'DESKTOP-FH6B6B4\SQLEXPRESS'
database = 'OOS'
username = 'imsadmin'
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

# --- NEW: Function to Initialize Delivery Settings Table ---
async def init_delivery_settings():
    """
    Creates the DeliverySettings table if it doesn't exist
    and inserts the default configuration row.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # 1. Create Table (Idempotent check)
            create_table_sql = """
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DeliverySettings' AND xtype='U')
            BEGIN
                CREATE TABLE [dbo].[DeliverySettings](
                    [SettingID] [int] IDENTITY(1,1) NOT NULL,
                    [BaseFee] [decimal](10, 2) NOT NULL DEFAULT 50.00,
                    [BaseDistanceKm] [decimal](10, 2) NOT NULL DEFAULT 3.00,
                    [ExtraFeePerKm] [decimal](10, 2) NOT NULL DEFAULT 10.00,
                    [MaxRadiusKm] [decimal](10, 2) NOT NULL DEFAULT 8.00,
                    [IsSurgePricingActive] [bit] NOT NULL DEFAULT 0,
                    [SurgeFlatFee] [decimal](10, 2) NOT NULL DEFAULT 20.00,
                    [UpdatedAt] [datetime2](7) DEFAULT GETDATE(),
                    PRIMARY KEY CLUSTERED ([SettingID] ASC)
                )
            END
            """
            await cursor.execute(create_table_sql)

            # 2. Insert Default Data (Only if table is empty)
            insert_default_sql = """
            IF NOT EXISTS (SELECT 1 FROM [dbo].[DeliverySettings])
            BEGIN
                INSERT INTO [dbo].[DeliverySettings] 
                ([BaseFee], [BaseDistanceKm], [ExtraFeePerKm], [MaxRadiusKm], [IsSurgePricingActive], [SurgeFlatFee])
                VALUES 
                (50.00, 3.00, 10.00, 8.00, 0, 20.00)
            END
            """
            await cursor.execute(insert_default_sql)
            print("Database: DeliverySettings table initialized successfully.")
            
    except Exception as e:
        print(f"Database Error: Failed to initialize DeliverySettings. {e}")
    finally:
        await conn.close()