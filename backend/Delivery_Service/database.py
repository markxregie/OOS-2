import aioodbc

# database config
server = 'DESKTOP-VQQ0NIU\SQLEXPRESS'
database = 'OOS'
username = 'sa'
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


# --- NEW: Function to Initialize Product Preparation Times Table ---
async def init_product_prep_times():
    """
    Creates the ProductPrepTimes table if it doesn't exist.
    This table stores the preparation time (in minutes) for each product,
    which is used by the delivery service to calculate accurate ETAs.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # 1. Create Table (Idempotent check)
            create_table_sql = """
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductPrepTimes' AND xtype='U')
            BEGIN
                CREATE TABLE [dbo].[ProductPrepTimes](
                    [PrepID] [int] IDENTITY(1,1) NOT NULL,
                    [ProductID] [int] NOT NULL,
                    [ProductName] [nvarchar](255) NULL,
                    [PrepTimeMinutes] [int] NOT NULL DEFAULT 10,
                    [UpdatedAt] [datetime2](7) DEFAULT GETDATE(),
                    PRIMARY KEY CLUSTERED ([PrepID] ASC)
                )
                
                CREATE NONCLUSTERED INDEX [IX_ProductID] ON [dbo].[ProductPrepTimes]
                (
                    [ProductID] ASC
                )
            END
            """
            await cursor.execute(create_table_sql)
            
            # 2. Add ProductName column if it doesn't exist (migration for existing tables)
            add_column_sql = """
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                           WHERE TABLE_NAME='ProductPrepTimes' AND COLUMN_NAME='ProductName')
            BEGIN
                ALTER TABLE [dbo].[ProductPrepTimes] 
                ADD [ProductName] [nvarchar](255) NULL
            END
            """
            await cursor.execute(add_column_sql)
            
            print("Database: ProductPrepTimes table initialized successfully.")
            
    except Exception as e:
        print(f"Database Error: Failed to initialize ProductPrepTimes. {e}")
    finally:
        await conn.close()


# --- Helper function to get prep time for a product by name ---
async def get_product_prep_time_by_name(product_name: str):
    """
    Retrieves the preparation time (in minutes) for a product by its name.
    Returns default 10 minutes if not found.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            query = "SELECT [PrepTimeMinutes] FROM [dbo].[ProductPrepTimes] WHERE [ProductName] = ?"
            await cursor.execute(query, (product_name,))
            result = await cursor.fetchone()
            prep_time = result[0] if result else 10  # Default 10 minutes
            print(f"DEBUG: Product '{product_name}' prep time: {prep_time} mins")
            return prep_time
    except Exception as e:
        print(f"Database Error: Failed to get prep time for product '{product_name}'. {e}")
        return 10
    finally:
        await conn.close()


# --- Helper function to get prep time for a product ---
async def get_product_prep_time(product_id):
    """
    Retrieves the preparation time (in minutes) for a given product.
    Returns default 10 minutes if not found.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            query = "SELECT [PrepTimeMinutes] FROM [dbo].[ProductPrepTimes] WHERE [ProductID] = ?"
            await cursor.execute(query, (product_id,))
            result = await cursor.fetchone()
            return result[0] if result else 10  # Default 10 minutes
    except Exception as e:
        print(f"Database Error: Failed to get prep time for product {product_id}. {e}")
        return 10
    finally:
        await conn.close()


# --- Helper function to get all product prep times ---
async def get_all_product_prep_times():
    """
    Retrieves all preparation times for all products.
    Returns a dictionary mapping productId -> prepTimeMinutes
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            query = "SELECT [ProductID], [PrepTimeMinutes] FROM [dbo].[ProductPrepTimes]"
            await cursor.execute(query)
            rows = await cursor.fetchall()
            # Convert to dictionary format: {productId: prepTimeMinutes}
            prep_times = {row[0]: row[1] for row in rows}
            print(f"DEBUG: Retrieved {len(prep_times)} product prep times from database")
            return prep_times
    except Exception as e:
        print(f"Database Error: Failed to get all prep times. {e}")
        return {}
    finally:
        await conn.close()


# --- Helper function to update prep time for a product ---
async def update_product_prep_time(product_id, prep_time_minutes, product_name=None):
    """
    Updates or inserts the preparation time for a product.
    ProductName is optional and used for reference/display purposes.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            upsert_sql = """
            IF EXISTS (SELECT 1 FROM [dbo].[ProductPrepTimes] WHERE [ProductID] = ?)
                UPDATE [dbo].[ProductPrepTimes] 
                SET [PrepTimeMinutes] = ?, [ProductName] = ?, [UpdatedAt] = GETDATE()
                WHERE [ProductID] = ?
            ELSE
                INSERT INTO [dbo].[ProductPrepTimes] ([ProductID], [ProductName], [PrepTimeMinutes])
                VALUES (?, ?, ?)
            """
            await cursor.execute(upsert_sql, (product_id, prep_time_minutes, product_name, product_id, product_id, product_name, prep_time_minutes))
            return True
    except Exception as e:
        print(f"Database Error: Failed to update prep time for product {product_id}. {e}")
        return False
    finally:
        await conn.close()


# --- Helper function to get all prep times ---
async def get_all_product_prep_times():
    """
    Retrieves all product preparation times from the database.
    """
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cursor:
            query = "SELECT [ProductID], [PrepTimeMinutes] FROM [dbo].[ProductPrepTimes]"
            await cursor.execute(query)
            rows = await cursor.fetchall()
            # Create a dictionary for easy lookup
            return {row[0]: row[1] for row in rows}
    except Exception as e:
        print(f"Database Error: Failed to get all prep times. {e}")
        return {}
    finally:
        await conn.close()