
import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="db_laboras",
        port=3306 
    )
# http://localhost:5000/
# kad pasiziureti websitea.
